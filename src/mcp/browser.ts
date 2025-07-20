/**
 * imports: external
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

/**
 * imports: internal
 */

import Browser from "../lib/browser.js";

/**
 * init
 */

export default (browser: Browser, server: McpServer) => {
  /**
   * prompts
   */

  server.registerPrompt(
    "open-browser",
    {
      title: "Open Browser",
      description: "Open the browser",
      argsSchema: { url: z.string() },
    },
    ({ url }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Please open the following URL in the browser: ${url}`,
          },
        },
      ],
    }),
  );

  server.registerPrompt(
    "close-browser",
    {
      title: "Close Browser",
      description: "Close the browser",
    },
    () => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Please close the current browser`,
          },
        },
      ],
    }),
  );

  server.registerPrompt(
    "list-identities",
    {
      title: "List Identities",
      description: "List the available identities",
    },
    () => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Please list the available identities`,
          },
        },
      ],
    }),
  );

  /**
   * resources
   */

  server.registerResource(
    "browser-identities",
    "browser://identities",
    {
      title: "Browser Identities",
      description: "List of available identities",
      mimeType: "application/json",
    },
    async (uri: URL) => {
      return {
        contents: [{ uri: uri.href, text: JSON.stringify(browser.Identities) }],
      };
    },
  );

  server.registerResource(
    "browser-identity",
    "browser://identities/{id}",
    {
      title: "Browser Identity",
      description: "Identity",
      mimeType: "application/json",
    },
    async (uri: URL) => {
      const id = uri.pathname.split("/").pop();
      const identity = browser.Identities.find((identity) => identity.id === id);
      if (!identity) {
        throw new Error(`Identity with ID ${id} not found`);
      }
      return {
        contents: [{ uri: uri.href, text: JSON.stringify(identity) }],
      };
    },
  );

  /**
   * tools
   */

  server.registerTool(
    "open-browser",
    {
      title: "Open Browser",
      description: "Open the browser",
      inputSchema: { url: z.string() },
    },
    async ({ url }) => {
      await browser.open({ url });
      return {
        content: [
          {
            type: "text",
            text: `Browser opened successfully for URL: ${url}`,
          },
        ],
      };
    },
  );

  server.registerTool(
    "close-browser",
    {
      title: "Close Browser",
      description: "Close the browser",
      inputSchema: {},
    },
    async () => {
      await browser.close();
      return {
        content: [
          {
            type: "text",
            text: "Browser closed successfully",
          },
        ],
      };
    },
  );

  server.registerTool(
    "get-page-html",
    {
      title: "Get Page HTML for URL",
      description: "Get the HTML ",
      inputSchema: { uri: z.string() },
    },
    async ({ uri }) => {
      const page = await browser.open({ url: uri });
      const html = await page.content();
      return {
        content: [
          {
            type: "text",
            text: html,
          },
        ],
      };
    },
  );
};
