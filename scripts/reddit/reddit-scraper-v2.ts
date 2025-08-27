import { chromium, Browser, Page, BrowserContext } from 'playwright';

interface RedditPost {
  title: string;
  author: string;
  subreddit: string;
  url: string;
  score: number;
  comments: number;
  content?: string;
  created: string;
  awards?: number;
  isVideo?: boolean;
  isPinned?: boolean;
}

interface ScraperOptions {
  outputFormat?: 'json' | 'markdown';
  maxPosts?: number;
  headless?: boolean;
  debug?: boolean;
}

interface TrendingOptions extends ScraperOptions {
  days?: number;
  minScore?: number;
  minComments?: number;
}

export class RedditScraperV2 {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private debug: boolean = false;

  async initialize(headless: boolean = true, debug: boolean = false): Promise<void> {
    this.debug = debug;
    
    this.browser = await chromium.launch({ 
      headless,
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
    
    // Handle cookie consent if it appears
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
    if (this.debug) {
      console.log(`[DEBUG] ${message}`);
    }
  }

  async searchKeyword(keyword: string, options: ScraperOptions = {}): Promise<RedditPost[]> {
    if (!this.page) throw new Error('Browser not initialized');

    const { maxPosts = 10 } = options;
    const posts: RedditPost[] = [];

    try {
      // Try using Reddit's search URL directly
      const searchUrl = `https://www.reddit.com/search/?q=${encodeURIComponent(keyword)}&sort=relevance&t=all`;
      this.log(`Navigating to: ${searchUrl}`);
      
      await this.page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await this.page.waitForTimeout(3000);
      
      // Try multiple selector strategies
      const selectors = [
        'div[data-testid="post-container"]',
        'div[data-click-id="background"]',
        'article',
        '.Post',
        'div[id^="t3_"]'
      ];
      
      let postElements: any[] = [];
      for (const selector of selectors) {
        this.log(`Trying selector: ${selector}`);
        postElements = await this.page.$$(selector);
        if (postElements.length > 0) {
          this.log(`Found ${postElements.length} posts with selector: ${selector}`);
          break;
        }
      }
      
      // If still no posts, try scrolling and waiting
      if (postElements.length === 0) {
        this.log('No posts found with initial selectors, scrolling and retrying...');
        
        // Scroll to load content
        for (let i = 0; i < 3; i++) {
          await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
          await this.page.waitForTimeout(2000);
        }
        
        // Try selectors again
        for (const selector of selectors) {
          postElements = await this.page.$$(selector);
          if (postElements.length > 0) {
            this.log(`Found ${postElements.length} posts after scrolling with selector: ${selector}`);
            break;
          }
        }
      }
      
      // Extract post data
      for (let i = 0; i < Math.min(postElements.length, maxPosts); i++) {
        const element = postElements[i];
        
        try {
          const postData = await element.evaluate((el: any) => {
            // Multiple strategies to find elements
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
            
            const title = findText(['h3', 'a[data-click-id="body"]', '.title', '[data-test-id="post-title"]']);
            const url = findHref(['a[data-click-id="body"]', 'a[href*="/comments/"]', 'a.title']);
            const author = findText(['[data-testid="post_author_link"]', 'a[href*="/user/"]', '.author']);
            const subreddit = findText(['[data-testid="subreddit-link"]', 'a[href*="/r/"]', '.subreddit']);
            
            // Parse score (could be "1.2k" format)
            const scoreText = findText(['[data-test-id="vote-score"]', '.score', '[aria-label*="upvote"]']);
            let score = 0;
            if (scoreText) {
              if (scoreText.includes('k')) {
                score = Math.floor(parseFloat(scoreText) * 1000);
              } else {
                score = parseInt(scoreText) || 0;
              }
            }
            
            const commentsText = findText(['[data-test-id="comments-page-link-num-comments"]', '.comments', '[data-click-id="comments"]']);
            const comments = parseInt(commentsText?.match(/\d+/)?.[0] || '0');
            
            const created = findText(['[data-testid="post_timestamp"]', 'time', '.live-timestamp']);
            
            return {
              title,
              url: url.startsWith('http') ? url : (url ? `https://www.reddit.com${url}` : ''),
              author: author.replace(/^u\//, ''),
              subreddit,
              score,
              comments,
              created
            };
          });
          
          if (postData.title && postData.url) {
            this.log(`Extracted post: ${postData.title}`);
            
            // Get full content by visiting the post
            const fullContent = await this.extractPostContent(postData.url);
            posts.push({
              ...postData,
              ...fullContent
            });
            
            await this.page.waitForTimeout(1000);
          }
        } catch (error) {
          this.log(`Error extracting post ${i}: ${error}`);
        }
      }
      
    } catch (error) {
      console.error('Error searching Reddit:', error);
      throw error;
    }

    return posts;
  }

  async extractPostContent(url: string): Promise<Partial<RedditPost>> {
    if (!this.page) throw new Error('Browser not initialized');

    try {
      this.log(`Extracting content from: ${url}`);
      
      const newPage = await this.context!.newPage();
      await newPage.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await newPage.waitForTimeout(2000);

      const content = await newPage.evaluate(() => {
        // Multiple strategies to find content
        const contentSelectors = [
          '[data-test-id="post-content"]',
          '[data-click-id="text"]',
          '.usertext-body',
          '.md',
          '[data-rtjson]'
        ];
        
        let textContent = '';
        for (const selector of contentSelectors) {
          const elem = document.querySelector(selector);
          if (elem?.textContent) {
            textContent = elem.textContent.trim();
            break;
          }
        }
        
        // Check for video
        const isVideo = !!(document.querySelector('video') || document.querySelector('[data-click-id="video"]'));
        
        // Check if pinned
        const isPinned = !!(document.querySelector('[data-testid="post-pinned-icon"]') || document.querySelector('.stickied'));
        
        // Get awards
        const awardsEl = document.querySelector('[aria-label*="award"]') || document.querySelector('.awarding-link');
        const awards = awardsEl ? parseInt(awardsEl.textContent?.match(/\d+/)?.[0] || '0') : 0;

        return {
          content: textContent,
          isVideo,
          isPinned,
          awards
        };
      });

      await newPage.close();
      return content;
      
    } catch (error) {
      this.log(`Error extracting content from ${url}: ${error}`);
      return { content: '' };
    }
  }

  async getTrendingPosts(options: TrendingOptions = {}): Promise<RedditPost[]> {
    if (!this.page) throw new Error('Browser not initialized');

    const { 
      days = 1, 
      maxPosts = 10,
      minScore = 100,
      minComments = 10
    } = options;

    const posts: RedditPost[] = [];

    try {
      // Navigate to Reddit's top posts
      const timeFilter = days === 1 ? 'day' : days <= 7 ? 'week' : 'month';
      const url = `https://www.reddit.com/top/?t=${timeFilter}`;
      
      this.log(`Getting trending posts from: ${url}`);
      
      await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await this.page.waitForTimeout(3000);

      // Scroll to load more posts
      for (let i = 0; i < 5; i++) {
        await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await this.page.waitForTimeout(1500);
      }

      // Try multiple selectors
      const selectors = [
        'div[data-testid="post-container"]',
        'div[data-click-id="background"]',
        'article',
        '.Post',
        'div[id^="t3_"]'
      ];
      
      let postElements: any[] = [];
      for (const selector of selectors) {
        postElements = await this.page.$$(selector);
        if (postElements.length > 0) break;
      }

      const trendingPosts = [];
      
      for (const element of postElements) {
        try {
          const postData = await element.evaluate((el: any) => {
            // Similar extraction logic as searchKeyword
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
            
            const title = findText(['h3', 'a[data-click-id="body"]', '.title']);
            const url = findHref(['a[data-click-id="body"]', 'a[href*="/comments/"]']);
            const scoreText = findText(['[data-test-id="vote-score"]', '.score']);
            
            let score = 0;
            if (scoreText) {
              if (scoreText.includes('k')) {
                score = Math.floor(parseFloat(scoreText) * 1000);
              } else {
                score = parseInt(scoreText) || 0;
              }
            }
            
            const commentsText = findText(['[data-test-id="comments-page-link-num-comments"]', '.comments']);
            const comments = parseInt(commentsText?.match(/\d+/)?.[0] || '0');
            
            return {
              title,
              url: url.startsWith('http') ? url : (url ? `https://www.reddit.com${url}` : ''),
              author: findText(['[data-testid="post_author_link"]', 'a[href*="/user/"]']).replace(/^u\//, ''),
              subreddit: findText(['[data-testid="subreddit-link"]', 'a[href*="/r/"]']),
              score,
              comments,
              created: findText(['[data-testid="post_timestamp"]', 'time'])
            };
          });
          
          if (postData.url && postData.score >= minScore && postData.comments >= minComments) {
            trendingPosts.push(postData);
          }
          
          if (trendingPosts.length >= maxPosts) break;
          
        } catch (error) {
          this.log(`Error extracting trending post: ${error}`);
        }
      }

      // Get full content for trending posts
      for (const post of trendingPosts) {
        const fullContent = await this.extractPostContent(post.url);
        posts.push({
          ...post,
          ...fullContent
        });
        await this.page.waitForTimeout(1000);
      }

    } catch (error) {
      console.error('Error getting trending posts:', error);
      throw error;
    }

    return posts;
  }

  private calculateTrendingScore(post: any): number {
    const scoreWeight = 0.4;
    const commentsWeight = 0.3;
    const engagementWeight = 0.3;
    
    const normalizedScore = Math.log10(post.score + 1);
    const normalizedComments = Math.log10(post.comments + 1);
    const engagementRatio = post.comments / (post.score + 1);
    
    return (
      normalizedScore * scoreWeight +
      normalizedComments * commentsWeight +
      engagementRatio * engagementWeight * 100
    );
  }

  formatOutput(posts: RedditPost[], format: 'json' | 'markdown' = 'json'): string {
    if (format === 'json') {
      return JSON.stringify(posts, null, 2);
    }
    
    let markdown = '# Reddit Posts\n\n';
    
    posts.forEach((post, index) => {
      markdown += `## ${index + 1}. ${post.title}\n\n`;
      markdown += `- **Author:** u/${post.author}\n`;
      markdown += `- **Subreddit:** ${post.subreddit}\n`;
      markdown += `- **Score:** ${post.score} | **Comments:** ${post.comments}\n`;
      markdown += `- **Created:** ${post.created}\n`;
      if (post.awards) markdown += `- **Awards:** ${post.awards}\n`;
      if (post.isPinned) markdown += `- **📌 Pinned**\n`;
      if (post.isVideo) markdown += `- **🎥 Video Post**\n`;
      markdown += `- **URL:** ${post.url}\n\n`;
      
      if (post.content) {
        markdown += `### Content\n${post.content}\n\n`;
      }
      
      markdown += '---\n\n';
    });
    
    return markdown;
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
    }
  }
}