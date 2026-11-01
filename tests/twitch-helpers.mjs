import {LocalConnectionStore} from '../src/auth/local-store.ts';
import {TwitchError} from '../src/auth/upstream/client.ts';

export function key(){return btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))));}
export function fixture(){
 const store=new LocalConnectionStore(':memory:');
 const sql={prepare:query=>({get:()=>store.db.query(query).get()})};
 const client={
  config:{clientId:'test-client',clientSecret:'test-secret',redirectUri:'https://studio.example/api/twitch/callback',encryptionSecret:key()},
  scopes:[],exchanges:0,refreshes:0,revocations:[],invalidAccess:false,invalidRefresh:false,unavailable:false,foreignIdentity:false,
  authorizationUrl(state,scopes){return 'https://id.twitch.tv/oauth2/authorize?'+new URLSearchParams({state,scope:scopes.join(' ')});},
  async exchange(){this.exchanges++;return {accessToken:'test-access',refreshToken:'test-refresh',expiresIn:3600,scopes:this.scopes};},
  async validate(token){if(this.unavailable)throw new TwitchError('provider_unavailable');if(this.invalidAccess&&token==='test-access')throw new TwitchError('invalid_access_token',401);return {client_id:'test-client',user_id:this.foreignIdentity?'other-user':'twitch-user',scopes:this.scopes,expires_in:3600};},
  async profile(token,id){return {id,login:'creator',displayName:'Creator',profileImageUrl:'https://static.example/avatar.png',broadcasterType:''};},
  async refresh(){this.refreshes++;if(this.invalidRefresh)throw new TwitchError('invalid_refresh_token',401);return {accessToken:'new-access',refreshToken:'new-refresh',expiresIn:3600,scopes:this.scopes};},
  async revoke(token){this.revocations.push(token);},
 };
 return {store,client,sql};
}
