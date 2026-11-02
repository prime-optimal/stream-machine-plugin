import { McpServer } from "@modelcontextprotocol/server";
import { registerObsTools } from "./adapters/obs/register";
import { version } from "./version";

export function createObsServer() {
  const server = new McpServer({ name: "stream-machine-obs", version });
  registerObsTools(server);
  return server;
}
