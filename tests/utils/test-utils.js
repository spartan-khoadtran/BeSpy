/**
 * Test Utilities for Twitter Unified Fetcher
 * Provides helper functions for testing various aspects of the script
 */

const { spawn } = require('child_process');
const path = require('path');

class TestUtils {
  constructor() {
    this.scriptPath = path.join(__dirname, '../../scripts/twitter-unified-fetcher.mjs');
  }

  /**
   * Execute the Twitter fetcher script with given arguments
   * @param {Array} args - Command line arguments
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} - Execution result with stdout, stderr, exitCode
   */
  async runScript(args = [], options = {}) {
    return new Promise((resolve) => {
      const child = spawn('node', [this.scriptPath, ...args], {
        stdio: 'pipe',
        ...options
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (exitCode) => {
        resolve({
          stdout,
          stderr,
          exitCode
        });
      });

      child.on('error', (error) => {
        resolve({
          stdout,
          stderr: error.message,
          exitCode: 1
        });
      });
    });
  }

  /**
   * Execute script with a timeout
   * @param {Array} args - Command line arguments
   * @param {number} timeout - Timeout in milliseconds
   * @returns {Promise<Object>} - Execution result
   */
  async runScriptWithTimeout(args = [], timeout = 30000) {
    return Promise.race([
      this.runScript(args),
      new Promise(resolve => 
        setTimeout(() => resolve({ 
          stdout: '', 
          stderr: 'Timeout', 
          exitCode: -1 
        }), timeout)
      )
    ]);
  }

  /**
   * Check if text is primarily English
   * @param {string} text - Text to analyze
   * @returns {boolean} - True if text appears to be English
   */
  isEnglishText(text) {
    if (!text || typeof text !== 'string') return false;
    
    // Common English patterns and words
    const englishPatterns = [
      /\b(the|be|to|of|and|a|in|that|have|i|it|for|not|on|with|he|as|you|do|at|this|but|his|by|from|they|we|say|her|she|or|an|will|my|one|all|would|there|their|what|so|up|out|if|about|who|get|which|go|me|when|make|can|like|time|no|just|him|know|take|people|into|year|your|good|some|could|them|see|other|than|then|now|look|only|come|its|over|think|also|back|after|use|two|how|our|work|first|well|way|even|new|want|because|any|these|give|day|most|us)\b/i
    ];
    
    // Check for English patterns
    const hasEnglishWords = englishPatterns.some(pattern => pattern.test(text));
    
    // Check for non-Latin scripts (indicates non-English)
    const nonLatinScript = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\u0600-\u06FF\u0750-\u077F\u0590-\u05FF\u0400-\u04FF\u1100-\u11FF\uAC00-\uD7AF]/;
    const hasNonLatin = nonLatinScript.test(text);
    
    // If it has non-Latin characters, it's likely not English
    if (hasNonLatin && !hasEnglishWords) return false;
    
    // Count English-like words
    const words = text.toLowerCase().split(/\s+/);
    const commonEnglishWords = ['the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i', 'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at'];
    const englishWordCount = words.filter(word => commonEnglishWords.includes(word)).length;
    
    // If more than 10% of words are common English words, consider it English
    return englishWordCount / words.length > 0.1 || (hasEnglishWords && !hasNonLatin);
  }

