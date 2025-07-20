/**
 * imports
 */

import { Page } from "puppeteer";
import { setTimeout } from "node:timers/promises";

/**
 * imports (internals)
 */

import Browser from "./browser";

/**
 * types
 */

export type RedditOptions = {
  browser: Browser;
};

export type IsLoggedInOptions = {
  identityId: string;
};

export type DoLoginOptions = {
  identityId: string;
};

export type SearchOptions = {
  query: string;
  limit?: number;
};

export type PostData = {
  uri: string;
  id: string;
  title: string;
  author: string;
  sub_reddit: {
    name: string;
    id: string;
  };
};

export type GetPostOptions = {
  uri: string;
};

export type ReplyOptions = {
  subreddit: string;
  post_id: string;
  text: string;
};

export type BasePostOptions = {
  title: string;
  subreddit: string;
};

export type PostOptions = BasePostOptions &
  (
    | {
        title: string;
        text: string;
        type: "text";
      }
    | {
        title: string;
        url: string;
        type: "link";
      }
  );

export type PostDetailData = PostData & {
  text: string;
  replies: { uri: string; id: string; text: string; author: string }[];
};

/**
 * consts
 */

const BASE_URL = "https://reddit.com";

const WAIT_FOR_SEND_BUTTON_MS = 1000;

const WAIT_FOR_NETWORK_IDLE_MS = 2 * 1000;

const DEFAULT_SEARCH_LIMIT = 20;

/**
 * class
 */

export default class Reddit {
  /**
   * private: attributes
   */

  private browser: Browser;

  /**
   * private: methods
   */

  private async getMyUsername(identityId: string, parentPage?: Page) {
    const avatarLinkSelector = "nav a[href^='/user/'][href$='/communities']";
    const url = new URL("/", BASE_URL);
    const overrideWaitNetworkIdleTimeout = WAIT_FOR_NETWORK_IDLE_MS;
    const page = parentPage || (await this.browser.open({ url: url.toString(), overrideWaitNetworkIdleTimeout, identityId }));
    try {
      const avatarLink = await page.$(avatarLinkSelector);
      if (!avatarLink) {
        return null;
      }
      const dataTestId = await avatarLink.evaluate((el) => el.getAttribute("href"));
      if (!dataTestId) {
        return null;
      }
      return dataTestId.replace("/user/", "").replace("/communities", "");
    } finally {
      if (!parentPage) {
        await page.close();
      }
    }
  }

  /**
   * constructor
   */

  constructor(options: RedditOptions) {
    this.browser = options.browser;
  }

  /**
   * public
   */

  public async isLoggedIn(options: IsLoggedInOptions) {
    const { identityId } = options;
    const myUsername = await this.getMyUsername(identityId);
    return !!myUsername;
  }

  public async doLogin(options: DoLoginOptions) {
    const { identityId } = options;
    const identity = this.browser.getIdentity(identityId);
    const redditPlatform = identity.platforms?.find((p) => p.platform === "reddit");
    if (!redditPlatform) {
      throw new Error(`Reddit platform not found for identity ${identityId}`);
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

  public async search(options: SearchOptions): Promise<PostData[]> {
    const { query, limit } = options;
    const encodedQuery = encodeURIComponent(query);
    const url = `${BASE_URL}/search.json?q=${encodedQuery}&t=all&limit=${limit || DEFAULT_SEARCH_LIMIT}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Search failed with status ${response.status}`);
    }
    const data = await response.json();
    return data.data.children.map((post: any) => ({
      uri: post.data.permalink,
      id: post.data.id,
      title: post.data.title,
      author: post.data.author,
      sub_reddit: {
        name: post.data.subreddit,
        id: post.data.subreddit_id,
      },
    })) as PostData[];
  }

  public async getPost(options: GetPostOptions) {
    const { uri } = options;
    const url = `${BASE_URL}${uri}.json`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`get post failed with status ${response.status}`);
    }
    const data = await response.json();
    const postData = data[0].data.children[0].data;
    const repliesData = data[1].data.children;
    return {
      uri: postData.permalink,
      id: postData.id,
      title: postData.title,
      author: postData.author,
      sub_reddit: {
        name: postData.subreddit,
        id: postData.subreddit_id,
      },
      text: postData.selftext,
      replies: repliesData.map((reply: any) => ({
        uri: reply.data.permalink,
        id: reply.data.id,
        text: reply.data.body,
        author: reply.data.author,
      })),
    } as PostDetailData;
  }

  public async post(options: PostOptions) {
    const { type, title, subreddit } = options;
    const url = new URL(`/${subreddit}/submit/?type=${type.toUpperCase()}`, BASE_URL);
    const overrideWaitNetworkIdleTimeout = WAIT_FOR_NETWORK_IDLE_MS;
    const page = await this.browser.open({ url: url.toString(), overrideWaitNetworkIdleTimeout });
    try {
      const faceplateTextarea = await page.$('faceplate-textarea-input[name="title"]');
      if (!faceplateTextarea) {
        throw new Error("title faceplate textarea not found");
      }
      // set title
      await page.evaluate((faceplateTextarea: any) => {
        faceplateTextarea.shadowRoot.querySelector('textarea[name="title"]').focus();
      }, faceplateTextarea);
      await page.keyboard.type(title);
      if (type === "text") {
        // set text
        const { text } = options;
        const shredditComposer = await page.$("shreddit-composer [contenteditable]");
        if (!shredditComposer) {
          throw new Error("shreddit composer not found");
        }
        await page.evaluate((shredditComposer: any) => {
          shredditComposer.focus();
          shredditComposer.click();
        }, shredditComposer);
        await page.keyboard.type(text);
      }
      await setTimeout(WAIT_FOR_SEND_BUTTON_MS);
      const sendButton = await page.$("r-post-form-submit-button[post-action-type='submit']");
      if (!sendButton) {
        throw new Error("send button not found");
      }
      await sendButton.click();
      await page.waitForNetworkIdle();
    } finally {
      await page.close();
    }
  }

  public async reply(options: ReplyOptions) {
    const { subreddit, post_id, text } = options;
    const url = new URL(`/${subreddit}/comments/${post_id}`, BASE_URL);
    const overrideWaitNetworkIdleTimeout = WAIT_FOR_NETWORK_IDLE_MS;
    const page = await this.browser.open({ url: url.toString(), overrideWaitNetworkIdleTimeout });
    try {
      const commentComposer = await page.$("comment-composer-host");
      if (!commentComposer) {
        throw new Error("title faceplate textarea not found");
      }
      await commentComposer.click();
      await page.evaluate((commentComposer: any) => {
        commentComposer.querySelector("[contenteditable='true']").click();
      }, commentComposer);
      await page.keyboard.type(text);
      await setTimeout(WAIT_FOR_SEND_BUTTON_MS);
      const commentButton = await page.$("shreddit-composer .button-primary");
      if (!commentButton) {
        throw new Error("comment button not found");
      }
      await commentButton.click();
      await page.waitForNetworkIdle();
    } finally {
      await page.close();
    }
  }

  public async listMyPosts() {
    const myUsername = await this.getMyUsername();
    const url = new URL(`/${myUsername}`, BASE_URL);
    const page = await this.browser.open({ url: url.toString() });
    try {
      const posts = await this.getPostsFromPage(page);
      return posts;
    } finally {
      await page.close();
    }
  }
}
