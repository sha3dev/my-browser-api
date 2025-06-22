import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import X from "../../src/lib/x";
import Browser from "../../src/lib/browser";

describe("X Platform", () => {
  let browser: Browser;
  let x: X;

  before(async () => {
    browser = new Browser({});
    x = new X({ browser });
  });

  describe("isLoggedIn", () => {
    it("should return a boolean", async () => {
      const result = await x.isLoggedIn();
      assert.strictEqual(typeof result, "boolean");
    });
  });

  describe("search", () => {
    it("should return search results", async () => {
      const results = await x.search({ query: "test", limit: 2 });
      assert(Array.isArray(results));
    });

    it("should respect limit parameter", async () => {
      const results = await x.search({ query: "test", limit: 1 });
      assert(results.length <= 1);
    });
  });

  describe("reply", () => {
    it("should reply to a tweet", async () => {
      await x.reply({
        uri: "/sha3dev/status/1935978689814278429",
        text: "Test from Hype Bot",
      });
      assert(true);
    });

    it("should handle non-existent tweet", async () => {
      await assert.rejects(() => x.reply({ uri: "/sha3dev/status/9999999999999999999n", text: "Test" }), { name: "Error" });
    });
  });

  describe("getPost", () => {
    it("should return post with replies", async () => {
      const post = await x.getTweet({
        uri: "/sha3dev/status/1935978689814278429",
        repliesLimit: 10,
      });

      assert.strictEqual(typeof post.id, "string");
      assert.strictEqual(typeof post.textContent, "string");
      assert(Array.isArray(post.replies));
    });

    it("should throw for non-existent post", async () => {
      await assert.rejects(() => x.getTweet({ uri: "/sha3dev/status/9999999999999999999" }), { name: "Error" });
    });
  });
});
