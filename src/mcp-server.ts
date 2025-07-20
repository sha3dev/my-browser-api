/**
 * imports
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

/**
 * imports (internals)
 */

import Browser from "./lib/browser.js";
import X from "./lib/x.js";
import initBrowser from "./mcp/browser";
import initX from "./mcp/x";

/**
 * init
 */

const browser = new Browser({});
const x = new X({ browser });

/**
 * export
 */

export function createServer() {
  const server = new McpServer({ name: "My Browser API", version: "1.0.0" });
  initBrowser(browser, server);
  initX(x, server);
  return { server, cleanup: () => server.close() };
}
