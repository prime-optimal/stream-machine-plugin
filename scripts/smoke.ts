import { resolve, dirname, join } from "node:path";
import { verifyServer } from "./desktop-smoke";

const desktop = resolve(process.argv[2] ?? "dist/server.js");
await verifyServer(join(dirname(desktop), "obs-server.js"), "obs");
await verifyServer(desktop, "desktop");
