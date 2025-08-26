#!/usr/bin/env node

/**
 * Debug and extract Starting Up category posts
 */

import { chromium } from 'playwright';
import fs from 'fs/promises';
import path from 'path';

async function debugStartingUp() {
  console.log('🔍 Debugging Starting Up category page...\n');
  
  const browser = await chromium.launch({
    headless: false,
    slowMo: 100
  });
  
  try {
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 720 }
    });
    
    const page = await context.newPage();
    
    console.log('🌐 Navigating to Starting Up page...');
    await page.goto('https://www.indiehackers.com/starting-up', {
      waitUntil: 'networkidle'
    });
    
    // Wait for content to load
    await page.waitForTimeout(3000);
    
    // Take screenshot for debugging
    await page.screenshot({ path: 'debug-starting-up.png' });
    console.log('📸 Screenshot saved: debug-starting-up.png');
    
    // Try multiple strategies to find posts
    console.log('\n🔍 Strategy 1: Looking for article elements...');
    const articles = await page.$$eval('article', elements => 
      elements.map(el => ({
        html: el.outerHTML.substring(0, 200),
        text: el.textContent?.substring(0, 100)
      }))
    );
    console.log(`Found ${articles.length} article elements`);
    
    console.log('\n🔍 Strategy 2: Looking for links with /post/ pattern...');
    const postLinks = await page.$$eval('a[href*="/post/"]', links =>
      links.map(link => ({
        href: link.href,
        text: link.textContent?.trim().substring(0, 100)
      }))
    );
    console.log(`Found ${postLinks.length} post links:`, postLinks.slice(0, 5));
    
    console.log('\n🔍 Strategy 3: Looking for h2/h3 headings (likely post titles)...');
    const headings = await page.$$eval('h2, h3', elements =>
      elements.map(el => ({
        tag: el.tagName,
        text: el.textContent?.trim(),
        parent: el.parentElement?.tagName
      }))
    );
    console.log(`Found ${headings.length} headings:`, headings.slice(0, 5));
    
    console.log('\n🔍 Strategy 4: Looking for specific class patterns...');
    const classPatterns = [
      '[class*="post"]',
      '[class*="story"]',
      '[class*="feed"]',
      '[class*="item"]',
      '[class*="card"]',
      '[class*="entry"]'
    ];
    
    for (const pattern of classPatterns) {
      const elements = await page.$$(pattern);
      if (elements.length > 0) {
        console.log(`✅ Found ${elements.length} elements with pattern: ${pattern}`);
        
        // Get sample data from first element
        const sampleData = await elements[0].evaluate(el => ({
          class: el.className,
          html: el.outerHTML.substring(0, 200),
          text: el.textContent?.substring(0, 100)
        }));
        console.log('  Sample:', sampleData);
      }
    }
    
    console.log('\n🔍 Strategy 5: Extracting structured post data...');
    const posts = await page.evaluate(() => {
      // Look for post containers
      const postContainers = [];
      
      // Try to find posts by common patterns
      const allDivs = document.querySelectorAll('div');
      
      allDivs.forEach(div => {
        // Check if this div contains a post-like structure
        const hasTitle = div.querySelector('h2, h3, a[href*="/post/"]');
        const hasLink = div.querySelector('a[href*="/post/"], a[href*="/product/"]');
        const hasText = div.textContent && div.textContent.length > 50;
        
        if (hasTitle && hasLink && hasText) {
          const titleElement = div.querySelector('h2, h3');
          const linkElement = div.querySelector('a[href*="/post/"], a[href*="/product/"]');
          
          if (titleElement && linkElement) {
            postContainers.push({
              title: titleElement.textContent?.trim(),
              url: linkElement.href,
              text: div.textContent?.substring(0, 200),
              className: div.className
            });
          }
        }
      });
      
      return postContainers;
    });
    
    console.log(`\n📊 Found ${posts.length} potential posts:`);
    posts.slice(0, 5).forEach((post, i) => {
      console.log(`\n${i + 1}. ${post.title}`);
      console.log(`   URL: ${post.url}`);
      console.log(`   Preview: ${post.text?.substring(0, 100)}...`);
    });
    
    // Try scrolling to load more content
    console.log('\n📜 Scrolling to load more content...');
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(2000);
      console.log(`Scroll ${i + 1} completed`);
    }
    
    // Check for "Load More" button
    console.log('\n🔍 Looking for Load More button...');
    const loadMoreButton = await page.$('button:has-text("Load More"), button:has-text("Show More"), button:has-text("View More")');
    if (loadMoreButton) {
      console.log('✅ Found Load More button, clicking...');
      await loadMoreButton.click();
      await page.waitForTimeout(2000);
    } else {
      console.log('❌ No Load More button found');
    }
    
    // Final extraction attempt
    console.log('\n🎯 Final extraction with all strategies...');
    const finalPosts = await page.evaluate(() => {
      const posts = [];
      
      // Get all links that look like posts
      document.querySelectorAll('a').forEach(link => {
        const href = link.href;
        if (href.includes('/post/') || href.includes('/product/')) {
          // Find the parent container
          let container = link.parentElement;
          while (container && container.parentElement) {
            const text = container.textContent || '';
            if (text.length > 100 && text.length < 5000) {
              // This looks like a post container
              const title = container.querySelector('h1, h2, h3')?.textContent?.trim() ||
                           link.textContent?.trim() || '';
              
              if (title && title.length > 5) {
                // Look for metadata
                const authorLink = container.querySelector('a[href*="/u/"], a[href*="?id="]');
                const timeElement = container.querySelector('time, [class*="time"], [class*="ago"]');
                
                // Look for engagement metrics
                const numbers = Array.from(container.querySelectorAll('a, span')).filter(el => {
                  const text = el.textContent?.trim() || '';
                  return /^\d+$/.test(text);
                });
                
                posts.push({
                  title: title,
                  url: href,
                  author: authorLink?.textContent?.trim() || 'Unknown',
                  time: timeElement?.textContent?.trim() || '',
                  upvotes: numbers[0]?.textContent || '0',
                  comments: numbers[1]?.textContent || '0',
                  preview: text.substring(0, 200)
                });
                break;
              }
            }
            container = container.parentElement;
          }
        }
      });
      
      // Remove duplicates
      const seen = new Set();
      return posts.filter(post => {
        const key = post.url;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    });
    
    console.log(`\n✅ Successfully extracted ${finalPosts.length} posts`);
    
    // Save results
    const outputDir = 'debug';
    await fs.mkdir(outputDir, { recursive: true });
    
    const outputFile = path.join(outputDir, 'starting-up-posts.json');
    await fs.writeFile(outputFile, JSON.stringify(finalPosts, null, 2));
    console.log(`\n💾 Results saved to: ${outputFile}`);
    
    // Display summary
    if (finalPosts.length > 0) {
      console.log('\n📊 Posts Summary:');
      finalPosts.slice(0, 10).forEach((post, i) => {
        console.log(`\n${i + 1}. ${post.title}`);
        console.log(`   Author: ${post.author}`);
        console.log(`   Time: ${post.time}`);
        console.log(`   Engagement: ${post.upvotes} upvotes, ${post.comments} comments`);
        console.log(`   URL: ${post.url}`);
      });
    }
    
    return finalPosts;
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await browser.close();
  }
}

// Run the debug script
debugStartingUp()
  .then(posts => {
    if (posts && posts.length > 0) {
      console.log(`\n🎉 Successfully found ${posts.length} posts from Starting Up category!`);
    } else {
      console.log('\n⚠️ No posts found. The page structure might have changed or require authentication.');
    }
  })
  .catch(error => {
    console.error('\n💥 Fatal error:', error);
  });