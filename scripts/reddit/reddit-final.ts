#!/usr/bin/env node

import { chromium } from 'playwright';
import { program } from 'commander';
import * as fs from 'fs/promises';
import * as path from 'path';

interface RedditPost {
  title: string;
  author: string;
  subreddit: string;
  url: string;
  score: number | string;
  comments?: number;
  content?: string;
  created?: string;
  isVideo?: boolean;
}

async function searchReddit(keyword: string, options: any) {
  const browser = await chromium.launch({ 
    headless: options.headless ?? true,
    args: ['--disable-blink-features=AutomationControlled']
  });
  
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    viewport: { width: 1920, height: 1080 }
  });
  
  const page = await context.newPage();
  const posts: RedditPost[] = [];
  
  try {
    // Navigate to Reddit search
    const searchUrl = `https://www.reddit.com/search/?q=${encodeURIComponent(keyword)}`;
    console.log(`🔍 Searching for: "${keyword}"`);
    await page.goto(searchUrl, { waitUntil: 'networkidle', timeout: 60000 });
    
    // Wait for content to load
    await page.waitForTimeout(3000);
    
    // Extract posts using a more reliable method
    const postData = await page.evaluate(() => {
      const posts = [];
      const articles = document.querySelectorAll('article');
      
      for (let i = 0; i < articles.length; i++) {
        const article = articles[i];
        try {
          // Get title
          const titleEl = article.querySelector('h3');
          if (!titleEl) continue;
          
          const title = titleEl.textContent?.trim() || '';
          
          // Get link
          const linkEl = article.querySelector('a[href*="/r/"][href*="/comments/"]');
          const url = linkEl ? `https://www.reddit.com${linkEl.getAttribute('href')}` : '';
          
          // Get subreddit
          const subredditEl = article.querySelector('a[href^="/r/"]:not([href*="/comments/"])');
          const subreddit = subredditEl?.textContent?.trim() || '';
          
          // Get author
          const authorEl = article.querySelector('a[href^="/user/"]');
          const author = authorEl?.textContent?.replace('u/', '') || '';
          
          // Get score and comments
          const buttons = article.querySelectorAll('button');
          let score = '0';
          let comments = 0;
          
          for (let j = 0; j < buttons.length; j++) {
            const button = buttons[j];
            const text = button.textContent || '';
            if (text.includes('upvote') || text.includes('downvote')) {
              const scoreEl = button.parentElement?.querySelector('div');
              if (scoreEl) score = scoreEl.textContent || '0';
            }
            if (text.includes('comment')) {
              const match = text.match(/(\d+)/);
              if (match) comments = parseInt(match[1]);
            }
          }
          
          posts.push({
            title,
            url,
            subreddit,
            author,
            score,
            comments
          });
        } catch (e) {
          console.error('Error extracting post:', e);
        }
      }
      
      return posts;
    });
    
    // Filter valid posts
    const validPosts = postData.filter(post => post.title && post.url);
    console.log(`✅ Found ${validPosts.length} posts`);
    
    // Visit each post to get content (limit to max posts)
    const maxPosts = parseInt(options.max) || 5;
    for (let i = 0; i < Math.min(validPosts.length, maxPosts); i++) {
      const post = validPosts[i];
      console.log(`📖 Extracting content from post ${i + 1}/${Math.min(validPosts.length, maxPosts)}: ${post.title.substring(0, 50)}...`);
      
      try {
        const newPage = await context.newPage();
        await newPage.goto(post.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await newPage.waitForTimeout(2000);
        
        const content = await newPage.evaluate(() => {
          // Try multiple selectors for content
          const selectors = [
            '[data-test-id="post-content"]',
            '[data-click-id="text"]',
            '.usertext-body .md',
            'div[slot="text-body"]'
          ];
          
          for (const selector of selectors) {
            const el = document.querySelector(selector);
            if (el?.textContent) {
              return el.textContent.trim();
            }
          }
          return '';
        });
        
        posts.push({
          ...post,
          content
        });
        
        await newPage.close();
      } catch (e) {
        console.error(`Error getting content for post: ${e}`);
        posts.push(post);
      }
      
      await page.waitForTimeout(1000);
    }
    
  } finally {
    await browser.close();
  }
  
  return posts;
}

