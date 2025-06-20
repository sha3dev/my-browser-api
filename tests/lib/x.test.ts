import { describe, it, before, after, mock } from "node:test";
import assert from "node:assert/strict";
import X from "../../src/lib/x";
import Browser from "../../src/lib/browser";

describe("X Platform", () => {
  let browser: Browser;
  let x: X;

  before(async () => {
    // Initialize the real browser
    browser = new Browser({
      // Use default options for testing
    });

    // Initialize X platform with the real browser
    x = new X({ browser });
  });

  after(async () => {
    // No need to explicitly close the browser as it's handled by the test runner
    // The browser instance will be garbage collected
  });

  describe("isLoggedIn", () => {
    it("should return a boolean indicating login status", async () => {
      // This is a real test that will check the actual login status
      // Note: The result depends on whether the browser has an active session
      const result = await x.isLoggedIn();

      // Just verify we got a boolean back
      assert.equal(typeof result, "boolean");
    });
  });

  describe("search", () => {
    it("should perform a search and return articles", async () => {
      const query = "test";

      try {
        // This will perform a real search
        await x.search({ query, limit: 2 });

        // If we get here, the search completed without errors
        assert.ok(true, "Search completed successfully");
      } catch (error) {
        // If the test fails, provide a helpful error message
        assert.fail(`Search failed with error: ${error}`);
      }
    });

    it("should respect the limit parameter", async () => {
      const query = "test";
      const limit = 1;

      try {
        // This will perform a real search with a limit of 1
        const results = await x.search({ query, limit });

        // Verify we got results and the count is correct
        assert.ok(Array.isArray(results), "Should return an array of results");
        assert.ok(results.length <= limit, `Should return at most ${limit} results`);

        // Verify the structure of the results
        if (results.length > 0) {
          const result = results[0];
          assert.ok("textContent" in result, "Result should have textContent");
          assert.ok("link" in result, "Result should have link");
        }
      } catch (error) {
        // If the test fails, provide a helpful error message
        assert.fail(`Search with limit failed with error: ${error}`);
      }
    });

    it("should handle pagination with a limit of 30 tweets", async function () {
      const query = "test";
      const limit = 30;
      try {
        // This will perform a real search with a limit of 30
        const results = await x.search({ query, limit });

        // Verify we got results and the count is correct
        assert.ok(Array.isArray(results), "Should return an array of results");

        // We might not get exactly 30 results, but should get multiple pages worth
        assert.ok(results.length > 10, "Should return multiple pages of results");
        assert.ok(results.length <= limit, `Should return at most ${limit} results`);

        // Verify the structure of the results
        if (results.length > 0) {
          const result = results[0];
          assert.ok("textContent" in result, "Result should have textContent");
          assert.ok("link" in result, "Result should have link");

          // Log some debug info
          console.log(`Found ${results.length} results`);
          console.log("First result:", {
            textLength: result.textContent?.length,
            link: result.link,
          });
        }
      } catch (error) {
        // If the test fails, provide a helpful error message
        assert.fail(`Search with pagination failed with error: ${error}`);
      }
    });
  });

  describe("reply", () => {
    it("should reply to a tweet with the given text", async function () {
      // Skip in CI environments where we might not have a real browser
      if (process.env.CI) {
        this.skip();
      }

      const tweetId = "1935978689814278429";
      const replyText = "Test from Hype Bot";

      try {
        // This will attempt to reply to a real tweet
        await x.reply({
          id: tweetId,
          text: replyText,
        });

        // If we get here, the reply was attempted without errors
        assert.ok(true, "Reply was attempted successfully");
      } catch (error) {
        // If the test fails, provide a helpful error message
        assert.fail(`Reply failed with error: ${error}`);
      }
    });

    it("should throw an error for non-existent tweet", async function () {
      // Skip in CI environments where we might not have a real browser
      if (process.env.CI) {
        this.skip();
      }

      const nonExistentTweetId = "9999999999999999999n"; // Very high ID that likely doesn't exist
      const replyText = "Test";

      await assert.rejects(
        async () => {
          await x.reply({
            id: nonExistentTweetId,
            text: replyText,
          });
        },
        Error,
        "Should throw an error for non-existent tweet",
      );
    });
  });
});
