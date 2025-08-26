#!/usr/bin/env node

import { chromium } from 'playwright';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Twitter Fetcher with Manual Login
 * You log in manually, then the script continues
 */

async function fetchWithManualLogin(keyword = 'AI') {
  console.log('🔐 Twitter Fetcher - Manual Login Method\n');
  
  // Launch browser with persistent storage to keep login
  const userDataDir = path.join(__dirname, 'browser-session');
  const browser = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    viewport: { width: 1280, height: 800 }
  });
  
  const page = browser.pages()[0] || await browser.newPage();
  
  try {
    // Go to Twitter
    console.log('📱 Opening Twitter...');
    await page.goto('https://x.com', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    
    // Check if logged in
    const isLoggedIn = await page.evaluate(() => {
      return !window.location.href.includes('login') && 
             document.querySelector('[data-testid="SideNav_AccountSwitcher_Button"]');
    });
    
    if (!isLoggedIn) {
      console.log('\n⚠️  Please log into Twitter/X in the browser window');
      console.log('📝 Your login will be saved for future runs');
      console.log('\nAfter logging in, press ENTER here to continue...\n');
      
      // Navigate to login
      await page.goto('https://x.com/login');
      
      // Wait for user to log in
      await new Promise(resolve => {
        process.stdin.resume();
        process.stdin.once('data', resolve);
      });
      
      console.log('✅ Checking login status...');
      await page.waitForTimeout(2000);
    } else {
      console.log('✅ Already logged in from previous session!');
    }
    
    // Now search
    console.log(`\n🔍 Searching for: "${keyword}"`);
    const searchUrl = `https://x.com/search?q=${encodeURIComponent(keyword)}&src=typed_query&f=live`;
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    
    // Scroll for more content
    await page.evaluate(() => window.scrollBy(0, 1000));
    await page.waitForTimeout(2000);
    
    // Extract tweets
    console.log('📊 Extracting tweets...\n');
    const tweets = await page.evaluate(() => {
      const results = [];
      const tweetEls = document.querySelectorAll('[data-testid="tweet"]');
      
      for (let i = 0; i < Math.min(10, tweetEls.length); i++) {
        const tweet = tweetEls[i];
        
        // Get text
        const textEl = tweet.querySelector('[data-testid="tweetText"]');
        const text = textEl ? textEl.innerText : '';
        
        // Get author
        let author = '';
        let handle = '';
        const userLink = tweet.querySelector('a[href^="/"]');
        if (userLink && !userLink.href.includes('/status/')) {
          handle = '@' + userLink.href.split('/').pop();
          const nameEl = tweet.querySelector('[data-testid="User-Name"] span');
          author = nameEl ? nameEl.innerText : handle;
        }
        
        // Get metrics
        const getCount = (label) => {
          const els = tweet.querySelectorAll('[role="button"]');
          for (const el of els) {
            const ariaLabel = el.getAttribute('aria-label') || '';
            if (ariaLabel.toLowerCase().includes(label)) {
              const match = ariaLabel.match(/(\d+)/);
              return match ? parseInt(match[1]) : 0;
            }
          }
          return 0;
        };
        
        const likes = getCount('like');
        const retweets = getCount('retweet') || getCount('repost');
        const replies = getCount('repl');
        
        // Get time
        const timeEl = tweet.querySelector('time');
        const timestamp = timeEl ? timeEl.getAttribute('datetime') : '';
        
        // Get URL
        const link = tweet.querySelector('a[href*="/status/"]');
        const url = link ? 'https://x.com' + link.getAttribute('href') : '';
        
        if (text) {
          results.push({
            text,
            author,
            handle,
            timestamp,
            likes,
            retweets,
            replies,
            url
          });
        }
      }
      return results;
    });
    
    console.log(`✅ Found ${tweets.length} tweets\n`);
    
    // Save reports
    const reportDir = path.join(__dirname, '..', 'reports');
    await fs.mkdir(reportDir, { recursive: true });
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    
    // Markdown
    let md = `# Twitter Search: ${keyword}\n\n`;
    md += `Generated: ${new Date().toLocaleString()}\n\n`;
    tweets.forEach((t, i) => {
      md += `## ${i+1}. ${t.author} ${t.handle}\n\n`;
      md += t.text + '\n\n';
      md += `❤️ ${t.likes} | 🔄 ${t.retweets} | 💬 ${t.replies}\n\n`;
      if (t.url) md += `[View Tweet](${t.url})\n\n`;
      md += '---\n\n';
    });
    
    await fs.writeFile(path.join(reportDir, `twitter-${keyword}-${timestamp}.md`), md);
    await fs.writeFile(path.join(reportDir, 'latest.md'), md);
    
    // CSV
    const csv = ['Author,Handle,Text,Likes,Retweets,Replies,URL'];
    tweets.forEach(t => {
      csv.push(`"${t.author}","${t.handle}","${t.text.replace(/"/g, '""')}",${t.likes},${t.retweets},${t.replies},"${t.url}"`);
    });
    
    await fs.writeFile(path.join(reportDir, `twitter-${keyword}-${timestamp}.csv`), csv.join('\n'));
    await fs.writeFile(path.join(reportDir, 'latest.csv'), csv.join('\n'));
    
    console.log('📁 Reports saved in reports/ folder');
    console.log('✅ Your login is saved for next time!\n');
    
    return tweets;
    
  } finally {
    await browser.close();
  }
}

// Run
const keyword = process.argv[2] || 'AI';
fetchWithManualLogin(keyword)
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
  });