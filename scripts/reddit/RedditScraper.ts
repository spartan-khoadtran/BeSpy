import { chromium, Browser, Page } from 'playwright';
import { Post, Comment, ScraperOptions, RedditSearchResult } from './types';

export class RedditScraper {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private readonly options: ScraperOptions;

  constructor(options: ScraperOptions = {}) {
    this.options = {
      headless: true,
      delayBetweenRequests: 2000,
      maxRetries: 3,
      timeout: 30000,
      ...options
    };
  }

  async initialize(): Promise<void> {
    this.browser = await chromium.launch({
      headless: this.options.headless
    });
    const context = await this.browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    this.page = await context.newPage();
    this.page.setDefaultTimeout(this.options.timeout!);
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
  }

  async searchByKeyword(keyword: string, limit: number = 25): Promise<Post[]> {
    if (!this.page) throw new Error('Scraper not initialized');

    const searchUrl = `https://www.reddit.com/search/?q=${encodeURIComponent(keyword)}&sort=relevance&t=all`;
    const posts: Post[] = [];

    try {
      await this.page.goto(searchUrl, { waitUntil: 'networkidle' });
      await this.page.waitForTimeout(this.options.delayBetweenRequests!);
      
      const postElements = await this.page.$$('[data-testid="post-container"]');
      const postsToProcess = postElements.slice(0, limit);

      for (const element of postsToProcess) {
        try {
          const post = await this.extractPostData(element);
          if (post) {
            posts.push(post);
          }
        } catch (err) {
          console.error('Error extracting post:', err);
        }
      }
    } catch (error) {
      console.error('Error searching by keyword:', error);
      throw error;
    }

    return posts;
  }

  async getTrendingPosts(subreddits: string[], days: number = 1): Promise<Post[]> {
    if (!this.page) throw new Error('Scraper not initialized');

    const posts: Post[] = [];
    const timeFilter = days === 1 ? 'day' : days === 7 ? 'week' : 'month';

    for (const subreddit of subreddits) {
      try {
        const url = `https://www.reddit.com/r/${subreddit}/top/?t=${timeFilter}`;
        await this.page.goto(url, { waitUntil: 'networkidle' });
        await this.page.waitForTimeout(this.options.delayBetweenRequests!);

        const postElements = await this.page.$$('[data-testid="post-container"]');
        const topPosts = postElements.slice(0, 10);

        for (const element of topPosts) {
          try {
            const post = await this.extractPostData(element);
            if (post) {
              post.subreddit = subreddit;
              post.trending_score = this.calculateTrendingScore(post);
              posts.push(post);
            }
          } catch (err) {
            console.error('Error extracting trending post:', err);
          }
        }
      } catch (error) {
        console.error(`Error fetching trending posts from r/${subreddit}:`, error);
      }
    }

    return posts.sort((a, b) => (b.trending_score || 0) - (a.trending_score || 0));
  }

  async batchFetchSubreddits(subreddits: string[], limit: number = 10): Promise<RedditSearchResult> {
    if (!this.page) throw new Error('Scraper not initialized');

    const result: RedditSearchResult = {
      posts: [],
      metadata: {
        searchTime: new Date().toISOString(),
        subreddits: subreddits,
        totalPosts: 0
      }
    };

    for (const subreddit of subreddits) {
      try {
        const url = `https://www.reddit.com/r/${subreddit}/hot/`;
        await this.page.goto(url, { waitUntil: 'networkidle' });
        await this.page.waitForTimeout(this.options.delayBetweenRequests!);

        const postElements = await this.page.$$('[data-testid="post-container"]');
        const postsToProcess = postElements.slice(0, limit);

        for (const element of postsToProcess) {
          try {
            const post = await this.extractPostData(element);
            if (post) {
              post.subreddit = subreddit;
              post.trending_score = this.calculateTrendingScore(post);
              result.posts.push(post);
            }
          } catch (err) {
            console.error('Error extracting post in batch mode:', err);
          }
        }
      } catch (error) {
        console.error(`Error fetching from r/${subreddit}:`, error);
      }
    }

    result.metadata.totalPosts = result.posts.length;
    return result;
  }

