#!/usr/bin/env node

import { chromium } from 'playwright';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log(`
================================================================================
SETUP INSTRUCTIONS - Connect to your existing Chrome:

1. Close all Chrome windows
2. Open Terminal and run:
   /Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome --remote-debugging-port=9222

3. Log into Twitter in that Chrome window
4. Run this script again - it will connect to your session
================================================================================
`);

async function fetchTwitterData(keyword = 'AI') {
  let browser;
  let page;
  
  try {
    // Connect to existing Chrome with debugging port
    console.log('Connecting to Chrome on port 9222...');
    browser = await chromium.connectOverCDP('http://localhost:9222');
    console.log('✅ Connected to your Chrome session!');
    
    // Get the first context and page
    const defaultContext = browser.contexts()[0];
    const pages = defaultContext.pages();
    
    if (pages.length > 0) {
      // Use existing tab
      page = pages[0];
      console.log('Using existing tab');
    } else {
      // Create new tab
      page = await defaultContext.newPage();
      console.log('Created new tab');
    }
    
    // Navigate to Twitter search
    console.log(`\nSearching Twitter for: "${keyword}"`);
    const searchUrl = `https://x.com/search?q=${encodeURIComponent(keyword)}&src=typed_query&f=live`;
    
    try {
      await page.goto(searchUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 15000
      });
    } catch (error) {
      console.log('Retrying navigation...');
      await page.goto(searchUrl, {
        waitUntil: 'load',
        timeout: 30000
      });
    }
    
    // Wait for content
    console.log('Waiting for tweets to load...');
    await page.waitForTimeout(5000);
    
    // Scroll to load more tweets
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight / 2);
    });
    await page.waitForTimeout(2000);
    
    // Extract tweet data
    console.log('Extracting tweet data...');
    const tweets = await page.evaluate(() => {
      const tweetElements = document.querySelectorAll('[data-testid="tweet"]');
      const tweetData = [];
      
      for (let i = 0; i < Math.min(10, tweetElements.length); i++) {
        const tweet = tweetElements[i];
        
        try {
          // Extract text
          const textElement = tweet.querySelector('[data-testid="tweetText"]');
          const text = textElement ? textElement.innerText : '';
          
          // Extract author info
          const userLink = tweet.querySelector('a[href^="/"][href*="/status/"]');
          let author = '';
          let authorHandle = '';
          
          if (userLink) {
            const href = userLink.getAttribute('href');
            const parts = href.split('/');
            if (parts.length >= 2) {
              authorHandle = '@' + parts[1];
              // Try to find display name
              const nameElement = tweet.querySelector('[data-testid="User-Name"] span:not([dir])');
              author = nameElement ? nameElement.innerText : authorHandle;
            }
          }
          
          // Extract engagement metrics
          const getMetricValue = (testId) => {
            const button = tweet.querySelector(`[data-testid="${testId}"]`);
            if (!button) return 0;
            const span = button.querySelector('span[data-testid]');
            if (!span) return 0;
            const text = span.innerText || '0';
            const value = text.replace(/[,K]/g, '');
            if (text.includes('K')) return Math.round(parseFloat(value) * 1000);
            return parseInt(value) || 0;
          };
          
          const likes = getMetricValue('like');
          const retweets = getMetricValue('retweet');
          const replies = getMetricValue('reply');
          
          // Get view count
          let impressions = 0;
          const viewsElement = tweet.querySelector('[href$="/analytics"]');
          if (viewsElement) {
            const viewText = viewsElement.innerText || '0';
            const viewValue = viewText.replace(/[,KM]/g, '');
            if (viewText.includes('M')) impressions = Math.round(parseFloat(viewValue) * 1000000);
            else if (viewText.includes('K')) impressions = Math.round(parseFloat(viewValue) * 1000);
            else impressions = parseInt(viewValue) || 0;
          }
          
          // Extract timestamp
          const timeElement = tweet.querySelector('time');
          const timestamp = timeElement ? timeElement.getAttribute('datetime') : new Date().toISOString();
          
          // Build tweet URL
          const statusLink = tweet.querySelector('a[href*="/status/"]');
          const url = statusLink ? 'https://x.com' + statusLink.getAttribute('href') : '';
          
          tweetData.push({
            text: text.substring(0, 500),
            author,
            authorHandle,
            timestamp,
            likes,
            retweets,
            replies,
            impressions,
            url
          });
        } catch (err) {
          console.error('Error extracting tweet:', err.message);
        }
      }
      
      return tweetData;
    });
    
    console.log(`\n✅ Found ${tweets.length} tweets`);
    
    if (tweets.length === 0) {
      console.log('\n⚠️  No tweets found. The page might not have loaded properly.');
      console.log('Please check if you are logged into Twitter in the Chrome window.');
      return [];
    }
    
    // Generate reports
    console.log('\nGenerating reports...');
    const reportDir = path.join(__dirname, '..', 'reports');
    await fs.mkdir(reportDir, { recursive: true });
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    
    // Generate Markdown report
    const mdContent = generateMarkdownReport(keyword, tweets);
    const mdPath = path.join(reportDir, `twitter-${keyword.replace(/\s+/g, '-')}-${timestamp}.md`);
    await fs.writeFile(mdPath, mdContent);
    console.log(`✅ Markdown report: ${mdPath}`);
    
    // Generate CSV report
    const csvContent = generateCSVReport(tweets);
    const csvPath = path.join(reportDir, `twitter-${keyword.replace(/\s+/g, '-')}-${timestamp}.csv`);
    await fs.writeFile(csvPath, csvContent);
    console.log(`✅ CSV report: ${csvPath}`);
    
    // Save as latest
    await fs.writeFile(path.join(reportDir, 'latest.md'), mdContent);
    await fs.writeFile(path.join(reportDir, 'latest.csv'), csvContent);
    console.log('✅ Saved as latest.md and latest.csv');
    
    return tweets;
    
  } catch (error) {
    if (error.message.includes('connect ECONNREFUSED')) {
      console.error('\n❌ Could not connect to Chrome!');
      console.error('Please make sure Chrome is running with debugging enabled:');
      console.error('/Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome --remote-debugging-port=9222');
    } else {
      console.error('\n❌ Error:', error.message);
    }
    throw error;
  } finally {
    // Don't close the browser - keep the session alive
    console.log('\nKeeping Chrome session open');
  }
}

