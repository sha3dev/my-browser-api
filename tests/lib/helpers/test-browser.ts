/**
 * imports: external
 */
import Browser from "../../../src/lib/browser";
import { Identity } from "../../../src/lib/browser/identity.schema";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Browser initialization
 */

export function createTestBrowser(): Browser {
  const identities = readFileSync(join(__dirname, "../../../config/identities.json"), "utf-8");
  return new Browser({ identities: JSON.parse(identities) as Identity[] });
}

export function getRandomIdentity(): Identity {
  const identities = readFileSync(join(__dirname, "../../../config/identities.json"), "utf-8");
  const identitiesArray = JSON.parse(identities) as Identity[];
  return identitiesArray[Math.floor(Math.random() * identitiesArray.length)];
}

/**
 * Browser cleanup
 */

export async function cleanupBrowser(browser: Browser): Promise<void> {
  if (browser) {
    await browser.close();
  }
}
