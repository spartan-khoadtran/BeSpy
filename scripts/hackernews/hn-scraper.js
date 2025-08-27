#!/usr/bin/env node

/**
 * Hacker News Scraper with Playwright
 * Searches HN using Algolia search and extracts full content
 * 
 * Usage:
 *   node hn-scraper.js "<keyword>" [maxPosts] [format]
 *   
 * Example:
 *   node hn-scraper.js "buildpad" 10 json
 */

import { chromium } from 'playwright';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class HackerNewsScraper {
  constructor(options = {}) {
    this.browser = null;
    this.page = null;
    this.options = {
      headless: options.headless !== false,
      maxPosts: options.maxPosts || 10,
      format: options.format || 'json'
    };
  }

  async init() {
    console.log('🚀 Initializing browser...');
    this.browser = await chromium.launch({
      headless: this.options.headless,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    this.page = await this.browser.newPage();
    await this.page.setViewportSize({ width: 1280, height: 800 });
  }

  async searchHackerNews(keyword) {
    console.log(`🔍 Searching for: "${keyword}"`);
    
    // Use Algolia HN search for better results
    const searchUrl = `https://hn.algolia.com/?query=${encodeURIComponent(keyword)}&sort=byPopularity&prefix=false&page=0&dateRange=all&type=all`;
    
    await this.page.goto(searchUrl, { waitUntil: 'networkidle' });
    await this.page.waitForTimeout(3000);
    
    // Extract search results
    const results = await this.page.evaluate((maxPosts) => {
      const stories = [];
      // Updated selector for Algolia search results
      const items = document.querySelectorAll('article');
      
      for (let i = 0; i < Math.min(items.length, maxPosts); i++) {
        const item = items[i];
        
        // Extract title - look for the main story link
        const titleLinks = item.querySelectorAll('a');
        let title = '';
        let url = '';
        let hnUrl = '';
        
        // Find the title link (usually the first or second link)
        for (const link of titleLinks) {
          const linkText = link.textContent.trim();
          if (linkText && linkText.length > 20 && !linkText.includes('points') && !linkText.includes('comments')) {
            title = linkText;
            // Check if it's an HN link or external
            if (link.href.includes('news.ycombinator.com/item')) {
              hnUrl = link.href;
            } else if (link.href.includes('http') && !link.href.includes('news.ycombinator.com/user')) {
              url = link.href;
            }
            break;
          }
        }
        
        // Extract metadata from links
        let points = 0;
        let author = '';
        let commentCount = 0;
        let createdAt = '';
        
        // Look for points, author, comments in the links
        for (const link of titleLinks) {
          const text = link.textContent.trim();
          
          // Points
          if (text.includes('point')) {
            const match = text.match(/(\d+)\s*point/);
            if (match) points = parseInt(match[1]);
          }
          
          // Author (user link)
          if (link.href.includes('news.ycombinator.com/user?id=')) {
            author = text;
          }
          
          // Comments
          if (text.includes('comment')) {
            const match = text.match(/(\d+)\s*comment/);
            if (match) commentCount = parseInt(match[1]);
            if (!hnUrl && link.href.includes('news.ycombinator.com/item')) {
              hnUrl = link.href;
            }
          }
          
          // Time
          if (text.includes('ago') || text.includes('day') || text.includes('month') || text.includes('year')) {
            if (!text.includes('point') && !text.includes('comment')) {
              createdAt = text;
            }
          }
        }
        
        // Also check for the HN URL in case we missed it
        if (!hnUrl) {
          const hnLink = item.querySelector('a[href*="news.ycombinator.com/item"]');
          if (hnLink) hnUrl = hnLink.href;
        }
        
        if (title) {
          stories.push({
            title,
            url: url || hnUrl, // Use HN URL if no external URL
            hnUrl,
            points,
            author,
            commentCount,
            createdAt,
            content: null, // Will be filled later
            comments: []  // Will be filled later
          });
        }
      }
      
      return stories;
    }, this.options.maxPosts);
    
    console.log(`📊 Found ${results.length} stories`);
    return results;
  }

  async extractStoryContent(story) {
    try {
      console.log(`📄 Extracting content for: ${story.title.substring(0, 50)}...`);
      
      // If it's an external link, we'll note that
      if (story.url && !story.url.includes('news.ycombinator.com')) {
        story.contentType = 'external';
        story.contentNote = 'External link - content not extracted';
      }
      
      // Extract comments from HN discussion
      if (story.hnUrl) {
        await this.page.goto(story.hnUrl, { waitUntil: 'networkidle', timeout: 30000 });
        await this.page.waitForTimeout(1000);
        
        // Extract story text if it's a text post
        const storyText = await this.page.evaluate(() => {
          const textEl = document.querySelector('.toptext, .fatitem .comment');
          return textEl ? textEl.textContent.trim() : null;
        });
        
        if (storyText) {
          story.content = storyText;
          story.contentType = 'text';
        }
        
        // Extract top comments
        const comments = await this.page.evaluate(() => {
          const commentEls = document.querySelectorAll('.comment-tree .athing.comtr');
          const topComments = [];
          
          for (let i = 0; i < Math.min(commentEls.length, 5); i++) {
            const commentEl = commentEls[i];
            
            const authorEl = commentEl.querySelector('.hnuser');
            const author = authorEl ? authorEl.textContent : 'unknown';
            
            const textEl = commentEl.querySelector('.commtext');
            const text = textEl ? textEl.textContent.trim() : '';
            
            const voteEl = commentEl.querySelector('.votelinks');
            const hasVotes = voteEl ? true : false;
            
            if (text) {
              topComments.push({
                author,
                text: text.substring(0, 500), // Limit comment length
                hasVotes
              });
            }
          }
          
          return topComments;
        });
        
        story.topComments = comments;
        console.log(`  ✅ Extracted ${comments.length} comments`);
      }
      
    } catch (error) {
      console.log(`  ⚠️  Error extracting content: ${error.message}`);
      story.extractionError = error.message;
    }
    
    return story;
  }

  async scrape(keyword) {
    try {
      await this.init();
      
      // Search for stories
      const stories = await this.searchHackerNews(keyword);
      
      if (stories.length === 0) {
        console.log('⚠️  No stories found for this keyword');
        return {
          keyword,
          stories: [],
          extractedAt: new Date().toISOString()
        };
      }
      
      // Extract content for each story
      console.log(`\n📚 Extracting detailed content for ${stories.length} stories...`);
      for (const story of stories) {
        await this.extractStoryContent(story);
        // Add delay to be respectful
        await this.page.waitForTimeout(1000);
      }
      
      return {
        keyword,
        stories,
        extractedAt: new Date().toISOString(),
        totalStories: stories.length
      };
      
    } finally {
      if (this.browser) {
        await this.browser.close();
      }
    }
  }

  formatAsJson(data) {
    return JSON.stringify(data, null, 2);
  }

  formatAsMarkdown(data) {
    const { keyword, stories, extractedAt, totalStories } = data;
    
    let markdown = `# Hacker News Search Results\n\n`;
    markdown += `**Search Query:** ${keyword}\n`;
    markdown += `**Extracted At:** ${new Date(extractedAt).toLocaleString()}\n`;
    markdown += `**Total Stories:** ${totalStories}\n\n`;
    markdown += `---\n\n`;
    
    stories.forEach((story, index) => {
      markdown += `## ${index + 1}. ${story.title}\n\n`;
      markdown += `- **Author:** ${story.author || 'Unknown'}\n`;
      markdown += `- **Posted:** ${story.createdAt || 'Unknown'}\n`;
      markdown += `- **Points:** ${story.points || 0}\n`;
      markdown += `- **Comments:** ${story.commentCount || 0}\n`;
      
      if (story.url) {
        markdown += `- **URL:** [${story.url}](${story.url})\n`;
      }
      if (story.hnUrl) {
        markdown += `- **HN Discussion:** [Link](${story.hnUrl})\n`;
      }
      
      markdown += `\n`;
      
      if (story.content) {
        markdown += `### Content\n\n${story.content}\n\n`;
      } else if (story.contentNote) {
        markdown += `### Content\n\n_${story.contentNote}_\n\n`;
      }
      
      if (story.topComments && story.topComments.length > 0) {
        markdown += `### Top Comments\n\n`;
        story.topComments.forEach((comment, i) => {
          markdown += `${i + 1}. **${comment.author}:**\n   ${comment.text}\n\n`;
        });
      }
      
      markdown += `---\n\n`;
    });
    
    return markdown;
  }

  async saveResults(data, keyword) {
    const date = new Date();
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dateStr = `${date.getDate()}-${monthNames[date.getMonth()]}-${date.getFullYear()}`;
    
    const outputDir = path.join(__dirname, '..', '..', 'report', 'hackernews', dateStr);
    await fs.mkdir(outputDir, { recursive: true });
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    const safeKeyword = keyword.replace(/[^a-zA-Z0-9\s]/g, '_').replace(/\s+/g, '_').substring(0, 50).toLowerCase();
    
    const results = [];
    
    // Save JSON
    const jsonPath = path.join(outputDir, `${safeKeyword}-${timestamp}.json`);
    await fs.writeFile(jsonPath, this.formatAsJson(data));
    console.log(`✅ JSON saved to: ${jsonPath}`);
    results.push(jsonPath);
    
    // Save Markdown
    const mdPath = path.join(outputDir, `${safeKeyword}-${timestamp}.md`);
    await fs.writeFile(mdPath, this.formatAsMarkdown(data));
    console.log(`✅ Markdown saved to: ${mdPath}`);
    results.push(mdPath);
    
    return results;
  }
}

// CLI Handler
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(`
🔥 Hacker News Scraper with Playwright

Usage:
  node hn-scraper.js "<keyword>" [maxPosts]

Arguments:
  keyword   - Search term (required)
  maxPosts  - Maximum posts to extract (default: 10)

Examples:
  node hn-scraper.js "buildpad"
  node hn-scraper.js "AI startup" 20
  node hn-scraper.js "YC companies" 5

Output:
  - JSON file with full data
  - Markdown file with formatted results
  - Saved to: report/hackernews/DD-MMM-YYYY/
`);
    process.exit(0);
  }
  
  const keyword = args[0];
  const maxPosts = args[1] ? parseInt(args[1]) : 10;
  
  console.log('\n🔥 Hacker News Scraper');
  console.log('=' .repeat(60));
  console.log(`📌 Search Keyword: "${keyword}"`);
  console.log(`📊 Max Posts: ${maxPosts}`);
  console.log('=' .repeat(60) + '\n');
  
  try {
    const scraper = new HackerNewsScraper({ maxPosts });
    const data = await scraper.scrape(keyword);
    
    if (data.stories.length === 0) {
      console.log('\n⚠️  No results found. Try a different keyword.');
      process.exit(1);
    }
    
    const files = await scraper.saveResults(data, keyword);
    
    console.log('\n' + '=' .repeat(60));
    console.log('✨ Extraction complete!');
    console.log(`📊 Extracted ${data.stories.length} stories`);
    console.log('📁 Files saved:');
    files.forEach(f => console.log(`   - ${f}`));
    console.log('=' .repeat(60));
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run if executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export default HackerNewsScraper;