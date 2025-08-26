/**
 * Main IndieHackers Scraper
 * Orchestrates the scraping process across all categories
 */

import path from 'path';
import { config } from './config.js';
import BrowserManager from './utils/browser-manager.js';
import DataProcessor from './utils/data-processor.js';
import ReportGenerator from './utils/report-generator.js';
import CategoryReportGenerator from './utils/category-report-generator.js';
import PostDetailExtractor from './utils/post-detail-extractor.js';

export class IndieHackersScraper {
  constructor(options = {}) {
    this.options = { ...options };
    this.browserManager = new BrowserManager(this.options.browser);
    this.dataProcessor = new DataProcessor();
    this.reportGenerator = new ReportGenerator();
    this.categoryReportGenerator = new CategoryReportGenerator();
    this.postDetailExtractor = null; // Will be initialized after browser
    this.stats = {
      totalPosts: 0,
      categoriesProcessed: 0,
      errors: [],
      startTime: null,
      endTime: null
    };
  }

  /**
   * Main scraping method
   */
  async scrape(categories = 'all', options = {}) {
    this.stats.startTime = new Date();
    
    try {
      console.log('🚀 Starting IndieHackers scraping process...');
      
      // Initialize browser
      await this.browserManager.init();
      
      // Initialize post detail extractor with browser manager
      this.postDetailExtractor = new PostDetailExtractor(this.browserManager);
      
      // Determine categories to scrape
      const categoriesToScrape = this.resolveCategoriesList(categories);
      console.log(`📝 Will scrape categories: ${categoriesToScrape.join(', ')}`);
      
      // Reset data processor for fresh session
      this.dataProcessor.reset();
      
      // Scrape each category
      const allPosts = [];
      
      for (const categoryKey of categoriesToScrape) {
        try {
          console.log(`\n🔍 Scraping category: ${categoryKey}`);
          const categoryPosts = await this.scrapeCategory(categoryKey, options);
          
          // Process the scraped data
          const processedPosts = this.dataProcessor.processScrapedData(categoryPosts, categoryKey);
          allPosts.push(...processedPosts);
          
          this.stats.categoriesProcessed++;
          console.log(`✅ Category '${categoryKey}' completed: ${processedPosts.length} posts`);
          
          // Add delay between categories to be respectful
          if (categoriesToScrape.indexOf(categoryKey) < categoriesToScrape.length - 1) {
            await this.delay(config.scraping.requestDelay);
          }
        } catch (error) {
          console.error(`❌ Error scraping category '${categoryKey}':`, error.message);
          this.stats.errors.push({ category: categoryKey, error: error.message });
          
          if (!config.errorHandling.continueOnError) {
            throw error;
          }
        }
      }
      
      // Sort all posts by engagement score
      const sortedPosts = this.dataProcessor.sortByEngagement(allPosts);
      this.stats.totalPosts = sortedPosts.length;
      
      console.log(`\n📊 Scraping completed!`);
      console.log(`   Total posts collected: ${this.stats.totalPosts}`);
      console.log(`   Categories processed: ${this.stats.categoriesProcessed}`);
      
      return {
        posts: sortedPosts,
        stats: this.getStats(),
        success: true
      };
      
    } catch (error) {
      console.error('❌ Scraping failed:', error.message);
      this.stats.errors.push({ general: error.message });
      
      return {
        posts: [],
        stats: this.getStats(),
        success: false,
        error: error.message
      };
    } finally {
      this.stats.endTime = new Date();
      await this.browserManager.close();
    }
  }

  /**
   * Scrape a specific category
   */
  async scrapeCategory(categoryKey, options = {}) {
    const category = config.categories[categoryKey];
    if (!category) {
      throw new Error(`Unknown category: ${categoryKey}`);
    }

    console.log(`🌐 Navigating to: ${category.url}`);
    await this.browserManager.navigateTo(category.url);
    
    // Wait for page to load
    await this.browserManager.waitForElement('body');
    await this.delay(2000);
    
    // Take screenshot for debugging
    if (config.debug.saveScreenshots) {
      await this.browserManager.screenshot(`${categoryKey}-initial.png`);
    }
    
    // Load more content if needed
    const postsTarget = options.postsPerCategory || config.scraping.defaultPostsPerCategory;
    await this.loadMoreContent(postsTarget);
    
    // Extract posts from the page
    const posts = await this.extractPosts();
    
    console.log(`📋 Extracted ${posts.length} raw posts from ${categoryKey}`);
    
    // Extract full details for each post if enabled
    if (options.extractFullDetails !== false && posts.length > 0) {
      const detailedPosts = await this.postDetailExtractor.extractFullDetails(posts, categoryKey);
      console.log(`📚 Extracted full details for ${detailedPosts.length} posts`);
      return detailedPosts;
    }
    
    return posts;
  }

