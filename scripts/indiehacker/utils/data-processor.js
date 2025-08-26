/**
 * Data Processor - Handles data transformation, scoring, and deduplication
 */

import { config } from '../config.js';

export class DataProcessor {
  constructor() {
    this.processedPosts = new Set();
    this.duplicateTracker = new Map();
  }

  /**
   * Process raw scraped data
   */
  processScrapedData(rawPosts, category) {
    console.log(`🔄 Processing ${rawPosts.length} posts for category: ${category}`);
    
    const processedPosts = rawPosts
      .map(post => this.normalizePost(post, category))
      .filter(post => this.isValidPost(post))
      .map(post => this.calculateEngagementScore(post))
      .filter(post => this.filterDuplicates(post));

    console.log(`✅ Processed ${processedPosts.length} valid posts`);
    return processedPosts;
  }

  /**
   * Normalize post data structure
   */
  normalizePost(rawPost, category) {
    const categoryInfo = config.categories[category] || { name: category, url: '', description: '' };
    
    // Handle both old format (with engagement object) and new format (direct properties)
    const upvotes = rawPost.engagement?.upvotes || rawPost.upvotes || 0;
    const commentCount = rawPost.commentCount || rawPost.engagement?.comments || rawPost.comments || 0;
    
    return {
      id: this.generatePostId(rawPost),
      title: this.cleanText(rawPost.title || ''),
      author: {
        username: this.extractUsername(rawPost.author || 'Unknown'),
        displayName: this.cleanText(rawPost.author || 'Unknown')
      },
      url: this.normalizeUrl(rawPost.url || ''),
      engagement: {
        upvotes: this.parseNumber(upvotes),
        comments: this.parseNumber(commentCount),
        raw_upvotes: upvotes,
        raw_comments: commentCount,
        // Preserve raw comments data if available
        raw_comments_data: rawPost.comments || rawPost.engagement?.raw_comments || []
      },
      timestamp: this.parseTimestamp(rawPost.timestamp || 'Recent'),
      content: {
        preview: this.cleanText(rawPost.content || ''),
        summary: this.generateSummary(rawPost.content || '')
      },
      // Preserve full content if extracted
      fullContent: rawPost.fullContent || '',
      // Preserve comments array if extracted
      comments: rawPost.comments || [],
      // Preserve comment count
      commentCount: rawPost.commentCount || commentCount,
      // Preserve tags if extracted
      tags: rawPost.tags || [],
      // Preserve views if extracted  
      views: rawPost.views || 0,
      category: {
        key: category,
        name: categoryInfo.name,
        description: categoryInfo.description
      },
      metadata: {
        scrapedAt: new Date().toISOString(),
        source: 'indiehackers-scraper',
        version: '1.0'
      }
    };
  }

  /**
   * Generate unique post ID
   */
  generatePostId(post) {
    const titleSlug = (post.title || '').toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 50);
    
    const authorSlug = this.extractUsername(post.author || 'unknown');
    const urlHash = this.hashString(post.url || '');
    
