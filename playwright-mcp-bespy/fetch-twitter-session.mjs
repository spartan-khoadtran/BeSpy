#!/usr/bin/env node

import { chromium } from 'playwright';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Instructions for using existing Chrome session:
console.log(`
================================================================================
To use your existing Chrome session with Twitter already logged in:

1. First, close all Chrome instances
2. Launch Chrome with remote debugging enabled:
   
   On Mac/Linux:
   google-chrome --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug
   
   On Windows:
   chrome.exe --remote-debugging-port=9222 --user-data-dir=C:\\temp\\chrome-debug

3. Log into Twitter in this Chrome instance
4. Run this script - it will connect to your existing session
================================================================================
`);

async function fetchTwitterData(keyword = 'AI') {
  let browser;
  let page;
  
  try {
    // Try to connect to existing Chrome session
    console.log('Attempting to connect to existing Chrome on port 9222...');
    browser = await chromium.connectOverCDP('http://localhost:9222');
    console.log('✅ Connected to existing Chrome session!');
    
    // Get existing pages or create new tab
    const pages = browser.contexts()[0].pages();
    if (pages.length > 0) {
      page = pages[0];
      console.log('Using existing tab');
    } else {
      page = await browser.contexts()[0].newPage();
      console.log('Created new tab in existing session');
    }
    
  } catch (error) {
    console.log('❌ Could not connect to existing Chrome session');
    console.log('Starting new browser with persistent storage...');
    
    // Use persistent context to maintain login
    const userDataDir = path.join(__dirname, 'browser-data');
    const context = await chromium.launchPersistentContext(userDataDir, {
      headless: false,
      viewport: null,
      args: ['--start-maximized']
    });
    
    page = context.pages()[0] || await context.newPage();
    browser = context;
  }
  
  try {
    // Navigate to Twitter search
    console.log(`Searching for: ${keyword}`);
    const searchUrl = `https://twitter.com/search?q=${encodeURIComponent(keyword)}&src=typed_query&f=live`;
    
    await page.goto(searchUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 20000
    });
    
    // Wait a bit for content to load
    await page.waitForTimeout(3000);
    
    // Check if logged in
    const isLoggedIn = await page.evaluate(() => {
      return !window.location.href.includes('/login') && 
             !document.querySelector('[href="/login"]');
    });
    
    if (!isLoggedIn) {
      console.log('⚠️  Not logged in. Please log in manually in the browser window.');
      console.log('After logging in, press Enter here to continue...');
      await new Promise(resolve => process.stdin.once('data', resolve));
    }
    
    console.log('Fetching tweets...');
    
    // Extract tweet data
    const tweets = await page.evaluate(() => {
      const tweetElements = document.querySelectorAll('[data-testid="tweet"]');
      const tweetData = [];
      
      for (let i = 0; i < Math.min(10, tweetElements.length); i++) {
        const tweet = tweetElements[i];
        
        try {
          // Extract text
          const textElement = tweet.querySelector('[data-testid="tweetText"]');
          const text = textElement ? textElement.innerText : '';
          
          // Extract author
          const authorElement = tweet.querySelector('[data-testid="User-Name"] a');
          const authorName = authorElement ? authorElement.querySelector('span')?.innerText : '';
          const authorHandle = authorElement ? authorElement.getAttribute('href')?.replace('/', '@') : '';
          
          // Extract metrics
          const getMetric = (ariaLabel) => {
            const element = tweet.querySelector(`[aria-label*="${ariaLabel}"]`);
            if (!element) return 0;
            const text = element.getAttribute('aria-label') || '';
            const match = text.match(/(\d+(?:,\d+)*(?:\.\d+)?[KMB]?)/);
            if (!match) return 0;
            const value = match[1].replace(',', '');
            if (value.includes('K')) return parseFloat(value) * 1000;
            if (value.includes('M')) return parseFloat(value) * 1000000;
            return parseInt(value) || 0;
          };
          
          const likes = getMetric('Like');
          const retweets = getMetric('Retweet');
          const replies = getMetric('Repl');
          const views = getMetric('View');
          
          // Extract timestamp
          const timeElement = tweet.querySelector('time');
          const timestamp = timeElement ? timeElement.getAttribute('datetime') : new Date().toISOString();
          
          // Build tweet URL
          const linkElement = tweet.querySelector('a[href*="/status/"]');
          const url = linkElement ? 'https://twitter.com' + linkElement.getAttribute('href') : '';
          
          tweetData.push({
            text: text.substring(0, 280),
            author: authorName,
            authorHandle,
            timestamp,
            likes,
            retweets,
            replies,
            impressions: views,
            url
          });
        } catch (err) {
          console.error('Error extracting tweet:', err);
        }
      }
      
      return tweetData;
    });
    
    console.log(`Found ${tweets.length} tweets`);
    
    // Generate reports
    const reportDir = path.join(__dirname, '..', 'reports');
    await fs.mkdir(reportDir, { recursive: true });
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    
    // Generate Markdown report
    const mdContent = generateMarkdownReport(keyword, tweets);
    const mdPath = path.join(reportDir, `twitter-${keyword}-${timestamp}.md`);
    await fs.writeFile(mdPath, mdContent);
    console.log(`✅ Markdown report saved: ${mdPath}`);
    
    // Generate CSV report
    const csvContent = generateCSVReport(tweets);
    const csvPath = path.join(reportDir, `twitter-${keyword}-${timestamp}.csv`);
    await fs.writeFile(csvPath, csvContent);
    console.log(`✅ CSV report saved: ${csvPath}`);
    
    // Also save as latest
    await fs.writeFile(path.join(reportDir, 'latest.md'), mdContent);
    await fs.writeFile(path.join(reportDir, 'latest.csv'), csvContent);
    
    return tweets;
    
  } finally {
    // Only close if we launched a new browser
    if (browser && browser.close) {
      await browser.close();
    } else {
      console.log('Keeping existing browser session open');
    }
  }
}

