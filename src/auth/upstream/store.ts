import type {Profile} from './client';

export type Connection = {ownerId:string;twitchUserId:string;profile:Profile;scopes:string[];ciphertext:string;expiresAt:number;validatedAt:number};
export interface ConnectionStore {
  saveState(hash:string,ownerId:string,scopes:string[],expiresAt:number):Promise<void>;
  consumeState(hash:string,ownerId:string,now:number):Promise<string[]|null>;
  get(ownerId:string):Promise<Connection|null>;
  put(connection:Connection,stateHash:string,now:number):Promise<boolean>;
  dropState(hash:string,ownerId:string):Promise<void>;
  remove(ownerId:string,expectedCiphertext?:string):Promise<void>;
  disconnect(ownerId:string):Promise<Connection|null>;
  claimRefresh(ownerId:string,expectedCiphertext:string,lease:string,now:number):Promise<boolean>;
  replaceRefreshed(connection:Connection,lease:string):Promise<boolean>;
  releaseRefresh(ownerId:string,lease:string):Promise<void>;
  markValidated(ownerId:string,expectedCiphertext:string,scopes:string[],expiresAt:number,now:number):Promise<boolean>;
}

type Row={owner_id:string;twitch_user_id:string;profile_json:string;scopes_json:string;token_ciphertext:string;expires_at:number;validated_at:number};
