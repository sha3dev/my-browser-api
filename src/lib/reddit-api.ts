/**
 * imports
 */

/**
 * types
 */

export type RedditOptions = {
  clientId: string;
  clientSecret: string;
  username?: string;
  password?: string;
  userAgent: string;
  refreshToken?: string;
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

const BASE_URL = "https://oauth.reddit.com";
const AUTH_URL = "https://www.reddit.com/api/v1/access_token";

/**
 * class
 */

export default class Reddit {
  /**
   * private: attributes
   */
  private clientId: string;
  private clientSecret: string;
  private username?: string;
  private password?: string;
  private userAgent: string;
  private refreshToken?: string;
  private accessToken: string | undefined = undefined;
  private tokenExpiration: number = 0;

  /**
   * private: methods
   */

  private async getAccessToken(): Promise<string> {
    // Check if we have a valid token
    if (this.accessToken && Date.now() < this.tokenExpiration) {
      return this.accessToken;
    }

    try {
      let formData: URLSearchParams;
      const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
      
      if (this.refreshToken) {
        // Use refresh token if available
        formData = new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: this.refreshToken
        });
      } else if (this.username && this.password) {
        // Use password flow if credentials are available
        formData = new URLSearchParams({
          grant_type: 'password',
          username: this.username,
          password: this.password
        });
      } else {
        throw new Error('Authentication failed: No refresh token or username/password provided');
      }

      const response = await fetch(AUTH_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': this.userAgent
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Authentication failed with status ${response.status}`);
      }

      const data = await response.json();
      this.accessToken = data.access_token;
      // Set expiration time (subtract 60 seconds for safety)
      this.tokenExpiration = Date.now() + (data.expires_in * 1000) - 60000;
      
      // Update refresh token if provided
      if (data.refresh_token && typeof data.refresh_token === 'string') {
        this.refreshToken = data.refresh_token;
      }

      return this.accessToken;
    } catch (error) {
      console.error('Error getting access token:', error);
      throw new Error('Failed to authenticate with Reddit API');
    }
  }

  private async apiRequest(method: string, endpoint: string, options?: { params?: Record<string, any>; body?: any }): Promise<any> {
    try {
      const token = await this.getAccessToken();
      const url = new URL(`${BASE_URL}${endpoint}`);
      
      // Add query parameters if provided
      if (options?.params) {
        Object.entries(options.params).forEach(([key, value]) => {
          if (value !== undefined) {
            url.searchParams.append(key, String(value));
          }
        });
      }
      
      const fetchOptions: RequestInit = {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'User-Agent': this.userAgent
        }
      };
      
      // Add body if provided and not a GET request
      if (options?.body && method.toUpperCase() !== 'GET') {
        fetchOptions.body = JSON.stringify(options.body);
      }
      
      const response = await fetch(url, fetchOptions);
      
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }
      
      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }
      
      return await response.text();
    } catch (error) {
      console.error(`Error making API request to ${endpoint}:`, error);
      throw new Error(`Reddit API request failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private extractPostData(post: any): PostData {
    const data = post.data || post;
    return {
      uri: `/r/${data.subreddit}/comments/${data.id}/${data.title ? encodeURIComponent(data.title.replace(/\s+/g, '_')) : ''}`,
      id: data.id,
      title: data.title,
      subReddit: {
        name: data.subreddit,
        id: data.subreddit_id
      }
    };
  }

  /**
   * constructor
   */
  constructor(options: RedditOptions) {
    this.clientId = options.clientId;
    this.clientSecret = options.clientSecret;
    this.username = options.username;
    this.password = options.password;
    this.userAgent = options.userAgent;
    this.refreshToken = options.refreshToken;
  }

  /**
   * public
   */

  public async isLoggedIn(): Promise<boolean> {
    try {
      // Try to get user identity to check if we're logged in
      const response = await this.apiRequest('GET', '/api/v1/me');
      return !!response.name;
    } catch (error) {
      return false;
    }
  }

  public async search(options: SearchOptions): Promise<PostData[]> {
    const { query, limit = 25 } = options;
    
    const response = await this.apiRequest('GET', '/search', {
      params: {
        q: query,
        limit,
        sort: 'relevance',
        type: 'link'
      }
    });

    if (!response.data || !response.data.children) {
      return [];
    }

    return response.data.children
      .filter((post: any) => post.kind === 't3')
      .map((post: any) => this.extractPostData(post));
  }

  public async getPost(options: GetPostOptions): Promise<PostDetailData> {
    const { uri, repliesLimit = 25 } = options;
    
    // Extract post ID from URI
    const postIdMatch = uri.match(/\/comments\/([^\/]+)/);
    if (!postIdMatch) {
      throw new Error(`Invalid post URI: ${uri}`);
    }
    
    const postId = postIdMatch[1];
    const response = await this.apiRequest('GET', `/comments/${postId}`, {
      params: {
        limit: repliesLimit,
        depth: 1
      }
    });

    if (!response[0] || !response[0].data || !response[0].data.children || !response[0].data.children[0]) {
      throw new Error(`Post with ID ${postId} not found`);
    }

    const postData = this.extractPostData(response[0].data.children[0]);
    const textContent = response[0].data.children[0].data.selftext || '';
    
    // Extract replies
    const replies: PostData[] = [];
    if (response[1] && response[1].data && response[1].data.children) {
      for (const reply of response[1].data.children) {
        if (reply.kind === 't1' && reply.data) {
          replies.push({
            uri: `/r/${reply.data.subreddit}/comments/${postId}/_/${reply.data.id}`,
            id: reply.data.id,
            title: reply.data.body.substring(0, 50) + (reply.data.body.length > 50 ? '...' : ''),
            subReddit: {
              name: reply.data.subreddit,
              id: reply.data.subreddit_id
            }
          });
        }
      }
    }

    return {
      ...postData,
      textContent,
      replies
    };
  }

  public async post(options: PostOptions): Promise<void> {
    const { text } = options;
    
    await this.apiRequest('POST', '/api/submit', {
      body: {
        kind: 'self',
        text,
        sr: 'u_' + await this.getUsername(),
        title: text.substring(0, 100) // Reddit requires a title, use first 100 chars of text
      }
    });
  }

  public async reply(options: ReplyOptions): Promise<void> {
    const { uri, text } = options;
    
    // Extract comment ID from URI
    const commentIdMatch = uri.match(/\/comments\/([^\/]+)\/[^\/]+\/([^\/]+)?/);
    if (!commentIdMatch) {
      throw new Error(`Invalid comment URI: ${uri}`);
    }
    
    const thingId = commentIdMatch[2] ? `t1_${commentIdMatch[2]}` : `t3_${commentIdMatch[1]}`;
    
    await this.apiRequest('POST', '/api/comment', {
      body: {
        thing_id: thingId,
        text
      }
    });
  }

  public async listMyPosts(): Promise<PostData[]> {
    const username = await this.getUsername();
    if (!username) {
      throw new Error('Not logged in');
    }
    
    const response = await this.apiRequest('GET', `/user/${username}/submitted`, {
      params: {
        limit: 100
      }
    });

    if (!response.data || !response.data.children) {
      return [];
    }

    return response.data.children
      .filter((post: any) => post.kind === 't3')
      .map((post: any) => this.extractPostData(post));
  }

  private async getUsername(): Promise<string> {
    const response = await this.apiRequest('GET', '/api/v1/me');
    if (!response.name) {
      throw new Error('Could not retrieve username');
    }
    return response.name;
  }
}