  private async extractPostData(element: any): Promise<Post | null> {
    try {
      const title = await element.$eval('h3', (el: any) => el.textContent?.trim() || '').catch(() => '');
      
      if (!title) return null;

      const author = await element.$eval('[data-testid="post_author_link"]', (el: any) => 
        el.textContent?.replace('u/', '') || 'unknown'
      ).catch(() => 'unknown');

      const score = await element.$eval('[data-click-id="upvote"]', (el: any) => {
        const parent = el.parentElement;
        const scoreText = parent?.querySelector('div:nth-child(2)')?.textContent || '0';
        if (scoreText.includes('k')) {
          return Math.round(parseFloat(scoreText) * 1000);
        }
        return parseInt(scoreText) || 0;
      }).catch(() => 0);

      const commentCount = await element.$eval('[data-click-id="comments"]', (el: any) => {
        const text = el.textContent || '0';
        const match = text.match(/(\d+)/);
        return match ? parseInt(match[1]) : 0;
      }).catch(() => 0);

      const postUrl = await element.$eval('a[data-click-id="body"]', (el: any) => 
        el.href || ''
      ).catch(() => '');

      const content = await element.$eval('[data-click-id="text"]', (el: any) => 
        el.textContent?.trim() || ''
      ).catch(() => '');

      const linkUrl = await element.$eval('a[data-testid="outbound-link"]', (el: any) => 
        el.href || ''
      ).catch(() => '');

      const timeText = await element.$eval('[data-testid="post_timestamp"]', (el: any) => 
        el.textContent || ''
      ).catch(() => '');

      const subreddit = await element.$eval('[data-testid="subreddit-link"]', (el: any) => 
        el.textContent?.replace('r/', '') || ''
      ).catch(() => '');

      const post: Post = {
        id: postUrl.split('/').filter(Boolean).pop() || '',
        title,
        url: postUrl,
        author,
        subreddit,
        created_utc: this.parseTimeToUTC(timeText),
        score,
        upvote_ratio: 0,
        num_comments: commentCount,
        content,
        link_url: linkUrl,
        comments: []
      };

      return post;
    } catch (error) {
      console.error('Error parsing post data:', error);
      return null;
    }
  }

  async fetchComments(postUrl: string, maxComments: number = 10): Promise<Comment[]> {
    if (!this.page) throw new Error('Scraper not initialized');

    const comments: Comment[] = [];

    try {
      await this.page.goto(postUrl, { waitUntil: 'networkidle' });
      await this.page.waitForTimeout(this.options.delayBetweenRequests!);

      const commentElements = await this.page.$$('[data-testid="comment"]');
      const commentsToProcess = commentElements.slice(0, maxComments);

      for (const element of commentsToProcess) {
        try {
          const comment = await this.extractCommentData(element);
          if (comment) {
            comments.push(comment);
          }
        } catch (err) {
          console.error('Error extracting comment:', err);
        }
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    }

    return comments;
  }

  private async extractCommentData(element: any): Promise<Comment | null> {
    try {
      const author = await element.$eval('[data-testid="comment_author_link"]', (el: any) => 
        el.textContent || 'unknown'
      ).catch(() => 'unknown');

      const body = await element.$eval('[data-testid="comment"] > div:last-child', (el: any) => 
        el.textContent?.trim() || ''
      ).catch(() => '');

      const scoreText = await element.$eval('[data-click-id="upvote"]', (el: any) => {
        const parent = el.parentElement;
        const score = parent?.querySelector('span')?.textContent || '1';
        return score;
      }).catch(() => '1');

      const score = scoreText.includes('k') 
        ? Math.round(parseFloat(scoreText) * 1000)
        : parseInt(scoreText) || 1;

      const comment: Comment = {
        id: Math.random().toString(36).substr(2, 9),
        author,
        body,
        score,
        created_utc: new Date().toISOString(),
        replies: []
      };

      return comment;
    } catch (error) {
      console.error('Error parsing comment data:', error);
      return null;
    }
  }

  private calculateTrendingScore(post: Post): number {
    const hoursAgo = (Date.now() - new Date(post.created_utc).getTime()) / (1000 * 60 * 60);
    if (hoursAgo <= 0) return 0;
    
    const engagementScore = (post.score + post.num_comments * 2) / Math.max(hoursAgo, 1);
    const upvoteBonus = post.upvote_ratio > 0.8 ? 1.5 : 1;
    
    return Math.round(engagementScore * upvoteBonus * 10) / 10;
  }

  private parseTimeToUTC(timeText: string): string {
    const now = new Date();
    
    if (timeText.includes('hour') || timeText.includes('hr')) {
      const hours = parseInt(timeText.match(/\d+/)?.[0] || '0');
      now.setHours(now.getHours() - hours);
    } else if (timeText.includes('day')) {
      const days = parseInt(timeText.match(/\d+/)?.[0] || '0');
      now.setDate(now.getDate() - days);
    } else if (timeText.includes('minute') || timeText.includes('min')) {
      const minutes = parseInt(timeText.match(/\d+/)?.[0] || '0');
      now.setMinutes(now.getMinutes() - minutes);
    }
    
    return now.toISOString();
  }

  async retryOperation<T>(
    operation: () => Promise<T>,
    maxRetries: number = this.options.maxRetries!
  ): Promise<T> {
    let lastError: any;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        console.error(`Attempt ${i + 1} failed:`, error);
        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1)));
        }
      }
    }
    
    throw lastError;
  }
}