function generateMarkdownReport(keyword, tweets) {
  let report = `# Twitter Search Report: ${keyword}\n\n`;
  report += `Generated: ${new Date().toLocaleString()}\n\n`;
  report += `Total posts found: ${tweets.length}\n\n`;
  
  tweets.forEach((tweet, index) => {
    report += `## ${index + 1}. ${tweet.author} ${tweet.authorHandle}\n\n`;
    report += `**Time:** ${new Date(tweet.timestamp).toLocaleString()}\n\n`;
    report += `**Content:** ${tweet.text}\n\n`;
    report += `**Metrics:**\n`;
    report += `- 👁 Impressions: ${tweet.impressions.toLocaleString()}\n`;
    report += `- ❤️ Likes: ${tweet.likes.toLocaleString()}\n`;
    report += `- 🔄 Retweets: ${tweet.retweets.toLocaleString()}\n`;
    report += `- 💬 Replies: ${tweet.replies.toLocaleString()}\n\n`;
    if (tweet.url) {
      report += `[View on Twitter](${tweet.url})\n\n`;
    }
    report += `---\n\n`;
  });
  
  return report;
}

function generateCSVReport(tweets) {
  const headers = ['Author', 'Handle', 'Time', 'Text', 'Impressions', 'Likes', 'Retweets', 'Replies', 'URL'];
  const rows = tweets.map(tweet => [
    tweet.author,
    tweet.authorHandle,
    tweet.timestamp,
    `"${tweet.text.replace(/"/g, '""')}"`,
    tweet.impressions,
    tweet.likes,
    tweet.retweets,
    tweet.replies,
    tweet.url
  ]);
  
  return [headers, ...rows].map(row => row.join(',')).join('\n');
}

// Run the fetcher
const keyword = process.argv[2] || 'AI';
console.log(`Starting Twitter data fetch for keyword: ${keyword}`);

fetchTwitterData(keyword)
  .then(tweets => {
    console.log(`\n✅ Successfully fetched ${tweets.length} tweets!`);
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
  });