#!/usr/bin/env node

import { chromium } from 'playwright';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Twitter Fetcher - Using YOUR Google Chrome
 * This connects to your actual Google Chrome with all your cookies and login sessions
 */

console.log(`
📋 How to use YOUR Google Chrome (already logged into Twitter):
================================================================

Option 1: Connect to existing Chrome browser
---------------------------------------------
1. Close all Chrome windows
2. Start Chrome with debugging enabled:
   /Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome --remote-debugging-port=9222
   
3. Make sure you're logged into Twitter
4. Run this script

Option 2: Use Chrome's profile directly (with your saved passwords)
--------------------------------------------------------------------  
1. Find your Chrome profile path:
   Mac: ~/Library/Application Support/Google/Chrome/Default
   Windows: C:\\Users\\[User]\\AppData\\Local\\Google\\Chrome\\User Data\\Default
   Linux: ~/.config/google-chrome/Default

2. Run: node twitter-chrome.mjs --use-profile

================================================================
`);

async function connectToYourChrome() {
  // Check if Chrome is running with debug port
  try {
    console.log('🔍 Checking for Chrome with debug port...');
    const browser = await chromium.connectOverCDP('http://localhost:9222');
    console.log('✅ Connected to YOUR Google Chrome!');
    return browser;
  } catch (e) {
    console.log('❌ Chrome not found on port 9222');
    return null;
  }
}

async function useYourChromeProfile() {
  console.log('🔍 Using your Chrome profile...');
  
  // Find Chrome executable
  const chromeExecutables = {
    darwin: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    win32: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    linux: '/usr/bin/google-chrome'
  };
  
  const chromePath = chromeExecutables[process.platform];
  
  // Find Chrome profile
  const profilePaths = {
    darwin: path.join(process.env.HOME, 'Library/Application Support/Google/Chrome'),
    win32: path.join(process.env.APPDATA, '../Local/Google/Chrome/User Data'),
    linux: path.join(process.env.HOME, '.config/google-chrome')
  };
  
  const profilePath = profilePaths[process.platform];
  
  console.log(`Chrome executable: ${chromePath}`);
  console.log(`Chrome profile: ${profilePath}`);
  
  try {
    // Launch Chrome with your profile
    const browser = await chromium.launch({
      executablePath: chromePath,
      headless: false,
      args: [`--user-data-dir=${profilePath}`]
    });
    
    console.log('✅ Launched YOUR Google Chrome with your profile!');
    return browser;
  } catch (e) {
    console.log('Failed to launch Chrome:', e.message);
    return null;
  }
}

