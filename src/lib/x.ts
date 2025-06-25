/**
 * imports
 */

import { ElementHandle, Page } from "puppeteer";
import { setTimeout } from "node:timers/promises";

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

export type PostData = {
  uri: string;
  id: string;
  textContent: string;
};

export type ReplyOptions = {
  uri: string;
  text: string;
};

export type GetPostOptions = {
  uri: string;
  repliesLimit?: number;
};

export type PostDetailData = PostData & {
  replies: PostData[];
};

/**
 * consts
 */

const WAIT_FOR_SEND_BUTTON_MS = 1000;

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

  private async toTweetData(article: ElementHandle<HTMLElement>) {
    const linkElement = await article.$("[href*='/status/']");
    const textContent = await article.evaluate((el) => el.textContent);
    const uri = linkElement ? await linkElement.evaluate((el) => el.getAttribute("href")) : undefined;
    const id = uri ? uri.split("/").pop() : undefined;
    if (textContent && uri && id && /^\d+$/.test(id)) {
      return { textContent, uri, id };
    }
    return null;
  }

  private async getTweetsFromPage(page: Page, limit?: number) {
    let stop = false;
    let tweets: PostData[] = [];
    do {
      const newArticlesHandles = await page.$$("article");
      let newResults = (await Promise.all(Array.from(newArticlesHandles).map(this.toTweetData))) as PostData[];
      newResults = newResults.filter((i) => i && !tweets.find((p) => p.id === i.id));
      tweets.push(...newResults);
      if (!limit || !newResults.length || limit < tweets.length) {
        stop = true;
      } else {
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.waitForNetworkIdle();
      }
    } while (!stop);
    const result = limit ? tweets.slice(0, limit) : tweets;
    return result;
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

  public async search(options: SearchOptions): Promise<PostData[]> {
    const { query, limit } = options;
    const encodedQuery = encodeURIComponent(query);
    const url = `https://x.com/search?q=${encodedQuery}`;
    const page = await this.browser.open({ url });
    if (!page) {
      throw new Error(`error opening ${url}`);
    }
    const tweets = await this.getTweetsFromPage(page, limit);
    await page.close();
    return tweets;
  }

  public async getTweet(options: GetPostOptions) {
    const { uri, repliesLimit } = options;
    const url = new URL(uri, "https://x.com");
    const page = await this.browser.open({ url: url.toString() });
    if (!page) {
      throw new Error(`error opening ${url}`);
    }
    const posts = await this.getTweetsFromPage(page, repliesLimit);
    await page.close();
    const post = posts.find((p) => p.uri === uri);
    if (!post) {
      throw new Error(`post with URI ${uri} not found`);
    }
    return {
      ...post,
      replies: posts.filter((p) => p.uri !== uri),
    };
  }

  public async reply(options: ReplyOptions) {
    const { uri, text } = options;
    const url = new URL(uri, "https://x.com");
    const page = await this.browser.open({ url: url.toString() });
    await page.waitForNetworkIdle();
    if (!page) {
      throw new Error(`error opening URI ${uri}`);
    }
    const contentEditableSelector = "[contenteditable]";
    const replyField = await page.$(contentEditableSelector);
    if (!replyField) {
      throw new Error(`Reply field with selector ${contentEditableSelector} not found`);
    }
    await replyField.click();
    await page.keyboard.type(text);
    await setTimeout(WAIT_FOR_SEND_BUTTON_MS);
    const sendButtonSelector = `button[data-testid="tweetButtonInline"]:not([aria-disabled="true"])`;
    const sendButton = await page.$(sendButtonSelector);
    if (!sendButton) {
      throw new Error(`Send button with selector ${sendButtonSelector} not found`);
    }
    await sendButton.click();
    await page.waitForNetworkIdle();
    await page.close();
  }
}
