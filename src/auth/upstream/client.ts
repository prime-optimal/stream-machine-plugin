export type TwitchConfig = {clientId:string;clientSecret:string;redirectUri:string;encryptionSecret:string};
export type Tokens = {accessToken:string;refreshToken:string;expiresIn:number;scopes:string[]};
export type Profile = {id:string;login:string;displayName:string;profileImageUrl:string;broadcasterType:string};
export type Validation = {client_id:string;user_id:string;scopes:string[];expires_in:number};

export class TwitchError extends Error {
  code:string;
  status:number;
  constructor(code:string,status=502) {super(code);this.code=code;this.status=status;}
}

export class TwitchClient {
  readonly config:TwitchConfig;
  private fetcher:typeof fetch;
  constructor(config:TwitchConfig,fetcher:typeof fetch=fetch) {this.config=config;this.fetcher=fetcher;}

  authorizationUrl(state:string, scopes:string[]) {
    const url=new URL('https://id.twitch.tv/oauth2/authorize');
    url.search=new URLSearchParams({client_id:this.config.clientId,redirect_uri:this.config.redirectUri,response_type:'code',scope:scopes.join(' '),state,force_verify:'true'}).toString();
    return url.toString();
  }

  private async request(url:string,init:RequestInit,invalidCode='provider_unavailable') {
    let response:Response;
    try {response=await this.fetcher(url,{...init,signal:AbortSignal.timeout(12000)});} catch {throw new TwitchError('provider_unavailable');}
    if(!response.ok) throw new TwitchError(response.status===401||response.status===400?invalidCode:'provider_unavailable',response.status===401?401:502);
    try{return await response.json();}catch{throw new TwitchError('invalid_provider_response');}
  }

  private async tokenRequest(parameters:Record<string,string>, invalidCode:string):Promise<Tokens> {
    const data=await this.request('https://id.twitch.tv/oauth2/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:this.config.clientId,client_secret:this.config.clientSecret,...parameters})},invalidCode) as Record<string,unknown>;
    if(typeof data.access_token!=='string'||!data.access_token||typeof data.refresh_token!=='string'||!data.refresh_token||typeof data.expires_in!=='number'||data.expires_in<=0||data.token_type!=='bearer')throw new TwitchError('invalid_provider_response');
    const scopes=Array.isArray(data.scope)?data.scope.filter((x):x is string=>typeof x==='string'):typeof data.scope==='string'?data.scope.split(' ').filter(Boolean):[];
    return {accessToken:data.access_token,refreshToken:data.refresh_token,expiresIn:data.expires_in,scopes};
  }

  exchange(code:string) {
    return this.tokenRequest({code,grant_type:'authorization_code',redirect_uri:this.config.redirectUri},'code_exchange_failed');
  }

  refresh(token:string) {
    return this.tokenRequest({refresh_token:token,grant_type:'refresh_token'},'invalid_refresh_token');
  }

  async validate(token:string):Promise<Validation> {
    const value=await this.request('https://id.twitch.tv/oauth2/validate',{headers:{Authorization:`OAuth ${token}`}},'invalid_access_token') as Validation;
    if(value.client_id!==this.config.clientId||typeof value.user_id!=='string'||!value.user_id||!Array.isArray(value.scopes)||!value.scopes.every(x=>typeof x==='string')||typeof value.expires_in!=='number'||value.expires_in<=0)throw new TwitchError('invalid_identity');
    return value;
  }

  async profile(token:string,expectedId:string):Promise<Profile> {
    const value=await this.request('https://api.twitch.tv/helix/users',{headers:{Authorization:`Bearer ${token}`,'Client-Id':this.config.clientId}},'invalid_access_token') as {data?:Record<string,unknown>[]};
    const p=value.data?.[0];
    if(!p||p.id!==expectedId||typeof p.login!=='string'||typeof p.display_name!=='string')throw new TwitchError('invalid_identity');
    const image=typeof p.profile_image_url==='string'&&p.profile_image_url.startsWith('https://')?p.profile_image_url:'';
    return {id:expectedId,login:p.login,displayName:p.display_name,profileImageUrl:image,broadcasterType:typeof p.broadcaster_type==='string'?p.broadcaster_type:''};
  }

  async revoke(token:string) {
    try {await this.fetcher('https://id.twitch.tv/oauth2/revoke',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:this.config.clientId,token}),signal:AbortSignal.timeout(12000)});}catch{}
  }
}
