import test from 'node:test';
import assert from 'node:assert/strict';
import { TwitchService } from '../src/auth/upstream/service.ts';
import { TwitchClient } from '../src/auth/upstream/client.ts';
import { TwitchTitleService } from '../src/adapters/twitch/service.ts';
import { TwitchChannelClient } from '../src/adapters/twitch/client.ts';
import { TwitchClipClient } from '../src/adapters/twitch/clips-client.ts';
import { fetchClipLibraryPage } from '../src/adapters/twitch/clip-library.ts';
import { twitchFeatures, requiredTwitchScopes, implementedTwitchScopes, futureTwitchPermissions, twitchConsentDisclosure } from '../src/auth/permissions.ts';
import { fixture } from './twitch-helpers.mjs';

const baseline = [
 'channel:manage:broadcast', 'channel:manage:clips', 'user:read:chat', 'user:write:chat',
 'moderator:read:followers', 'channel:read:subscriptions', 'bits:read',
 'channel:read:redemptions', 'channel:manage:redemptions', 'clips:edit', 'user:bot', 'channel:bot',
].sort();
test('default connection requests exactly product policy in the real Twitch URL', async () => {
 const { store, client } = fixture();
 client.authorizationUrl = (state, scopes) => new TwitchClient(client.config).authorizationUrl(state, scopes);
 try {
  for(const flags of [[],[false,false,false],[false,true,true]]){
   const started = await new TwitchService(store, client).begin('owner',...flags);
   const url = new URL(started.url);
   assert.equal(url.origin + url.pathname, 'https://id.twitch.tv/oauth2/authorize');
   assert.equal(url.searchParams.get('scope'), baseline.join(' '));
   assert.deepEqual(started.requestedScopes, baseline);
   assert.equal(url.searchParams.get('response_type'), 'code');
   assert.equal(url.searchParams.get('force_verify'), 'true');
   assert.equal(url.searchParams.get('redirect_uri'), client.config.redirectUri);
   assert.equal(url.searchParams.get('state'), started.state);
  }
 } finally { store.close(); }
});
test('registry distinguishes implemented features from owner-requested future consent', () => {
 assert.deepEqual(requiredTwitchScopes,baseline);
 assert.deepEqual(implementedTwitchScopes,['channel:manage:broadcast','channel:manage:clips']);
 assert.deepEqual(Object.keys(twitchFeatures),['connection','profile','channel','title','clipMetadata','clipLibrary','clipDownload','channelUpdate']);
 assert.deepEqual(Object.fromEntries(Object.entries(twitchFeatures).map(([name,f])=>[name,f.scopes])), {
  connection:[],profile:[],channel:[],title:['channel:manage:broadcast'],
  clipMetadata:[],clipLibrary:[],clipDownload:['channel:manage:clips'],channelUpdate:[],
 });
 assert.equal(futureTwitchPermissions.length,10);
 assert.deepEqual(futureTwitchPermissions.map(p=>p.scope).sort(),baseline.filter(s=>!implementedTwitchScopes.includes(s)));
 for(const scope of baseline) assert.ok(twitchConsentDisclosure.includes(scope));
 assert.ok(twitchConsentDisclosure.includes('not active features'));
 assert.ok(twitchConsentDisclosure.includes('API access suspension'));
 assert.ok(twitchConsentDisclosure.includes('does not authorize a separate bot'));
 assert.equal(baseline.includes('chat:read'),false);
 assert.equal(baseline.includes('chat:edit'),false);
 assert.equal(baseline.some(s=>s.startsWith('analytics:')),false);
});
test('old partial grants stay usable, reconnect union is exact, rejection preserves prior connection',async()=>{
 for(const old of [[],['channel:manage:broadcast'],baseline]){
  const {store,client}=fixture(),service=new TwitchService(store,client);
  try {
   const first=await service.begin('owner');
   await service.complete('owner',first.state,first.state,'code',null);
   client.scopes=[...old,'user:read:email'];
   const status=await service.status('owner');
   assert.equal(status.connected,true);
   assert.deepEqual(status.missingScopes,baseline.filter(s=>!old.includes(s)));
   assert.equal(status.reconnectRequired,old.length!==baseline.length);
   const previous=await store.get('owner');
   const next=await service.begin('owner');
   assert.deepEqual(next.requestedScopes,[...baseline,'user:read:email'].sort());
   await assert.rejects(service.complete('owner',next.state,next.state,null,'access_denied'),{code:'denied'});
   assert.deepEqual(await store.get('owner'),previous);
   assert.deepEqual(client.revocations,[]);
   const missing=await service.begin('owner');
   client.exchange=async()=>({accessToken:'rejected-new-token',refreshToken:'rejected-refresh',expiresIn:3600,scopes:[]});
   client.scopes=['channel:manage:broadcast'];
   await assert.rejects(service.complete('owner',missing.state,missing.state,'code',null),{code:'missing_permissions'});
   assert.deepEqual(await store.get('owner'),previous);
   assert.deepEqual(client.revocations,['rejected-new-token']);
   const success=await service.begin('owner');
   client.scopes=[...baseline,'user:read:email'];
   client.exchange=async()=>({accessToken:'replacement-token',refreshToken:'replacement-refresh',expiresIn:3600,scopes:[]});
   await service.complete('owner',success.state,success.state,'code',null);
   assert.deepEqual((await service.status('owner')).missingScopes,[]);
   assert.deepEqual((await store.get('owner')).scopes,client.scopes);
   assert.ok(client.revocations.includes('test-access'));
  } finally {store.close();}
 }
});
test('refresh stores actual reduced grants and status reports them without disconnect',async()=>{
 const {store,client}=fixture(),service=new TwitchService(store,client);
 try {
  const first=await service.begin('owner');
  await service.complete('owner',first.state,first.state,'code',null);
  client.scopes=['channel:manage:broadcast']; client.invalidAccess=true;
  const status=await service.status('owner');
  assert.equal(status.connected,true);
  assert.equal(status.reconnectRequired,true);
  assert.deepEqual(status.grantedScopes,client.scopes);
  assert.deepEqual(status.missingScopes,baseline.filter(s=>s!=='channel:manage:broadcast'));
  assert.deepEqual((await store.get('owner')).scopes,client.scopes);
 } finally {store.close();}
});
test('tool-facing status exposes missing policy scopes without claiming future features work',async()=>{
 const service=new TwitchTitleService({withAccount:async operation=>operation({
  account:{id:'123',login:'test',displayName:'Test',scopes:['channel:manage:broadcast']},
  clientId:'fake',accessToken:'TOKEN_SENTINEL',
 })});
 const status=await service.status();
 assert.deepEqual(status.implementedScopes,implementedTwitchScopes);
 assert.equal(status.reconnectRequired,true);
 assert.deepEqual(status.missingScopes,baseline.filter(s=>s!=='channel:manage:broadcast'));
 assert.equal(JSON.stringify(status).includes('TOKEN_SENTINEL'),false);
});
test('implemented clients issue only the registered endpoint inventory',async()=>{
 const seen=new Set();
 const fake=async(input,init)=>{
  const url=new URL(input), method=init?.method??'GET';
  seen.add(method+' '+url.pathname);
  if(url.pathname==='/helix/users') return Response.json({data:[{id:'123',login:'test',display_name:'Test',description:'Test',profile_image_url:'',offline_image_url:''}]});
  if(url.pathname==='/helix/channels') return method==='PATCH'?new Response(null,{status:204}):Response.json({data:[{broadcaster_id:'123',broadcaster_login:'test',broadcaster_name:'Test',title:'Original',game_id:'1',game_name:'Test'}]});
  if(url.pathname==='/helix/clips')return Response.json(url.searchParams.has('broadcaster_id')?{data:[{id:'Clip',url:'https://clips.twitch.tv/Clip',title:'Clip',created_at:'2026-10-01T00:00:00Z',duration:5,view_count:1,game_id:'1'}]}:{data:[{id:'Clip',broadcaster_id:'123',title:'Clip',url:'https://clips.twitch.tv/Clip'}]});
  if(url.pathname==='/helix/games')return Response.json({data:[{id:'1',name:'Test'}]});
  if(url.pathname==='/helix/clips/downloads')return Response.json({data:[{clip_id:'Clip',landscape_download_url:'https://example.test/clip',portrait_download_url:null}]});
  throw new Error('Undeclared endpoint');
 };
 const access={account:{id:'123'},clientId:'fake',accessToken:'FAKE'};
 const channel=new TwitchChannelClient(fake),clips=new TwitchClipClient(fake);
 await channel.read(access);await channel.readProfile(access);await channel.writeTitle(access,'New');
 await clips.read(access,'Clip');await clips.download(access,'Clip');
 await fetchClipLibraryPage((path,params)=>clips.get(access,path,params),{id:'123',login:'test',displayName:'Test'},{},'local');
 const expected=[...new Set(Object.values(twitchFeatures).flatMap(f=>f.endpoints).filter(e=>!e.includes('eventsub')))];
 assert.deepEqual([...seen].sort(),expected.sort());
});
