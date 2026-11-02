import { StdioServerTransport } from "@modelcontextprotocol/server/stdio";
import { createServer } from "./server";
declare const __STREAM_MACHINE_HTML__: string;

const server = createServer(__STREAM_MACHINE_HTML__);
const exit = () => void server.shutdown().then(() => process.exit(0));
process.stdin.on("end", exit);
process.stdin.on("close", exit);
process.on("SIGINT", exit);
process.on("SIGTERM", exit);
await server.connect(new StdioServerTransport());