function generateMarkdownReport(keyword, tweets) {
  let report = `# Twitter Search Report: ${keyword}\n\n`;
  report += `Generated: ${new Date().toLocaleString()}\n\n`;
  report += `Total posts found: ${tweets.length}\n\n`;
  
  tweets.forEach((tweet, index) => {
    report += `## ${index + 1}. ${tweet.author || 'Unknown'} ${tweet.authorHandle}\n\n`;
    report += `**Time:** ${new Date(tweet.timestamp).toLocaleString()}\n\n`;
    report += `**Content:**\n${tweet.text}\n\n`;
    report += `**Engagement:**\n`;
    report += `- 👁 Views: ${tweet.impressions.toLocaleString()}\n`;
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
  const headers = ['Author', 'Handle', 'Time', 'Text', 'Views', 'Likes', 'Retweets', 'Replies', 'URL'];
  const rows = tweets.map(tweet => [
    tweet.author || '',
    tweet.authorHandle || '',
    tweet.timestamp,
    `"${(tweet.text || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`,
    tweet.impressions || 0,
    tweet.likes || 0,
    tweet.retweets || 0,
    tweet.replies || 0,
    tweet.url || ''
  ]);
  
  return [headers, ...rows].map(row => row.join(',')).join('\n');
}

// Check if Chrome is running with debugging
async function checkChromeDebugPort() {
  try {
    await chromium.connectOverCDP('http://localhost:9222');
    return true;
  } catch (error) {
    return false;
  }
}

// Main execution
const keyword = process.argv[2] || 'AI';

checkChromeDebugPort().then(async (isRunning) => {
  if (!isRunning) {
    console.error('❌ Chrome is not running with debugging enabled!');
    console.error('\nPlease run this command first:');
    console.error('/Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome --remote-debugging-port=9222');
    console.error('\nThen run this script again.');
    process.exit(1);
  }
  
  console.log(`Starting Twitter fetch for: "${keyword}"`);
  
  fetchTwitterData(keyword)
    .then(tweets => {
      console.log(`\n✅ Success! Fetched ${tweets.length} tweets`);
      console.log('Reports saved in the reports/ folder');
      process.exit(0);
    })
    .catch(error => {
      console.error('Failed:', error.message);
      process.exit(1);
    });
});