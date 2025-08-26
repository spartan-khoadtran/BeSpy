/**
 * Category Report Generator - Creates separate reports for each category
 */

import fs from 'fs/promises';
import path from 'path';
import { config } from '../config.js';

export class CategoryReportGenerator {
  constructor() {
    this.outputDir = config.reporting.outputDir;
  }

  /**
   * Generate separate reports for each category
   */
  async generateCategoryReports(allPosts, date = new Date()) {
    try {
      console.log('📁 Generating category-based reports...');
      
      // Create output directory
      const dateStr = this.formatDate(date);
      const reportDir = path.join(this.outputDir, dateStr);
      await this.ensureDirectoryExists(reportDir);
      
      // Group posts by category
      const categoryGroups = this.groupByCategory(allPosts);
      const generatedReports = [];
      
      // Generate report for each category (including empty ones)
      const allCategories = ['main', 'starting-up', 'tech', 'ai', 'creators', 'money'];
      for (const categoryKey of allCategories) {
        const posts = categoryGroups[categoryKey] || [];
        const categoryReport = await this.generateSingleCategoryReport(
          categoryKey, 
          posts, 
          reportDir,
          dateStr
        );
        generatedReports.push(categoryReport);
      }
      
      // Also generate a combined summary report
      const summaryReport = await this.generateSummaryReport(
        allPosts,
        categoryGroups,
        reportDir,
        dateStr
      );
      generatedReports.push(summaryReport);
      
      console.log(`✅ Generated ${generatedReports.length} reports`);
      
      return {
        reports: generatedReports,
        reportDir,
        stats: {
          totalPosts: allPosts.length,
          categoriesProcessed: Object.keys(categoryGroups).length,
          reportsGenerated: generatedReports.length
        }
      };
    } catch (error) {
      console.error('❌ Failed to generate category reports:', error.message);
      throw error;
    }
  }

  /**
   * Generate report for a single category
   */
  async generateSingleCategoryReport(categoryKey, posts, reportDir, dateStr) {
    const categoryName = this.getCategoryDisplayName(categoryKey);
    console.log(`  📝 Generating ${categoryName} report (${posts.length} posts)...`);
    
    // Sort posts by engagement score (if any posts exist)
    const sortedPosts = posts.length > 0 
      ? posts.sort((a, b) => b.engagementScore - a.engagementScore)
      : [];
    
    // Generate JSON report for this category
    const jsonData = this.buildCategoryJSON(categoryKey, sortedPosts, dateStr);
    const jsonPath = path.join(reportDir, `${categoryKey}-data.json`);
    await fs.writeFile(jsonPath, JSON.stringify(jsonData, null, 2), 'utf8');
    
    // Generate Markdown report for this category
    const markdownContent = this.buildCategoryMarkdown(categoryKey, sortedPosts, dateStr);
    const markdownPath = path.join(reportDir, `${categoryKey}-report.md`);
    await fs.writeFile(markdownPath, markdownContent, 'utf8');
    
    return {
      category: categoryKey,
      jsonPath,
      markdownPath,
      postCount: posts.length
    };
  }

  /**
   * Build JSON structure for a single category
   */
  buildCategoryJSON(categoryKey, posts, dateStr) {
    const categoryName = this.getCategoryDisplayName(categoryKey);
    
    // Calculate category-specific metadata
    const totalEngagement = posts.reduce((sum, post) => {
      const comments = post.commentCount || post.comments?.length || post.engagement?.comments || 0;
      const upvotes = post.engagement?.upvotes || post.upvotes || 0;
      return sum + comments + upvotes;
    }, 0);
    
    const avgEngagement = posts.length > 0 ? totalEngagement / posts.length : 0;
    
    const metadata = {
      report_date: dateStr,
      generated_at: new Date().toISOString(),
      category: categoryName,
      total_posts_analyzed: posts.length,
      total_community_engagement: totalEngagement,
      average_engagement_per_post: Math.round(avgEngagement * 100) / 100
    };
    
    // Format posts with full data
    const formattedPosts = posts.map((post, index) => {
      const postId = this.generatePostId(post);
      const commentCount = post.commentCount || post.comments?.length || post.engagement?.comments || 0;
      const upvotes = post.engagement?.upvotes || post.upvotes || 0;
      
      // Get full content - check multiple locations
      let fullText = '';
      if (post.fullContent && post.fullContent.length > 0) {
        fullText = post.fullContent;
      } else if (post.content && typeof post.content === 'string') {
        fullText = post.content;
      }
      
      // Get comments data
      let commentsData = [];
      if (post.comments && Array.isArray(post.comments)) {
        commentsData = post.comments.map(comment => ({
          author: comment.author || 'Anonymous',
          text: comment.text || '',
          upvotes: comment.upvotes || 0,
          timestamp: comment.timestamp || null
        }));
      }
      
      return {
        post_id: postId,
        title: post.title || '',
        url: this.normalizeUrl(post.url),
        author: {
          username: this.extractUsername(post.author),
          display_name: this.getDisplayName(post.author),
          verified: false
        },
        category: categoryName,
        content: {
          summary: this.generateSummary(post, fullText),
          full_text: fullText
        },
        metrics: {
          comments: commentCount,
          upvotes: upvotes,
          engagement_score: Math.round((post.engagementScore || 0) * 100) / 100,
          views: post.views || 0
        },
        comments_data: commentsData,
        tags: post.tags || [],
        timestamps: {
          posted_at: post.timestamp ? new Date(post.timestamp).toISOString() : null,
          scraped_at: new Date().toISOString()
        },
        ranking: index + 1
      };
    });
    
    // Extract trending themes for this category
    const trendingThemes = this.extractCategoryThemes(formattedPosts);
    
    return {
      metadata,
      posts: formattedPosts,
      trending_themes: trendingThemes,
      engagement_scoring: {
        algorithm: {
          comments_weight: 0.6,
          upvotes_weight: 0.3,
          recency_weight: 0.1
        },
        description: "Posts ranked by engagement score calculated from weighted metrics"
      }
    };
  }

