import { chromium, Browser, Page, BrowserContext } from 'playwright';
import * as fs from 'fs/promises';
import * as path from 'path';

// Interfaces matching PRD specifications
interface Comment {
  id: string;
  author: string;
  body: string;
  score: number;
  created_utc: string;
  replies: Comment[];
}

interface Post {
  id: string;
  title: string;
  url: string;
  author: string;
  subreddit: string;
  created_utc: string;
  score: number;
  upvote_ratio: number;
  num_comments: number;
  content: string;
  link_url: string;
  trending_score?: number;
  comments: Comment[];
}

interface RedditSearchResult {
  posts: Post[];
  metadata: {
    searchTime: string;
    keyword?: string;
    subreddits?: string[];
    totalPosts: number;
  };
}

interface ScraperOptions {
  headless?: boolean;
  delayBetweenRequests?: number;
  maxRetries?: number;
  timeout?: number;
  debug?: boolean;
}

export class RedditScraperEnhanced {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private options: ScraperOptions;

  constructor(options: ScraperOptions = {}) {
    this.options = {
      headless: true,
      delayBetweenRequests: 2000,
      maxRetries: 3,
      timeout: 30000,
      debug: false,
      ...options
    };
  }

  async initialize(): Promise<void> {
    this.browser = await chromium.launch({ 
      headless: this.options.headless,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--no-sandbox',
        '--disable-setuid-sandbox'
      ]
    });
    