async function fetchTwitterData(keyword = 'AI', useProfile = false) {
  let browser;
  let page;
  
  try {
    // Try to connect to existing Chrome first
    browser = await connectToYourChrome();
    
    if (!browser && useProfile) {
      // Use Chrome profile if requested
      browser = await useYourChromeProfile();
    }
    
    if (!browser) {
      console.log('\n⚠️  Could not connect to Chrome.');
      console.log('Starting Chrome now. Please wait...\n');
      
      // Start Chrome with debug port
      const { exec } = await import('child_process');
      const chromeCmd = process.platform === 'darwin' 
        ? '/Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome --remote-debugging-port=9222 &'
        : 'google-chrome --remote-debugging-port=9222 &';
      
      exec(chromeCmd);
      console.log('Waiting for Chrome to start...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Try connecting again
      browser = await connectToYourChrome();
      
      if (!browser) {
        throw new Error('Could not connect to Chrome');
      }
    }
    
    // Get or create page
    const context = browser.contexts()[0];
    const pages = context.pages();
    page = pages.length > 0 ? pages[0] : await context.newPage();
    
    // Navigate to Twitter
    const searchUrl = `https://x.com/search?q=${encodeURIComponent(keyword)}&src=typed_query&f=live`;
    console.log(`\n🔍 Searching for: "${keyword}"`);
    
    await page.goto(searchUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 20000
    }).catch(() => console.log('Navigation timeout, continuing...'));
    
    // Wait for content
    await page.waitForTimeout(3000);
    
    // Check login status
    const url = page.url();
    if (url.includes('login')) {
      console.log('\n⚠️  You need to log into Twitter');
      console.log('Log in using the browser window, then press Enter...');
      await new Promise(resolve => {
        process.stdin.resume();
        process.stdin.once('data', resolve);
      });
      await page.goto(searchUrl);
      await page.waitForTimeout(3000);
    }
    
    // Scroll and wait
    await page.evaluate(() => window.scrollBy(0, 800));
    await page.waitForTimeout(2000);
    
    // Extract tweets
    console.log('📊 Extracting tweets...');
    const tweets = await page.evaluate(() => {
      const results = [];
      const elements = document.querySelectorAll('[data-testid="tweet"], article');
      
      for (let i = 0; i < Math.min(10, elements.length); i++) {
        const tweet = elements[i];
        
        // Extract text
        const textEl = tweet.querySelector('[data-testid="tweetText"], [lang]');
        const text = textEl ? textEl.innerText : '';
        
        // Extract author
        let author = 'Unknown';
        let handle = '@unknown';
        const links = tweet.querySelectorAll('a[href^="/"]');
        for (const link of links) {
          const href = link.getAttribute('href');
          if (href && !href.includes('/status/')) {
            handle = '@' + href.substring(1).split('/')[0];
            // Find display name
            const spans = tweet.querySelectorAll('span');
            for (const span of spans) {
              if (span.innerText && !span.innerText.startsWith('@') && span.innerText.length > 1) {
                author = span.innerText;
                break;
              }
            }
            break;
          }
        }
        
        // Extract metrics
        const buttons = tweet.querySelectorAll('[role="button"]');
        let likes = 0, retweets = 0, replies = 0;
        
        buttons.forEach(btn => {
          const label = btn.getAttribute('aria-label') || '';
          const match = label.match(/(\d+)/);
          if (match) {
            const value = parseInt(match[1]);
            if (label.includes('Like')) likes = value;
            else if (label.includes('Retweet') || label.includes('Repost')) retweets = value;
            else if (label.includes('Reply')) replies = value;
          }
        });
        
        // Get time
        const timeEl = tweet.querySelector('time');
        const timestamp = timeEl ? timeEl.getAttribute('datetime') : new Date().toISOString();
        
        // Get URL
        const statusLink = tweet.querySelector('a[href*="/status/"]');
        const url = statusLink ? 'https://x.com' + statusLink.getAttribute('href') : '';
        
        if (text) {
          results.push({
            text: text.substring(0, 500),
            author,
            authorHandle: handle,
            timestamp,
            likes,
            retweets,
            replies,
            impressions: 0,
            url
          });
        }
      }
      
      return results;
    });
    
    console.log(`✅ Found ${tweets.length} tweets\n`);
    
    if (tweets.length === 0) {
      console.log('No tweets found. Check if you\'re logged in.');
      return [];
    }
    
    // Generate reports
    const reportDir = path.join(__dirname, '..', 'reports');
    await fs.mkdir(reportDir, { recursive: true });
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const safeKeyword = keyword.replace(/[^a-z0-9]/gi, '-');
    
    // Markdown report
    let md = `# Twitter Search: ${keyword}\n\n`;
    md += `Generated: ${new Date().toLocaleString()}\n\n`;
    
    tweets.forEach((t, i) => {
      md += `## ${i+1}. ${t.author} ${t.authorHandle}\n\n`;
      md += t.text + '\n\n';
      md += `Likes: ${t.likes} | Retweets: ${t.retweets} | Replies: ${t.replies}\n`;
      if (t.url) md += `[View](${t.url})\n`;
      md += '\n---\n\n';
    });
    
    const mdPath = path.join(reportDir, `twitter-${safeKeyword}-${timestamp}.md`);
    await fs.writeFile(mdPath, md);
    console.log(`📝 Report saved: ${mdPath}`);
    
    // CSV report
    const csv = ['Author,Handle,Text,Likes,Retweets,Replies,URL'];
    tweets.forEach(t => {
      csv.push([
        t.author,
        t.authorHandle,
        `"${t.text.replace(/"/g, '""')}"`,
        t.likes,
        t.retweets,
        t.replies,
        t.url
      ].join(','));
    });
    
    const csvPath = path.join(reportDir, `twitter-${safeKeyword}-${timestamp}.csv`);
    await fs.writeFile(csvPath, csv.join('\n'));
    console.log(`📊 CSV saved: ${csvPath}`);
    
    // Save as latest
    await fs.writeFile(path.join(reportDir, 'latest.md'), md);
    await fs.writeFile(path.join(reportDir, 'latest.csv'), csv.join('\n'));
    
    return tweets;
    
  } catch (error) {
    console.error('Error:', error.message);
    throw error;
  } finally {
    // Don't close if using existing Chrome
    console.log('\nKeeping Chrome open (your session)');
  }
}

// Main
const keyword = process.argv[2] || 'AI';
const useProfile = process.argv.includes('--use-profile');

console.log('🐦 Twitter Data Fetcher (Using YOUR Chrome)\n');

fetchTwitterData(keyword, useProfile)
  .then(tweets => {
    if (tweets.length > 0) {
      console.log(`\n✅ Success! Check reports/ folder`);
    }
    process.exit(0);
  })
  .catch(() => process.exit(1));