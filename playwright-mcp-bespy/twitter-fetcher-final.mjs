#!/usr/bin/env node

import { chromium } from 'playwright';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Twitter Data Fetcher - Final Implementation
 * 
 * This script can work in 3 modes:
 * 1. Connect to existing Chrome with debug port (if you have Chrome open with --remote-debugging-port=9222)
 * 2. Use persistent browser context (maintains cookies/login between runs)
 * 3. Launch fresh browser (requires manual login)
 */

async function fetchTwitterData(keyword = 'AI') {
  console.log(`\n🔍 Fetching Twitter data for: "${keyword}"\n`);
  
  let browser;
  let context;
  let page;
  
  try {
    // Try Method 1: Connect to existing Chrome debug session
    try {
      console.log('Attempting to connect to existing Chrome (port 9222)...');
      browser = await chromium.connectOverCDP('http://localhost:9222');
      context = browser.contexts()[0];
      const pages = context.pages();
      page = pages.length > 0 ? pages[0] : await context.newPage();
      console.log('✅ Connected to existing Chrome session!\n');
    } catch (e) {
      // Method 2: Use persistent context with saved login
      console.log('No debug Chrome found. Using persistent browser context...');
      const userDataDir = path.join(__dirname, 'browser-data');
      context = await chromium.launchPersistentContext(userDataDir, {
        headless: false,
        viewport: { width: 1280, height: 800 },
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      });
      page = context.pages()[0] || await context.newPage();
      browser = context;
      console.log('✅ Launched browser with persistent storage\n');
    }
    
    // Navigate to Twitter/X
    const searchUrl = `https://x.com/search?q=${encodeURIComponent(keyword)}&src=typed_query&f=live`;
    console.log(`Navigating to: ${searchUrl}`);
    
    try {
      await page.goto(searchUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 15000
      });
    } catch (navError) {
      console.log('Initial navigation timed out, continuing anyway...');
    }
    
    // Wait for page to settle
    await page.waitForTimeout(3000);
    
    // Check if we're logged in
    const currentUrl = page.url();
    if (currentUrl.includes('/login') || currentUrl.includes('flow/login')) {
      console.log('\n⚠️  You need to log in to Twitter/X');
      console.log('Please log in manually in the browser window that opened.');
      console.log('After logging in, press Enter here to continue...\n');
      
      // Wait for user to log in
      await new Promise(resolve => {
        process.stdin.resume();
        process.stdin.once('data', resolve);
      });
      
      // Navigate again after login
      await page.goto(searchUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 15000
      });
      await page.waitForTimeout(3000);
    }
    
    console.log('Waiting for tweets to load...');
    
    // Try to wait for tweet elements
    try {
      await page.waitForSelector('[data-testid="tweet"]', { timeout: 10000 });
    } catch (e) {
      console.log('Tweet elements not found with standard selector, trying alternative...');
    }
    
    // Scroll to load more tweets
    await page.evaluate(() => window.scrollBy(0, 500));
    await page.waitForTimeout(2000);
    
    // Extract tweets
    console.log('Extracting tweet data...\n');
    const tweets = await page.evaluate(() => {
      const results = [];
      const tweetElements = document.querySelectorAll('[data-testid="tweet"], article');
      
      for (let i = 0; i < Math.min(10, tweetElements.length); i++) {
        const tweet = tweetElements[i];
        
        try {
          // Get tweet text
          let text = '';
          const textEl = tweet.querySelector('[data-testid="tweetText"], [lang]');
          if (textEl) {
            text = textEl.innerText || textEl.textContent || '';
          }
          
          // Get author info
          let author = 'Unknown';
          let handle = '@unknown';
          
          // Try multiple selectors for author
          const authorLink = tweet.querySelector('a[href^="/"][tabindex="-1"], a[href*="/status/"]');
          if (authorLink) {
            const href = authorLink.getAttribute('href') || '';
            const match = href.match(/^\/([^\/]+)/);
            if (match) {
              handle = '@' + match[1];
              // Look for display name
              const nameEl = tweet.querySelector('[data-testid="User-Name"] span, [dir="ltr"] span');
              if (nameEl) {
                author = nameEl.innerText || nameEl.textContent || handle;
              }
            }
          }
          
          // Get metrics (simplified)
          const getMetric = (keyword) => {
            const elements = tweet.querySelectorAll('[role="button"] span');
            for (const el of elements) {
              const text = el.innerText || '';
              if (text && !isNaN(parseInt(text))) {
                const parentText = el.parentElement?.innerText || '';
                if (parentText.toLowerCase().includes(keyword)) {
                  return parseInt(text.replace(/[,K]/g, '')) || 0;
                }
              }
            }
            return 0;
          };
          
          // Get timestamp
          const timeEl = tweet.querySelector('time');
          const timestamp = timeEl ? timeEl.getAttribute('datetime') : new Date().toISOString();
          
          // Build URL
          const statusLink = tweet.querySelector('a[href*="/status/"]');
          const url = statusLink ? 'https://x.com' + statusLink.getAttribute('href') : '';
          
          if (text) {
            results.push({
              text: text.substring(0, 500),
              author,
              authorHandle: handle,
              timestamp,
              likes: getMetric('like'),
              retweets: getMetric('repost') || getMetric('retweet'),
              replies: getMetric('repl'),
              impressions: getMetric('view'),
              url
            });
          }
        } catch (err) {
          console.error('Error parsing tweet:', err.message);
        }
      }
      
      return results;
    });
    
    if (tweets.length === 0) {
      console.log('⚠️  No tweets found. This could be because:');
      console.log('  - The page didn\'t load properly');
      console.log('  - You\'re not logged in');
      console.log('  - Twitter/X changed their HTML structure');
      return [];
    }
    
    console.log(`✅ Extracted ${tweets.length} tweets\n`);
    
    // Generate reports
    const reportDir = path.join(__dirname, '..', 'reports');
    await fs.mkdir(reportDir, { recursive: true });
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const safeKeyword = keyword.replace(/[^a-z0-9]/gi, '-').toLowerCase();
    
    // Save Markdown report
    const mdContent = generateMarkdownReport(keyword, tweets);
    const mdFile = path.join(reportDir, `twitter-${safeKeyword}-${timestamp}.md`);
    await fs.writeFile(mdFile, mdContent);
    console.log(`📝 Markdown report: ${mdFile}`);
    
    // Save CSV report
    const csvContent = generateCSVReport(tweets);
    const csvFile = path.join(reportDir, `twitter-${safeKeyword}-${timestamp}.csv`);
    await fs.writeFile(csvFile, csvContent);
    console.log(`📊 CSV report: ${csvFile}`);
    
    // Save as latest
    await fs.writeFile(path.join(reportDir, 'latest.md'), mdContent);
    await fs.writeFile(path.join(reportDir, 'latest.csv'), csvContent);
    
    console.log('\n✅ Reports generated successfully!');
    
    return tweets;
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    throw error;
  } finally {
    // Close browser if we launched it
    if (browser && browser.close) {
      await browser.close();
    }
  }
}