  /**
   * Load more content by scrolling and clicking load more buttons
   */
  async loadMoreContent(targetPosts = config.scraping.defaultPostsPerCategory) {
    const maxScrolls = Math.ceil(targetPosts / 10); // Estimate 10 posts per scroll
    
    console.log(`📜 Loading more content (target: ${targetPosts} posts)...`);
    
    let currentPostCount = 0;
    let scrollCount = 0;
    
    while (scrollCount < maxScrolls) {
      // Scroll to load more content
      await this.browserManager.scrollToLoadMore(1);
      
      // Check current post count
      const newPostCount = await this.getCurrentPostCount();
      
      console.log(`📊 Posts found: ${newPostCount} (was ${currentPostCount})`);
      
      // Break if we have enough posts or no new posts loaded
      if (newPostCount >= targetPosts || newPostCount === currentPostCount) {
        console.log(`✅ Sufficient content loaded: ${newPostCount} posts`);
        break;
      }
      
      currentPostCount = newPostCount;
      scrollCount++;
      
      // Add delay between scrolls
      await this.delay(config.scraping.requestDelay);
    }
  }

  /**
   * Get current number of posts on the page
   */
  async getCurrentPostCount() {
    try {
      return await this.browserManager.evaluateInPage(() => {
        // Try multiple selectors for post containers
        const selectors = [
          '.post-item',
          '.story-item', 
          '[data-testid="post"]',
          '.feed-item',
          '.post-card',
          'article',
          '[class*="post"]'
        ];
        
        for (const selector of selectors) {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            return elements.length;
          }
        }
        
        return 0;
      }) || 0;
    } catch (error) {
      console.warn('⚠️ Could not count posts:', error.message);
      return 0;
    }
  }

  /**
   * Extract posts from the current page
   */
  async extractPosts() {
    try {
      const posts = await this.browserManager.evaluateInPage(() => {
        console.log('Starting post extraction...');
        
        // First, let's find all post containers
        // IndieHackers uses a structure where each post is in a div with specific patterns
        const allDivs = Array.from(document.querySelectorAll('div'));
        
        // Filter divs that contain post-like structure
        const postElements = allDivs.filter(div => {
          // A post div should have:
          // 1. An h3 title (inside an anchor tag)
          // 2. Links with numbers (engagement metrics)
          const hasTitle = div.querySelector('a[href*="/post/"] h3, a[href*="/product/"] h3');
          const hasMetrics = div.querySelectorAll('a').length >= 2 && 
                             Array.from(div.querySelectorAll('a')).some(a => /^\d+$/.test(a.textContent?.trim()));
          return hasTitle && hasMetrics;
        });
        
        console.log(`Found ${postElements.length} potential post containers`);
        
        if (postElements.length === 0) {
          // Fallback: Try to find posts by looking for h3 elements
          const h3Elements = document.querySelectorAll('h3');
          console.log(`Found ${h3Elements.length} h3 elements as fallback`);
        }
        
        return postElements.map((element, index) => {
          try {
            // Extract title and URL
            let title = '';
            let url = '';
            
            // Look for h3 inside anchor tags (new structure)
            const titleLink = element.querySelector('a[href*="/post/"] h3, a[href*="/product/"] h3');
            if (titleLink) {
              title = titleLink.textContent?.trim() || '';
              url = titleLink.closest('a')?.href || '';
            } else {
              // Fallback to any h3
              const h3 = element.querySelector('h3');
              if (h3) {
                title = h3.textContent?.trim() || '';
                const link = h3.closest('a') || element.querySelector('a[href*="/post/"], a[href*="/product/"]');
                url = link?.href || '';
              }
            }
            
            // Extract author - look for user profile links
            let author = '';
            const userLinks = element.querySelectorAll('a[href*="?id="], a[href*="/u/"]');
            for (const link of userLinks) {
              // Skip if it's the post title link
              if (!link.querySelector('h3') && !link.querySelector('h2')) {
                const text = link.textContent?.trim();
                if (text && text.length > 0 && !(/^\d+$/.test(text))) {
                  author = text;
                  break;
                }
              }
            }
            
            // Extract engagement metrics
            let upvotes = 0;
            let comments = 0;
            
            // Find all links with just numbers
            const allLinks = Array.from(element.querySelectorAll('a'));
            const numberLinks = allLinks.filter(link => {
              const text = link.textContent?.trim();
              return text && /^\d+$/.test(text);
            });
            
            // Usually structured as: [upvotes, comments]
            if (numberLinks.length >= 2) {
              upvotes = parseInt(numberLinks[0].textContent?.trim()) || 0;
              comments = parseInt(numberLinks[1].textContent?.trim()) || 0;
            } else if (numberLinks.length === 1) {
              // If only one number, assume it's upvotes
              upvotes = parseInt(numberLinks[0].textContent?.trim()) || 0;
            }
            
            // Extract timestamp (if available)
            let timestamp = '';
            const timeElements = element.querySelectorAll('time, [class*="time"], [class*="ago"]');
            if (timeElements.length > 0) {
              timestamp = timeElements[0].textContent?.trim() || timeElements[0].getAttribute('datetime') || '';
            }
            
            // Extract content preview (if available)
            let content = '';
            const paragraphs = element.querySelectorAll('p');
            if (paragraphs.length > 0) {
              content = Array.from(paragraphs).map(p => p.textContent?.trim()).join(' ');
              if (content.length > 300) {
                content = content.substring(0, 300) + '...';
              }
            }
            
            // Create post object
            const post = {
              title,
              author: author || 'Unknown',
              url,
              upvotes,
              comments,
              timestamp: timestamp || 'Recent',
              content,
              rawIndex: index
            };
            
            // Debug logging for first few posts
            if (index < 5) {
              console.log(`DEBUG Post ${index}:`, {
                title: title?.substring(0, 50),
                author,
                upvotes,
                comments,
                hasTitle: !!title,
                titleLength: title?.length,
                url: url?.substring(0, 50)
              });
            }
            
            // Return post if it has a title
            if (title && title.length > 0) {
              return post;
            }
            
            return null;
          } catch (error) {
            console.error(`Error extracting post ${index}:`, error.message);
            return null;
          }
        }).filter(post => post !== null);
      });
      
      console.log(`📊 Successfully extracted ${posts?.length || 0} posts`);
      return posts || [];
      
    } catch (error) {
      console.error('❌ Failed to extract posts:', error.message);
      return [];
    }
  }

  /**
   * Generate report from scraped data
   */
  async generateReport(posts, options = {}) {
    try {
      console.log('\n📝 Generating reports...');
      
      // Generate category-based reports (separate files per category)
      const categoryResults = await this.categoryReportGenerator.generateCategoryReports(posts, options.date);
      console.log(`✅ Generated ${categoryResults.reports.length} category reports`);
      
      // Also generate the traditional combined report
      const reportResult = await this.reportGenerator.generateReport(posts, options.date);
      console.log('✅ Combined report generation completed!');
      
      console.log(`   Reports saved to: ${categoryResults.reportDir}`);
      
      // List all generated files
      console.log('\n📁 Generated files:');
      categoryResults.reports.forEach(report => {
        if (report.jsonPath) {
          console.log(`   - ${path.basename(report.jsonPath)} (${report.category} JSON)`);
        }
        if (report.markdownPath) {
          console.log(`   - ${path.basename(report.markdownPath)} (${report.category} Markdown)`);
        }
      });
      console.log(`   - ${path.basename(reportResult.reportPath)} (Combined Markdown)`);
      console.log(`   - ${path.basename(reportResult.jsonPath)} (Combined JSON)`);
      
      return {
        ...reportResult,
        categoryReports: categoryResults.reports,
        reportDir: categoryResults.reportDir,
        totalFiles: categoryResults.reports.length * 2 + 2 // category files + combined files
      };
    } catch (error) {
      console.error('❌ Failed to generate report:', error.message);
      throw error;
    }
  }

  /**
   * Full scrape and report workflow
   */
  async scrapeAndReport(categories = 'all', options = {}) {
    try {
      // Enable full details extraction by default
      const scrapeOptions = {
        ...options,
        extractFullDetails: options.extractFullDetails !== false // Default to true
      };
      
      // Perform scraping
      const scrapeResult = await this.scrape(categories, scrapeOptions);
      
      if (!scrapeResult.success) {
        throw new Error(`Scraping failed: ${scrapeResult.error}`);
      }
      
      // Generate report
      const reportResult = await this.generateReport(scrapeResult.posts, options);
      
      return {
        ...reportResult,
        scrapingStats: scrapeResult.stats,
        totalPosts: scrapeResult.posts.length
      };
    } catch (error) {
      console.error('❌ Full workflow failed:', error.message);
      throw error;
    }
  }

  /**
   * Utility methods
   */
  resolveCategoriesList(categories) {
    if (categories === 'all') {
      return Object.keys(config.categories);
    }
    
    if (typeof categories === 'string') {
      return categories.split(',').map(cat => cat.trim());
    }
    
    if (Array.isArray(categories)) {
      return categories;
    }
    
    return ['main']; // Default fallback
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getStats() {
    const duration = this.stats.endTime ? 
      (this.stats.endTime - this.stats.startTime) / 1000 : 0;
    
    return {
      ...this.stats,
      duration: Math.round(duration * 100) / 100,
      postsPerSecond: duration > 0 ? Math.round((this.stats.totalPosts / duration) * 100) / 100 : 0
    };
  }
}

export default IndieHackersScraper;