    this.context = await this.browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 },
      extraHTTPHeaders: {
        'Accept-Language': 'en-US,en;q=0.9',
      }
    });
    
    this.page = await this.context.newPage();
    
    // Handle cookie consent
    this.page.on('load', async () => {
      if (this.page) {
        const acceptButton = await this.page.$('button:has-text("Accept")').catch(() => null);
        if (acceptButton) {
          await acceptButton.click().catch(() => {});
        }
      }
    });
  }

  private log(message: string): void {
    if (this.options.debug) {
      console.log(`[DEBUG] ${message}`);
    }
  }

  async searchByKeyword(keyword: string, limit: number = 25): Promise<Post[]> {
    if (!this.page) throw new Error('Browser not initialized');

    const searchUrl = `https://www.reddit.com/search/?q=${encodeURIComponent(keyword)}&sort=relevance&t=all`;
    const posts: Post[] = [];

    try {
      this.log(`Searching for keyword: ${keyword}`);
      await this.page.goto(searchUrl, { waitUntil: 'domcontentloaded' });
      await this.page.waitForTimeout(this.options.delayBetweenRequests!);
      
      // Scroll to load more posts
      for (let i = 0; i < 3; i++) {
        await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await this.page.waitForTimeout(1500);
      }
      
      const postElements = await this.page.$$('shreddit-post, div[data-testid="post-container"], article');
      const postsToProcess = postElements.slice(0, limit);

      for (const element of postsToProcess) {
        try {
          const post = await this.extractPostData(element);
          if (post) {
            posts.push(post);
          }
        } catch (err) {
          this.log(`Error extracting post: ${err}`);
        }
      }
    } catch (error) {
      console.error('Error searching by keyword:', error);
      throw error;
    }

    return posts;
  }

  async getTrendingPosts(subreddits: string[], days: number = 1): Promise<Post[]> {
    if (!this.page) throw new Error('Browser not initialized');

    const posts: Post[] = [];
    const timeFilter = days === 1 ? 'day' : days <= 7 ? 'week' : 'month';

    for (const subreddit of subreddits) {
      try {
        const url = `https://www.reddit.com/r/${subreddit}/top/?t=${timeFilter}`;
        this.log(`Fetching trending from r/${subreddit}`);
        
        await this.page.goto(url, { waitUntil: 'domcontentloaded' });
        await this.page.waitForTimeout(this.options.delayBetweenRequests!);

        // Scroll to load posts
        for (let i = 0; i < 2; i++) {
          await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
          await this.page.waitForTimeout(1500);
        }

        const postElements = await this.page.$$('shreddit-post, div[data-testid="post-container"], article');
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
            this.log(`Error extracting trending post: ${err}`);
          }
        }
      } catch (error) {
        console.error(`Error fetching trending posts from r/${subreddit}:`, error);
      }
    }

    // Sort by trending score
    return posts.sort((a, b) => (b.trending_score || 0) - (a.trending_score || 0));
  }

  async batchFetchSubreddits(subreddits: string[], limit: number = 10): Promise<RedditSearchResult> {
    if (!this.page) throw new Error('Browser not initialized');

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
        this.log(`Batch fetching from r/${subreddit}`);
        
        await this.page.goto(url, { waitUntil: 'domcontentloaded' });
        await this.page.waitForTimeout(this.options.delayBetweenRequests!);

        // Scroll to load posts
        for (let i = 0; i < 2; i++) {
          await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
          await this.page.waitForTimeout(1500);
        }

        const postElements = await this.page.$$('shreddit-post, div[data-testid="post-container"], article');
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
            this.log(`Error extracting post in batch mode: ${err}`);
          }
        }
      } catch (error) {
        console.error(`Error fetching from r/${subreddit}:`, error);
      }
    }

    result.metadata.totalPosts = result.posts.length;
    
    // Sort by trending score
    result.posts.sort((a, b) => (b.trending_score || 0) - (a.trending_score || 0));
    
    return result;
  }

  private async extractPostData(element: any): Promise<Post | null> {
    try {
      const postData = await element.evaluate((el: any) => {
        const findText = (selectors: string[]): string => {
          for (const sel of selectors) {
            const elem = el.querySelector(sel);
            if (elem?.textContent) return elem.textContent.trim();
          }
          return '';
        };
        
        const findHref = (selectors: string[]): string => {
          for (const sel of selectors) {
            const elem = el.querySelector(sel) as HTMLAnchorElement;
            if (elem?.href) return elem.href;
          }
          return '';
        };
        
        // Handle shreddit-post web components
        const isShredditPost = el.tagName?.toLowerCase() === 'shreddit-post';
        
        const title = isShredditPost 
          ? (el.querySelector('[slot="title"]')?.textContent || el.querySelector('h3')?.textContent || '')
          : findText(['h3', 'a[data-click-id="body"]', '.title', '[data-test-id="post-title"]']);
          
        const url = isShredditPost
          ? (el.getAttribute('permalink') ? `https://www.reddit.com${el.getAttribute('permalink')}` : '')
          : findHref(['a[data-click-id="body"]', 'a[href*="/comments/"]', 'a.title']);
          
        const author = isShredditPost
          ? (el.getAttribute('author') || findText(['[slot="author"]', 'a[href*="/user/"]']))
          : findText(['[data-testid="post_author_link"]', 'a[href*="/user/"]', '.author']);
          
        const subreddit = isShredditPost
          ? (el.getAttribute('subreddit-name') || url.match(/\/r\/([^\/]+)/)?.[1] || '')
          : findText(['[data-testid="subreddit-link"]', 'a[href*="/r/"]', '.subreddit']);
        
        // Parse score
        const scoreText = isShredditPost
          ? (el.getAttribute('score') || findText(['[slot="vote"]', 'shreddit-post-karma', '.score']))
          : findText(['[data-test-id="vote-score"]', '.score', '[aria-label*="upvote"]']);
        
        let score = 0;
        if (scoreText) {
          if (scoreText.includes('k')) {
            score = Math.floor(parseFloat(scoreText) * 1000);
          } else {
            score = parseInt(scoreText) || 0;
          }
        }
        
        // Parse comments
        const commentsText = isShredditPost
          ? (el.getAttribute('comment-count') || findText(['[slot="comments"]', '.comments']))
          : findText(['[data-test-id="comments-page-link-num-comments"]', '.comments', '[data-click-id="comments"]']);
        const num_comments = parseInt(commentsText?.match(/\d+/)?.[0] || '0');
        
        // Get timestamp
        const timeText = isShredditPost
          ? (el.querySelector('time')?.textContent || el.querySelector('faceplate-relative-time')?.textContent || '')
          : findText(['[data-testid="post_timestamp"]', 'time', '.live-timestamp']);
        
        // Get post ID from URL
        const id = isShredditPost
          ? (el.getAttribute('id') || url.match(/comments\/([a-z0-9]+)\//)?.[1] || '')
          : url.match(/comments\/([a-z0-9]+)\//)?.[1] || '';
        
        // Get post content
        const content = isShredditPost
          ? findText(['[slot="text-body"]', '[slot="text"]', '.md'])
          : findText(['[data-click-id="text"]', '[data-test-id="post-content"]', '.usertext-body']);
        
        // Get external link
        const link_url = isShredditPost
          ? (el.getAttribute('content-href') || findHref(['a[slot="outbound-link"]']))
          : findHref(['a[data-testid="outbound-link"]', 'a.thumbnail']);
        
        return {
          id,
          title,
          url: url.startsWith('http') ? url : (url ? `https://www.reddit.com${url}` : ''),
          author: author.replace(/^u\//, ''),
          subreddit: subreddit.replace(/^r\//, ''),
          score,
          num_comments,
          timeText,
          content,
          link_url: link_url && !link_url.includes('reddit.com') ? link_url : ''
        };
      });

      if (!postData.title || !postData.url) return null;

      // Parse time to UTC
      const created_utc = this.parseTimeToUTC(postData.timeText);
      
      // Calculate upvote ratio (estimate based on score and comments)
      const upvote_ratio = Math.min(0.95, 0.7 + (postData.score / (postData.score + postData.num_comments * 10)));

      const post: Post = {
        id: postData.id,
        title: postData.title,
        url: postData.url,
        author: postData.author,
        subreddit: postData.subreddit,
        created_utc,
        score: postData.score,
        upvote_ratio: Math.round(upvote_ratio * 100) / 100,
        num_comments: postData.num_comments,
        content: postData.content || '',
        link_url: postData.link_url || '',
        comments: []
      };

      return post;
    } catch (error) {
      this.log(`Error parsing post data: ${error}`);
      return null;
    }
  }

  async fetchComments(postUrl: string, maxComments: number = 10): Promise<Comment[]> {
    if (!this.page) throw new Error('Browser not initialized');

    const comments: Comment[] = [];

    try {
      const newPage = await this.context!.newPage();
      await newPage.goto(postUrl, { waitUntil: 'domcontentloaded' });
      await newPage.waitForTimeout(this.options.delayBetweenRequests!);

      // Get comments
      const commentData = await newPage.evaluate(() => {
        const comments: any[] = [];
        
        // Find comment threads
        const commentThreads = document.querySelectorAll('[data-testid="comment-tree-item"], .thing.comment');
        
        commentThreads.forEach((thread: any) => {
          try {
            const author = thread.querySelector('[data-testid="comment_author_link"], .author')?.textContent || 'unknown';
            const body = thread.querySelector('[data-testid="comment"] > div:last-child, .usertext-body')?.textContent?.trim() || '';
            const scoreEl = thread.querySelector('[data-click-id="upvote"]')?.parentElement;
            const scoreText = scoreEl?.querySelector('span')?.textContent || '1';
            
            let score = 1;
            if (scoreText.includes('k')) {
              score = Math.floor(parseFloat(scoreText) * 1000);
            } else {
              score = parseInt(scoreText) || 1;
            }
            
            if (body) {
              comments.push({
                id: Math.random().toString(36).substr(2, 9),
                author: author.replace(/^u\//, ''),
                body,
                score,
                created_utc: new Date().toISOString(),
                replies: []
              });
            }
          } catch (err) {
            console.error('Error extracting comment:', err);
          }
        });
        
        return comments;
      });

      await newPage.close();
      return commentData.slice(0, maxComments);
      
    } catch (error) {
      this.log(`Error fetching comments: ${error}`);
      return [];
    }
  }

  private calculateTrendingScore(post: Post): number {
    // PRD formula: (upvotes + comments * 2) / hours_since_posted
    const now = Date.now();
    const postTime = new Date(post.created_utc).getTime();
    const hoursAgo = Math.max(1, (now - postTime) / (1000 * 60 * 60));
    
    const engagementScore = (post.score + post.num_comments * 2) / hoursAgo;
    
    // Bonus for high upvote ratio
    const upvoteBonus = post.upvote_ratio > 0.8 ? 1.5 : 1;
    
    return Math.round(engagementScore * upvoteBonus * 10) / 10;
  }

  private parseTimeToUTC(timeText: string): string {
    const now = new Date();
    
    if (!timeText) return now.toISOString();
    
    if (timeText.includes('just now')) {
      return now.toISOString();
    } else if (timeText.includes('hour') || timeText.includes('hr')) {
      const hours = parseInt(timeText.match(/\d+/)?.[0] || '0');
      now.setHours(now.getHours() - hours);
    } else if (timeText.includes('day')) {
      const days = parseInt(timeText.match(/\d+/)?.[0] || '0');
      now.setDate(now.getDate() - days);
    } else if (timeText.includes('minute') || timeText.includes('min')) {
      const minutes = parseInt(timeText.match(/\d+/)?.[0] || '0');
      now.setMinutes(now.getMinutes() - minutes);
    } else if (timeText.includes('month')) {
      const months = parseInt(timeText.match(/\d+/)?.[0] || '0');
      now.setMonth(now.getMonth() - months);
    } else if (timeText.includes('year')) {
      const years = parseInt(timeText.match(/\d+/)?.[0] || '0');
      now.setFullYear(now.getFullYear() - years);
    }
    
    return now.toISOString();
  }

  formatAsJSON(data: Post[] | RedditSearchResult): string {
    return JSON.stringify(data, null, 2);
  }

  formatAsMarkdown(data: Post[] | RedditSearchResult, title?: string): string {
    const posts = Array.isArray(data) ? data : data.posts;
    const heading = title || 'Reddit Search Results';
    
    let markdown = `# ${heading}\n\n`;
    markdown += `**Generated**: ${new Date().toISOString()}\n`;
    markdown += `**Total Posts**: ${posts.length}\n\n`;
    
    // Add summary statistics
    if (posts.length > 0) {
      const totalScore = posts.reduce((sum, post) => sum + post.score, 0);
      const totalComments = posts.reduce((sum, post) => sum + post.num_comments, 0);
      const avgScore = Math.round(totalScore / posts.length);
      const avgComments = Math.round(totalComments / posts.length);
      const subreddits = [...new Set(posts.map(p => p.subreddit))];
      
      markdown += `## Summary Statistics\n\n`;
      markdown += `- **Subreddits**: ${subreddits.join(', ')}\n`;
      markdown += `- **Average Score**: ${avgScore.toLocaleString()}\n`;
      markdown += `- **Average Comments**: ${avgComments.toLocaleString()}\n\n`;
    }
    
    markdown += '---\n\n';

    for (let i = 0; i < posts.length; i++) {
      const post = posts[i];
      markdown += `## ${i + 1}. [${post.title}](${post.url})\n\n`;
      markdown += `- **Author**: u/${post.author}\n`;
      markdown += `- **Subreddit**: r/${post.subreddit}\n`;
      markdown += `- **Score**: ${post.score.toLocaleString()}`;
      
      if (post.upvote_ratio > 0) {
        markdown += ` (${Math.round(post.upvote_ratio * 100)}% upvoted)`;
      }
      
      markdown += `\n- **Comments**: ${post.num_comments.toLocaleString()}\n`;
      markdown += `- **Posted**: ${new Date(post.created_utc).toLocaleString()}\n`;
      
      if (post.trending_score) {
        markdown += `- **Trending Score**: ${post.trending_score}\n`;
      }

      if (post.content) {
        markdown += `\n### Content\n\n${post.content}\n`;
      }

      if (post.link_url) {
        markdown += `\n**External Link**: [${post.link_url}](${post.link_url})\n`;
      }

      if (post.comments && post.comments.length > 0) {
        markdown += `\n### Top Comments\n\n`;
        const topComments = post.comments.slice(0, 3);
        
        for (let j = 0; j < topComments.length; j++) {
          const comment = topComments[j];
          markdown += `${j + 1}. **${comment.author}** (${comment.score} points):\n`;
          markdown += `   > ${comment.body.replace(/\n/g, '\n   > ')}\n\n`;
        }
      }

      markdown += '\n---\n\n';
    }

    return markdown;
  }

  async saveToFile(content: string, filename: string): Promise<string> {
    // Get current date in YYYY-MM-DD format
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    
    // Build the correct output path: /report/reddit/YYYY-MM-DD/filename
    const baseDir = path.resolve(process.cwd(), '../../report/reddit', dateStr);
    const outputPath = path.join(baseDir, filename);
    
    // Create directory if it doesn't exist
    await fs.mkdir(baseDir, { recursive: true });
    await fs.writeFile(outputPath, content, 'utf-8');
    
    return outputPath;
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
      this.context = null;
    }
  }
}