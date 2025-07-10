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

export type RedditOptions = {
  browser: Browser;
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
  uri: string;
  text: string;
};

export type BasePostOptions = {
  title: string;
  subreddit?: string;
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

  private async getMyUsername(parentPage?: Page) {
    const avatarLinkSelector = "nav a[href^='/user/'][href$='/communities']";
    const url = new URL("/", BASE_URL);
    const overrideWaitNetworkIdleTimeout = WAIT_FOR_NETWORK_IDLE_MS;
    const page = parentPage || (await this.browser.open({ url: url.toString(), overrideWaitNetworkIdleTimeout }));
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

  private async postToReddit(page: Page, text: string) {
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

  constructor(options: RedditOptions) {
    this.browser = options.browser;
  }

  /**
   * public
   */

  public async isLoggedIn() {
    const myUsername = await this.getMyUsername();
    return !!myUsername;
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
    let url: URL;
    const { type, title, subreddit } = options;
    if (subreddit) {
      url = new URL(`/r/${subreddit}/submit/?type=${type.toUpperCase()}`, BASE_URL);
    } else {
      const myUsername = await this.getMyUsername();
      url = new URL(`/user/${myUsername}/submit/?type=${type.toUpperCase()}`, BASE_URL);
    }
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
    const { uri, text } = options;
    const url = new URL(uri, BASE_URL);
    const page = await this.browser.open({ url: url.toString() });
    try {
      await this.postToReddit(page, text);
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
