import { verifyServer } from "./desktop-smoke";
const path = process.argv[2];
if (!path) throw new Error("Creative server path required");
await verifyServer(path, "creative");
