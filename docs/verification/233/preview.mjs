import {readFile} from 'node:fs/promises';

const port = 4410;
const account = {id: 'home-layout-fixture', login: 'preview_channel', displayName: 'Preview channel (fixture)'};
const siteOrigin = 'https://stream-machine-oauth-test.tinycocoa22.chatgpt.site';
const server = Bun.serve({hostname: '127.0.0.1', port, async fetch(request) {
  const url = new URL(request.url);
  if (request.method === 'GET' && url.pathname === '/') {
    const html = await readFile(new URL('../../../dist/app.html', import.meta.url), 'utf8');
    return new Response(html.replace('<body>', '<body><aside role="note" style="padding:10px;background:#202020;color:white">Layout fixture. No live account, provider actions, or messages.</aside>'), {headers: {'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store'}});
  }
  if (request.method !== 'POST' || url.pathname !== '/api/tool') return new Response(null, {status: 404});
  const {name} = await request.json();
  if (name === 'stream_machine_open') return Response.json({structuredContent: {runtime: 'hosted', siteOrigin}});
  if (name === 'stream_machine_twitch_status') return Response.json({structuredContent: {twitch: {mode: 'mock', account}}});
  if (name === 'stream_machine_clips_library') return Response.json({structuredContent: {clips: {account, items: [], cursor: null, storage: 'site'}}});
  return Response.json({isError: true, structuredContent: {error: {code: 'FIXTURE_SNAPSHOT_UNAVAILABLE'}}});
}});
console.log(`Home layout fixture: http://127.0.0.1:${server.port}/?preview=1`);
