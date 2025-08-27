#!/usr/bin/env node

import { chromium } from 'playwright';
import { program } from 'commander';
import * as fs from 'fs/promises';

interface RedditPost {
  id: string;
  title: string;
  author: string;
  subreddit: string;
  url: string;
  permalink: string;
  score: number;
  num_comments: number;
  selftext?: string;
  created_utc: number;
  is_video: boolean;
}

class RedditAPIScraper {
  async searchReddit(keyword: string, limit: number = 10): Promise<RedditPost[]> {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    });
    const page = await context.newPage();

    try {
      // Use Reddit's JSON API endpoint
      const searchUrl = `https://www.reddit.com/search.json?q=${encodeURIComponent(keyword)}&limit=${limit}&sort=relevance&raw_json=1`;
      console.log(`🔍 Searching Reddit API for: "${keyword}"`);
      
      const response = await page.goto(searchUrl);
      const jsonText = await response?.text();
      
      if (!jsonText) {
        console.log('❌ No response from Reddit');
        return [];
      }

      const data = JSON.parse(jsonText);
      
      if (!data.data || !data.data.children) {
        console.log('❌ Invalid response structure');
        return [];
      }

      const posts: RedditPost[] = data.data.children.map((child: any) => ({
        id: child.data.id,
        title: child.data.title,
        author: child.data.author,
        subreddit: child.data.subreddit_name_prefixed,
        url: child.data.url,
        permalink: `https://reddit.com${child.data.permalink}`,
        score: child.data.score,
        num_comments: child.data.num_comments,
        selftext: child.data.selftext,
        created_utc: child.data.created_utc,
        is_video: child.data.is_video
      }));

      console.log(`✅ Found ${posts.length} posts`);
      return posts;
      
    } catch (error) {
      console.error('❌ Error:', error);
      return [];
    } finally {
      await browser.close();
    }
  }

  async getTrending(timeframe: string = 'day', limit: number = 10): Promise<RedditPost[]> {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    });
    const page = await context.newPage();

    try {
      const url = `https://www.reddit.com/top.json?t=${timeframe}&limit=${limit}&raw_json=1`;
      console.log(`📈 Getting top posts from: ${timeframe}`);
      
      const response = await page.goto(url);
      const jsonText = await response?.text();
      
      if (!jsonText) return [];

      const data = JSON.parse(jsonText);
      const posts: RedditPost[] = data.data.children.map((child: any) => ({
        id: child.data.id,
        title: child.data.title,
        author: child.data.author,
        subreddit: child.data.subreddit_name_prefixed,
        url: child.data.url,
        permalink: `https://reddit.com${child.data.permalink}`,
        score: child.data.score,
        num_comments: child.data.num_comments,
        selftext: child.data.selftext,
        created_utc: child.data.created_utc,
        is_video: child.data.is_video
      }));

      console.log(`✅ Found ${posts.length} trending posts`);
      return posts;
      
    } finally {
      await browser.close();
    }
  }

  formatOutput(posts: RedditPost[], format: 'json' | 'markdown'): string {
    if (format === 'json') {
      return JSON.stringify(posts, null, 2);
    }

    let md = '# Reddit Posts\n\n';
    posts.forEach((post, i) => {
      const date = new Date(post.created_utc * 1000).toLocaleString();
      md += `## ${i + 1}. ${post.title}\n\n`;
      md += `- **Subreddit:** ${post.subreddit}\n`;
      md += `- **Author:** u/${post.author}\n`;
      md += `- **Score:** ${post.score} | **Comments:** ${post.num_comments}\n`;
      md += `- **Posted:** ${date}\n`;
      md += `- **Link:** ${post.permalink}\n`;
      if (post.is_video) md += `- **🎥 Video Post**\n`;
      if (post.selftext) {
        md += `\n### Content\n\n${post.selftext.substring(0, 500)}${post.selftext.length > 500 ? '...' : ''}\n`;
      }
      md += '\n---\n\n';
    });
    return md;
  }
}

// CLI
program
  .name('reddit-api')
  .version('1.0.0')
  .description('Reddit scraper using JSON API');

program
  .command('search <keyword>')
  .description('Search Reddit')
  .option('-l, --limit <number>', 'Limit results', '10')
  .option('-f, --format <type>', 'Output format (json/markdown)', 'json')
  .option('-o, --output <file>', 'Output file')
  .action(async (keyword, options) => {
    const scraper = new RedditAPIScraper();
    const posts = await scraper.searchReddit(keyword, parseInt(options.limit));
    const output = scraper.formatOutput(posts, options.format as 'json' | 'markdown');
    
    if (options.output) {
      await fs.writeFile(options.output, output);
      console.log(`📝 Saved to: ${options.output}`);
    } else {
      console.log(output);
    }
  });

program
  .command('trending')
  .description('Get trending posts')
  .option('-t, --time <period>', 'Time period (hour/day/week/month/year/all)', 'day')
  .option('-l, --limit <number>', 'Limit results', '10')
  .option('-f, --format <type>', 'Output format', 'json')
  .action(async (options) => {
    const scraper = new RedditAPIScraper();
    const posts = await scraper.getTrending(options.time, parseInt(options.limit));
    console.log(scraper.formatOutput(posts, options.format as 'json' | 'markdown'));
  });

program
  .command('test')
  .description('Test with buildpad')
  .action(async () => {
    const scraper = new RedditAPIScraper();
    console.log('🧪 Testing "buildpad" search...');
    let posts = await scraper.searchReddit('buildpad', 5);
    
    if (posts.length === 0) {
      console.log('No results for "buildpad", trying variations...');
      posts = await scraper.searchReddit('build pad', 5);
    }
    
    if (posts.length > 0) {
      console.log('✅ Test PASSED!');
      console.log(scraper.formatOutput(posts, 'json'));
    } else {
      console.log('❌ No results found for "buildpad" or variations');
      console.log('\nTrying with "javascript" to verify scraper works...');
      posts = await scraper.searchReddit('javascript', 2);
      if (posts.length > 0) {
        console.log('✅ Scraper works! "buildpad" just has no Reddit posts.');
        console.log(`Found ${posts.length} posts for "javascript"`);
      }
    }
  });

program.parse(process.argv);