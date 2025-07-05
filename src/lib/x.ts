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
  isFromMe: boolean;
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

export type PostOptions = {
  text: string;
};

export type PostDetailData = PostData & {
  replies: PostData[];
};

/**
 * consts
 */

const BASE_URL = "https://x.com";

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

  private async getMyUsername(parentPage?: Page) {
    const userAvatarPrefix = "UserAvatar-Container-";
    const url = new URL("/home", BASE_URL);
    const page = parentPage || (await this.browser.open({ url: url.toString() }));
    try {
      const avatarContainer = await page.$(`[data-testid^='${userAvatarPrefix}']`);
      if (!avatarContainer) {
        throw new Error(`Avatar container with prefix ${userAvatarPrefix} not found`);
      }
      const dataTestId = await avatarContainer.evaluate((el) => el.getAttribute("data-testid"));
      if (!dataTestId) {
        throw new Error(`Avatar container with prefix ${userAvatarPrefix} not found`);
      }
      return dataTestId.replace(userAvatarPrefix, "");
    } finally {
      if (!parentPage) {
        await page.close();
      }
    }
  }

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
    const myUsername = await this.getMyUsername(page);
    do {
      const newArticlesHandles = await page.$$("article");
      let newResults = (await Promise.all(Array.from(newArticlesHandles).map(this.toTweetData))) as PostData[];
      newResults = newResults.filter((i) => i && !tweets.find((p) => p.id === i.id));
      tweets.push(...newResults.map((i) => ({ ...i, isFromMe: i.uri.includes(myUsername) })));
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

  private async postToX(page: Page, text: string) {
    await page.waitForNetworkIdle();
    const contentEditableSelector = "[contenteditable]";
    const postField = await page.$(contentEditableSelector);
    if (!postField) {
      throw new Error(`Post field with selector ${contentEditableSelector} not found`);
    }
    await postField.click();
    await page.keyboard.type(text);
    await page.waitForNetworkIdle();
    await setTimeout(WAIT_FOR_SEND_BUTTON_MS);
    const sendButtonSelector = `button[data-testid="tweetButtonInline"]:not([aria-disabled="true"])`;
    const sendButton = await page.$(sendButtonSelector);
    if (!sendButton) {
      throw new Error(`Send button with selector ${sendButtonSelector} not found`);
    }
    await sendButton.click();
    await page.waitForNetworkIdle();
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
    const url = new URL("/home", BASE_URL);
    const page = await this.browser.open({ url: url.toString() });
    try {
      const avatarContainer = await page.$("[data-testid^='UserAvatar-Container-']");
      return !!avatarContainer;
    } finally {
      await page.close();
    }
  }

  public async search(options: SearchOptions): Promise<PostData[]> {
    const { query, limit } = options;
    const encodedQuery = encodeURIComponent(query);
    const url = `${BASE_URL}/search?q=${encodedQuery}`;
    const page = await this.browser.open({ url });
    try {
      const tweets = await this.getTweetsFromPage(page, limit);
      return tweets;
    } finally {
      await page.close();
    }
  }

  public async getTweet(options: GetPostOptions) {
    const { uri, repliesLimit } = options;
    const url = new URL(uri, BASE_URL);
    const page = await this.browser.open({ url: url.toString() });
    try {
      const posts = await this.getTweetsFromPage(page, repliesLimit);
      const post = posts.find((p) => p.uri === uri);
      if (!post) {
        throw new Error(`post with URI ${uri} not found`);
      }
      return {
        ...post,
        replies: posts.filter((p) => p.uri !== uri),
      };
    } finally {
      await page.close();
    }
  }

  public async post(options: PostOptions) {
    const { text } = options;
    const url = new URL("/home", BASE_URL);
    const page = await this.browser.open({ url: url.toString() });
    try {
      await this.postToX(page, text);
    } finally {
      await page.close();
    }
  }

  public async reply(options: ReplyOptions) {
    const { uri, text } = options;
    const url = new URL(uri, BASE_URL);
    const page = await this.browser.open({ url: url.toString() });
    try {
      await this.postToX(page, text);
    } finally {
      await page.close();
    }
  }

  public async listMyTweets() {
    const myUsername = await this.getMyUsername();
    const url = new URL(`/${myUsername}`, BASE_URL);
    const page = await this.browser.open({ url: url.toString() });
    try {
      const tweets = await this.getTweetsFromPage(page);
      return tweets;
    } finally {
      await page.close();
    }
  }
}
