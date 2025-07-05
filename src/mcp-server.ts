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
   * browser
   */

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

  /**
   * tools
   */

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

  /**
   * platform: X
   */

  /**
   * prompts
   */

  server.registerPrompt(
    "am-i-logged-in-on-x",
    {
      title: "Am I logged in on X?",
      description: "Am I logged in on X?",
      argsSchema: {},
    },
    () => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Please check if I am logged in on X`,
          },
        },
      ],
    }),
  );

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

  server.registerPrompt(
    "post-new-on-x",
    {
      title: "Post New",
      description: "Post a new tweet on X",
      argsSchema: { text: z.string() },
    },
    ({ text }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Please post the following tweet on X: ${text}`,
          },
        },
      ],
    }),
  );

  server.registerPrompt(
    "list-my-tweets-on-x",
    {
      title: "List My Tweets",
      description: "List my tweets on X",
      argsSchema: {},
    },
    () => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Please list my tweets on X`,
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
    "am-i-logged-in-on-x",
    {
      title: "Am I logged in on X?",
      description: "Am I logged in on X?",
      inputSchema: {},
    },
    async () => {
      const isLoggedIn = await x.isLoggedIn();
      return {
        content: [
          {
            type: "text",
            text: `You are ${isLoggedIn ? "logged in" : "not logged in"} on X`,
          },
        ],
      };
    },
  );

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
      inputSchema: { uri: z.string(), repliesLimit: z.number().optional() },
      annotations: {
        openWorldHint: true,
      },
    },
    async ({ uri, repliesLimit }) => {
      const tweet = await x.getTweet({ uri, repliesLimit });
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

  server.registerTool(
    "post-new-on-x",
    {
      title: "Post New",
      description: "Post a new tweet on X",
      inputSchema: { text: z.string() },
      annotations: {
        openWorldHint: true,
      },
    },
    async ({ text }) => {
      await x.post({ text });
      return {
        content: [
          {
            type: "text",
            text: `Posted new tweet: ${text}`,
          },
        ],
      };
    },
  );

  server.registerTool(
    "list-my-tweets-on-x",
    {
      title: "List My Tweets",
      description: "List my tweets on X",
      inputSchema: {},
    },
    async () => {
      const tweets = await x.listMyTweets();
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(tweets, null, 2),
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
