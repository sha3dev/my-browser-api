import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import Browser from "../../src/lib/browser";
import { createTestBrowser, cleanupBrowser, TEST_IDENTITY } from "./helpers/test-browser";

describe("Browser", () => {
  let browser: Browser;
  const TEST_URL = "https://example.com";

  before(async () => {
    browser = createTestBrowser();
  });

  after(async () => {
    await cleanupBrowser(browser);
  });

  it("should open a URL and return a page object", async () => {
    const page = await browser.open({ url: TEST_URL, identityId: TEST_IDENTITY.id });
    assert.ok(page);
    const title = await page.title();
    assert.ok(title);
    const url = page.url();
    assert.ok(url.includes("example.com"));
  });

  it("should handle invalid URLs", async () => {
    try {
      await browser.open({ url: "https://thisurldoesnotexist12345.com", identityId: TEST_IDENTITY.id });
      assert.fail("Should have thrown an error");
    } catch (error) {
      assert.ok(error instanceof Error);
    }
  });

  it("should create browser with identities", () => {
    const identities = [TEST_IDENTITY];
    const browserWithIdentities = new Browser({ identities });
    assert.deepEqual(browserWithIdentities.Identities, identities);
  });

  it("should throw error for invalid identity", () => {
    try {
      // @ts-ignore - intentionally passing invalid identity
      new Browser({ identities: [{ id: "missing-required-fields" }] });
      assert.fail("Should have thrown an error");
    } catch (error) {
      assert.ok(error instanceof Error);
      assert.ok((error as Error).message.includes("Invalid identity"));
    }
  });

  it("should throw error when identity not found", async () => {
    try {
      await browser.open({ url: TEST_URL, identityId: "non-existent-identity" });
      assert.fail("Should have thrown an error");
    } catch (error) {
      assert.ok(error instanceof Error);
      assert.ok((error as Error).message.includes("identity"));
      assert.ok((error as Error).message.includes("not found"));
    }
  });

  it("should track last used identity", async () => {
    const browserWithIdentity = new Browser({ identities: [TEST_IDENTITY] });
    assert.equal(browserWithIdentity.LastIdentity, null);
    await browserWithIdentity.open({ url: TEST_URL, identityId: TEST_IDENTITY.id });
    assert.deepEqual(browserWithIdentity.LastIdentity, TEST_IDENTITY);
    await browserWithIdentity.close();
  });
});
