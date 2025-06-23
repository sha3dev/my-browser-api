/**
 * imports
 */
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import express from "express";

/**
 * imports (internals)
 */

import { createServer } from "./mcp-server.js";

/**
 * consts
 */

const PORT = process.env.PORT || 3000;

/**
 * init
 */

const app = express();
const transports: Map<string, SSEServerTransport> = new Map<string, SSEServerTransport>();
console.log("Starting My Browser MCP server...");

/**
 * routes
 */

app.get("/mcp", async (req, res) => {
  let transport: SSEServerTransport;
  const { server, cleanup } = createServer();
  if (req?.query?.sessionId) {
    const sessionId = req?.query?.sessionId as string;
    transport = transports.get(sessionId) as SSEServerTransport;
    console.error("Client Reconnecting? This shouldn't happen; when client has a sessionId, GET /sse should not be called again.", transport.sessionId);
  } else {
    // Create and store transport for new session
    transport = new SSEServerTransport("/message", res);
    transports.set(transport.sessionId, transport);
    // Connect server to transport
    await server.connect(transport);
    console.log("Client Connected: ", transport.sessionId);
    // Set up event listener for connection close
    const handleConnectionClose = async () => {
      console.log("Client Disconnected: ", transport.sessionId);
      transports.delete(transport.sessionId);
      await cleanup();
    };
    // Add custom property to track the cleanup function
    res.on("close", handleConnectionClose);
  }
});

app.post("/message", async (req, res) => {
  const sessionId = req?.query?.sessionId as string;
  const transport = transports.get(sessionId);
  if (transport) {
    console.error("Client Message from", sessionId);
    await transport.handlePostMessage(req, res);
  } else {
    console.error(`No transport found for sessionId ${sessionId}`);
  }
});

app.listen(PORT, () => console.info(`Server is running on port ${PORT}`));