function generateMarkdownReport(keyword, tweets) {
  let md = `# Twitter/X Search Report: ${keyword}\n\n`;
  md += `**Generated:** ${new Date().toLocaleString()}\n`;
  md += `**Total tweets:** ${tweets.length}\n\n`;
  md += `---\n\n`;
  
  tweets.forEach((tweet, i) => {
    md += `## ${i + 1}. ${tweet.author} (${tweet.authorHandle})\n\n`;
    md += `**Posted:** ${new Date(tweet.timestamp).toLocaleString()}\n\n`;
    md += `${tweet.text}\n\n`;
    md += `**Engagement:**\n`;
    md += `- ❤️ Likes: ${tweet.likes || 0}\n`;
    md += `- 🔄 Retweets: ${tweet.retweets || 0}\n`;
    md += `- 💬 Replies: ${tweet.replies || 0}\n`;
    md += `- 👁 Views: ${tweet.impressions || 0}\n\n`;
    if (tweet.url) {
      md += `[View Tweet](${tweet.url})\n\n`;
    }
    md += `---\n\n`;
  });
  
  return md;
}

function generateCSVReport(tweets) {
  const headers = ['Author', 'Handle', 'Timestamp', 'Text', 'Likes', 'Retweets', 'Replies', 'Views', 'URL'];
  const rows = tweets.map(t => [
    t.author,
    t.authorHandle,
    t.timestamp,
    `"${t.text.replace(/"/g, '""').replace(/\n/g, ' ')}"`,
    t.likes || 0,
    t.retweets || 0,
    t.replies || 0,
    t.impressions || 0,
    t.url || ''
  ]);
  
  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

// Main execution
const keyword = process.argv[2] || 'AI';

console.log('🐦 Twitter/X Data Fetcher');
console.log('========================\n');

fetchTwitterData(keyword)
  .then(tweets => {
    if (tweets.length > 0) {
      console.log(`\n✅ Successfully fetched ${tweets.length} tweets!`);
      console.log('📁 Check the reports/ folder for your data.\n');
    }
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Failed to fetch data');
    process.exit(1);
  });