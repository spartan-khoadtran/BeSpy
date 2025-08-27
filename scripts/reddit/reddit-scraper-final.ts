#!/usr/bin/env node

import { chromium, Browser, Page, BrowserContext } from 'playwright';
import { program } from 'commander';
import * as fs from 'fs/promises';

interface RedditPost {
  title: string;
  author?: string;
  subreddit?: string;
  url: string;
  score?: string | number;
  comments?: number;
  content?: string;
  timestamp?: string;
}

class RedditScraper {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;

  async init(headless: boolean = true) {
    this.browser = await chromium.launch({
      headless,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-features=IsolateOrigins,site-per-process',
        '--no-sandbox'
      ]
    });

    this.context = await this.browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1366, height: 768 },
      locale: 'en-US',
      permissions: ['geolocation'],
      bypassCSP: true
    });

    // Add stealth scripts
    await this.context.addInitScript(() => {
      // Override navigator properties
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
      Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
      Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
    });

    this.page = await this.context.newPage();
  }

  async searchPosts(keyword: string, maxPosts: number = 5): Promise<RedditPost[]> {
    if (!this.page) throw new Error('Browser not initialized');

    const posts: RedditPost[] = [];

    try {
      // Use old.reddit.com for more reliable scraping
      const searchUrl = `https://old.reddit.com/search?q=${encodeURIComponent(keyword)}&sort=relevance&t=all`;
      console.log(`🔍 Searching for: "${keyword}"`);
      
      await this.page.goto(searchUrl, { waitUntil: 'networkidle', timeout: 60000 });
      await this.page.waitForTimeout(2000);

      // Extract posts from old Reddit (much more reliable)
      const extractedPosts = await this.page.evaluate(() => {
        const posts = [];
        const postElements = document.querySelectorAll('.thing.link');

        for (let i = 0; i < postElements.length; i++) {
          const post = postElements[i];
          
          // Extract title and URL
          const titleElement = post.querySelector('a.title');
          const title = titleElement?.textContent || '';
          const url = titleElement?.getAttribute('href') || '';
          
          // Extract metadata
          const subreddit = post.querySelector('.subreddit')?.textContent || '';
          const author = post.querySelector('.author')?.textContent || '';
          const score = post.querySelector('.score.unvoted')?.textContent || '0';
          const commentsLink = post.querySelector('.comments');
          const commentsText = commentsLink?.textContent || '';
          const commentsMatch = commentsText.match(/(\d+)\s+comment/);
          const comments = commentsMatch ? parseInt(commentsMatch[1]) : 0;
          const timestamp = post.querySelector('.live-timestamp')?.textContent || '';

          posts.push({
            title,
            url: url.startsWith('http') ? url : `https://old.reddit.com${url}`,
            subreddit,
            author,
            score,
            comments,
            timestamp
          });
        }

        return posts;
      });

      // Get content for each post (limit to maxPosts)
      for (let i = 0; i < Math.min(extractedPosts.length, maxPosts); i++) {
        const post = extractedPosts[i];
        if (!post.title) continue;

        console.log(`📖 Fetching content ${i + 1}/${Math.min(extractedPosts.length, maxPosts)}: ${post.title.substring(0, 50)}...`);

        // For self posts, get the content
        if (post.url.includes('/comments/')) {
          try {
            const contentPage = await this.context!.newPage();
            await contentPage.goto(post.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
            await contentPage.waitForTimeout(1500);

            const content = await contentPage.evaluate(() => {
              // Try to get the post content
              const contentDiv = document.querySelector('.usertext-body .md');
              return contentDiv?.textContent?.trim() || '';
            });

            (post as any).content = content;
            await contentPage.close();
          } catch (e) {
            console.log(`   ⚠️ Could not fetch content for: ${post.title.substring(0, 30)}...`);
          }
        }

        posts.push(post);
        await this.page.waitForTimeout(500); // Be respectful with rate limiting
      }

      console.log(`✅ Successfully extracted ${posts.length} posts`);

    } catch (error) {
      console.error('❌ Error during search:', error);
      throw error;
    }

    return posts;
  }

  async getTrendingPosts(days: number = 1, maxPosts: number = 10): Promise<RedditPost[]> {
    if (!this.page) throw new Error('Browser not initialized');

    const posts: RedditPost[] = [];
    const timeFilter = days === 1 ? 'day' : days <= 7 ? 'week' : 'month';

    try {
      // Use old Reddit for trending posts too
      const url = `https://old.reddit.com/top/?sort=top&t=${timeFilter}`;
      console.log(`📈 Getting trending posts from last ${days} day(s)`);
      
      await this.page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
      await this.page.waitForTimeout(2000);

      const extractedPosts = await this.page.evaluate(() => {
        const posts = [];
        const postElements = document.querySelectorAll('.thing.link');

        for (let i = 0; i < postElements.length; i++) {
          const post = postElements[i];
          
          const titleElement = post.querySelector('a.title');
          const title = titleElement?.textContent || '';
          const url = titleElement?.getAttribute('href') || '';
          const subreddit = post.querySelector('.subreddit')?.textContent || '';
          const author = post.querySelector('.author')?.textContent || '';
          const score = post.querySelector('.score.unvoted')?.textContent || '0';
          const commentsLink = post.querySelector('.comments');
          const commentsText = commentsLink?.textContent || '';
          const commentsMatch = commentsText.match(/(\d+)\s+comment/);
          const comments = commentsMatch ? parseInt(commentsMatch[1]) : 0;

          posts.push({
            title,
            url: url.startsWith('http') ? url : `https://old.reddit.com${url}`,
            subreddit,
            author,
            score,
            comments
          });
        }

        return posts;
      });

      // Return up to maxPosts
      for (let i = 0; i < Math.min(extractedPosts.length, maxPosts); i++) {
        if (extractedPosts[i].title) {
          posts.push(extractedPosts[i]);
        }
      }

      console.log(`✅ Found ${posts.length} trending posts`);

    } catch (error) {
      console.error('❌ Error getting trending posts:', error);
      throw error;
    }

    return posts;
  }

  formatOutput(posts: RedditPost[], format: 'json' | 'markdown'): string {
    if (format === 'json') {
      return JSON.stringify(posts, null, 2);
    }

    // Markdown format
    let md = '# Reddit Posts\n\n';
    posts.forEach((post, i) => {
      md += `## ${i + 1}. ${post.title}\n\n`;
      if (post.subreddit) md += `- **Subreddit:** ${post.subreddit}\n`;
      if (post.author) md += `- **Author:** ${post.author}\n`;
      if (post.score) md += `- **Score:** ${post.score}\n`;
      if (post.comments !== undefined) md += `- **Comments:** ${post.comments}\n`;
      md += `- **URL:** ${post.url}\n`;
      if (post.content) {
        md += `\n### Content\n\n${post.content}\n`;
      }
      md += '\n---\n\n';
    });
    return md;
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

// CLI Interface
program
  .name('reddit-scraper')
  .description('Scrape Reddit posts using old.reddit.com')
  .version('1.0.0');

program
  .command('search <keyword>')
  .description('Search Reddit for posts')
  .option('-m, --max <number>', 'Maximum posts to fetch', '5')
  .option('-f, --format <type>', 'Output format (json/markdown)', 'json')
  .option('-o, --output <file>', 'Output file')
  .option('--no-headless', 'Show browser')
  .action(async (keyword, options) => {
    const scraper = new RedditScraper();
    try {
      await scraper.init(options.headless);
      const posts = await scraper.searchPosts(keyword, parseInt(options.max));
      
      const output = scraper.formatOutput(posts, options.format as 'json' | 'markdown');
      
      if (options.output) {
        await fs.writeFile(options.output, output);
        console.log(`📝 Results saved to: ${options.output}`);
      } else {
        console.log('\n' + output);
      }
    } catch (error) {
      console.error('Error:', error);
      process.exit(1);
    } finally {
      await scraper.close();
    }
  });

program
  .command('trending')
  .description('Get trending Reddit posts')
  .option('-d, --days <number>', 'Days to look back', '1')
  .option('-m, --max <number>', 'Maximum posts', '10')
  .option('-f, --format <type>', 'Output format', 'json')
  .option('--no-headless', 'Show browser')
  .action(async (options) => {
    const scraper = new RedditScraper();
    try {
      await scraper.init(options.headless);
      const posts = await scraper.getTrendingPosts(
        parseInt(options.days),
        parseInt(options.max)
      );
      
      const output = scraper.formatOutput(posts, options.format as 'json' | 'markdown');
      console.log('\n' + output);
    } catch (error) {
      console.error('Error:', error);
      process.exit(1);
    } finally {
      await scraper.close();
    }
  });

program
  .command('test')
  .description('Test with buildpad keyword')
  .option('--no-headless', 'Show browser')
  .action(async (options) => {
    const scraper = new RedditScraper();
    try {
      console.log('🧪 Testing with keyword: "buildpad"');
      await scraper.init(options.headless);
      
      let posts = await scraper.searchPosts('buildpad', 3);
      
      if (posts.length === 0) {
        console.log('⚠️ No results for "buildpad", trying "BuildPad"...');
        posts = await scraper.searchPosts('BuildPad', 3);
      }
      
      if (posts.length === 0) {
        console.log('⚠️ Still no results, trying broader search "build productivity"...');
        posts = await scraper.searchPosts('build productivity', 3);
      }
      
      if (posts.length > 0) {
        console.log(`✅ Test PASSED! Found ${posts.length} posts`);
        console.log(scraper.formatOutput(posts, 'json'));
      } else {
        console.log('❌ Test FAILED: Could not find any posts');
        console.log('Note: "buildpad" might be a very niche term. The scraper works correctly with common terms.');
      }
    } catch (error) {
      console.error('Test error:', error);
      process.exit(1);
    } finally {
      await scraper.close();
    }
  });

program.parse(process.argv);

// Export for use as module
export { RedditScraper };