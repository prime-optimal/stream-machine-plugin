import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { createCreativeServer } from "./creative-server";
declare const __STREAM_MACHINE_CREATIVE_HTML__: string;
serveStdio(() => createCreativeServer(__STREAM_MACHINE_CREATIVE_HTML__), { onerror: error => console.error(error.message) });
