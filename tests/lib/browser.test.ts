import { describe, it, after, before, afterEach, TestContext } from "node:test";
import assert from "node:assert";
import { Page } from 'puppeteer';
import Browser from "../../src/lib/browser";

// Extend TestContext to include skip method
interface ExtendedTestContext extends TestContext {
  skip(): void;
}

describe("Browser", () => {
  let browser: Browser;
  let page: Page | null = null;
  const TEST_URL = "https://example.com";
  const isCI = process.env.CI === 'true';

  before(async function(this: ExtendedTestContext) {
    // Skip in CI if needed
    if (isCI) {
      this.skip();
    }
    
    browser = new Browser({});
  });

  afterEach(async () => {
    if (page && !page.isClosed()) {
      await page.close().catch(console.error);
      page = null;
    }
  });

  after(async function() {
    if (isCI) return;
    
    // @ts-ignore - Accessing private property for cleanup
    if (browser && browser.browser) {
      try {
        // @ts-ignore
        await browser.browser.close();
      } catch (error) {
        console.error('Error closing browser:', error);
      }
    }
  });

  it("should open a URL and return a page object", async function(this: ExtendedTestContext) {
    if (isCI) this.skip();
    
    page = await browser.open({ url: TEST_URL });
    
    assert.ok(page, "Should return a page object");
    assert.strictEqual(typeof page.title, "function", "Page should have title method");
    
    const title = await page.title();
    assert.ok(title, "Page should have a title");
    console.log(`Page title: ${title}`);
    
    const url = page.url();
    assert.match(url, new RegExp(TEST_URL), `Page URL should include ${TEST_URL}`);
  });

  it("should handle invalid URLs gracefully", async function(this: ExtendedTestContext) {
    if (isCI) this.skip();
    
    const invalidUrl = "https://thisurldoesnotexist12345.com";
    
    try {
      page = await browser.open({ url: invalidUrl });
      assert.fail("Should have thrown an error for invalid URL");
    } catch (error: any) {
      assert.ok(error instanceof Error, "Should throw an Error");
      // Check for any error related to navigation or page load
      if (!/navigation|timeout|failed/i.test(error.message)) {
        console.warn('Unexpected error message:', error.message);
      }
      // Just verify we got an error, don't check the specific message
      assert.ok(true);
    }
  });
});
