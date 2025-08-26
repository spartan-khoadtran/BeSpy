/**
 * Browser Manager - Handles Playwright browser lifecycle
 */

import { chromium } from 'playwright';
import path from 'path';
import { config } from '../config.js';

export class BrowserManager {
  constructor(options = {}) {
    this.options = { ...config.scraping.browser, ...options };
    this.browser = null;
    this.context = null;
    this.page = null;
  }

  /**
   * Initialize browser and create context
   */
  async init() {
    try {
      console.log('🚀 Initializing browser...');
      
      // Set up browser-data profile directory
      const userDataDir = path.join(process.cwd(), 'browser-data');
      console.log(`📁 Using browser profile: ${userDataDir}`);
      
      this.browser = await chromium.launchPersistentContext(userDataDir, {
        headless: this.options.headless,
        viewport: this.options.viewport,
        userAgent: this.options.userAgent,
        args: [
          '--no-sandbox',
          '--disable-dev-shm-usage',
          '--disable-blink-features=AutomationControlled'
        ],
        // Add headers to appear more human-like
        extraHTTPHeaders: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
          'DNT': '1'
        }
      });

      // Use the browser context directly as it's a persistent context
      this.context = this.browser;

      this.page = await this.context.newPage();
      
      // Set longer timeout for page loads
      this.page.setDefaultTimeout(config.scraping.pageTimeout);
      
      console.log('✅ Browser initialized successfully');
      return this.page;
    } catch (error) {
      console.error('❌ Failed to initialize browser:', error.message);
      throw error;
    }
  }

  /**
   * Navigate to a URL with error handling and retries
   */
  async navigateTo(url, maxRetries = config.errorHandling.maxRetries) {
    let attempt = 0;
    
    while (attempt < maxRetries) {
      try {
        console.log(`🌐 Navigating to: ${url} (attempt ${attempt + 1})`);
        
        await this.page.goto(url, {
          waitUntil: 'domcontentloaded',  // Faster loading - doesn't wait for all network requests
          timeout: config.scraping.pageTimeout
        });
        
        // Wait for content to load
        await this.page.waitForSelector('body', { timeout: 5000 });
        
        console.log('✅ Navigation successful');
        return;
      } catch (error) {
        attempt++;
        console.warn(`⚠️ Navigation attempt ${attempt} failed:`, error.message);
        
        if (attempt >= maxRetries) {
          throw new Error(`Failed to navigate to ${url} after ${maxRetries} attempts: ${error.message}`);
        }
        
        // Wait before retry
        await this.delay(config.errorHandling.retryDelay);
      }
    }
  }

  /**
   * Wait for element to be present
   */
  async waitForElement(selector, timeout = 10000) {
    try {
      await this.page.waitForSelector(selector, { timeout });
      return true;
    } catch (error) {
      console.warn(`⚠️ Element not found: ${selector}`);
      return false;
    }
  }

  /**
   * Scroll to bottom of page to load more content
   */
  async scrollToLoadMore(maxScrolls = 5) {
    console.log('📜 Scrolling to load more content...');
    
    let scrollCount = 0;
    let previousHeight = 0;
    
    while (scrollCount < maxScrolls) {
      // Get current page height
      const currentHeight = await this.page.evaluate(() => document.body.scrollHeight);
      
      // Break if no new content loaded
      if (currentHeight === previousHeight && scrollCount > 0) {
        console.log('📜 No new content loaded, stopping scroll');
        break;
      }
      
      previousHeight = currentHeight;
      
      // Scroll to bottom
      await this.page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      
      // Wait for new content to load
      await this.delay(config.scraping.requestDelay);
      
      // Check for load more button
      const loadMoreButton = await this.page.$(config.selectors.loadMoreButton);
      if (loadMoreButton) {
        try {
          await loadMoreButton.click();
          await this.delay(config.scraping.requestDelay * 2);
          console.log('🔄 Clicked load more button');
        } catch (error) {
          console.warn('⚠️ Could not click load more button:', error.message);
        }
      }
      
      scrollCount++;
    }
    
    console.log(`📜 Completed ${scrollCount} scrolls`);
  }

  /**
   * Take screenshot for debugging
   */
  async screenshot(filename) {
    if (!config.debug.saveScreenshots) return;
    
    try {
      const screenshotPath = `${config.debug.screenshotDir}/${filename}`;
      await this.page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`📸 Screenshot saved: ${screenshotPath}`);
    } catch (error) {
      console.warn('⚠️ Failed to take screenshot:', error.message);
    }
  }

  /**
   * Get page HTML content
   */
  async getPageContent() {
    try {
      return await this.page.content();
    } catch (error) {
      console.error('❌ Failed to get page content:', error.message);
      return '';
    }
  }

  /**
   * Execute JavaScript in page context
   */
  async evaluateInPage(fn, ...args) {
    try {
      return await this.page.evaluate(fn, ...args);
    } catch (error) {
      console.error('❌ Failed to evaluate in page:', error.message);
      return null;
    }
  }

  /**
   * Check if page has loaded properly
   */
  async isPageLoaded() {
    try {
      const readyState = await this.page.evaluate(() => document.readyState);
      return readyState === 'complete';
    } catch (error) {
      return false;
    }
  }

  /**
   * Close browser and cleanup
   */
  async close() {
    try {
      if (this.page) {
        await this.page.close();
        console.log('📄 Page closed');
      }
      
      if (this.context) {
        await this.context.close();
        console.log('🔄 Context closed');
      }
      
      if (this.browser) {
        await this.browser.close();
        console.log('🚀 Browser closed');
      }
    } catch (error) {
      console.error('❌ Error closing browser:', error.message);
    }
  }

  /**
   * Utility method for delays
   */
  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get current page URL
   */
  getCurrentUrl() {
    return this.page ? this.page.url() : null;
  }

  /**
   * Check if browser is initialized
   */
  isInitialized() {
    return this.browser && this.context && this.page;
  }

  /**
   * Create a new page in the same context
   */
  async newPage() {
    if (!this.context) {
      throw new Error('Browser context not initialized');
    }
    
    return await this.context.newPage();
  }
}

export default BrowserManager;