async function getTrendingPosts(options: any) {
  const browser = await chromium.launch({ 
    headless: options.headless ?? true 
  });
  
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    viewport: { width: 1920, height: 1080 }
  });
  
  const page = await context.newPage();
  const posts: RedditPost[] = [];
  
  try {
    // Navigate to Reddit top posts
    const days = parseInt(options.days) || 1;
    const timeFilter = days === 1 ? 'day' : days <= 7 ? 'week' : 'month';
    const url = `https://www.reddit.com/top/?t=${timeFilter}`;
    
    console.log(`📈 Getting trending posts from last ${days} day(s)`);
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(3000);
    
    // Scroll to load more
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => window.scrollBy(0, window.innerHeight));
      await page.waitForTimeout(1500);
    }
    
    // Extract trending posts
    const postData = await page.evaluate(() => {
      const posts = [];
      const articles = document.querySelectorAll('article');
      
      for (let i = 0; i < articles.length; i++) {
        const article = articles[i];
        try {
          const titleEl = article.querySelector('h3');
          if (!titleEl) continue;
          
          const title = titleEl.textContent?.trim() || '';
          const linkEl = article.querySelector('a[href*="/r/"][href*="/comments/"]');
          const url = linkEl ? `https://www.reddit.com${linkEl.getAttribute('href')}` : '';
          const subredditEl = article.querySelector('a[href^="/r/"]:not([href*="/comments/"])');
          const subreddit = subredditEl?.textContent?.trim() || '';
          const authorEl = article.querySelector('a[href^="/user/"]');
          const author = authorEl?.textContent?.replace('u/', '') || '';
          
          // Extract score
          let score = '0';
          const buttons = article.querySelectorAll('button');
          for (let j = 0; j < buttons.length; j++) {
            const button = buttons[j];
            if (button.textContent?.includes('upvote')) {
              const scoreEl = button.parentElement?.querySelector('div');
              if (scoreEl) score = scoreEl.textContent || '0';
              break;
            }
          }
          
          posts.push({ title, url, subreddit, author, score });
        } catch (e) {}
      }
      
      return posts;
    });
    
    const validPosts = postData.filter(post => post.title && post.url);
    console.log(`✅ Found ${validPosts.length} trending posts`);
    
    const maxPosts = parseInt(options.max) || 10;
    for (let i = 0; i < Math.min(validPosts.length, maxPosts); i++) {
      posts.push(validPosts[i]);
    }
    
  } finally {
    await browser.close();
  }
  
  return posts;
}

function formatOutput(posts: RedditPost[], format: string) {
  if (format === 'markdown') {
    let markdown = '# Reddit Posts\n\n';
    posts.forEach((post, i) => {
      markdown += `## ${i + 1}. ${post.title}\n\n`;
      markdown += `- **Subreddit:** ${post.subreddit}\n`;
      markdown += `- **Author:** ${post.author}\n`;
      markdown += `- **Score:** ${post.score}\n`;
      if (post.comments) markdown += `- **Comments:** ${post.comments}\n`;
      markdown += `- **URL:** ${post.url}\n`;
      if (post.content) {
        markdown += `\n### Content\n${post.content}\n`;
      }
      markdown += '\n---\n\n';
    });
    return markdown;
  }
  
  return JSON.stringify(posts, null, 2);
}

// CLI Setup
program
  .name('reddit-scraper')
  .version('1.0.0')
  .description('Scrape Reddit posts');

program
  .command('search <keyword>')
  .description('Search Reddit for posts')
  .option('-m, --max <number>', 'Max posts', '5')
  .option('-f, --format <format>', 'Output format', 'json')
  .option('-o, --output <file>', 'Output file')
  .option('--no-headless', 'Show browser')
  .action(async (keyword, options) => {
    try {
      const posts = await searchReddit(keyword, options);
      const output = formatOutput(posts, options.format);
      
      if (options.output) {
        await fs.writeFile(options.output, output);
        console.log(`📝 Saved to ${options.output}`);
      } else {
        console.log(output);
      }
    } catch (error) {
      console.error('❌ Error:', error);
      process.exit(1);
    }
  });

program
  .command('trending')
  .description('Get trending posts')
  .option('-d, --days <number>', 'Days', '1')
  .option('-m, --max <number>', 'Max posts', '10')
  .option('-f, --format <format>', 'Output format', 'json')
  .option('--no-headless', 'Show browser')
  .action(async (options) => {
    try {
      const posts = await getTrendingPosts(options);
      const output = formatOutput(posts, options.format);
      console.log(output);
    } catch (error) {
      console.error('❌ Error:', error);
      process.exit(1);
    }
  });

program
  .command('test')
  .description('Test with buildpad keyword')
  .action(async () => {
    try {
      const posts = await searchReddit('buildpad', { max: '3' });
      if (posts.length === 0) {
        console.error('❌ Test FAILED: No results for buildpad');
        
        // Try alternative search terms
        console.log('\n🔄 Trying alternative search: "build pad"');
        const altPosts = await searchReddit('build pad', { max: '3' });
        if (altPosts.length > 0) {
          console.log(`✅ Found ${altPosts.length} posts with "build pad"`);
          console.log(formatOutput(altPosts, 'json'));
        }
      } else {
        console.log(`✅ Test PASSED: Found ${posts.length} posts`);
        console.log(formatOutput(posts, 'json'));
      }
    } catch (error) {
      console.error('❌ Test error:', error);
      process.exit(1);
    }
  });

program.parse(process.argv);