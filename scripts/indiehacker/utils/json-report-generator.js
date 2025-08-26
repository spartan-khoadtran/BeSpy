/**
 * JSON Report Generator - Creates JSON reports following the exact report_format.json structure
 */

import fs from 'fs/promises';
import path from 'path';
import { config } from '../config.js';

export class JSONReportGenerator {
  constructor() {
    this.outputDir = config.reporting.outputDir;
  }

  /**
   * Generate JSON report following the exact format specification
   */
  async generateJSONReport(allPosts, date = new Date()) {
    try {
      console.log('📋 Generating JSON report...');
      
      // Create output directory
      const dateStr = this.formatDate(date);
      const reportDir = path.join(this.outputDir, dateStr);
      await this.ensureDirectoryExists(reportDir);
      
      // Build the JSON structure according to report_format.json
      const reportData = this.buildJSONStructure(allPosts, dateStr);
      
      // Write JSON report
      const jsonPath = path.join(reportDir, 'raw-data.json');
      await fs.writeFile(jsonPath, JSON.stringify(reportData, null, 2), 'utf8');
      
      console.log(`✅ JSON report generated: ${jsonPath}`);
      console.log(`📊 Total posts with full data: ${reportData.posts.length}`);
      
      return {
        jsonPath,
        stats: {
          totalPosts: reportData.posts.length,
          categoriesAnalyzed: reportData.metadata.categories_covered,
          hasFullContent: reportData.posts.filter(p => p.content.full_text).length
        }
      };
    } catch (error) {
      console.error('❌ Failed to generate JSON report:', error.message);
      throw error;
    }
  }

  /**
   * Build JSON structure according to report_format.json specification
   */
  buildJSONStructure(posts, dateStr) {
    // Calculate metadata
    const metadata = this.buildMetadata(posts, dateStr);
    
    // Format posts with all required fields
    const formattedPosts = this.formatPosts(posts);
    
    // Build category statistics
    const categories = this.buildCategoryStats(formattedPosts);
    
    // Extract trending themes
    const trendingThemes = this.extractTrendingThemes(formattedPosts);
    
    // Build engagement scoring info
    const engagementScoring = {
      algorithm: {
        comments_weight: config.scoring?.weights?.comments || 0.6,
        upvotes_weight: config.scoring?.weights?.upvotes || 0.3,
        recency_weight: config.scoring?.weights?.recency || 0.1
      },
      description: "Posts ranked by engagement score calculated from weighted metrics"
    };
    
    return {
      metadata,
      posts: formattedPosts,
      categories,
      trending_themes: trendingThemes,
      engagement_scoring: engagementScoring
    };
  }

  /**
   * Build metadata section
   */
  buildMetadata(posts, dateStr) {
    const categoriesSet = new Set(posts.map(p => p.category?.key || 'main'));
    const totalEngagement = posts.reduce((sum, post) => {
      const comments = post.commentCount || post.comments?.length || post.engagement?.comments || 0;
      const upvotes = post.engagement?.upvotes || post.upvotes || 0;
      return sum + comments + upvotes;
    }, 0);
    
    const avgEngagement = posts.length > 0 ? totalEngagement / posts.length : 0;
    
    // Find top engagement category
    const categoryEngagement = {};
    posts.forEach(post => {
      const category = post.category?.key || 'main';
      const engagement = (post.commentCount || post.comments?.length || post.engagement?.comments || 0) + 
                        (post.engagement?.upvotes || post.upvotes || 0);
      categoryEngagement[category] = (categoryEngagement[category] || 0) + engagement;
    });
    
    const topCategory = Object.entries(categoryEngagement)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'main';
    
    return {
      report_date: dateStr,
      generated_at: new Date().toISOString(),
      scraper_version: "2.0",
      total_posts_analyzed: posts.length,
      categories_covered: categoriesSet.size,
      top_engagement_category: this.getCategoryName(topCategory),
      average_engagement_per_post: Math.round(avgEngagement * 100) / 100,
      total_community_engagement: totalEngagement
    };
  }

