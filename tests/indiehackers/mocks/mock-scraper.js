/**
 * Mock IndieHackers Scraper for Testing
 * Provides consistent mock data for testing scraper functionality
 */

const sampleData = require('../fixtures/sample-posts.json');

class MockIndieHackersScraper {
  constructor(options = {}) {
    this.options = {
      delay: options.delay || 0,
      shouldFail: options.shouldFail || false,
      failureRate: options.failureRate || 0,
      mockNetworkLatency: options.mockNetworkLatency || 100,
      ...options
    };
    
    this.scraped = [];
    this.categories = Object.keys(sampleData.categoryData);
  }

  /**
   * Mock scraping a category
   * @param {string} category - Category to scrape
   * @param {Object} options - Scraping options
   * @returns {Promise<Array>} - Array of scraped posts
   */
  async scrapeCategory(category, options = {}) {
    await this.simulateNetworkDelay();
    
    if (this.shouldSimulateFailure()) {
      throw new Error(`Mock scraping failed for category: ${category}`);
    }

    const categoryPosts = sampleData.sampleIndieHackersPosts.filter(
      post => post.category === category || category === 'all'
    );

    // Simulate processing time
    await this.sleep(this.options.delay);

    const scrapedPosts = categoryPosts.map(post => ({
      ...post,
      scraped_at: new Date().toISOString(),
      scraper_version: '1.0.0-test'
    }));

    this.scraped.push(...scrapedPosts);
    return scrapedPosts;
  }

  /**
   * Mock scraping all categories
   * @param {Object} options - Scraping options
   * @returns {Promise<Object>} - Scraped data by category
   */
  async scrapeAll(options = {}) {
    const results = {};
    const categories = options.categories || this.categories.filter(c => c !== 'main');

    for (const category of categories) {
      try {
        results[category] = await this.scrapeCategory(category, options);
      } catch (error) {
        results[category] = { error: error.message };
      }
    }

    return results;
  }

  /**
   * Mock engagement score calculation
   * @param {Object} post - Post data
   * @returns {number} - Engagement score
   */
  calculateEngagementScore(post) {
    if (!post.engagement) return 0;
    
    const { upvotes = 0, comments = 0, views = 0 } = post.engagement;
    
    // Mock algorithm: comments have higher weight
    const commentWeight = 3;
    const upvoteWeight = 2;
    const viewWeight = 0.1;
    
    return Math.round(
      (comments * commentWeight) + 
      (upvotes * upvoteWeight) + 
      (views * viewWeight)
    );
  }

  /**
   * Mock data processing and prioritization
   * @param {Array} posts - Array of posts
   * @returns {Array} - Processed and sorted posts
   */
  processPosts(posts) {
    return posts
      .map(post => ({
        ...post,
        engagement_score: this.calculateEngagementScore(post),
        processed_at: new Date().toISOString()
      }))
      .sort((a, b) => b.engagement_score - a.engagement_score);
  }

