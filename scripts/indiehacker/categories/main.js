/**
 * Main Category Scraper
 * Specialized scraper for IndieHackers main feed
 */

import { config } from '../config.js';
import BrowserManager from '../utils/browser-manager.js';
import { DeepExtractor } from '../utils/deep-extractor.js';

export class MainScraper {
  constructor(browserManager) {
    this.browserManager = browserManager || new BrowserManager();
    this.categoryInfo = config.categories['main'];
    this.deepExtractor = new DeepExtractor(this.browserManager.page);
  }

  /**
   * Scrape Main category posts
   */
  async scrape(options = {}) {
    try {
      console.log('🏠 Scraping Main feed...');
      
      // Navigate to Main page (homepage)
      await this.browserManager.navigateTo(this.categoryInfo.url);
      
      // Wait for main feed content
      await this.browserManager.waitForElement('[data-testid="post"], .post-item, .story-item');
      await this.browserManager.delay(2000);
      
      // Load more main feed content
      await this.loadMainContent(options.postsPerCategory || config.scraping.defaultPostsPerCategory);
      
      // Extract main feed posts (initial extraction)
      const rawPosts = await this.extractMainPosts();
      console.log(`📝 Extracted ${rawPosts.length} raw posts from listing`);
      
      // Deep extract full data by clicking into each post
      const deepExtractedPosts = await this.deepExtractPosts(rawPosts);
      console.log(`🔍 Deep extracted ${deepExtractedPosts.length} posts with full content`);
      
      // Enhance posts with main feed analysis
      const enhancedPosts = await this.enhanceMainPosts(deepExtractedPosts);
      
      console.log(`✅ Main feed scraping completed: ${enhancedPosts.length} posts`);
      return enhancedPosts;
      
    } catch (error) {
      console.error('❌ Main feed scraping failed:', error.message);
      throw error;
    }
  }

