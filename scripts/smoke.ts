import { resolve, dirname, join } from "node:path";
import { verifyServer } from "./desktop-smoke";

const streamdeck = resolve(process.argv[2] ?? "dist/server.js");
await verifyServer(join(dirname(streamdeck), "obs-server.js"), "obs");
await verifyServer(streamdeck, "streamdeck");
