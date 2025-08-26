/**
 * IndieHackers Test Utilities
 * Specialized utilities for testing IndieHackers scraper functionality
 */

const fs = require('fs').promises;
const path = require('path');

class IndieHackersTestUtils {
  constructor() {
    this.categories = [
      'starting-up',
      'tech', 
      'artificial-intelligence',
      'creators',
      'money',
      'main'
    ];
    
    this.categoryUrls = {
      'starting-up': 'https://www.indiehackers.com/starting-up',
      'tech': 'https://www.indiehackers.com/tech',
      'artificial-intelligence': 'https://www.indiehackers.com/tags/artificial-intelligence',
      'creators': 'https://www.indiehackers.com/creators',
      'money': 'https://www.indiehackers.com/money',
      'main': 'https://www.indiehackers.com/'
    };
  }

  /**
   * Validate IndieHackers post structure
   * @param {Object} post - Post object to validate
   * @returns {Object} - Validation result
   */
  validatePostStructure(post) {
    const requiredFields = [
      'id', 'title', 'url', 'author', 'category', 
      'engagement', 'timestamp', 'content_preview'
    ];

    const result = {
      valid: true,
      errors: [],
      warnings: []
    };

    // Check required fields
    for (const field of requiredFields) {
      if (!post.hasOwnProperty(field)) {
        result.valid = false;
        result.errors.push(`Missing required field: ${field}`);
      }
    }

    // Validate specific field formats
    if (post.url && !this.isValidIndieHackersUrl(post.url)) {
      result.valid = false;
      result.errors.push('Invalid IndieHackers URL format');
    }

    if (post.timestamp && !this.isValidISO8601(post.timestamp)) {
      result.valid = false;
      result.errors.push('Invalid timestamp format - should be ISO 8601');
    }

    if (post.category && !this.categories.includes(post.category) && post.category !== 'main') {
      result.warnings.push(`Unknown category: ${post.category}`);
    }

    // Validate engagement metrics
    if (post.engagement) {
      const engagementResult = this.validateEngagementMetrics(post.engagement);
      if (!engagementResult.valid) {
        result.valid = false;
        result.errors.push(...engagementResult.errors);
      }
    }

    // Validate author structure
    if (post.author) {
      const authorResult = this.validateAuthorStructure(post.author);
      if (!authorResult.valid) {
        result.valid = false;
        result.errors.push(...authorResult.errors);
      }
    }

    return result;
  }

  /**
   * Validate engagement metrics structure
   * @param {Object} engagement - Engagement metrics
   * @returns {Object} - Validation result
   */
  validateEngagementMetrics(engagement) {
    const result = { valid: true, errors: [] };
    const requiredMetrics = ['upvotes', 'comments', 'views'];

    for (const metric of requiredMetrics) {
      if (!engagement.hasOwnProperty(metric)) {
        result.valid = false;
        result.errors.push(`Missing engagement metric: ${metric}`);
      } else if (typeof engagement[metric] !== 'number' || engagement[metric] < 0) {
        result.valid = false;
        result.errors.push(`Invalid ${metric} value - must be non-negative number`);
      }
    }

    return result;
  }

  /**
   * Validate author structure
   * @param {Object} author - Author object
   * @returns {Object} - Validation result
   */
  validateAuthorStructure(author) {
    const result = { valid: true, errors: [] };
    const requiredFields = ['username', 'display_name'];

    for (const field of requiredFields) {
      if (!author.hasOwnProperty(field)) {
        result.valid = false;
        result.errors.push(`Missing author field: ${field}`);
      } else if (typeof author[field] !== 'string' || author[field].trim() === '') {
        result.valid = false;
        result.errors.push(`Invalid ${field} - must be non-empty string`);
      }
    }

    if (author.profile_url && !this.isValidIndieHackersProfileUrl(author.profile_url)) {
      result.errors.push('Invalid author profile URL format');
    }

    return result;
  }

