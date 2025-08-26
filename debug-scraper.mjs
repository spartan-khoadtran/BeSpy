#!/usr/bin/env node

import { IndieHackersScraper } from './scripts/indiehacker/scraper.js';

async function debugScraper() {
  console.log('🔍 Debug IndieHackers scraper...');
  
  const scraper = new IndieHackersScraper();
  
  try {
    await scraper.initialize();
    
    // Navigate to main page
    const page = scraper.browserManager.page;
    await page.goto('https://www.indiehackers.com/', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    console.log('✅ Navigation successful');
    
    // Wait for content
    await page.waitForTimeout(3000);
    
    // Try to find posts with various selectors
    const selectors = [
      '[data-testid="post"]',
      '.post-item',
      '.story-item',
      'article',
      '[class*="post"]',
      '[class*="story"]',
      'a[href*="/post/"]',
      'h2',
      'h3'
    ];
    
    for (const selector of selectors) {
      try {
        const count = await page.$$eval(selector, elements => elements.length);
        if (count > 0) {
          console.log(`✅ Found ${count} elements with selector: ${selector}`);
          
          // Get first few elements for inspection
          const samples = await page.$$eval(selector, (elements) => 
            elements.slice(0, 3).map(el => ({
              tagName: el.tagName,
              className: el.className,
              textContent: el.textContent?.substring(0, 100) + '...',
              href: el.href,
              innerHTML: el.innerHTML?.substring(0, 200) + '...'
            }))
          );
          console.log(`Sample elements:`, JSON.stringify(samples, null, 2));
        }
      } catch (e) {
        // Selector not found, continue
      }
    }
    
    // Try to extract some raw data
    console.log('\n🔍 Trying to extract raw post data...');
    const rawPosts = await page.evaluate(() => {
      const posts = [];
      
      // Look for various post patterns
      const postSelectors = [
        'article',
        '[data-testid="post"]',
        '.post-item',
        '.story-item',
        '[class*="post"]'
      ];
      
      for (const selector of postSelectors) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          console.log(`Found ${elements.length} posts with ${selector}`);
          
          elements.forEach((element, index) => {
            if (index < 3) { // Only first 3 for debugging
              // Try to extract basic info
              const titleElement = element.querySelector('h1, h2, h3, .title, [class*="title"]');
              const linkElement = element.querySelector('a[href*="/post/"], a[href*="/story/"]');
              const authorElement = element.querySelector('[class*="author"], .username, [class*="user"]');
              
              posts.push({
                selector: selector,
                title: titleElement?.textContent?.trim() || 'No title found',
                url: linkElement?.href || 'No URL found',
                author: authorElement?.textContent?.trim() || 'No author found',
                fullHTML: element.outerHTML?.substring(0, 500) + '...'
              });
            }
          });
          break; // Use first successful selector
        }
      }
      
      return posts;
    });
    
    console.log(`Found ${rawPosts.length} raw posts:`, JSON.stringify(rawPosts, null, 2));
    
    await scraper.close();
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
    await scraper.close();
  }
}

debugScraper();