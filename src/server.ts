/**
 * imports
 */
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

/**
 * imports (internals)
 */

import { createServer } from "./mcp-server.js";

/**
 * main
 */

async function main() {
  const { server } = createServer();
  // Create stdio transport
  const transport = new StdioServerTransport();
  // Connect server to transport
  await server.connect(transport);
  console.log("Server connected to stdio transport");
  // Process will terminate when stdin closes
  process.stdin.on("end", () => {
    console.log("Stdin closed, terminating server");
    process.exit(0);
  });
}

/**
 * run
 */

console.log("starting IdentityFarm MCP server...");

main().catch((error) => {
  console.error(`Error startinc server: ${error}`);
  process.exit(1);
});
