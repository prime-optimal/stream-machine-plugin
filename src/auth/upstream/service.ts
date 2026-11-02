import {decryptTokens,encryptTokens,randomState,stateHash} from './crypto';
import {TwitchClient,TwitchError,type Tokens} from './client';
import type {Connection,ConnectionStore} from './store';

export const FOLLOWER_SCOPE='moderator:read:followers';
export { CLIP_SCOPE } from "../permissions";
import { requestedTwitchScopes, twitchPermissions } from "../permissions";

export class TwitchService {
  readonly store:ConnectionStore;
  readonly client:TwitchClient;
  private now:()=>number;
  constructor(store:ConnectionStore,client:TwitchClient,now=()=>Date.now()) {this.store=store;this.client=client;this.now=now;}

  async begin(ownerId:string,followers=false,_manageBroadcast=false,_manageClips=false) {
    const previous=await this.store.get(ownerId);
    const state=randomState(),scopes=requestedTwitchScopes(previous?.scopes??[],followers?[FOLLOWER_SCOPE]:[]);
    await this.store.saveState(await stateHash(state),ownerId,scopes,this.now()+600000);
    return {state,url:this.client.authorizationUrl(state,scopes),requestedScopes:scopes};
  }

  async complete(ownerId:string,state:string,cookie:string|null,code:string|null,error:string|null) {
    if(!cookie||state!==cookie||!/^[A-Za-z0-9_-]{43}$/.test(state))throw new TwitchError('invalid_state',400);
    const hash=await stateHash(state),requested=await this.store.consumeState(hash,ownerId,this.now());
    if(!requested)throw new TwitchError('expired_state',400);
    let exchanged:Tokens|undefined;
    let saved=false;
    try {
      if(error)throw new TwitchError('denied',400);
      if(!code)throw new TwitchError('invalid_callback',400);
      exchanged=await this.client.exchange(code);
      const validated=await this.client.validate(exchanged.accessToken);
      if(!requested.every(scope=>validated.scopes.includes(scope)))throw new TwitchError('missing_permissions',400);
      const profile=await this.client.profile(exchanged.accessToken,validated.user_id);
      const previous=await this.store.get(ownerId);
      const ciphertext=await encryptTokens(exchanged,this.client.config.encryptionSecret,ownerId);
      saved=await this.store.put({ownerId,twitchUserId:profile.id,profile,scopes:validated.scopes,ciphertext,expiresAt:this.now()+validated.expires_in*1000,validatedAt:this.now()},hash,this.now());
      if(!saved)throw new TwitchError('connection_cancelled',409);
      if(previous) {
        try {const tokens=await this.tokens(previous);if(tokens.accessToken!==exchanged.accessToken)await this.client.revoke(tokens.accessToken);}catch{}
      }
      return {profile,scopes:validated.scopes};
    } finally {
      if(exchanged&&!saved)await this.client.revoke(exchanged.accessToken);
      await this.store.dropState(hash,ownerId);
    }
  }

  private async tokens(connection:Connection) {
    return decryptTokens<Tokens>(connection.ciphertext,this.client.config.encryptionSecret,connection.ownerId);
  }

  private async refresh(connection:Connection,tokens:Tokens) {
    const lease=randomState();
    if(!await this.store.claimRefresh(connection.ownerId,connection.ciphertext,lease,this.now()))throw new TwitchError('refresh_in_progress',503);
    let updated:Tokens|undefined;
    let saved=false;
    try {
      updated=await this.client.refresh(tokens.refreshToken);
      const validated=await this.client.validate(updated.accessToken);
      if(validated.user_id!==connection.twitchUserId)throw new TwitchError('invalid_identity',401);
      const next={...connection,ciphertext:await encryptTokens(updated,this.client.config.encryptionSecret,connection.ownerId),scopes:validated.scopes,expiresAt:this.now()+validated.expires_in*1000,validatedAt:this.now()};
      saved=await this.store.replaceRefreshed(next,lease);
      if(!saved)throw new TwitchError('connection_cancelled',409);
      return next;
    } finally {if(updated&&!saved)await this.client.revoke(updated.accessToken);await this.store.releaseRefresh(connection.ownerId,lease);}
  }

  async status(ownerId:string) {
    let connection=await this.store.get(ownerId);
    if(!connection)return {connected:false};
    let tokens:Tokens;
    try {tokens=await this.tokens(connection);} catch {await this.store.remove(ownerId,connection.ciphertext);return {connected:false,reconnectRequired:true};}
    try {
      try {
        const validation=await this.client.validate(tokens.accessToken);
        if(validation.user_id!==connection.twitchUserId)throw new TwitchError('invalid_identity',401);
        connection={...connection,scopes:validation.scopes,expiresAt:this.now()+validation.expires_in*1000,validatedAt:this.now()};
        if(!await this.store.markValidated(ownerId,connection.ciphertext,validation.scopes,connection.expiresAt,this.now()))throw new TwitchError('connection_cancelled',409);
      } catch(error) {
        if(error instanceof TwitchError&&error.code==='invalid_access_token')connection=await this.refresh(connection,tokens);
        else throw error;
      }
      return {connected:true,profile:connection.profile,scopes:connection.scopes,...twitchPermissions(connection.scopes)};
    } catch(error) {
      if(error instanceof TwitchError&&['invalid_refresh_token','invalid_identity','invalid_access_token'].includes(error.code)){await this.store.remove(ownerId,connection.ciphertext);return {connected:false,reconnectRequired:true};}
      throw error;
    }
  }

  async disconnect(ownerId:string) {
    const connection=await this.store.disconnect(ownerId);
    if(connection){try {await this.client.revoke((await this.tokens(connection)).accessToken);}catch{}}
  }

  async withAccessToken<T>(ownerId:string,operation:(connection:Connection,token:string)=>Promise<T>) {
    const status=await this.status(ownerId);
    if(!status.connected)throw new TwitchError('connection_required',401);
    const connection=await this.store.get(ownerId);
    if(!connection)throw new TwitchError('connection_cancelled',409);
    return operation(connection,(await this.tokens(connection)).accessToken);
  }
}