  /**
   * Format posts according to specification
   */
  formatPosts(posts) {
    return posts.map((post, index) => {
      // Extract all the data we have
      const postId = this.generatePostId(post);
      const title = post.title || '';
      const url = this.normalizeUrl(post.url);
      
      // Author information
      const author = {
        username: this.extractUsername(post.author),
        display_name: this.getDisplayName(post.author),
        verified: false // We don't have this data yet
      };
      
      // Category
      const category = this.getCategoryName(post.category?.key || 'main');
      
      // Content - get the full text properly
      let fullText = '';
      
      // Check different possible locations for full content
      if (post.fullContent && post.fullContent.length > 0) {
        fullText = post.fullContent;
      } else if (post.content && typeof post.content === 'string') {
        fullText = post.content;
      } else if (post.content && typeof post.content === 'object') {
        fullText = post.content.full || post.content.preview || '';
      }
      
      const content = {
        summary: this.generateSummary(post),
        full_text: fullText // Use the actual full text, not summary
      };
      
      // Metrics
      const commentCount = post.commentCount || post.comments?.length || post.engagement?.comments || 0;
      const upvotes = post.engagement?.upvotes || post.upvotes || 0;
      const engagementScore = post.engagementScore || this.calculateEngagementScore(commentCount, upvotes);
      const views = post.views || 0;
      
      const metrics = {
        comments: commentCount,
        upvotes: upvotes,
        engagement_score: Math.round(engagementScore * 100) / 100,
        views: views
      };
      
      // Comments data - extract from what we have
      const commentsData = this.extractCommentsData(post);
      
      // Tags
      const tags = post.tags || [];
      
      // Timestamps
      const timestamps = {
        posted_at: post.timestamp ? new Date(post.timestamp).toISOString() : null,
        scraped_at: post.metadata?.scrapedAt || new Date().toISOString()
      };
      
      // Ranking (1-based)
      const ranking = index + 1;
      
      return {
        post_id: postId,
        title,
        url,
        author,
        category,
        content,
        metrics,
        comments_data: commentsData,
        tags,
        timestamps,
        ranking
      };
    });
  }

  /**
   * Extract comments data from post
   */
  extractCommentsData(post) {
    // Check different possible locations for comments
    if (post.comments && Array.isArray(post.comments)) {
      return post.comments.map(comment => ({
        author: comment.author || 'Anonymous',
        text: comment.text || comment.content || '',
        upvotes: comment.upvotes || 0,
        timestamp: comment.timestamp || null
      }));
    }
    
    if (post.engagement?.raw_comments && Array.isArray(post.engagement.raw_comments)) {
      return post.engagement.raw_comments.map(comment => ({
        author: comment.author || 'Anonymous',
        text: comment.text || comment.content || '',
        upvotes: comment.upvotes || 0,
        timestamp: comment.timestamp || null
      }));
    }
    
    // Return empty array if no comments data
    return [];
  }

  /**
   * Build category statistics
   */
  buildCategoryStats(posts) {
    const categoryMap = {
      main: 'IndieHackers',
      'starting-up': 'starting_up',
      tech: 'tech',
      ai: 'ai',
      creators: 'creators',
      money: 'money'
    };
    
    const stats = {};
    
    // Initialize all categories
    Object.values(categoryMap).forEach(cat => {
      stats[cat] = {
        post_count: 0,
        total_engagement: 0,
        average_engagement: 0,
        top_post: null
      };
    });
    
    // Group posts by category and calculate stats
    posts.forEach(post => {
      const categoryKey = categoryMap[post.category?.toLowerCase()] || 
                         categoryMap[post.category?.key] || 
                         'IndieHackers';
      
      if (!stats[categoryKey]) {
        stats[categoryKey] = {
          post_count: 0,
          total_engagement: 0,
          average_engagement: 0,
          top_post: null
        };
      }
      
      stats[categoryKey].post_count++;
      const engagement = post.metrics.comments + post.metrics.upvotes;
      stats[categoryKey].total_engagement += engagement;
      
      // Track top post
      if (!stats[categoryKey].top_post || 
          post.metrics.engagement_score > (stats[categoryKey].top_post.engagement_score || 0)) {
        stats[categoryKey].top_post = {
          title: post.title,
          engagement_score: post.metrics.engagement_score
        };
      }
    });
    
    // Calculate averages
    Object.keys(stats).forEach(key => {
      if (stats[key].post_count > 0) {
        stats[key].average_engagement = Math.round(
          (stats[key].total_engagement / stats[key].post_count) * 100
        ) / 100;
      }
    });
    
    return stats;
  }

