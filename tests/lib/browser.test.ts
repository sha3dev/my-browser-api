import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import Browser from "../../src/lib/browser";

describe("Browser", () => {
  let browser: Browser;
  const TEST_URL = "https://example.com";

  before(async () => {
    browser = new Browser({});
  });

  it("should open a URL and return a page object", async () => {
    const page = await browser.open({ url: TEST_URL });
    assert.ok(page);

    const title = await page.title();
    assert.ok(title);

    const url = page.url();
    assert.ok(url.includes("example.com"));
  });

  it("should handle invalid URLs", async () => {
    try {
      await browser.open({ url: "https://thisurldoesnotexist12345.com" });
      assert.fail("Should have thrown an error");
    } catch (error) {
      assert.ok(error instanceof Error);
    }
  });
});
