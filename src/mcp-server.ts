/**
 * imports
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

/**
 * imports (internals)
 */

import Browser from "./lib/browser.js";
import X from "./lib/x.js";

/**
 * init
 */

const browser = new Browser({});
const x = new X({ browser });

/**
 * private
 */

function initServer(server: McpServer) {
  /**
   * platform: X
   */

  /**
   * prompts
   */

  server.registerPrompt(
    "search-posts-on-x",
    {
      title: "Search Posts",
      description: "Search for tweets on X platform using a specific query term",
      argsSchema: { query: z.string() },
    },
    ({ query }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Please search for tweets on X platform using the following query term: ${query}`,
          },
        },
      ],
    }),
  );

  server.registerPrompt(
    "get-post-on-x",
    {
      title: "Get Post",
      description: "Get a tweet from X",
      argsSchema: { uri: z.string() },
    },
    ({ uri }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Please get the following tweet from X: ${uri}`,
          },
        },
      ],
    }),
  );

  server.registerPrompt(
    "reply-on-x",
    {
      title: "Reply",
      description: "Reply to a tweet on X",
      argsSchema: { uri: z.string(), text: z.string() },
    },
    ({ uri, text }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Please reply to the following tweet on X: ${uri}\n\n${text}`,
          },
        },
      ],
    }),
  );

  /**
   * resources
   */

  server.registerResource(
    "x-post",
    "x://uri",
    {
      title: "X Post",
      description: "Tweet from X",
      mimeType: "application/json",
    },
    async (uri: URL) => {
      const tweetRelativeUri = uri.href.replace("x://", "");
      const post = await x.getTweet({ uri: tweetRelativeUri });
      return {
        contents: [{ uri: uri.href, text: JSON.stringify(post) }],
      };
    },
  );

  /**
   * tools
   */

  server.registerTool(
    "search-posts-on-x",
    {
      title: "Search posts",
      description: "Search for tweets on X platform using a specific query term",
      inputSchema: { query: z.string(), limit: z.number().optional() },
      annotations: {
        openWorldHint: true,
      },
    },
    async ({ query, limit }) => {
      const tweets = await x.search({ query, limit });
      if (!tweets.length) {
        return {
          content: [
            {
              type: "text",
              text: `Error: No tweets found matching "${query}"`,
            },
          ],
          isError: true,
        };
      }
      return {
        content: [
          { type: "text", text: `Found tweets matching "${query}":` },
          {
            type: "text",
            text: JSON.stringify(tweets, null, 2),
          },
        ],
      };
    },
  );

  server.registerTool(
    "get-post-on-x",
    {
      title: "Get Post",
      description: "Get a tweet from X",
      inputSchema: { uri: z.string() },
      annotations: {
        openWorldHint: true,
      },
    },
    async ({ uri }) => {
      const tweet = await x.getTweet({ uri });
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(tweet, null, 2),
          },
        ],
      };
    },
  );

  server.registerTool(
    "reply-on-x",
    {
      title: "Reply",
      description: "Reply to a tweet on X",
      inputSchema: { uri: z.string(), text: z.string() },
      annotations: {
        openWorldHint: true,
      },
    },
    async ({ uri, text }) => {
      await x.reply({ uri, text });
      return {
        content: [
          {
            type: "text",
            text: `Replied to tweet with URI ${uri}`,
          },
        ],
      };
    },
  );
}
/**
 * export
 */

export function createServer() {
  const server = new McpServer({ name: "My Browser API", version: "1.0.0" });
  initServer(server);
  return { server, cleanup: () => server.close() };
}