  /**
   * Extract trending themes
   */
  extractTrendingThemes(posts) {
    const themeMap = new Map();
    const commonWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were']);
    
    // Count keyword occurrences
    posts.forEach(post => {
      const text = `${post.title} ${post.content.summary}`.toLowerCase();
      const words = text.match(/\b[a-z]{3,}\b/g) || [];
      
      words.forEach(word => {
        if (!commonWords.has(word)) {
          if (!themeMap.has(word)) {
            themeMap.set(word, { count: 0, posts: [] });
          }
          const theme = themeMap.get(word);
          theme.count++;
          if (!theme.posts.find(p => p.post_id === post.post_id)) {
            theme.posts.push({
              post_id: post.post_id,
              title: post.title,
              url: post.url,
              comments: post.metrics.comments
            });
          }
        }
      });
    });
    
    // Convert to array and sort
    return Array.from(themeMap.entries())
      .filter(([, data]) => data.count >= 2)
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 10)
      .map(([keyword, data]) => ({
        keyword: keyword.charAt(0).toUpperCase() + keyword.slice(1),
        frequency: data.count,
        related_posts: data.posts.slice(0, 3)
      }));
  }

  /**
   * Utility methods
   */
  formatDate(date) {
    const d = date instanceof Date ? date : new Date(date);
    return d.toISOString().split('T')[0];
  }

  formatDateTime(date) {
    const d = date instanceof Date ? date : new Date(date);
    return d.toISOString();
  }

  async ensureDirectoryExists(dir) {
    try {
      await fs.access(dir);
    } catch {
      await fs.mkdir(dir, { recursive: true });
    }
  }

  generatePostId(post) {
    // Try to extract from URL first
    const urlMatch = post.url?.match(/post\/([a-zA-Z0-9_-]+)/);
    if (urlMatch) return urlMatch[1];
    
    // Generate from title and author
    const titleSlug = (post.title || '').toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 10);
    
    const authorSlug = this.extractUsername(post.author);
    return `${titleSlug}-${authorSlug}-${Date.now().toString(36)}`.substring(0, 20);
  }

  extractUsername(author) {
    if (!author) return 'unknown';
    
    if (typeof author === 'object') {
      return author.username || author.displayName || 'unknown';
    }
    
    const match = author.toString().match(/@([a-zA-Z0-9_]+)/);
    if (match) return match[1];
    
    return author.toString().replace(/[^a-zA-Z0-9_]/g, '').toLowerCase() || 'unknown';
  }

  getDisplayName(author) {
    if (!author) return 'Unknown';
    
    if (typeof author === 'object') {
      return author.displayName || author.display_name || author.username || 'Unknown';
    }
    
    return author.toString().replace(/@/g, '') || 'Unknown';
  }

  normalizeUrl(url) {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `https://www.indiehackers.com${url.startsWith('/') ? '' : '/'}${url}`;
  }

  getCategoryName(key) {
    const categoryMap = {
      main: 'IndieHackers',
      'starting-up': 'starting_up',
      tech: 'tech',
      ai: 'ai',
      creators: 'creators',
      money: 'money'
    };
    return categoryMap[key?.toLowerCase()] || key || 'IndieHackers';
  }

  generateSummary(post) {
    // Try different sources for content
    let contentText = '';
    
    if (post.fullContent) {
      contentText = post.fullContent;
    } else if (post.content) {
      // Handle content as object or string
      if (typeof post.content === 'object') {
        contentText = post.content.preview || post.content.summary || '';
      } else {
        contentText = post.content;
      }
    }
    
    // Convert to string if needed
    contentText = String(contentText || '');
    
    if (!contentText) return '';
    
    // Clean and truncate
    const cleaned = contentText.replace(/\s+/g, ' ').trim();
    return cleaned.substring(0, 200) + (cleaned.length > 200 ? '...' : '');
  }

  calculateEngagementScore(comments, upvotes) {
    const weights = config.scoring?.weights || { comments: 0.6, upvotes: 0.3, recency: 0.1 };
    return (comments * weights.comments) + (upvotes * weights.upvotes);
  }
}

export default JSONReportGenerator;