/**
 * Base Category Scraper with Deep Extraction
 */

import { config } from '../config.js';
import { DeepExtractor } from '../utils/deep-extractor.js';

export class BaseCategoryScraper {
  constructor(browserManager, categoryKey) {
    this.browserManager = browserManager;
    this.categoryKey = categoryKey;
    this.categoryInfo = config.categories[categoryKey];
    this.deepExtractor = new DeepExtractor(this.browserManager.page);
  }

  /**
   * Main scraping method
   */
  async scrape(options = {}) {
    try {
      console.log(`📂 Scraping ${this.categoryInfo.name} category...`);
      
      // Navigate to category page
      await this.browserManager.navigateTo(this.categoryInfo.url);
      
      // Wait for content
      await this.browserManager.waitForElement('[data-testid="post"], .post-item, .story-item, article');
      await this.browserManager.delay(2000);
      
      // Load more content
      const targetPosts = options.postsPerCategory || config.scraping.defaultPostsPerCategory;
      await this.loadMoreContent(targetPosts);
      
      // Extract posts from listing
      const rawPosts = await this.extractPostsFromListing();
      console.log(`📝 Extracted ${rawPosts.length} posts from listing`);
      
      // Deep extract full data
      const deepExtractedPosts = await this.deepExtractPosts(rawPosts);
      console.log(`🔍 Deep extracted ${deepExtractedPosts.length} posts`);
      
      // Category-specific enhancement
      const enhancedPosts = await this.enhancePosts(deepExtractedPosts);
      
      console.log(`✅ ${this.categoryInfo.name} scraping completed: ${enhancedPosts.length} posts`);
      return enhancedPosts;
      
    } catch (error) {
      console.error(`❌ ${this.categoryInfo.name} scraping failed:`, error.message);
      throw error;
    }
  }

