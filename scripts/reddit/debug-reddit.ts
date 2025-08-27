import { chromium } from 'playwright';

async function debugReddit() {
  const browser = await chromium.launch({ 
    headless: false,  // Show browser for debugging
    args: ['--disable-blink-features=AutomationControlled']
  });
  
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 }
  });
  
  const page = await context.newPage();
  
  try {
    console.log('Navigating to r/programming...');
    await page.goto('https://www.reddit.com/r/programming/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    
    // Wait for page to load
    await page.waitForTimeout(3000);
    
    // Take screenshot
    await page.screenshot({ path: 'reddit-debug.png' });
    console.log('Screenshot saved to reddit-debug.png');
    
    // Try various selectors
    const selectors = [
      'shreddit-post',
      'article',
      '[data-testid="post-container"]',
      'div[data-click-id="background"]',
      '.Post',
      'div[id^="t3_"]',
      '[slot="post-container"]'
    ];
    
    for (const selector of selectors) {
      const count = await page.$$eval(selector, els => els.length);
      console.log(`Selector "${selector}": ${count} elements found`);
      
      if (count > 0) {
        // Try to extract data from first post
        const postData = await page.$eval(selector, (el: any) => {
          const title = el.querySelector('h3')?.textContent || 
                       el.querySelector('a[slot="full-post-link"]')?.textContent ||
                       el.querySelector('[slot="title"]')?.textContent ||
                       'No title found';
          
          return {
            title: title.trim(),
            html: el.outerHTML.substring(0, 500)
          };
        });
        
        console.log(`First post title: ${postData.title}`);
        console.log(`HTML preview: ${postData.html}...`);
        break;
      }
    }
    
    // Check page structure
    const bodyHTML = await page.$eval('body', el => el.innerHTML.substring(0, 1000));
    console.log('\nPage structure preview:', bodyHTML);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

debugReddit();