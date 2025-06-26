/**
 * imports
 */

import { Page } from "puppeteer";

/**
 * imports (internals)
 */

import Browser from "./browser";

/**
 * types
 */

export type GoogleOptions = {
  browser: Browser;
};

export type SearchOptions = {
  query: string;
  limit?: number;
};

export type SearchResult = {
  title: string;
  url: string;
  description: string;
};

/**
 * consts
 */

const BASE_URL = "https://www.google.com";

/**
 * class
 */

export default class Google {
  /**
   * private: attributes
   */

  private browser: Browser;

  /**
   * private: methods
   */

  private async extractSearchResults(page: Page, limit?: number): Promise<SearchResult[]> {
    await page.waitForSelector("div[data-sokoban-container]", { timeout: 10000 });
    const results: SearchResult[] = [];
    const resultHandles = await page.$$("div.g");
    for (const handle of resultHandles) {
      try {
        // Skip elements that don't contain search results
        const isSearchResult = await handle.evaluate((el) => {
          // Check if it's a main search result (not "People also ask", "Related searches", etc.)
          return el.querySelector("h3") && el.querySelector("a[href]");
        });
        if (!isSearchResult) continue;
        const result = await handle.evaluate((el) => {
          const titleElement = el.querySelector("h3");
          const linkElement = el.querySelector("a[href]");
          const snippetElement = el.querySelector('[data-sncf="1"]') || el.querySelector(".VwiC3b") || el.querySelector(".aCOpRe");
          if (!titleElement || !linkElement) return null;
          return {
            title: titleElement.textContent?.trim() || "",
            url: linkElement.getAttribute("href") || "",
            description: snippetElement?.textContent?.trim() || "",
          };
        });
        if (result && result.url && !result.url.startsWith("http://webcache.googleusercontent.com")) {
          results.push(result);
          if (limit && results.length >= limit) break;
        }
      } catch (error) {
        console.error("Error extracting search result:", error);
      }
    }
    return results;
  }

  /**
   * constructor
   */

  constructor(options: GoogleOptions) {
    this.browser = options.browser;
  }

  /**
   * public
   */

  public async search(options: SearchOptions): Promise<SearchResult[]> {
    const { query, limit } = options;
    const encodedQuery = encodeURIComponent(query);
    const url = `${BASE_URL}/search?q=${encodedQuery}`;
    const page = await this.browser.open({ url });
    if (!page) {
      throw new Error(`Error opening ${url}`);
    }
    try {
      const results = await this.extractSearchResults(page, limit);
      return results;
    } finally {
      await page.close();
    }
  }
}