  /**
   * Load more content by scrolling/clicking
   */
  async loadMoreContent(targetPosts) {
    console.log(`📜 Loading content for ${this.categoryInfo.name} (target: ${targetPosts} posts)...`);
    
    let loadedPosts = 0;
    let attempts = 0;
    const maxAttempts = 8;
    
    while (loadedPosts < targetPosts && attempts < maxAttempts) {
      // Scroll to load more
      await this.browserManager.evaluateInPage(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      
      await this.browserManager.delay(config.scraping.requestDelay);
      
      // Try to click load more button
      const loadMoreClicked = await this.browserManager.evaluateInPage(() => {
        const loadMoreSelectors = [
          'button[data-testid="load-more"]',
          '.load-more',
          '.show-more',
          'button:contains("Load more")',
          'button:contains("Show more")',
          '[aria-label*="Load more"]'
        ];
        
        for (const selector of loadMoreSelectors) {
          const button = document.querySelector(selector);
          if (button && button.offsetParent !== null && !button.disabled) {
            button.click();
            return true;
          }
        }
        
        // Try generic buttons
        const buttons = document.querySelectorAll('button');
        for (const button of buttons) {
          const text = button.textContent.toLowerCase();
          if ((text.includes('load') || text.includes('more')) && 
              button.offsetParent !== null && !button.disabled) {
            button.click();
            return true;
          }
        }
        
        return false;
      });
      
      if (loadMoreClicked) {
        await this.browserManager.delay(config.scraping.requestDelay * 2);
      }
      
      // Count current posts
      const currentCount = await this.browserManager.evaluateInPage(() => {
        return document.querySelectorAll('[data-testid="post"], .post-item, .story-item, article').length;
      });
      
      console.log(`📊 Posts loaded: ${currentCount}`);
      
      if (currentCount === loadedPosts) {
        attempts++;
      } else {
        loadedPosts = currentCount;
        attempts = 0;
      }
    }
  }

  /**
   * Extract posts from the listing page
   */
  async extractPostsFromListing() {
    return await this.browserManager.evaluateInPage(() => {
      const containerSelectors = [
        '[data-testid="post"]',
        '.story-item',
        '.post-item',
        'article',
        '.feed-item'
      ];
      
      let postElements = [];
      
      for (const selector of containerSelectors) {
        postElements = Array.from(document.querySelectorAll(selector));
        if (postElements.length > 0) break;
      }
      
      return postElements.map((element) => {
        // Extract basic info from listing
        const titleElement = element.querySelector('h2 a, h3 a, .title a, a[href*="/post/"]');
        const title = titleElement?.textContent?.trim() || '';
        const url = titleElement?.href || '';
        
        const authorElement = element.querySelector('.author-name, .username, [href*="/users/"]');
        const author = authorElement?.textContent?.trim() || '';
        
        // Initial engagement metrics (may be inaccurate)
        const upvoteElement = element.querySelector('.upvote-count, .points, .vote-count');
        const upvotes = parseInt(upvoteElement?.textContent?.replace(/[^\d]/g, '') || '0');
        
        const commentElement = element.querySelector('.comment-count, .comments-count');
        const comments = parseInt(commentElement?.textContent?.replace(/[^\d]/g, '') || '0');
        
        const timestampElement = element.querySelector('time, .time-ago, .timestamp');
        const timestamp = timestampElement?.textContent?.trim() || '';
        
        // Preview content
        const contentElement = element.querySelector('.content, .excerpt, p');
        const content = contentElement?.textContent?.trim() || '';
        
        return {
          title,
          url,
          author,
          upvotes,
          comments,
          timestamp,
          content: content.substring(0, 250),
          category: this.categoryKey
        };
      }).filter(post => post.title && post.url);
    });
  }

  /**
   * Deep extract posts by clicking into each one
   */
  async deepExtractPosts(rawPosts) {
    console.log(`🔄 Starting deep extraction for ${rawPosts.length} posts...`);
    
    // Filter posts with valid URLs
    const postsWithUrls = rawPosts.filter(post => post.url && post.url.length > 0);
    
    if (postsWithUrls.length === 0) {
      console.warn('⚠️ No posts with valid URLs for deep extraction');
      return rawPosts;
    }
    
    // Limit number of posts for deep extraction (for speed)
    const postsToExtract = postsWithUrls.slice(0, Math.min(postsWithUrls.length, 25));
    
    // Perform deep extraction
    const deepExtracted = await this.deepExtractor.extractMultiplePosts(
      postsToExtract.map(post => ({
        url: post.url.startsWith('http') ? post.url : `${config.baseUrl}${post.url}`,
        ...post
      })),
      config.scraping.requestDelay
    );
    
    // Merge deep extracted data
    const mergedPosts = rawPosts.map(rawPost => {
      const deepPost = deepExtracted.find(dp => 
        dp.url === rawPost.url || 
        dp.url === `${config.baseUrl}${rawPost.url}`
      );
      
      if (deepPost && deepPost.deepExtracted) {
        return {
          ...rawPost,
          ...deepPost,
          url: rawPost.url,
          upvotes: Math.max(rawPost.upvotes || 0, deepPost.upvotes || 0),
          comments: Math.max(rawPost.comments || 0, deepPost.comments || 0),
          content: deepPost.content || rawPost.content,
          hasFullContent: deepPost.hasFullContent || false,
          deepExtracted: true
        };
      }
      
      return rawPost;
    });
    
    const successfullyExtracted = mergedPosts.filter(p => p.deepExtracted).length;
    console.log(`✅ Deep extracted ${successfullyExtracted}/${postsToExtract.length} posts`);
    
    // Navigate back to category page
    await this.browserManager.navigateTo(this.categoryInfo.url);
    
    return mergedPosts;
  }

  /**
   * Enhance posts with category-specific metadata
   * Override this in child classes for category-specific enhancements
   */
  async enhancePosts(posts) {
    return posts.map(post => ({
      ...post,
      categoryMetadata: {
        name: this.categoryInfo.name,
        key: this.categoryKey,
        description: this.categoryInfo.description
      }
    }));
  }
}

export default BaseCategoryScraper;