  /**
   * Extract hashtags from text
   * @param {string} text - Text to analyze
   * @returns {Array} - Array of hashtags
   */
  extractHashtags(text) {
    if (!text || typeof text !== 'string') return [];
    const hashtags = text.match(/#\w+/g) || [];
    return hashtags;
  }

  /**
   * Extract mentions from text
   * @param {string} text - Text to analyze
   * @returns {Array} - Array of mentions
   */
  extractMentions(text) {
    if (!text || typeof text !== 'string') return [];
    const mentions = text.match(/@\w+/g) || [];
    return mentions;
  }

  /**
   * Extract URLs from text
   * @param {string} text - Text to analyze
   * @returns {Array} - Array of URLs
   */
  extractUrls(text) {
    if (!text || typeof text !== 'string') return [];
    const urlRegex = /https?:\/\/[^\s]+/g;
    const urls = text.match(urlRegex) || [];
    return urls;
  }

  /**
   * Calculate engagement rate
   * @param {Object} metrics - Post metrics (likes, retweets, replies, impressions)
   * @returns {number} - Engagement rate as percentage
   */
  calculateEngagementRate(metrics) {
    if (!metrics || typeof metrics !== 'object') return 0;
    
    const { likes = 0, retweets = 0, replies = 0, impressions = 0 } = metrics;
    
    if (impressions === 0) return 0;
    
    const totalEngagement = likes + retweets + replies;
    return parseFloat(((totalEngagement / impressions) * 100).toFixed(2));
  }

  /**
   * Transform raw post data to standardized format
   * @param {Object} rawPost - Raw post data
   * @returns {Object} - Transformed post data
   */
  transformPostData(rawPost) {
    if (!rawPost || typeof rawPost !== 'object') {
      return this.getEmptyPostStructure();
    }

    const transformed = {
      post_id: rawPost.id || rawPost.post_id || this.generateId(),
      url: rawPost.url || `https://twitter.com/${rawPost.handle || 'unknown'}/status/${rawPost.id || '0'}`,
      author: {
        user_id: rawPost.author?.user_id || rawPost.userId || this.generateId(),
        username: rawPost.handle || rawPost.author?.username || 'unknown',
        display_name: rawPost.author || rawPost.author?.display_name || 'Unknown User',
        verified: rawPost.verified || rawPost.author?.verified || false,
        follower_count: rawPost.follower_count || rawPost.author?.follower_count || 0
      },
      content: {
        text: rawPost.text || rawPost.content?.text || '',
        hashtags: this.extractHashtags(rawPost.text || '').map(h => h.substring(1)), // Remove # symbol
        mentions: this.extractMentions(rawPost.text || '').map(m => m.substring(1)), // Remove @ symbol
        urls: this.extractUrls(rawPost.text || '')
      },
      metrics: {
        impressions: rawPost.impressions || rawPost.metrics?.impressions || 0,
        likes: rawPost.likes || rawPost.metrics?.likes || 0,
        retweets: rawPost.retweets || rawPost.metrics?.retweets || 0,
        replies: rawPost.replies || rawPost.metrics?.replies || 0,
        bookmarks: rawPost.bookmarks || rawPost.metrics?.bookmarks || 0,
        shares: rawPost.shares || rawPost.metrics?.shares || 0
      },
      timestamps: {
        created_at: rawPost.timestamp || rawPost.timestamps?.created_at || new Date().toISOString(),
        last_updated: rawPost.last_updated || rawPost.timestamps?.last_updated || new Date().toISOString()
      },
      engagement_rate: 0, // Will be calculated below
      comments: rawPost.comments || []
    };

    // Calculate engagement rate
    transformed.engagement_rate = this.calculateEngagementRate(transformed.metrics);

    return transformed;
  }

  /**
   * Calculate reply depth for a comment
   * @param {string} parentId - Parent post/comment ID
   * @param {number} parentDepth - Depth of parent (0 for original post)
   * @returns {number} - Reply depth
   */
  calculateReplyDepth(parentId, parentDepth = 0) {
    if (!parentId) return 0;
    return parentDepth + 1;
  }

  /**
   * Parse API response and handle malformed data
   * @param {any} response - API response
   * @returns {Object} - Parsed response or empty structure
   */
  parseApiResponse(response) {
    try {
      if (!response || typeof response !== 'object') {
        return { posts: [], metadata: {} };
      }

      if (Array.isArray(response)) {
        return { posts: response, metadata: {} };
      }

      return {
        posts: response.posts || response.data?.posts || [],
        metadata: response.metadata || response.data?.metadata || {}
      };
    } catch (error) {
      return { posts: [], metadata: {}, error: error.message };
    }
  }

  /**
   * Generate a random ID for testing purposes
   * @returns {string} - Random ID
   */
  generateId() {
    return Math.random().toString(36).substr(2, 9);
  }

  /**
   * Get empty post structure for testing
   * @returns {Object} - Empty post structure
   */
  getEmptyPostStructure() {
    return {
      post_id: this.generateId(),
      url: 'https://twitter.com/unknown/status/0',
      author: {
        user_id: this.generateId(),
        username: 'unknown',
        display_name: 'Unknown User',
        verified: false,
        follower_count: 0
      },
      content: {
        text: '',
        hashtags: [],
        mentions: [],
        urls: []
      },
      metrics: {
        impressions: 0,
        likes: 0,
        retweets: 0,
        replies: 0,
        bookmarks: 0,
        shares: 0
      },
      timestamps: {
        created_at: new Date().toISOString(),
        last_updated: new Date().toISOString()
      },
      engagement_rate: 0,
      comments: []
    };
  }

  /**
   * Validate post data structure
   * @param {Object} post - Post data to validate
   * @returns {boolean} - True if valid structure
   */
  validatePostStructure(post) {
    if (!post || typeof post !== 'object') return false;

    const requiredFields = [
      'post_id', 'url', 'author', 'content', 'metrics', 'timestamps', 'engagement_rate'
    ];

    return requiredFields.every(field => post.hasOwnProperty(field));
  }

  /**
   * Clean up test files and directories
   * @param {string} directory - Directory to clean up
   */
  async cleanup(directory) {
    const fs = require('fs').promises;
    const path = require('path');

    try {
      const fullPath = path.join(__dirname, directory);
      await fs.rmdir(fullPath, { recursive: true });
    } catch (error) {
      // Directory might not exist, which is fine
    }
  }
}

module.exports = TestUtils;