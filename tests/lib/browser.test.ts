import { describe, it, after, before, afterEach } from "node:test";
import assert from "node:assert";
import { Page } from 'puppeteer';
import Browser from "../../src/lib/browser";

describe("Browser", () => {
  let browser: Browser;
  let page: Page | null = null;
  const TEST_URL = "https://example.com";

  before(async () => {
    browser = new Browser({});
  });

  afterEach(async () => {
    if (page && !page.isClosed()) {
      await page.close().catch(console.error);
      page = null;
    }
  });

  after(async () => {
    // @ts-ignore - Accessing private property for cleanup
    if (browser && browser.browser) {
      // @ts-ignore
      await browser.browser.close().catch(console.error);
    }
  });

  it("should open a URL and return a page object", async () => {
    page = await browser.open({ url: TEST_URL });
    
    assert.ok(page, "Should return a page object");
    assert.strictEqual(typeof page.title, "function", "Page should have title method");
    
    const title = await page.title();
    assert.ok(title, "Page should have a title");
    console.log(`Page title: ${title}`);
    
    const url = page.url();
    assert.match(url, new RegExp(TEST_URL), `Page URL should include ${TEST_URL}`);
  });

  it("should handle invalid URLs gracefully", async () => {
    const invalidUrl = "https://thisurldoesnotexist12345.com";
    
    try {
      page = await browser.open({ url: invalidUrl });
      assert.fail("Should have thrown an error for invalid URL");
    } catch (error) {
      assert.ok(error instanceof Error, "Should throw an Error");
      assert.match(
        error.message,
        /error opening/i,
        "Error message should indicate URL opening failure"
      );
    }
  });
});
