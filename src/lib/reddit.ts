/**
 * imports
 */

import { ElementHandle, Page } from "puppeteer";

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
  subReddit: {
    name: string;
    id: string;
  };
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
  textContent: string;
  replies: PostData[];
};

/**
 * consts
 */

const BASE_URL = "https://reddit.com";

const WAIT_FOR_SEND_BUTTON_MS = 1000;

const WAIT_FOR_NETWORK_IDLE_MS = 2 * 1000;

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

  private async toPostData(article: ElementHandle<HTMLElement>) {
    const postTitle = await article.$("[data-testid='post-title']");
    if (!postTitle) {
      throw new Error(`Post title not found`);
    }
    const postTitleHref = await postTitle.evaluate((el) => el.getAttribute("href"));
    if (!postTitleHref) {
      throw new Error(`Post title href not found`);
    }
    const facePlateTrackingContext = await article.$("[data-faceplate-tracking-context]");
    if (!facePlateTrackingContext) {
      throw new Error(`Faceplate tracking context not found`);
    }
    const dataFaceplateTrackingContext = await facePlateTrackingContext.evaluate((el) => el.getAttribute("data-faceplate-tracking-context"));
    if (!dataFaceplateTrackingContext) {
      throw new Error(`Faceplate tracking context not found`);
    }
    try {
      const dataFaceplateTrackingContextJson = JSON.parse(dataFaceplateTrackingContext);
      const id = dataFaceplateTrackingContextJson.post.id;
      const uri = postTitleHref;
      const title = dataFaceplateTrackingContextJson.post.title;
      const subReddit = { name: dataFaceplateTrackingContextJson.subreddit.name, id: dataFaceplateTrackingContextJson.subreddit.id };
      return { id, uri, title, subReddit };
    } catch (error) {
      throw new Error(`Faceplate tracking context not found`);
    }
  }

  private async getPostsFromPage(page: Page, limit?: number) {
    let stop = false;
    let posts: PostData[] = [];
    do {
      const newArticlesHandles = await page.$$("div[data-testid='search-post-unit']");
      let newResults = (await Promise.all(Array.from(newArticlesHandles).map(this.toPostData))) as PostData[];
      newResults = newResults.filter((i) => i && !posts.find((p) => p.id === i.id));
      posts.push(...newResults.map((i) => ({ ...i })));
      if (!limit || !newResults.length || limit < posts.length) {
        stop = true;
      } else {
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await new Promise((f) => setTimeout(f, WAIT_FOR_NETWORK_IDLE_MS));
      }
    } while (!stop);
    const result = limit ? posts.slice(0, limit) : posts;
    return result;
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
    const url = `${BASE_URL}/search?q=${encodedQuery}`;
    const overrideWaitNetworkIdleTimeout = WAIT_FOR_NETWORK_IDLE_MS;
    const page = await this.browser.open({ url, overrideWaitNetworkIdleTimeout });
    try {
      const posts = await this.getPostsFromPage(page, limit);
      return posts;
    } finally {
      await page.close();
    }
  }

  public async getPost(options: GetPostOptions) {
    const { uri, repliesLimit } = options;
    const url = new URL(uri, BASE_URL);
    const page = await this.browser.open({ url: url.toString() });
    try {
      const posts = await this.getPostsFromPage(page, repliesLimit);
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
      await this.postToReddit(page, text);
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
