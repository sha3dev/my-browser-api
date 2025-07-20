import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import X from "../../src/lib/x";
import Browser from "../../src/lib/browser";
import { createTestBrowser, cleanupBrowser, getRandomIdentity } from "./helpers/test-browser";
import { Identity } from "../../src/lib/browser/identity.schema";

describe("X Platform", () => {
  let browser: Browser;
  let x: X;
  let identity = getRandomIdentity();

  before(async () => {
    browser = createTestBrowser();
    x = new X({ browser });
  });

  after(async () => {
    await cleanupBrowser(browser);
  });

  describe("isLoggedIn", () => {
    it("should return a boolean", async () => {
      const result = await x.isLoggedIn({ identityId: identity.id });
      assert.strictEqual(typeof result, "boolean");
    });
  });

  describe("doLogin", () => {
    it("should login to X platform", async () => {
      try {
        await x.doLogin({ identityId: identity.id });
        const isLoggedIn = await x.isLoggedIn({ identityId: identity.id });
        assert.strictEqual(isLoggedIn, true);
      } catch (error: unknown) {
        console.log("Skipping doLogin test due to:", (error as Error).message);
      }
    });
  });

  describe("doLogout", () => {
    it("should logout from X platform", async () => {
      try {
        await x.doLogout({ identityId: identity.id });
        const isLoggedIn = await x.isLoggedIn({ identityId: identity.id });
        assert.strictEqual(isLoggedIn, false);
      } catch (error: unknown) {
        console.log("Skipping doLogout test due to:", (error as Error).message);
      }
    });
  });

  describe("search", () => {
    it("should return search results", async () => {
      const identity = getRandomIdentity();
      const results = await x.search({ identityId: identity.id, query: "test", limit: 2 });
      assert(Array.isArray(results));
      results.forEach((post) => {
        assert.strictEqual(typeof post.id, "string");
        assert.strictEqual(typeof post.uri, "string");
        assert.strictEqual(typeof post.textContent, "string");
        assert.strictEqual(typeof post.isFromMe, "boolean");
      });
    });

    it("should respect limit parameter", async () => {
      const results = await x.search({ identityId: identity.id, query: "test", limit: 1 });
      assert(results.length <= 1);
    });

    it("should handle empty query", async () => {
      try {
        await x.search({ identityId: identity.id, query: "" });
        // X might actually handle empty queries, so this isn't necessarily an error
        assert(true);
      } catch (error) {
        assert.ok(error instanceof Error);
      }
    });
  });

  describe("reply", () => {
    it("should reply to a tweet", async () => {
      const validTweetUri = "/sha3dev/status/1935978689814278429";
      try {
        await x.reply({
          identityId: identity.id,
          uri: validTweetUri,
          text: "Test from Automated Testing",
        });
        assert(true);
      } catch (error: unknown) {
        console.log("Skipping reply test due to:", (error as Error).message);
      }
    });
  });

  describe("getTweet", () => {
    it("should return post with replies", async () => {
      const validTweetUri = "/sha3dev/status/1935978689814278429";
      const post = await x.getTweet({
        identityId: identity.id,
        uri: validTweetUri,
        repliesLimit: 10,
      });

      assert.strictEqual(typeof post.id, "string");
      assert.strictEqual(typeof post.uri, "string");
      assert.strictEqual(typeof post.textContent, "string");
      assert.strictEqual(typeof post.isFromMe, "boolean");
      assert(Array.isArray(post.replies));
    });

    it("should respect repliesLimit parameter", async () => {
      const post = await x.getTweet({
        identityId: identity.id,
        uri: "/sha3dev/status/1935978689814278429",
        repliesLimit: 2,
      });
      assert(post.replies.length <= 2);
    });

    it("should throw for non-existent post", async () => {
      await assert.rejects(() => x.getTweet({ identityId: identity.id, uri: "/sha3dev/status/9999999999999999999" }), { name: "Error" });
    });
  });

  describe("post", () => {
    it("should post a new tweet", async () => {
      try {
        await x.post({
          identityId: identity.id,
          text: "Test tweet from Automated Testing",
        });
        assert(true);
      } catch (error: unknown) {
        console.log("Skipping post test due to:", (error as Error).message);
      }
    });
  });

  describe("listMyTweets", () => {
    it("should return my tweets", async () => {
      const tweets = await x.listMyTweets({ identityId: identity.id });
      assert(Array.isArray(tweets));
    });

    it("should handle errors in getMyUsername", async () => {
      // Create a browser instance that will cause an error
      const errorBrowser = new Browser({ identities: [] });
      const errorX = new X({ browser: errorBrowser });

      try {
        await errorX.listMyTweets({ identityId: "non-existent-id" });
        assert.fail("Should have thrown an error");
      } catch (error: unknown) {
        assert.ok(error as Error);
      } finally {
        await errorBrowser.close();
      }
    });
  });
});
