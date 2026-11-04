import {readFile} from 'node:fs/promises';
const record = JSON.parse(await readFile(new URL('./live-library.json', import.meta.url), 'utf8'));
const siteOrigin = 'https://stream-machine-oauth-test.tinycocoa22.chatgpt.site';
const html = await readFile(new URL('../../../dist/app.html', import.meta.url), 'utf8');
const notice = '<aside role="note" style="padding:12px;background:#202020;color:white">Read-only verification snapshot of the live Site library. Videos load from the Site. Saves are disabled.</aside>';
const server = Bun.serve({hostname: '127.0.0.1', port: 4399, async fetch(request) {
  const url = new URL(request.url);
  if (request.method === 'GET' && url.pathname === '/clips') return new Response(html.replace('<body>', '<body>' + notice), {headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}});
  if (request.method !== 'POST' || url.pathname !== '/api/tool') return new Response(null, {status:404});
  const {name} = await request.json();
  if (name === 'stream_machine_open') return Response.json({structuredContent:{runtime:'hosted',siteOrigin}});
  if (name === 'stream_machine_clips_library') return Response.json({structuredContent:record.structuredContent});
  if (name === 'stream_machine_twitch_status') return Response.json({structuredContent:{twitch:{account:record.structuredContent.clips.account}}});
  return Response.json({isError:true,structuredContent:{error:{code:'READ_ONLY_VERIFICATION'}}});
}});
console.log(`Read-only live gallery snapshot: http://127.0.0.1:${server.port}/clips`);