  /**
   * Build Markdown content for a single category
   */
  buildCategoryMarkdown(categoryKey, posts, dateStr) {
    const categoryName = this.getCategoryDisplayName(categoryKey);
    const topPosts = posts.slice(0, 20); // Limit to top 20 posts
    
    let content = `# ${categoryName} Report - ${dateStr}\n\n`;
    content += `*IndieHackers Analytics - Category Report*\n\n`;
    content += `---\n\n`;
    
    // Category Summary
    content += `## Category Summary\n\n`;
    content += `- **Total posts:** ${posts.length}\n`;
    content += `- **Top post:** ${posts[0]?.title || 'N/A'}\n`;
    
    if (posts.length === 0) {
      content += `- **Status:** No posts found for this category\n`;
      content += `- **Note:** This category may require authentication or different access methods\n`;
      content += `\n## No Data Available\n\n`;
      content += `No posts were found in the ${categoryName} category during this scraping session.\n`;
      content += `This could be due to:\n`;
      content += `- The category page requiring login/authentication\n`;
      content += `- Changes in the website structure\n`;
      content += `- No recent posts in this category\n`;
      return content;
    }
    
    const totalComments = posts.reduce((sum, post) => {
      return sum + (post.commentCount || post.comments?.length || post.engagement?.comments || 0);
    }, 0);
    const totalUpvotes = posts.reduce((sum, post) => {
      return sum + (post.engagement?.upvotes || post.upvotes || 0);
    }, 0);
    
    content += `- **Total engagement:** ${totalComments} comments, ${totalUpvotes} upvotes\n`;
    content += `- **Generated:** ${new Date().toISOString()}\n\n`;
    
    // Top Posts
    content += `## Top Posts\n\n`;
    
    topPosts.forEach((post, index) => {
      content += this.formatPostMarkdown(post, index + 1);
      if (index < topPosts.length - 1) {
        content += '\n---\n\n';
      }
    });
    
    if (posts.length > topPosts.length) {
      content += `\n*... and ${posts.length - topPosts.length} more posts in this category*\n`;
    }
    
    return content;
  }

  /**
   * Format a single post for markdown
   */
  formatPostMarkdown(post, rank) {
    const commentCount = post.commentCount || post.comments?.length || post.engagement?.comments || 0;
    const upvotes = post.engagement?.upvotes || post.upvotes || 0;
    const author = this.getDisplayName(post.author);
    
    let content = `### ${rank}. ${post.title}\n\n`;
    content += `**Author:** @${author}  \n`;
    content += `**Engagement:** ${commentCount} comments, ${upvotes} upvotes  \n`;
    content += `**Score:** ${Math.round((post.engagementScore || 0) * 100) / 100}  \n`;
    
    if (post.tags && post.tags.length > 0) {
      content += `**Tags:** ${post.tags.join(', ')}  \n`;
    }
    
    if (post.views > 0) {
      content += `**Views:** ${post.views}  \n`;
    }
    
    content += `**URL:** ${post.url}\n\n`;
    
    // Add full content if available
    if (post.fullContent && post.fullContent.length > 100) {
      const truncated = post.fullContent.length > 1000 
        ? post.fullContent.substring(0, 1000) + '...'
        : post.fullContent;
      content += `**Content:**\n\n`;
      content += `> ${truncated.replace(/\n/g, '\n> ')}\n\n`;
    }
    
    // Add top comments if available
    if (post.comments && Array.isArray(post.comments) && post.comments.length > 0) {
      content += `**Top Comments (${post.comments.length} total):**\n\n`;
      const topComments = post.comments.slice(0, 3);
      topComments.forEach((comment, idx) => {
        content += `${idx + 1}. **${comment.author}**`;
        if (comment.upvotes > 0) {
          content += ` (${comment.upvotes} upvotes)`;
        }
        content += `:\n   > ${comment.text?.substring(0, 300)}${comment.text?.length > 300 ? '...' : ''}\n\n`;
      });
      
      if (post.comments.length > 3) {
        content += `   *... and ${post.comments.length - 3} more comments*\n`;
      }
    }
    
    return content;
  }

