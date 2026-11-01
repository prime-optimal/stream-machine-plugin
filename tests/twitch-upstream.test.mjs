import test from 'node:test';
import assert from 'node:assert/strict';
import {TwitchService,FOLLOWER_SCOPE} from '../src/auth/upstream/service.ts';
import {decryptTokens,encryptTokens,randomState} from '../src/auth/upstream/crypto.ts';
import {TwitchError} from '../src/auth/upstream/client.ts';
import {fixture,key} from './twitch-helpers.mjs';

async function connected(){const f=fixture();const service=new TwitchService(f.store,f.client);const started=await service.begin('owner');await service.complete('owner',started.state,started.state,'code',null);return {...f,service};}

test('seals tokens to both the key and owner',async()=>{
 const secret=key(),value={accessToken:'private-value'};
 const sealed=await encryptTokens(value,secret,'owner');
 assert.ok(!sealed.includes('private-value'));
 assert.deepEqual(await decryptTokens(sealed,secret,'owner'),value);
 await assert.rejects(decryptTokens(sealed,secret,'different-owner'));
 await assert.rejects(decryptTokens(sealed,key(),'owner'));
 await assert.rejects(decryptTokens('invalid',secret,'owner'));
});
test('basic connection requests no optional scopes and stores no raw state or token',async()=>{
 const {store,client,sql}=fixture(),service=new TwitchService(store,client);
 const start=await service.begin('owner');
 assert.equal(new URL(start.url).searchParams.get('scope'),'');
 const state=sql.prepare('SELECT hash AS state_hash FROM states').get();assert.notEqual(state.state_hash,start.state);
 await service.complete('owner',start.state,start.state,'code',null);
 const row=await store.get('owner');assert.ok(!row.ciphertext.includes('test-access'));assert.ok(!row.ciphertext.includes('test-refresh'));
 const status=await service.status('owner');assert.equal(status.connected,true);assert.equal(status.profile.login,'creator');assert.equal(JSON.stringify(status).includes('test-access'),false);
 assert.deepEqual(await service.status('other-owner'),{connected:false});
});
test('rejects callback without matching cookie before exchanging code',async()=>{
 const {store,client}=fixture(),service=new TwitchService(store,client),start=await service.begin('owner');
 await assert.rejects(service.complete('owner',start.state,null,'code',null),{code:'invalid_state'});
 await assert.rejects(service.complete('owner',start.state,randomState(),'code',null),{code:'invalid_state'});
 assert.equal(client.exchanges,0);
});
test('binds state to the Sites user and consumes it only once',async()=>{
 const {store,client}=fixture(),service=new TwitchService(store,client),start=await service.begin('owner');
 await assert.rejects(service.complete('other-owner',start.state,start.state,'code',null),{code:'expired_state'});
 await service.complete('owner',start.state,start.state,'code',null);
 await assert.rejects(service.complete('owner',start.state,start.state,'code',null),{code:'expired_state'});
 assert.equal(client.exchanges,1);
});
test('expires state after ten minutes',async()=>{
 const {store,client}=fixture();let now=1000;const service=new TwitchService(store,client,()=>now),start=await service.begin('owner');now+=600001;
 await assert.rejects(service.complete('owner',start.state,start.state,'code',null),{code:'expired_state'});assert.equal(client.exchanges,0);
});
test('denial consumes a valid state without creating a connection',async()=>{
 const {store,client}=fixture(),service=new TwitchService(store,client),start=await service.begin('owner');
 await assert.rejects(service.complete('owner',start.state,start.state,null,'access_denied'),{code:'denied'});
 assert.equal(client.exchanges,0);assert.equal(await store.get('owner'),null);
 await assert.rejects(service.complete('owner',start.state,start.state,'code',null),{code:'expired_state'});
});
test('follower permissions require an explicit request and actual grant',async()=>{
 const {store,client}=fixture(),service=new TwitchService(store,client),start=await service.begin('owner',true);
 assert.equal(new URL(start.url).searchParams.get('scope'),FOLLOWER_SCOPE);
 await assert.rejects(service.complete('owner',start.state,start.state,'code',null),{code:'missing_permissions'});
 assert.equal(await store.get('owner'),null);assert.deepEqual(client.revocations,['test-access']);
 client.scopes=[FOLLOWER_SCOPE];const next=await service.begin('owner',true);await service.complete('owner',next.state,next.state,'code',null);
 assert.deepEqual((await service.status('owner')).scopes,[FOLLOWER_SCOPE]);
});
test('refreshes after a 401 and persists the rotated refresh token',async()=>{
 const {service,client,store}=await connected();client.invalidAccess=true;
 assert.equal((await service.status('owner')).connected,true);assert.equal(client.refreshes,1);
 const row=await store.get('owner');const tokens=await decryptTokens(row.ciphertext,client.config.encryptionSecret,'owner');assert.equal(tokens.refreshToken,'new-refresh');
});
test('invalid refresh requires reconnection; temporary outages preserve the connection',async()=>{
 const {service,client,store}=await connected();client.unavailable=true;
 await assert.rejects(service.status('owner'),{code:'provider_unavailable'});assert.ok(await store.get('owner'));
 client.unavailable=false;client.invalidAccess=true;client.invalidRefresh=true;
 assert.deepEqual(await service.status('owner'),{connected:false,reconnectRequired:true});assert.equal(await store.get('owner'),null);
});
test('rejects a changed Twitch identity and removes only that owner connection',async()=>{
 const {service,client,store}=await connected();client.foreignIdentity=true;
 assert.deepEqual(await service.status('owner'),{connected:false,reconnectRequired:true});assert.equal(await store.get('owner'),null);
});
test('one refresh lease prevents duplicate concurrent token refreshes',async()=>{
 const {service,client}=await connected();client.invalidAccess=true;
 let release;client.refresh=async()=>{client.refreshes++;await new Promise(resolve=>release=resolve);return {accessToken:'new-access',refreshToken:'new-refresh',expiresIn:3600,scopes:[]};};
 const first=service.status('owner');while(!release)await new Promise(resolve=>setImmediate(resolve));
 await assert.rejects(service.status('owner'),{code:'refresh_in_progress'});release();assert.equal((await first).connected,true);assert.equal(client.refreshes,1);
});
test('disconnect cancels a code exchange already in flight',async()=>{
 const {store,client}=fixture(),service=new TwitchService(store,client),start=await service.begin('owner');
 let release;client.exchange=async()=>{await new Promise(resolve=>release=resolve);return {accessToken:'test-access',refreshToken:'test-refresh',expiresIn:3600,scopes:[]};};
 const callback=service.complete('owner',start.state,start.state,'code',null);while(!release)await new Promise(resolve=>setImmediate(resolve));
 await service.disconnect('owner');release();await assert.rejects(callback,{code:'connection_cancelled'});assert.equal(await store.get('owner'),null);assert.ok(client.revocations.includes('test-access'));
});
test('disconnect during refresh cannot recreate the connection',async()=>{
 const {service,client,store}=await connected();client.invalidAccess=true;
 let release;client.refresh=async()=>{await new Promise(resolve=>release=resolve);return {accessToken:'new-access',refreshToken:'new-refresh',expiresIn:3600,scopes:[]};};
 const pending=service.status('owner');while(!release)await new Promise(resolve=>setImmediate(resolve));
 await service.disconnect('owner');release();await assert.rejects(pending,{code:'connection_cancelled'});assert.equal(await store.get('owner'),null);
});
test('disconnect revokes the actual connection replaced while disconnect was pending',async()=>{
 const {service,client,store}=await connected(),start=await service.begin('owner');
 const original=store.disconnect.bind(store);let release;
 store.disconnect=async owner=>{await new Promise(resolve=>release=resolve);return original(owner);};
 const disconnecting=service.disconnect('owner');while(!release)await new Promise(resolve=>setImmediate(resolve));
 client.exchange=async()=>({accessToken:'replacement-access',refreshToken:'replacement-refresh',expiresIn:3600,scopes:[]});
 await service.complete('owner',start.state,start.state,'replacement-code',null);
 release();await disconnecting;
 assert.equal(await store.get('owner'),null);
 assert.ok(client.revocations.includes('replacement-access'));
});
test('a refreshed token is revoked if its subsequent validation fails',async()=>{
 const {service,client,store}=await connected();
 client.validate=async token=>{if(token==='test-access')throw new TwitchError('invalid_access_token',401);throw new TwitchError('provider_unavailable');};
 await assert.rejects(service.status('owner'),{code:'provider_unavailable'});
 assert.ok(client.revocations.includes('new-access'));
 assert.ok(await store.get('owner'));
});