    return `${titleSlug}-${authorSlug}-${urlHash}`.replace(/^-+|-+$/g, '');
  }

  /**
   * Calculate engagement score using weighted formula
   */
  calculateEngagementScore(post) {
    const { comments, upvotes } = post.engagement;
    const weights = config.scoring.weights;
    
    // Calculate base engagement score
    const baseScore = (comments * weights.comments) + (upvotes * weights.upvotes);
    
    // Calculate recency multiplier
    const recencyMultiplier = this.calculateRecencyMultiplier(post.timestamp);
    
    // Final score
    const engagementScore = baseScore * (1 + (recencyMultiplier * weights.recency));
    
    return {
      ...post,
      engagementScore: Math.round(engagementScore * 100) / 100,
      metrics: {
        baseScore,
        recencyMultiplier,
        totalScore: engagementScore
      }
    };
  }

  /**
   * Calculate recency multiplier (higher for newer posts)
   */
  calculateRecencyMultiplier(timestamp) {
    if (!timestamp) return 0;
    
    const now = new Date();
    const postTime = new Date(timestamp);
    const hoursOld = (now - postTime) / (1000 * 60 * 60);
    
    // Posts within configured hours get higher multiplier
    if (hoursOld <= config.scoring.recencyHours) {
      return Math.max(0, (config.scoring.recencyHours - hoursOld) / config.scoring.recencyHours);
    }
    
    return 0;
  }

  /**
   * Filter out duplicate posts
   */
  filterDuplicates(post) {
    const duplicateKey = this.generateDuplicateKey(post);
    
    if (this.duplicateTracker.has(duplicateKey)) {
      const existingPost = this.duplicateTracker.get(duplicateKey);
      
      // Keep the post with higher engagement score
      if (post.engagementScore > existingPost.engagementScore) {
        this.duplicateTracker.set(duplicateKey, post);
        console.log(`🔄 Replaced duplicate with higher engagement: ${post.title.substring(0, 50)}...`);
        return true;
      }
      
      console.log(`🗑️ Filtered duplicate: ${post.title.substring(0, 50)}...`);
      return false;
    }
    
    this.duplicateTracker.set(duplicateKey, post);
    return true;
  }

  /**
   * Generate key for duplicate detection
   */
  generateDuplicateKey(post) {
    // Use title and author for duplicate detection
    const titleKey = this.normalizeForComparison(post.title);
    const authorKey = post.author.username.toLowerCase();
    
    return `${titleKey}-${authorKey}`;
  }

  /**
   * Sort posts by engagement score
   */
  sortByEngagement(posts) {
    return posts.sort((a, b) => b.engagementScore - a.engagementScore);
  }

  /**
   * Group posts by category
   */
  groupByCategory(posts) {
    const grouped = {};
    
    posts.forEach(post => {
      const categoryKey = post.category.key;
      if (!grouped[categoryKey]) {
        grouped[categoryKey] = {
          category: post.category,
          posts: []
        };
      }
      grouped[categoryKey].posts.push(post);
    });
    
    // Sort posts within each category
    Object.values(grouped).forEach(group => {
      group.posts = this.sortByEngagement(group.posts);
    });
    
    return grouped;
  }

  /**
   * Extract trending themes from posts
   */
  extractTrendingThemes(posts) {
    const themes = new Map();
    const commonWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'my', 'your', 'his', 'her', 'its', 'our', 'their']);
    
    posts.forEach(post => {
      // Extract words from title and content
      const text = `${post.title} ${post.content.preview}`.toLowerCase();
      const words = text.match(/\b[a-z]{3,}\b/g) || [];
      
      words.forEach(word => {
        if (!commonWords.has(word)) {
          const currentCount = themes.get(word) || 0;
          themes.set(word, currentCount + 1);
        }
      });
    });
    
    // Convert to array and sort by frequency
    return Array.from(themes.entries())
      .filter(([word, count]) => count >= 3) // Minimum threshold
      .sort(([, a], [, b]) => b - a)
      .slice(0, config.reporting.trendingThemesLimit)
      .map(([theme, count]) => ({
        theme: this.capitalizeFirst(theme),
        count,
        posts: posts.filter(post => 
          post.title.toLowerCase().includes(theme) || 
          post.content.preview.toLowerCase().includes(theme)
        ).slice(0, 5)
      }));
  }

  /**
   * Generate executive summary
   */
  generateExecutiveSummary(posts, categoryGroups) {
    const totalPosts = posts.length;
    const categories = Object.keys(categoryGroups).length;
    
    // Find top engagement category
    let topCategory = null;
    let maxCategoryEngagement = 0;
    
    Object.entries(categoryGroups).forEach(([key, group]) => {
      const avgEngagement = group.posts.reduce((sum, post) => sum + post.engagementScore, 0) / group.posts.length;
      if (avgEngagement > maxCategoryEngagement) {
        maxCategoryEngagement = avgEngagement;
        topCategory = group.category.name;
      }
    });
    
    // Calculate total engagement
    const totalEngagement = posts.reduce((sum, post) => 
      sum + post.engagement.comments + post.engagement.upvotes, 0);
    
    return {
      totalPosts,
      categories,
      topCategory,
      totalEngagement,
      avgEngagementPerPost: Math.round((totalEngagement / totalPosts) * 100) / 100,
      dateRange: this.getDateRange(posts),
      scrapedAt: new Date().toISOString()
    };
  }

  /**
   * Utility methods
   */
  cleanText(text) {
    return text.toString().trim().replace(/\s+/g, ' ');
  }

  extractUsername(author) {
    const match = author.match(/@([a-zA-Z0-9_]+)/);
    return match ? match[1] : author.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
  }

  normalizeUrl(url) {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    if (url.startsWith('/')) return `${config.baseUrl}${url}`;
    return url;
  }

  parseNumber(value) {
    if (typeof value === 'number') return value;
    const cleaned = value.toString().replace(/[^\d]/g, '');
    return parseInt(cleaned) || 0;
  }

  parseTimestamp(timestamp) {
    if (!timestamp) return null;
    
    // Handle relative timestamps like "2h ago", "1d ago"
    const now = new Date();
    const relativeMatch = timestamp.match(/(\d+)([hmd])\s*ago/i);
    
    if (relativeMatch) {
      const value = parseInt(relativeMatch[1]);
      const unit = relativeMatch[2].toLowerCase();
      
      switch (unit) {
        case 'h':
          return new Date(now - (value * 60 * 60 * 1000));
        case 'd':
          return new Date(now - (value * 24 * 60 * 60 * 1000));
        case 'm':
          return new Date(now - (value * 60 * 1000));
      }
    }
    
    // Try to parse as regular date
    const parsed = new Date(timestamp);
    return isNaN(parsed.getTime()) ? null : parsed;
  }

  generateSummary(content) {
    if (!content) return '';
    
    // Simple summary generation - take first 150 characters
    return content.substring(0, 150).trim() + (content.length > 150 ? '...' : '');
  }

  normalizeForComparison(text) {
    return text.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  getDateRange(posts) {
    const timestamps = posts
      .map(post => post.timestamp)
      .filter(timestamp => timestamp)
      .sort();
    
    if (timestamps.length === 0) return null;
    
    return {
      from: timestamps[0],
      to: timestamps[timestamps.length - 1]
    };
  }

  isValidPost(post) {
    if (!post || !post.title) return false;
    
    // Be more lenient with title length
    if (post.title.length < 3) return false;
    
    // Handle both old and new post formats
    const comments = post.engagement?.comments || post.comments || 0;
    const upvotes = post.engagement?.upvotes || post.upvotes || 0;
    const totalEngagement = comments + upvotes;
    
    // Allow posts with zero engagement if they have a good title
    // This is because new posts might not have engagement yet
    if (totalEngagement < config.scoring.minEngagement && post.title.length < 10) return false;
    
    return true;
  }

  /**
   * Reset processor state for new scraping session
   */
  reset() {
    this.processedPosts.clear();
    this.duplicateTracker.clear();
  }
}

export default DataProcessor;