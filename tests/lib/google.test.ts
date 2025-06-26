import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import Google from "../../src/lib/google";
import Browser from "../../src/lib/browser";

describe("Google", () => {
  let browser: Browser;
  let google: Google;

  before(async () => {
    browser = new Browser({});
    google = new Google({ browser });
  });

  describe("search", () => {
    it("should return search results", async () => {
      const results = await google.search({
        query: "test",
        limit: 2,
      });
      assert(Array.isArray(results));
    });

    it("should respect limit parameter", async () => {
      const results = await google.search({
        query: "test",
        limit: 1,
      });
      assert(results.length <= 1);
    });
  });
});