  /**
   * Mock duplicate detection
   * @param {Array} posts - Array of posts
   * @returns {Array} - Deduplicated posts
   */
  removeDuplicates(posts) {
    const seen = new Set();
    return posts.filter(post => {
      const key = `${post.title}-${post.author.username}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /**
   * Mock trend analysis
   * @param {Array} posts - Array of posts
   * @returns {Object} - Trending themes
   */
  analyzeTrends(posts) {
    const tagCounts = {};
    const themes = {};

    posts.forEach(post => {
      if (post.tags) {
        post.tags.forEach(tag => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
      }

      // Simple keyword extraction for themes
      const keywords = this.extractKeywords(post.title + ' ' + post.content_preview);
      keywords.forEach(keyword => {
        themes[keyword] = (themes[keyword] || 0) + 1;
      });
    });

    return {
      topTags: this.getTopItems(tagCounts, 5),
      topThemes: this.getTopItems(themes, 5)
    };
  }

  /**
   * Extract keywords from text (simple mock implementation)
   * @param {string} text - Text to analyze
   * @returns {Array} - Array of keywords
   */
  extractKeywords(text) {
    if (!text) return [];
    
    const commonWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between'];
    
    return text
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 3 && !commonWords.includes(word))
      .filter(word => /^[a-zA-Z]+$/.test(word))
      .slice(0, 10);
  }

  /**
   * Get top items from a count object
   * @param {Object} countObject - Object with counts
   * @param {number} limit - Number of top items
   * @returns {Array} - Top items with counts
   */
  getTopItems(countObject, limit = 5) {
    return Object.entries(countObject)
      .sort(([,a], [,b]) => b - a)
      .slice(0, limit)
      .map(([item, count]) => ({ item, count }));
  }

  /**
   * Mock report generation
   * @param {Object} data - Scraped data
   * @param {Object} options - Report options
   * @returns {Object} - Generated report
   */
  generateReport(data, options = {}) {
    const allPosts = Object.values(data).flat().filter(post => !post.error);
    const processedPosts = this.processPosts(allPosts);
    const uniquePosts = this.removeDuplicates(processedPosts);
    const trends = this.analyzeTrends(uniquePosts);

    const report = {
      metadata: {
        generated_at: new Date().toISOString(),
        total_posts: uniquePosts.length,
        categories_scraped: Object.keys(data).length,
        scraper_version: '1.0.0-test'
      },
      summary: {
        total_posts_analyzed: uniquePosts.length,
        top_engagement_category: this.getTopEngagementCategory(data),
        trending_topics: trends.topThemes.map(t => t.item)
      },
      top_posts: uniquePosts.slice(0, 10),
      category_breakdown: this.getCategoryBreakdown(data),
      trending_themes: trends,
      errors: Object.entries(data)
        .filter(([, posts]) => posts.error)
        .map(([category, error]) => ({ category, error: error.error }))
    };

    return report;
  }

  /**
   * Get category with highest engagement
   * @param {Object} data - Scraped data by category
   * @returns {string} - Category name
   */
  getTopEngagementCategory(data) {
    let topCategory = 'unknown';
    let maxAvgEngagement = 0;

    Object.entries(data).forEach(([category, posts]) => {
      if (posts.error || !Array.isArray(posts)) return;
      
      const avgEngagement = posts.reduce((sum, post) => 
        sum + (post.engagement_score || 0), 0) / posts.length;
      
      if (avgEngagement > maxAvgEngagement) {
        maxAvgEngagement = avgEngagement;
        topCategory = category;
      }
    });

    return topCategory;
  }

  /**
   * Get breakdown by category
   * @param {Object} data - Scraped data by category
   * @returns {Object} - Category breakdown
   */
  getCategoryBreakdown(data) {
    const breakdown = {};
    
    Object.entries(data).forEach(([category, posts]) => {
      if (posts.error) {
        breakdown[category] = { error: posts.error };
      } else {
        breakdown[category] = {
          post_count: posts.length,
          avg_engagement: posts.length > 0 ? 
            posts.reduce((sum, post) => sum + (post.engagement_score || 0), 0) / posts.length : 0,
          top_post: posts.sort((a, b) => (b.engagement_score || 0) - (a.engagement_score || 0))[0]
        };
      }
    });

    return breakdown;
  }

  /**
   * Simulate network delay
   * @returns {Promise} - Resolves after delay
   */
  async simulateNetworkDelay() {
    if (this.options.mockNetworkLatency > 0) {
      await this.sleep(this.options.mockNetworkLatency);
    }
  }

  /**
   * Check if should simulate failure
   * @returns {boolean} - True if should fail
   */
  shouldSimulateFailure() {
    if (this.options.shouldFail) return true;
    return Math.random() < this.options.failureRate;
  }

  /**
   * Sleep utility
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise} - Resolves after delay
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Reset scraper state
   */
  reset() {
    this.scraped = [];
  }

  /**
   * Get scraping statistics
   * @returns {Object} - Stats object
   */
  getStats() {
    return {
      total_scraped: this.scraped.length,
      categories_attempted: this.categories.length,
      success_rate: this.options.shouldFail ? 0 : 1 - this.options.failureRate
    };
  }
}

module.exports = MockIndieHackersScraper;