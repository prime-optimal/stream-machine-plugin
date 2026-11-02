import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { createObsServer } from "./obs-server";

serveStdio(createObsServer, { onerror: error => console.error(error.message) });
