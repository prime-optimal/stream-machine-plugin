import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { createServer } from "./server";
declare const __STREAM_MACHINE_HTML__: string;

serveStdio(() => createServer(__STREAM_MACHINE_HTML__), { onerror: error => console.error(error.message) });
