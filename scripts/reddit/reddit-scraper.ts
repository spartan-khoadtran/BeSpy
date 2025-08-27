import { chromium, Browser, Page } from 'playwright';

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
}

interface TrendingOptions extends ScraperOptions {
  days?: number;
  minScore?: number;
  minComments?: number;
}

export class RedditScraper {
  private browser: Browser | null = null;
  private page: Page | null = null;

  async initialize(headless: boolean = true): Promise<void> {
    this.browser = await chromium.launch({ 
      headless,
      args: ['--disable-blink-features=AutomationControlled']
    });
    const context = await this.browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 }
    });
    this.page = await context.newPage();
  }

  async searchKeyword(keyword: string, options: ScraperOptions = {}): Promise<RedditPost[]> {
    if (!this.page) throw new Error('Browser not initialized');

    const { maxPosts = 10 } = options;
    const posts: RedditPost[] = [];

    try {
      // Navigate to Reddit search
      const searchUrl = `https://www.reddit.com/search/?q=${encodeURIComponent(keyword)}&sort=relevance`;
      await this.page.goto(searchUrl, { waitUntil: 'networkidle', timeout: 30000 });
      
      // Wait for posts to load
      await this.page.waitForSelector('[data-testid="post-container"]', { timeout: 10000 }).catch(() => {});
      
      // Scroll to load more posts
      for (let i = 0; i < 3; i++) {
        await this.page.evaluate(() => window.scrollBy(0, window.innerHeight));
        await this.page.waitForTimeout(2000);
      }

      // Get post links
      const postElements = await this.page.$$('[data-testid="post-container"]');
      const postData = [];

      for (let i = 0; i < Math.min(postElements.length, maxPosts); i++) {
        const element = postElements[i];
        
        const postInfo = await element.evaluate((el) => {
          const titleEl = el.querySelector('h3');
          const linkEl = el.querySelector('a[data-click-id="body"]');
          const authorEl = el.querySelector('[data-testid="post_author_link"]');
          const subredditEl = el.querySelector('[data-testid="subreddit-link"]');
          const scoreEl = el.querySelector('[data-test-id="vote-score"]');
          const commentsEl = el.querySelector('[data-test-id="comments-page-link-num-comments"]');
          const timeEl = el.querySelector('[data-testid="post_timestamp"]');
          
          return {
            title: titleEl?.textContent?.trim() || '',
            url: linkEl ? `https://www.reddit.com${linkEl.getAttribute('href')}` : '',
            author: authorEl?.textContent?.replace('u/', '') || '',
            subreddit: subredditEl?.textContent || '',
            score: scoreEl ? parseInt(scoreEl.textContent || '0') : 0,
            comments: commentsEl ? parseInt(commentsEl.textContent || '0') : 0,
            created: timeEl?.textContent || ''
          };
        });
        
        if (postInfo.url) {
          postData.push(postInfo);
        }
      }

      // Visit each post to get full content
      for (const post of postData) {
        const fullPost = await this.extractPostContent(post.url);
        posts.push({
          ...post,
          ...fullPost
        });
        
        // Add delay to avoid rate limiting
        await this.page.waitForTimeout(1500);
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
      await this.page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      await this.page.waitForTimeout(2000);

      const content = await this.page.evaluate(() => {
        // Get post content
        const contentEl = document.querySelector('[data-test-id="post-content"]');
        const textContent = contentEl?.querySelector('[data-click-id="text"]')?.textContent || '';
        
        // Check if it's a video post
        const isVideo = !!document.querySelector('video');
        
        // Check if pinned
        const isPinned = !!document.querySelector('[data-testid="post-pinned-icon"]');
        
        // Get awards count
        const awardsEl = document.querySelector('[aria-label*="award"]');
        const awards = awardsEl ? parseInt(awardsEl.textContent || '0') : 0;

        // Get actual score and comments from the post page
        const scoreEl = document.querySelector('[data-test-id="vote-score"]');
        const score = scoreEl ? parseInt(scoreEl.textContent || '0') : 0;
        
        const commentsEl = document.querySelector('[data-test-id="comment-count"]');
        const comments = commentsEl ? parseInt(commentsEl.textContent?.match(/\d+/)?.[0] || '0') : 0;

        return {
          content: textContent,
          isVideo,
          isPinned,
          awards,
          score: score || undefined,
          comments: comments || undefined
        };
      });

      return content;
    } catch (error) {
      console.error(`Error extracting content from ${url}:`, error);
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
      // Navigate to Reddit popular/hot posts
      const timeFilter = days === 1 ? 'day' : days <= 7 ? 'week' : 'month';
      const url = `https://www.reddit.com/top/?t=${timeFilter}`;
      
      await this.page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      await this.page.waitForSelector('[data-testid="post-container"]', { timeout: 10000 });

      // Scroll to load more posts
      for (let i = 0; i < 5; i++) {
        await this.page.evaluate(() => window.scrollBy(0, window.innerHeight));
        await this.page.waitForTimeout(2000);
      }

      const postElements = await this.page.$$('[data-testid="post-container"]');
      const trendingPosts = [];

      for (const element of postElements) {
        const postInfo = await element.evaluate((el) => {
          const titleEl = el.querySelector('h3');
          const linkEl = el.querySelector('a[data-click-id="body"]');
          const authorEl = el.querySelector('[data-testid="post_author_link"]');
          const subredditEl = el.querySelector('[data-testid="subreddit-link"]');
          const scoreEl = el.querySelector('[data-test-id="vote-score"]');
          const commentsEl = el.querySelector('[data-test-id="comments-page-link-num-comments"]');
          const timeEl = el.querySelector('[data-testid="post_timestamp"]');
          
          const scoreText = scoreEl?.textContent || '0';
          let score = 0;
          if (scoreText.includes('k')) {
            score = parseFloat(scoreText) * 1000;
          } else {
            score = parseInt(scoreText);
          }
          
          return {
            title: titleEl?.textContent?.trim() || '',
            url: linkEl ? `https://www.reddit.com${linkEl.getAttribute('href')}` : '',
            author: authorEl?.textContent?.replace('u/', '') || '',
            subreddit: subredditEl?.textContent || '',
            score: score,
            comments: parseInt(commentsEl?.textContent || '0'),
            created: timeEl?.textContent || ''
          };
        });
        
        // Filter by minimum score and comments for trending
        if (postInfo.url && postInfo.score >= minScore && postInfo.comments >= minComments) {
          trendingPosts.push(postInfo);
        }
        
        if (trendingPosts.length >= maxPosts) break;
      }

      // Calculate trending score and sort
      const scoredPosts = trendingPosts.map(post => ({
        ...post,
        trendingScore: this.calculateTrendingScore(post)
      }));
      
      scoredPosts.sort((a, b) => b.trendingScore - a.trendingScore);

      // Get full content for top trending posts
      for (const post of scoredPosts.slice(0, maxPosts)) {
        const fullPost = await this.extractPostContent(post.url);
        posts.push({
          ...post,
          ...fullPost
        });
        
        await this.page.waitForTimeout(1500);
      }

    } catch (error) {
      console.error('Error getting trending posts:', error);
      throw error;
    }

    return posts;
  }

  private calculateTrendingScore(post: any): number {
    // Algorithm to evaluate trending posts
    // Factors: score, comments, recency, engagement ratio
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
    
    // Markdown format
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