  /**
   * Calculate engagement score using the expected algorithm
   * @param {Object} engagement - Engagement metrics
   * @returns {number} - Calculated engagement score
   */
  calculateEngagementScore(engagement) {
    if (!engagement) return 0;

    const { upvotes = 0, comments = 0, views = 0 } = engagement;
    
    // Based on PRD: Comments have higher weight, then upvotes, then recency/views
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
   * Validate report structure matches PRD template
   * @param {Object} report - Generated report
   * @returns {Object} - Validation result
   */
  validateReportStructure(report) {
    const result = { valid: true, errors: [], warnings: [] };
    
    const requiredSections = [
      'metadata',
      'summary', 
      'top_posts',
      'category_breakdown',
      'trending_themes'
    ];

    // Check main sections
    for (const section of requiredSections) {
      if (!report.hasOwnProperty(section)) {
        result.valid = false;
        result.errors.push(`Missing report section: ${section}`);
      }
    }

    // Validate summary structure
    if (report.summary) {
      const requiredSummaryFields = [
        'total_posts_analyzed',
        'top_engagement_category', 
        'trending_topics'
      ];

      for (const field of requiredSummaryFields) {
        if (!report.summary.hasOwnProperty(field)) {
          result.valid = false;
          result.errors.push(`Missing summary field: ${field}`);
        }
      }
    }

    // Validate top posts section
    if (report.top_posts) {
      if (!Array.isArray(report.top_posts)) {
        result.valid = false;
        result.errors.push('top_posts must be an array');
      } else {
        // Check if posts are properly sorted by engagement
        for (let i = 1; i < report.top_posts.length; i++) {
          const current = report.top_posts[i].engagement_score || 0;
          const previous = report.top_posts[i-1].engagement_score || 0;
          if (current > previous) {
            result.warnings.push('Top posts may not be properly sorted by engagement score');
            break;
          }
        }
      }
    }

    return result;
  }

  /**
   * Validate markdown report format
   * @param {string} markdown - Markdown content
   * @returns {Object} - Validation result
   */
  validateMarkdownReport(markdown) {
    const result = { valid: true, errors: [], warnings: [] };

    if (typeof markdown !== 'string') {
      result.valid = false;
      result.errors.push('Report must be a string');
      return result;
    }

    // Check for required sections in markdown
    const requiredSections = [
      '# IndieHackers Daily Report',
      '## Executive Summary',
      '## Top Posts (Ranked by Engagement)',
      '## Category Breakdown',
      '## Trending Themes'
    ];

    for (const section of requiredSections) {
      if (!markdown.includes(section)) {
        result.valid = false;
        result.errors.push(`Missing markdown section: ${section}`);
      }
    }

    // Check for proper markdown formatting
    const lines = markdown.split('\n');
    let inCodeBlock = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Track code blocks
      if (line.startsWith('```')) {
        inCodeBlock = !inCodeBlock;
      }
      
      // Skip validation inside code blocks
      if (inCodeBlock) continue;
      
      // Check heading hierarchy
      if (line.startsWith('#')) {
        const level = (line.match(/^#+/) || [''])[0].length;
        if (level > 4) {
          result.warnings.push(`Deep heading level (${level}) at line ${i + 1}`);
        }
      }
      
      // Check for proper URL formatting
      const urlMatches = line.match(/\[([^\]]+)\]\(([^)]+)\)/g);
      if (urlMatches) {
        for (const match of urlMatches) {
          const url = match.match(/\[([^\]]+)\]\(([^)]+)\)/)[2];
          if (!this.isValidUrl(url)) {
            result.warnings.push(`Invalid URL format: ${url} at line ${i + 1}`);
          }
        }
      }
    }

    return result;
  }

  /**
   * Test CLI parameter parsing
   * @param {Array} args - Command line arguments
   * @returns {Object} - Parsed parameters and validation
   */
  testCliParameters(args) {
    const result = { valid: true, errors: [], params: {} };
    
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      
      if (arg === '--date') {
        const dateValue = args[i + 1];
        if (!dateValue) {
          result.valid = false;
          result.errors.push('--date requires a value');
        } else if (!this.isValidDateFormat(dateValue)) {
          result.valid = false;
          result.errors.push('--date must be in YYYY-MM-DD format');
        } else {
          result.params.date = dateValue;
        }
        i++; // Skip next argument
      } else if (arg === '--categories') {
        const categoriesValue = args[i + 1];
        if (!categoriesValue) {
          result.valid = false;
          result.errors.push('--categories requires a value');
        } else {
          const categories = categoriesValue.split(',').map(c => c.trim());
          const invalidCategories = categories.filter(c => 
            c !== 'all' && !this.categories.includes(c)
          );
          if (invalidCategories.length > 0) {
            result.valid = false;
            result.errors.push(`Invalid categories: ${invalidCategories.join(', ')}`);
          } else {
            result.params.categories = categories;
          }
        }
        i++; // Skip next argument  
      } else if (arg === '--output') {
        const outputValue = args[i + 1];
        if (!outputValue) {
          result.valid = false;
          result.errors.push('--output requires a value');
        } else {
          result.params.output = outputValue;
        }
        i++; // Skip next argument
      } else if (arg.startsWith('--')) {
        result.errors.push(`Unknown parameter: ${arg}`);
      }
    }

    return result;
  }

  /**
   * Generate mock HTML for testing scraper
   * @param {string} category - Category to generate HTML for
   * @param {number} postCount - Number of posts to include
   * @returns {string} - Mock HTML content
   */
  generateMockHTML(category, postCount = 5) {
    const posts = [];
    
    for (let i = 1; i <= postCount; i++) {
      posts.push(`
        <div class="post-item" data-testid="post-${i}">
          <h3 class="post-title">
            <a href="/post/test-post-${i}">Test Post ${i} for ${category}</a>
          </h3>
          <div class="post-meta">
            <span class="author">@testuser${i}</span>
            <span class="timestamp">${new Date().toISOString()}</span>
          </div>
          <div class="engagement-metrics">
            <span class="upvotes">${10 + i * 5}</span>
            <span class="comments">${i * 2}</span>
            <span class="views">${100 + i * 50}</span>
          </div>
          <div class="content-preview">
            This is a test post preview for ${category} category. Post number ${i}.
          </div>
        </div>
      `);
    }

    return `
      <!DOCTYPE html>
      <html>
        <head><title>IndieHackers - ${category}</title></head>
        <body>
          <div class="posts-container" data-testid="posts-container">
            ${posts.join('\n')}
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Check if URL is valid IndieHackers URL
   * @param {string} url - URL to validate
   * @returns {boolean} - True if valid
   */
  isValidIndieHackersUrl(url) {
    if (!url || typeof url !== 'string') return false;
    return url.startsWith('https://www.indiehackers.com/');
  }

  /**
   * Check if URL is valid IndieHackers profile URL
   * @param {string} url - URL to validate  
   * @returns {boolean} - True if valid
   */
  isValidIndieHackersProfileUrl(url) {
    if (!url || typeof url !== 'string') return false;
    return url.match(/^https:\/\/www\.indiehackers\.com\/@[\w-]+$/);
  }

  /**
   * Check if string is valid ISO 8601 timestamp
   * @param {string} timestamp - Timestamp to validate
   * @returns {boolean} - True if valid
   */
  isValidISO8601(timestamp) {
    if (!timestamp || typeof timestamp !== 'string') return false;
    const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
    return iso8601Regex.test(timestamp);
  }

  /**
   * Check if string is valid date format (YYYY-MM-DD)
   * @param {string} date - Date string to validate
   * @returns {boolean} - True if valid
   */
  isValidDateFormat(date) {
    if (!date || typeof date !== 'string') return false;
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) return false;
    
    // Check if it's a valid date
    const dateObj = new Date(date);
    return dateObj instanceof Date && !isNaN(dateObj) && 
           dateObj.toISOString().substr(0, 10) === date;
  }

  /**
   * Check if string is a valid URL
   * @param {string} url - URL to validate
   * @returns {boolean} - True if valid
   */
  isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Create test output directory
   * @param {string} testName - Name of the test
   * @returns {string} - Path to test directory
   */
  async createTestOutputDir(testName) {
    const testDir = path.join(__dirname, '../output', testName);
    await fs.mkdir(testDir, { recursive: true });
    return testDir;
  }

  /**
   * Clean up test files
   * @param {string} testDir - Directory to clean up
   */
  async cleanupTestFiles(testDir) {
    try {
      await fs.rmdir(testDir, { recursive: true });
    } catch (error) {
      // Directory might not exist, which is fine
    }
  }

  /**
   * Compare two posts for equality (ignoring timestamps)
   * @param {Object} post1 - First post
   * @param {Object} post2 - Second post
   * @returns {boolean} - True if posts are equivalent
   */
  postsEqual(post1, post2) {
    if (!post1 || !post2) return false;
    
    const compareFields = ['id', 'title', 'url', 'category'];
    
    for (const field of compareFields) {
      if (post1[field] !== post2[field]) return false;
    }
    
    // Compare author
    if (post1.author?.username !== post2.author?.username) return false;
    
    // Compare engagement (allowing for small differences due to timing)
    const eng1 = post1.engagement || {};
    const eng2 = post2.engagement || {};
    
    const engagementFields = ['upvotes', 'comments', 'views'];
    for (const field of engagementFields) {
      if (Math.abs((eng1[field] || 0) - (eng2[field] || 0)) > 1) return false;
    }
    
    return true;
  }

  /**
   * Generate performance test data
   * @param {number} postCount - Number of posts to generate
   * @returns {Array} - Array of test posts
   */
  generatePerformanceTestData(postCount = 1000) {
    const posts = [];
    const categories = this.categories.slice(0, -1); // Exclude 'main'
    
    for (let i = 1; i <= postCount; i++) {
      const category = categories[i % categories.length];
      posts.push({
        id: `perf-post-${i}`,
        title: `Performance Test Post ${i}`,
        url: `https://www.indiehackers.com/post/perf-test-${i}`,
        author: {
          username: `perfuser${i % 100}`,
          display_name: `Performance User ${i % 100}`,
          profile_url: `https://www.indiehackers.com/@perfuser${i % 100}`
        },
        category,
        engagement: {
          upvotes: Math.floor(Math.random() * 200),
          comments: Math.floor(Math.random() * 50),
          views: Math.floor(Math.random() * 5000) + 100
        },
        timestamp: new Date(Date.now() - Math.random() * 86400000).toISOString(),
        content_preview: `This is performance test post ${i} with some content to analyze.`,
        tags: ['performance', 'test', category]
      });
    }
    
    return posts;
  }
}

module.exports = IndieHackersTestUtils;