#!/usr/bin/env node

import { chromium } from 'playwright';

async function debugRedditSearch() {
  const browser = await chromium.launch({ 
    headless: false,  // Always show browser for debugging
    slowMo: 500      // Slow down actions to see what's happening
  });
  
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 }
  });
  
  const page = await context.newPage();
  
  try {
    console.log('🔍 Navigating to Reddit search for "javascript"...');
    await page.goto('https://www.reddit.com/search/?q=javascript', { 
      waitUntil: 'networkidle', 
      timeout: 60000 
    });
    
    console.log('⏳ Waiting for page to load...');
    await page.waitForTimeout(5000);
    
    // Debug: Check what selectors exist on the page
    const selectors = [
      'article',
      'div[data-testid="post-container"]', 
      'shreddit-post',
      'faceplate-tracker',
      '[slot="post-title"]',
      'a[slot="full-post-link"]',
      'h1, h2, h3',
      '.Post',
      'div[id^="t3_"]'
    ];
    
    console.log('\n📋 Checking for selectors:');
    for (const selector of selectors) {
      const count = await page.$$eval(selector, els => els.length);
      if (count > 0) {
        console.log(`   ✅ ${selector}: ${count} found`);
      } else {
        console.log(`   ❌ ${selector}: 0 found`);
      }
    }
    
    // Try Reddit's new web components
    console.log('\n🔧 Trying new Reddit structure...');
    const posts = await page.evaluate(() => {
      const results = [];
      
      // Try shreddit-post elements (new Reddit structure)
      const shredditPosts = document.querySelectorAll('shreddit-post');
      console.log(`Found ${shredditPosts.length} shreddit-post elements`);
      
      if (shredditPosts.length > 0) {
        for (let i = 0; i < Math.min(shredditPosts.length, 3); i++) {
          const post = shredditPosts[i];
          const title = post.querySelector('[slot="title"]')?.textContent || 
                       post.querySelector('a[slot="full-post-link"]')?.textContent || '';
          const link = post.querySelector('a[slot="full-post-link"]')?.getAttribute('href') || '';
          const author = post.getAttribute('author') || '';
          const subreddit = post.getAttribute('subreddit-prefixed') || '';
          const score = post.getAttribute('score') || '0';
          const commentCount = post.getAttribute('comment-count') || '0';
          
          results.push({
            title: title.trim(),
            url: link ? `https://www.reddit.com${link}` : '',
            author,
            subreddit,
            score,
            comments: parseInt(commentCount)
          });
        }
      } else {
        // Fallback to article elements
        const articles = document.querySelectorAll('article');
        console.log(`Found ${articles.length} article elements`);
        
        for (let i = 0; i < Math.min(articles.length, 3); i++) {
          const article = articles[i];
          const h3 = article.querySelector('h3');
          results.push({
            title: h3?.textContent || 'No title found',
            hasH3: !!h3,
            hasLinks: article.querySelectorAll('a').length
          });
        }
      }
      
      return results;
    });
    
    console.log('\n📊 Extracted data:');
    console.log(JSON.stringify(posts, null, 2));
    
    // Take a screenshot for debugging
    await page.screenshot({ path: 'reddit-debug.png', fullPage: false });
    console.log('\n📸 Screenshot saved as reddit-debug.png');
    
    console.log('\n⏸️  Browser will stay open for 10 seconds for inspection...');
    await page.waitForTimeout(10000);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await browser.close();
  }
}

// Run the debug function
debugRedditSearch().catch(console.error);