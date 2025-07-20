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

export type IsLoggedInOptions = {
  identityId: string;
};

export type DoLoginOptions = {
  identityId: string;
};

export type DoLogoutOptions = {
  identityId: string;
};

export type SearchOptions = {
  identityId: string;
  query: string;
  limit?: number;
};

export type PostData = {
  identityId: string;
  uri: string;
  id: string;
  isFromMe: boolean;
  textContent: string;
};

export type ReplyOptions = {
  identityId: string;
  uri: string;
  text: string;
};

export type GetPostOptions = {
  identityId: string;
  uri: string;
  repliesLimit?: number;
};

export type PostOptions = {
  identityId: string;
  text: string;
};

export type ListMyTweetsOptions = {
  identityId: string;
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

  private async getMyUsername(identityId: string, parentPage?: Page) {
    const userAvatarPrefix = "UserAvatar-Container-";
    const url = new URL("/home", BASE_URL);
    const page = parentPage || (await this.browser.open({ url: url.toString(), identityId }));
    try {
      const avatarContainer = await page.$(`[data-testid^='${userAvatarPrefix}']`);
      if (avatarContainer) {
        const dataTestId = await avatarContainer.evaluate((el) => el.getAttribute("data-testid"));
        if (dataTestId) {
          return dataTestId.replace(userAvatarPrefix, "");
        }
      }
      return false;
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

  private async getTweetsFromPage(identityId: string, page: Page, limit?: number) {
    let stop = false;
    let tweets: PostData[] = [];
    const myUsername = await this.checkLoggedIn(identityId, page);
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

  private async checkLoggedIn(identityId: string, page: Page) {
    const username = await this.getMyUsername(identityId, page);
    if (!username) {
      throw new Error(`User not logged in`);
    }
    return username;
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

  public async isLoggedIn(options: IsLoggedInOptions) {
    const { identityId } = options;
    let result: boolean;
    try {
      const myUsername = await this.getMyUsername(identityId);
      result = !!myUsername;
    } catch (error) {
      result = false;
    }
    return result;
  }

  public async doLogin(options: DoLoginOptions) {
    const { identityId } = options;
    const identity = this.browser.getIdentity(identityId);
    const xPlatform = identity.platforms?.find((p) => p.platform === "x");
    if (!xPlatform) {
      throw new Error(`X platform not found for identity ${identityId}`);
    }
    const url = `${BASE_URL}/i/flow/login`;
    const page = await this.browser.open({ url, identityId });
    try {
      await page.waitForSelector(`input[autocomplete='username']`);
      const inputUsername = await page.$(`input[autocomplete='username']`);
      if (!inputUsername) {
        throw new Error(`Input username with selector input[autocomplete='username'] not found`);
      }
      await inputUsername.click();
      await page.keyboard.type(xPlatform.username);
      const nextButton = await page.$(`[data-viewportview] button[type='button']:has(span):not([data-testid])`);
      if (!nextButton) {
        throw new Error(`Next button not found`);
      }
      await nextButton.click();
      const inputPasswordSelector = `input[type='password']`;
      await page.waitForSelector(inputPasswordSelector);
      const inputPassword = await page.$(inputPasswordSelector);
      if (!inputPassword) {
        throw new Error(`Input password not found`);
      }
      await inputPassword.click();
      await page.keyboard.type(xPlatform.password);
      const loginButtonSelector = `button[data-testid="LoginForm_Login_Button"]`;
      await page.waitForSelector(loginButtonSelector);
      const loginButton = await page.$(loginButtonSelector);
      if (!loginButton) {
        throw new Error(`Login button not found`);
      }
      await loginButton.click();
      await page.waitForNetworkIdle();
    } finally {
      await page.close();
    }
  }

  public async doLogout(options: DoLogoutOptions) {
    const { identityId } = options;
    const identity = this.browser.getIdentity(identityId);
    const xPlatform = identity.platforms?.find((p) => p.platform === "x");
    if (!xPlatform) {
      throw new Error(`X platform not found for identity ${identityId}`);
    }
    const url = `${BASE_URL}/logout`;
    const page = await this.browser.open({ url, identityId });
    try {
      await page.waitForNetworkIdle();
      const logoutButton = await page.$("button");
      if (!logoutButton) {
        throw new Error(`Logout button not found`);
      }
      await logoutButton.click();
      await page.waitForNetworkIdle();
    } finally {
      await page.close();
    }
  }

  public async search(options: SearchOptions) {
    const { identityId, query, limit } = options;
    const encodedQuery = encodeURIComponent(query);
    const url = `${BASE_URL}/search?q=${encodedQuery}`;
    const page = await this.browser.open({ url, identityId });
    try {
      await this.checkLoggedIn(identityId, page);
      const tweets = await this.getTweetsFromPage(identityId, page, limit);
      return tweets;
    } finally {
      await page.close();
    }
  }

  public async getTweet(options: GetPostOptions) {
    const { identityId, uri, repliesLimit } = options;
    const url = new URL(uri, BASE_URL);
    const page = await this.browser.open({ url: url.toString(), identityId });
    try {
      await this.checkLoggedIn(identityId, page);
      const posts = await this.getTweetsFromPage(identityId, page, repliesLimit);
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
    const { identityId, text } = options;
    const url = new URL("/home", BASE_URL);
    const page = await this.browser.open({ url: url.toString(), identityId });
    try {
      await this.checkLoggedIn(identityId, page);
      await this.postToX(page, text);
    } finally {
      await page.close();
    }
  }

  public async reply(options: ReplyOptions) {
    const { identityId, uri, text } = options;
    const url = new URL(uri, BASE_URL);
    const page = await this.browser.open({ url: url.toString(), identityId });
    try {
      await this.checkLoggedIn(identityId, page);
      await this.postToX(page, text);
    } finally {
      await page.close();
    }
  }

  public async listMyTweets(options: ListMyTweetsOptions) {
    const { identityId } = options;
    const myUsername = await this.getMyUsername(identityId);
    const url = new URL(`/${myUsername}`, BASE_URL);
    const page = await this.browser.open({ url: url.toString(), identityId });
    try {
      await this.checkLoggedIn(identityId, page);
      const tweets = await this.getTweetsFromPage(identityId, page);
      return tweets;
    } finally {
      await page.close();
    }
  }
}