  /**
   * Generate summary report covering all categories
   */
  async generateSummaryReport(allPosts, categoryGroups, reportDir, dateStr) {
    console.log('  📊 Generating summary report...');
    
    // Build summary content
    let content = `# IndieHackers Daily Summary - ${dateStr}\n\n`;
    content += `*Complete analysis across all categories*\n\n`;
    content += `---\n\n`;
    
    // Executive Summary
    content += `## Executive Summary\n\n`;
    content += `- **Total posts analyzed:** ${allPosts.length}\n`;
    content += `- **Categories covered:** ${Object.keys(categoryGroups).length}\n`;
    
    // Category breakdown
    content += `\n## Category Breakdown\n\n`;
    
    for (const [categoryKey, posts] of Object.entries(categoryGroups)) {
      if (posts.length > 0) {
        const categoryName = this.getCategoryDisplayName(categoryKey);
        const totalEngagement = posts.reduce((sum, post) => {
          const comments = post.commentCount || post.comments?.length || post.engagement?.comments || 0;
          const upvotes = post.engagement?.upvotes || post.upvotes || 0;
          return sum + comments + upvotes;
        }, 0);
        
        content += `### ${categoryName}\n`;
        content += `- **Posts:** ${posts.length}\n`;
        content += `- **Total engagement:** ${totalEngagement}\n`;
        content += `- **Top post:** ${posts[0]?.title || 'N/A'}\n`;
        content += `- **Report file:** [${categoryKey}-report.md](./${categoryKey}-report.md)\n`;
        content += `- **Data file:** [${categoryKey}-data.json](./${categoryKey}-data.json)\n\n`;
      }
    }
    
    // Top 10 posts across all categories
    const top10Posts = allPosts
      .sort((a, b) => b.engagementScore - a.engagementScore)
      .slice(0, 10);
    
    content += `## Top 10 Posts Across All Categories\n\n`;
    top10Posts.forEach((post, index) => {
      const categoryName = this.getCategoryDisplayName(post.category?.key || 'main');
      const commentCount = post.commentCount || post.comments?.length || post.engagement?.comments || 0;
      const upvotes = post.engagement?.upvotes || post.upvotes || 0;
      
      content += `${index + 1}. **[${post.title}](${post.url})**\n`;
      content += `   *${categoryName} • ${commentCount} comments, ${upvotes} upvotes • Score: ${Math.round(post.engagementScore * 100) / 100}*\n\n`;
    });
    
    content += `\n---\n\n`;
    content += `*Generated on ${new Date().toISOString()}*\n`;
    content += `*IndieHackers Analytics Scraper v2.0*`;
    
    // Write summary file
    const summaryPath = path.join(reportDir, 'summary.md');
    await fs.writeFile(summaryPath, content, 'utf8');
    
    return {
      category: 'summary',
      markdownPath: summaryPath,
      postCount: allPosts.length
    };
  }

  /**
   * Utility methods
   */
  groupByCategory(posts) {
    const groups = {};
    
    posts.forEach(post => {
      const categoryKey = post.category?.key || 'main';
      if (!groups[categoryKey]) {
        groups[categoryKey] = [];
      }
      groups[categoryKey].push(post);
    });
    
    return groups;
  }

  getCategoryDisplayName(key) {
    const categoryMap = {
      main: 'IndieHackers',
      'starting-up': 'Starting Up',
      tech: 'Tech',
      ai: 'A.I.',
      creators: 'Creators',
      money: 'Money'
    };
    return categoryMap[key] || key;
  }

  generatePostId(post) {
    const urlMatch = post.url?.match(/post\/([a-zA-Z0-9_-]+)/);
    if (urlMatch) return urlMatch[1];
    
    const titleSlug = (post.title || '').toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 10);
    
    return `${titleSlug}-${Date.now().toString(36)}`.substring(0, 20);
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

  generateSummary(post, fullText) {
    const text = fullText || post.content || '';
    const cleaned = text.toString().replace(/\s+/g, ' ').trim();
    return cleaned.substring(0, 200) + (cleaned.length > 200 ? '...' : '');
  }

  extractCategoryThemes(posts) {
    const themeMap = new Map();
    const commonWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were']);
    
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
    
    return Array.from(themeMap.entries())
      .filter(([, data]) => data.count >= 2)
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 5)
      .map(([keyword, data]) => ({
        keyword: keyword.charAt(0).toUpperCase() + keyword.slice(1),
        frequency: data.count,
        related_posts: data.posts.slice(0, 3)
      }));
  }

  formatDate(date) {
    const d = date instanceof Date ? date : new Date(date);
    return d.toISOString().split('T')[0];
  }

  async ensureDirectoryExists(dir) {
    try {
      await fs.access(dir);
    } catch {
      await fs.mkdir(dir, { recursive: true });
    }
  }
}

export default CategoryReportGenerator;