  /**
   * Load more main feed content
   */
  async loadMainContent(targetPosts) {
    console.log(`🏠 Loading Main feed content (target: ${targetPosts} posts)...`);
    
    let loadedPosts = 0;
    let attempts = 0;
    const maxAttempts = 10; // Main feed might have more content
    
    while (loadedPosts < targetPosts && attempts < maxAttempts) {
      // Scroll to load more main content
      await this.browserManager.evaluateInPage(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      
      await this.browserManager.delay(config.scraping.requestDelay);
      
      // Look for main feed load more patterns
      const loadMoreClicked = await this.browserManager.evaluateInPage(() => {
        const loadMoreSelectors = [
          'button[data-testid="load-more"]',
          '.load-more-posts',
          '.main-feed-load-more',
          '.pagination-next',
          '.show-more-stories',
          '[aria-label*="Load more"]'
        ];
        
        for (const selector of loadMoreSelectors) {
          const button = document.querySelector(selector);
          if (button && button.offsetParent !== null && !button.disabled) {
            button.click();
            console.log(`Clicked main feed load more: ${selector}`);
            return true;
          }
        }
        
        // Try generic buttons for main feed
        const buttons = document.querySelectorAll('button');
        for (const button of buttons) {
          const text = button.textContent.toLowerCase();
          if ((text.includes('load') || text.includes('more') || text.includes('next')) && 
              button.offsetParent !== null && !button.disabled) {
            button.click();
            console.log(`Clicked main feed generic button: ${text}`);
            return true;
          }
        }
        
        return false;
      });
      
      if (loadMoreClicked) {
        await this.browserManager.delay(config.scraping.requestDelay * 2);
      }
      
      // Count current main feed posts
      const currentCount = await this.browserManager.evaluateInPage(() => {
        return document.querySelectorAll('[data-testid="post"], .post-item, .story-item, article').length;
      });
      
      console.log(`🏠 Main feed posts loaded: ${currentCount}`);
      
      if (currentCount === loadedPosts) {
        attempts++;
      } else {
        loadedPosts = currentCount;
        attempts = 0;
      }
      
      // Additional scroll behavior for main feed
      if (attempts > 3) {
        // Try aggressive scrolling for stubborn main feeds
        await this.browserManager.evaluateInPage(() => {
          for (let i = 0; i < 5; i++) {
            window.scrollTo(0, document.body.scrollHeight);
          }
        });
        await this.browserManager.delay(config.scraping.requestDelay * 3);
      }
    }
  }

  /**
   * Extract main feed posts
   */
  async extractMainPosts() {
    return await this.browserManager.evaluateInPage(() => {
      console.log('🏠 Extracting Main feed posts...');
      
      // Updated selectors for new IndieHackers structure
      const containerSelectors = [
        // Each post is typically a div containing an h3 title and engagement metrics
        'div:has(> a[href*="/post/"]):has(h3)',
        'div:has(> a[href*="/product/"]):has(h3)',
        // Generic containers with titles and metrics
        'div:has(h3):has(a[href*="/sign-up"])',
        // Fallback selectors
        '[data-testid="post"]',
        '.story-item',
        '.post-item',
        'article'
      ];
      
      let postElements = [];
      let usedSelector = '';
      
      for (const selector of containerSelectors) {
        postElements = Array.from(document.querySelectorAll(selector));
        if (postElements.length > 0) {
          usedSelector = selector;
          console.log(`Main: Using selector '${selector}': found ${postElements.length} posts`);
          break;
        }
      }
      
      if (postElements.length === 0) {
        console.warn('No Main feed posts found');
        return [];
      }
      
      return postElements.map((element, index) => {
        try {
          // Extract title - new structure has h3 inside anchor tags
          const titleSelectors = [
            'a[href*="/post/"] h3',
            'a[href*="/product/"] h3',
            'h3',
            'h2 a',
            'h2',
            '.story-title a',
            '.post-title a',
            'a[href*="/post/"]',
            '.title a'
          ];
          
          let title = '';
          let postUrl = '';
          
          for (const selector of titleSelectors) {
            const titleEl = element.querySelector(selector);
            if (titleEl) {
              title = titleEl.textContent?.trim() || '';
              postUrl = titleEl.href || titleEl.getAttribute('href') || '';
              if (title && postUrl) break;
            }
          }
          
          // Extract author - look for user profile links
          const authorSelectors = [
            // New structure: user links with ?id= parameter
            'a[href*="?id="]:not(:has(h3))',
            // Make sure we're not getting the post title link
            'a[href^="/"]:not([href*="/post/"]):not([href*="/product/"]):not(:has(h3))',
            '.author-name',
            '.story-author',
            '.post-author',
            '.username'
          ];
          
          let author = '';
          
          for (const selector of authorSelectors) {
            const authorEl = element.querySelector(selector);
            if (authorEl) {
              author = authorEl.textContent?.trim() || '';
              if (author) break;
            }
          }
          
          // Extract engagement metrics - new structure
          let upvotes = 0;
          let comments = 0;
          
          // Look for all links with just numbers (these are usually metrics)
          const allLinks = element.querySelectorAll('a');
          const metricValues = [];
          
          allLinks.forEach(link => {
            const text = link.textContent?.trim();
            // Check if it's a pure number
            if (text && /^\d+$/.test(text)) {
              const value = parseInt(text);
              // Check if this link has an upvote or comment icon nearby
              const hasUpvoteIcon = link.querySelector('img[src*="upvote"]') || 
                                   link.previousElementSibling?.querySelector('img[src*="upvote"]') ||
                                   link.nextElementSibling?.querySelector('img[src*="upvote"]');
              const hasCommentIcon = link.querySelector('img[src*="comment"]') ||
                                    link.previousElementSibling?.querySelector('img[src*="comment"]') ||
                                    link.nextElementSibling?.querySelector('img[src*="comment"]');
              
              metricValues.push(value);
            }
          });
          
          // Usually the pattern is: first number = upvotes, second = comments
          if (metricValues.length >= 2) {
            upvotes = metricValues[0];
            comments = metricValues[1];
          } else if (metricValues.length === 1) {
            // If only one metric, assume it's upvotes
            upvotes = metricValues[0];
          }
          
          // Extract timestamp with broad patterns
          const timestampSelectors = [
            '.time-ago',
            '.story-date',
            '.post-date',
            '.timestamp',
            'time',
            '.date',
            '.ago',
            '.published-at'
          ];
          
          let timestamp = '';
          
          for (const selector of timestampSelectors) {
            const timestampEl = element.querySelector(selector);
            if (timestampEl) {
              timestamp = timestampEl.textContent?.trim() || 
                         timestampEl.getAttribute('datetime') || 
                         timestampEl.getAttribute('title') || '';
              if (timestamp) break;
            }
          }
          
          // Extract content with broad patterns
          const contentSelectors = [
            '.story-content',
            '.post-content',
            '.post-body',
            '.main-content',
            '.discussion-content',
            '.content',
            '.excerpt',
            'p'
          ];
          
          let content = '';
          
          for (const selector of contentSelectors) {
            const contentEl = element.querySelector(selector);
            if (contentEl) {
              content = contentEl.textContent?.trim() || '';
              if (content.length > 50) {
                content = content.substring(0, 250) + (content.length > 250 ? '...' : '');
                break;
              }
            }
          }
          
          // Detect main feed indicators
          const mainIndicators = {
            hasMultipleTopics: this.detectMultipleTopics(title + ' ' + content),
            hasTags: element.querySelectorAll('.tag, .label, .category').length > 0,
            isPopular: upvotes > 10 || comments > 5,
            hasExternalLink: element.querySelector('a[href^="http"]:not([href*="indiehackers.com"])') !== null,
            hasImage: element.querySelector('img') !== null,
            isRecent: this.isRecentPost(timestamp)
          };
          
          // Extract tags if present
          const tags = this.extractTags(element);
          
          // Detect post type
          const postType = this.detectPostType(title, content, element);
          
          // Create main feed post object
          const post = {
            title,
            author,
            url: postUrl,
            upvotes,
            comments,
            timestamp,
            content,
            category: 'main',
            mainIndicators,
            tags,
            postType,
            extractedAt: new Date().toISOString(),
            selector: usedSelector,
            index
          };
          
          // Main feed posts should have basic validity
          if (title && title.length > 5 && 
              (upvotes > 0 || comments > 0 || content.length > 10)) {
            return post;
          }
          
          return null;
          
        } catch (error) {
          console.error(`Error extracting Main post ${index}:`, error.message);
          return null;
        }
      }).filter(post => post !== null);
    });
  }

  /**
   * Deep extract posts by clicking into each one
   */
  async deepExtractPosts(rawPosts) {
    console.log(`🔄 Starting deep extraction for ${rawPosts.length} posts...`);
    
    // Filter posts with valid URLs
    const postsWithUrls = rawPosts.filter(post => post.url && post.url.length > 0);
    console.log(`📎 ${postsWithUrls.length} posts have valid URLs`);
    
    if (postsWithUrls.length === 0) {
      console.warn('⚠️ No posts with valid URLs for deep extraction');
      return rawPosts;
    }
    
    // Prepare posts for deep extraction
    const postsToExtract = postsWithUrls.slice(0, Math.min(postsWithUrls.length, 30)); // Limit to 30 for speed
    
    // Perform deep extraction
    const deepExtracted = await this.deepExtractor.extractMultiplePosts(
      postsToExtract.map(post => ({
        url: post.url.startsWith('http') ? post.url : `${config.baseUrl}${post.url}`,
        ...post
      })),
      config.scraping.requestDelay
    );
    
    // Merge deep extracted data with raw posts
    const mergedPosts = rawPosts.map(rawPost => {
      const deepPost = deepExtracted.find(dp => 
        dp.url === rawPost.url || 
        dp.url === `${config.baseUrl}${rawPost.url}`
      );
      
      if (deepPost && deepPost.deepExtracted) {
        return {
          ...rawPost,
          ...deepPost,
          // Keep original URL format
          url: rawPost.url,
          // Merge engagement data (use higher values)
          upvotes: Math.max(rawPost.upvotes || 0, deepPost.upvotes || 0),
          comments: Math.max(rawPost.comments || 0, deepPost.comments || 0),
          // Use deep extracted content if available
          content: deepPost.content || rawPost.content,
          // Mark as deep extracted
          hasFullContent: deepPost.hasFullContent || false,
          deepExtracted: true
        };
      }
      
      return rawPost;
    });
    
    const successfullyExtracted = mergedPosts.filter(p => p.deepExtracted).length;
    console.log(`✅ Successfully deep extracted ${successfullyExtracted}/${postsToExtract.length} posts`);
    
    // Navigate back to main page
    await this.browserManager.navigateTo(this.categoryInfo.url);
    
    return mergedPosts;
  }
  
  /**
   * Enhance main posts with general analysis
   */
  async enhanceMainPosts(posts) {
    return posts.map(post => {
      // Detect general topics
      const topics = this.detectGeneralTopics(post.title + ' ' + post.content);
      
      // Detect discussion themes
      const themes = this.detectDiscussionThemes(post.title + ' ' + post.content);
      
      // Calculate main feed relevance score
      const mainScore = this.calculateMainRelevanceScore(post, topics, themes);
      
      // Classify main category
      const mainCategory = this.classifyMainCategory(post, topics, themes);
      
      // Analyze engagement potential
      const engagementPotential = this.analyzeEngagementPotential(post);
      
      return {
        ...post,
        mainMetadata: {
          topics,
          themes,
          mainScore,
          category: mainCategory,
          engagementPotential,
          isHighEngagement: post.mainIndicators.isPopular,
          isMultiTopic: post.mainIndicators.hasMultipleTopics.length > 1,
          hasVisualContent: post.mainIndicators.hasImage
        }
      };
    });
  }

  /**
   * Detect multiple topics in text
   */
  detectMultipleTopics(text) {
    const topics = [
      'startup', 'business', 'technology', 'marketing', 'product',
      'funding', 'growth', 'ai', 'saas', 'mobile', 'web', 'design'
    ];
    
    const lowerText = text.toLowerCase();
    return topics.filter(topic => lowerText.includes(topic));
  }

  /**
   * Check if post is recent
   */
  isRecentPost(timestamp) {
    if (!timestamp) return false;
    
    const now = new Date();
    const postTime = new Date(timestamp);
    const hoursOld = (now - postTime) / (1000 * 60 * 60);
    
    return hoursOld <= 24; // Within last 24 hours
  }

  /**
   * Extract tags from element
   */
  extractTags(element) {
    const tagSelectors = ['.tag', '.label', '.category', '.badge', '.chip'];
    const tags = [];
    
    tagSelectors.forEach(selector => {
      const tagElements = element.querySelectorAll(selector);
      tagElements.forEach(tagEl => {
        const tagText = tagEl.textContent?.trim();
        if (tagText && tagText.length > 0) {
          tags.push(tagText);
        }
      });
    });
    
    return [...new Set(tags)]; // Remove duplicates
  }

  /**
   * Detect post type
   */
  detectPostType(title, content, element) {
    const titleLower = title.toLowerCase();
    const contentLower = content.toLowerCase();
    
    if (titleLower.includes('ask') || titleLower.includes('question')) {
      return 'question';
    } else if (titleLower.includes('show') || titleLower.includes('launch')) {
      return 'show';
    } else if (titleLower.includes('milestone') || contentLower.includes('achieved')) {
      return 'milestone';
    } else if (titleLower.includes('tip') || titleLower.includes('how to')) {
      return 'advice';
    } else if (element.querySelector('a[href^="http"]:not([href*="indiehackers.com"])')) {
      return 'link';
    } else {
      return 'discussion';
    }
  }

  /**
   * Detect general topics
   */
  detectGeneralTopics(text) {
    const generalTopics = [
      'entrepreneurship', 'startup life', 'product development', 'marketing strategies',
      'business growth', 'technology trends', 'user experience', 'team building',
      'productivity', 'work-life balance', 'industry insights', 'lessons learned'
    ];
    
    const lowerText = text.toLowerCase();
    return generalTopics.filter(topic => 
      topic.split(' ').some(word => lowerText.includes(word))
    );
  }

  /**
   * Detect discussion themes
   */
  detectDiscussionThemes(text) {
    const themes = [
      'success story', 'failure story', 'lessons learned', 'advice seeking',
      'tool recommendation', 'market analysis', 'competitor analysis',
      'user feedback', 'feature request', 'problem solving'
    ];
    
    const lowerText = text.toLowerCase();
    return themes.filter(theme => 
      theme.split(' ').every(word => lowerText.includes(word)) ||
      theme.split(' ').some(word => lowerText.includes(word))
    );
  }

  /**
   * Calculate main relevance score
   */
  calculateMainRelevanceScore(post, topics, themes) {
    let score = 0;
    
    // Base score from main indicators
    if (post.mainIndicators.hasMultipleTopics.length > 0) score += 0.3;
    if (post.mainIndicators.hasTags) score += 0.2;
    if (post.mainIndicators.isPopular) score += 0.3;
    if (post.mainIndicators.hasExternalLink) score += 0.1;
    if (post.mainIndicators.hasImage) score += 0.1;
    if (post.mainIndicators.isRecent) score += 0.2;
    
    // Topic and theme bonuses
    score += topics.length * 0.05;
    score += themes.length * 0.03;
    
    // Engagement bonus
    const engagementTotal = post.upvotes + post.comments;
    if (engagementTotal > 50) score += 0.2;
    else if (engagementTotal > 20) score += 0.1;
    else if (engagementTotal > 5) score += 0.05;
    
    // Length bonus (substantial content)
    if (post.content.length > 200) score += 0.1;
    if (post.content.length > 500) score += 0.1;
    
    return Math.min(score, 1.0); // Cap at 1.0
  }

  /**
   * Classify main category
   */
  classifyMainCategory(post, topics, themes) {
    const text = (post.title + ' ' + post.content).toLowerCase();
    
    if (post.postType === 'question') {
      return 'question';
    } else if (post.postType === 'show') {
      return 'showcase';
    } else if (text.includes('success') || text.includes('milestone')) {
      return 'success-story';
    } else if (text.includes('advice') || text.includes('tip')) {
      return 'advice';
    } else if (text.includes('tool') || text.includes('resource')) {
      return 'resource-sharing';
    } else if (themes.some(theme => theme.includes('analysis'))) {
      return 'analysis';
    } else {
      return 'general-discussion';
    }
  }

  /**
   * Analyze engagement potential
   */
  analyzeEngagementPotential(post) {
    let potential = 'low';
    
    const engagementScore = post.upvotes + (post.comments * 2); // Comments weighted more
    
    if (engagementScore > 100) {
      potential = 'very-high';
    } else if (engagementScore > 50) {
      potential = 'high';
    } else if (engagementScore > 20) {
      potential = 'medium';
    } else if (engagementScore > 5) {
      potential = 'moderate';
    }
    
    // Adjust based on post characteristics
    if (post.postType === 'question' && post.comments > post.upvotes) {
      potential = this.increaseEngagementLevel(potential);
    }
    
    if (post.mainIndicators.hasExternalLink) {
      potential = this.increaseEngagementLevel(potential);
    }
    
    return potential;
  }

  /**
   * Helper to increase engagement level
   */
  increaseEngagementLevel(current) {
    const levels = ['low', 'moderate', 'medium', 'high', 'very-high'];
    const currentIndex = levels.indexOf(current);
    return levels[Math.min(currentIndex + 1, levels.length - 1)];
  }

  /**
   * Get main feed specific metrics
   */
  async getMainMetrics() {
    return await this.browserManager.evaluateInPage(() => {
      const metrics = {
        totalMainPosts: 0,
        postsWithTags: 0,
        postsWithLinks: 0,
        postsWithImages: 0,
        uniqueAuthors: new Set(),
        avgEngagement: 0,
        postTypes: new Map(),
        topTags: new Map()
      };
      
      const posts = document.querySelectorAll('[data-testid="post"], .post-item, .story-item');
      metrics.totalMainPosts = posts.length;
      
      let totalEngagement = 0;
      
      posts.forEach(post => {
        // Check for tags
        if (post.querySelectorAll('.tag, .label, .category').length > 0) {
          metrics.postsWithTags++;
        }
        
        // Check for external links
        if (post.querySelector('a[href^="http"]:not([href*="indiehackers.com"])')) {
          metrics.postsWithLinks++;
        }
        
        // Check for images
        if (post.querySelector('img')) {
          metrics.postsWithImages++;
        }
        
        // Track authors
        const author = post.querySelector('.author-name, .story-author, .post-author')?.textContent?.trim();
        if (author) {
          metrics.uniqueAuthors.add(author);
        }
        
        // Calculate engagement
        const upvotes = post.querySelector('.upvote-count, .story-points, .vote-count')?.textContent?.replace(/[^\d]/g, '') || '0';
        const comments = post.querySelector('.comment-count, .story-comments, .comments-count')?.textContent?.replace(/[^\d]/g, '') || '0';
        totalEngagement += parseInt(upvotes) + parseInt(comments);
        
        // Detect post types
        const title = post.querySelector('h2 a, h3 a, .story-title a')?.textContent?.toLowerCase() || '';
        if (title.includes('ask') || title.includes('question')) {
          metrics.postTypes.set('question', (metrics.postTypes.get('question') || 0) + 1);
        } else if (title.includes('show') || title.includes('launch')) {
          metrics.postTypes.set('show', (metrics.postTypes.get('show') || 0) + 1);
        } else {
          metrics.postTypes.set('discussion', (metrics.postTypes.get('discussion') || 0) + 1);
        }
        
        // Track tags
        const tags = post.querySelectorAll('.tag, .label, .category');
        tags.forEach(tag => {
          const tagText = tag.textContent?.trim().toLowerCase();
          if (tagText) {
            metrics.topTags.set(tagText, (metrics.topTags.get(tagText) || 0) + 1);
          }
        });
      });
      
      metrics.uniqueAuthors = metrics.uniqueAuthors.size;
      metrics.avgEngagement = posts.length > 0 ? 
        Math.round((totalEngagement / posts.length) * 100) / 100 : 0;
      
      // Convert Maps to Objects for serialization
      metrics.postTypes = Object.fromEntries(metrics.postTypes);
      metrics.topTags = Object.fromEntries(metrics.topTags);
      
      return metrics;
    });
  }
}

export default MainScraper;