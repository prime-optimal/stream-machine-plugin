import { McpServer } from "@modelcontextprotocol/server";
import { StdioServerTransport } from "@modelcontextprotocol/server/stdio";
import { registerStreamDeckTools } from "./adapters/streamdeck/register";
import { version } from "./version";

const server = new McpServer({ name: "stream-machine-streamdeck", version });
const deck = registerStreamDeckTools(server);
let closing: Promise<void> | undefined;
const shutdown = (): Promise<void> => {
  closing ??= deck.close().then(() => undefined, () => { process.stderr.write("Stream Deck cleanup failed.\n"); });
  return closing;
};
const exit = () => void shutdown().then(() => process.exit(0));
server.server.onclose = () => void shutdown();
process.stdin.on("end", exit);
process.stdin.on("close", exit);
process.on("SIGINT", exit);
process.on("SIGTERM", exit);
await server.connect(new StdioServerTransport());
