/**
 * imports
 */

import { ElementHandle } from "puppeteer";

/**
 * imports (internals)
 */

import Browser from "./browser";

/**
 * types
 */

export type XOptions = {
  browser: Browser;
};

export type SearchOptions = {
  query: string;
  limit?: number;
};

export type SearchResult = {
  textContent: string;
  id: number;
};

export type ReplyOptions = {
  id: string;
  text: string;
};

/**
 * consts
 */

/**
 * class
 */

export default class X {
  /**
   * private: attributes
   */

  private browser: Browser;

  /**
   * private: methods
   */

  private async toSearchResult(article: ElementHandle<HTMLElement>) {
    const linkElement = await article.$("[href*='/status/']");
    const textContent = await article.evaluate((el) => el.textContent);
    const link = linkElement ? await linkElement.evaluate((el) => el.getAttribute("href")) : undefined;
    const id = link ? link.split("/").pop() : undefined;
    if (textContent && !Number.isNaN(Number(id))) {
      return { textContent, id: Number(id) };
    }
    return null;
  }

  /**
   * constructor
   */

  constructor(options: XOptions) {
    this.browser = options.browser;
  }

  /**
   * public
   */

  public async isLoggedIn() {
    const page = await this.browser.open({ url: "https://x.com" });
    const avatarContainer = await page.$("[data-testid^='UserAvatar-Container-']");
    await page.close();
    return !!avatarContainer;
  }

  public async search(options: SearchOptions): Promise<SearchResult[]> {
    const { query, limit } = options;
    const encodedQuery = encodeURIComponent(query);
    const url = `https://x.com/search?q=${encodedQuery}`;
    const page = await this.browser.open({ url });
    if (!page) {
      throw new Error(`error opening ${url}`);
    }
    const results: SearchResult[] = [];
    let stop = false;
    await page.waitForSelector("article");
    do {
      const newArticlesHandles = await page.$$("article");
      let newResults = (await Promise.all(Array.from(newArticlesHandles).map(this.toSearchResult))) as SearchResult[];
      newResults = newResults.filter((i) => i && !results.find((r) => r.id === i.id));
      results.push(...newResults);
      if (!limit || !newResults.length || limit < results.length) {
        stop = true;
      } else {
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.waitForNetworkIdle();
      }
    } while (!stop);
    await page.close();
    const result = limit ? results.slice(0, limit) : results;
    return result;
  }

  public async reply(options: ReplyOptions) {
    const { id, text } = options;
    const url = `https://x.com/i/status/${id}`;
    const page = await this.browser.open({ url });
    await page.waitForNetworkIdle();
    if (!page) {
      throw new Error(`error opening ${url}`);
    }
    const contentEditableSelector = "[contenteditable]";
    const replyField = await page.$(contentEditableSelector);
    if (!replyField) {
      throw new Error(`Reply field with selector ${contentEditableSelector} not found`);
    }

    await replyField.click();
    await page.keyboard.type(text);
    const sendButtonSelector = `button[data-testid="tweetButtonInline"]:not([aria-disabled="true"])`;
    const sendButton = await page.waitForSelector(sendButtonSelector);
    if (!sendButton) {
      throw new Error(`Send button with selector ${sendButtonSelector} not found`);
    }
    await sendButton.click();
    await page.waitForNetworkIdle();
    await page.close();
  }
}
