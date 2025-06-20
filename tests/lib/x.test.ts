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
        id: "1935978689814278429",
        text: "Test from Hype Bot",
      });
      assert(true);
    });

    it("should handle non-existent tweet", async () => {
      await assert.rejects(() => x.reply({ id: "9999999999999999999n", text: "Test" }), { name: "Error" });
    });
  });
});
