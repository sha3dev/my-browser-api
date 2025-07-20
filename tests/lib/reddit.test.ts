import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import Reddit from "../../src/lib/reddit";
import Browser from "../../src/lib/browser";
import { createTestBrowser, cleanupBrowser } from "./helpers/test-browser";

describe("Reddit Platform", () => {
  let browser: Browser;
  let reddit: Reddit;

  before(async () => {
    browser = createTestBrowser();
    reddit = new Reddit({ browser });
  });

  after(async () => {
    await cleanupBrowser(browser);
  });

  describe("isLoggedIn", () => {
    it("should return a boolean", async () => {
      const result = await reddit.isLoggedIn();
      assert.strictEqual(typeof result, "boolean");
    });
  });

  describe("search", () => {
    it("should return search results", async () => {
      const results = await reddit.search({ query: "test", limit: 30 });
      assert(Array.isArray(results));
    });

    it("should respect limit parameter", async () => {
      const results = await reddit.search({ query: "test", limit: 1 });
      assert(results.length <= 1);
    });
  });

  describe("getPost", () => {
    it("should return post with replies", async () => {
      const post = await reddit.getPost({
        uri: "/r/WinStupidPrizes/comments/1l81nyb/acceleration_test_with_no_seatbelt/",
      });
      assert.strictEqual(typeof post.id, "string");
      assert(Array.isArray(post.replies));
    });

    it("should throw for non-existent post", async () => {
      await assert.rejects(
        () =>
          reddit.getPost({
            uri: "/r/test/comments/999999999/nonexistent",
          }),
        { name: "Error" },
      );
    });
  });

  describe("post", () => {
    it("should post a new submission", async () => {
      await reddit.post({
        title: "Test",
        text: "Test post from Hype Bot",
        type: "text",
        subreddit: "r/Test_Posts",
      });
      assert(true);
    });
  });

  describe("reply", () => {
    it("should reply to a post", async () => {
      await reddit.reply({
        subreddit: "r/Test_Posts",
        post_id: "1lwwilg",
        text: "Test reply from Hype Bot",
      });
      assert(true);
    });
    it("should handle non-existent post", async () => {
      await assert.rejects(() => reddit.reply({ subreddit: "r/Test_Posts", post_id: "999999999", text: "Test" }), { name: "Error" });
    });
  });

  describe("listMyPosts", () => {
    it("should return my posts", async () => {
      const posts = await reddit.listMyPosts();
      assert(Array.isArray(posts));
      assert(posts.length > 0);
      assert.strictEqual(typeof posts[0].textContent, "string");
      assert.strictEqual(typeof posts[0].uri, "string");
      assert.strictEqual(typeof posts[0].id, "string");
    });
  });
});
