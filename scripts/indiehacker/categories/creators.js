/**
 * Creators Category Scraper
 * Specialized scraper for IndieHackers Creators section
 */

import { config } from '../config.js';
import BrowserManager from '../utils/browser-manager.js';

export class CreatorsScraper {
  constructor(browserManager) {
    this.browserManager = browserManager || new BrowserManager();
    this.categoryInfo = config.categories['creators'];
  }

  /**
   * Scrape Creators category posts
   */
  async scrape(options = {}) {
    try {
      console.log('🎨 Scraping Creators category...');
      
      // Navigate to Creators page
      await this.browserManager.navigateTo(this.categoryInfo.url);
      
      // Wait for creators-specific content
      await this.browserManager.waitForElement('[data-testid="post"], .post-item, .creator-post');
      await this.browserManager.delay(2000);
      
      // Load more creators content
      await this.loadCreatorsContent(options.postsPerCategory || config.scraping.defaultPostsPerCategory);
      
      // Extract creator posts
      const posts = await this.extractCreatorPosts();
      
      // Enhance posts with creator-specific data
      const enhancedPosts = await this.enhanceCreatorPosts(posts);
      
      console.log(`✅ Creators scraping completed: ${enhancedPosts.length} posts`);
      return enhancedPosts;
      
    } catch (error) {
      console.error('❌ Creators scraping failed:', error.message);
      throw error;
    }
  }

  /**
   * Load more creators content
   */
  async loadCreatorsContent(targetPosts) {
    console.log(`🎨 Loading Creators content (target: ${targetPosts} posts)...`);
    
    let loadedPosts = 0;
    let attempts = 0;
    const maxAttempts = 8;
    
    while (loadedPosts < targetPosts && attempts < maxAttempts) {
      // Scroll to load more creator content
      await this.browserManager.evaluateInPage(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      
      await this.browserManager.delay(config.scraping.requestDelay);
      
      // Look for creators-specific load more patterns
      const loadMoreClicked = await this.browserManager.evaluateInPage(() => {
        const loadMoreSelectors = [
          'button[data-testid="load-more"]',
          '.load-more-creators',
          '.creators-pagination button',
          '.load-more-posts',
          '.pagination-next'
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
          if ((text.includes('load') || text.includes('more') || text.includes('show')) && 
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
      
      // Count current creator posts
      const currentCount = await this.browserManager.evaluateInPage(() => {
        return document.querySelectorAll('[data-testid="post"], .post-item, .creator-post, article').length;
      });
      
      console.log(`🎨 Creator posts loaded: ${currentCount}`);
      
      if (currentCount === loadedPosts) {
        attempts++;
      } else {
        loadedPosts = currentCount;
        attempts = 0;
      }
    }
  }

  /**
   * Extract creator posts with creator-specific selectors
   */
  async extractCreatorPosts() {
    return await this.browserManager.evaluateInPage(() => {
      console.log('🎨 Extracting Creator posts...');
      
      // Creator-specific container selectors
      const containerSelectors = [
        '[data-testid="post"]',
        '.creator-post',
        '.post-item',
        '.story-item',
        'article[class*="creator"]',
        'article[class*="post"]',
        '.discussion-item',
        '.creator-story'
      ];
      
      let postElements = [];
      let usedSelector = '';
      
      for (const selector of containerSelectors) {
        postElements = Array.from(document.querySelectorAll(selector));
        if (postElements.length > 0) {
          usedSelector = selector;
          console.log(`Creators: Using selector '${selector}': found ${postElements.length} posts`);
          break;
        }
      }
      
      if (postElements.length === 0) {
        console.warn('No Creator posts found');
        return [];
      }
      
      return postElements.map((element, index) => {
        try {
          // Extract title with creator-specific patterns
          const titleSelectors = [
            'h2 a',
            'h3 a',
            '.creator-title a',
            '.post-title a',
            'a[href*="/post/"]',
            '.story-title a',
            '.discussion-title a'
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
          
          // Extract author with creator focus
          const authorSelectors = [
            '.creator-name',
            '.author-name',
            '.user-name',
            '.post-author',
            '[data-testid="author"]',
            'a[href*="/users/"]'
          ];
          
          let author = '';
          
          for (const selector of authorSelectors) {
            const authorEl = element.querySelector(selector);
            if (authorEl) {
              author = authorEl.textContent?.trim() || '';
              if (author) break;
            }
          }
          
          // Extract creator-specific engagement metrics
          const upvoteSelectors = [
            '.upvote-count',
            '.creator-votes',
            '.vote-count',
            '[data-testid="upvotes"]',
            '.points',
            '.likes-count'
          ];
          
          let upvotes = 0;
          
          for (const selector of upvoteSelectors) {
            const upvoteEl = element.querySelector(selector);
            if (upvoteEl) {
              const upvoteText = upvoteEl.textContent?.trim() || '0';
              upvotes = parseInt(upvoteText.replace(/[^\d]/g, '')) || 0;
              if (upvotes > 0) break;
            }
          }
          
          const commentSelectors = [
            '.comment-count',
            '.creator-comments',
            '.comments-count',
            '[data-testid="comments"]',
            'a[href*="#comments"]',
            '.replies-count'
          ];
          
          let comments = 0;
          
          for (const selector of commentSelectors) {
            const commentEl = element.querySelector(selector);
            if (commentEl) {
              const commentText = commentEl.textContent?.trim() || '0';
              comments = parseInt(commentText.replace(/[^\d]/g, '')) || 0;
              if (comments > 0) break;
            }
          }
          
          // Extract timestamp
          const timestampSelectors = [
            '.time-ago',
            '.creator-timestamp',
            '.timestamp',
            'time',
            '.post-date',
            '.published-date'
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
          
          // Extract creator content
          const contentSelectors = [
            '.creator-content',
            '.post-content',
            '.post-body',
            '.story-content',
            '.discussion-content',
            '.content'
          ];
          
          let content = '';
          
          for (const selector of contentSelectors) {
            const contentEl = element.querySelector(selector);
            if (contentEl) {
              content = contentEl.textContent?.trim() || '';
              if (content.length > 50) {
                content = content.substring(0, 280) + (content.length > 280 ? '...' : '');
                break;
              }
            }
          }
          
          // Detect creator-specific indicators
          const creatorIndicators = {
            hasCreatorKeywords: this.detectCreatorKeywords(title + ' ' + content),
            hasPlatformMention: this.detectPlatforms(title + ' ' + content),
            hasMonetization: this.detectMonetization(title + ' ' + content),
            hasAudience: this.detectAudienceTerms(title + ' ' + content),
            hasContent: this.detectContentTypes(title + ' ' + content),
            hasLink: element.querySelector('a[href*="http"]') !== null
          };
          
          // Extract creator metrics if visible
          const creatorMetrics = this.extractCreatorMetrics(element);
          
          // Create creator post object
          const post = {
            title,
            author,
            url: postUrl,
            upvotes,
            comments,
            timestamp,
            content,
            category: 'creators',
            creatorIndicators,
            creatorMetrics,
            extractedAt: new Date().toISOString(),
            selector: usedSelector,
            index
          };
          
          // Creator posts should have creator-relevant content
          if (title && title.length > 3 && 
              (upvotes > 0 || comments > 0 || content.length > 20 ||
               creatorIndicators.hasCreatorKeywords.length > 0)) {
            return post;
          }
          
          return null;
          
        } catch (error) {
          console.error(`Error extracting Creator post ${index}:`, error.message);
          return null;
        }
      }).filter(post => post !== null);
    });
  }

  /**
   * Enhance creator posts with creator-specific analysis
   */
  async enhanceCreatorPosts(posts) {
    return posts.map(post => {
      // Detect creator platforms and tools
      const platforms = this.detectCreatorPlatforms(post.title + ' ' + post.content);
      
      // Detect content types
      const contentTypes = this.detectContentFormats(post.title + ' ' + post.content);
      
      // Detect monetization strategies
      const monetizationStrategies = this.detectMonetizationStrategies(post.title + ' ' + post.content);
      
      // Calculate creator relevance score
      const creatorScore = this.calculateCreatorRelevanceScore(post, platforms, contentTypes, monetizationStrategies);
      
      // Classify creator category
      const creatorCategory = this.classifyCreatorCategory(post, platforms, contentTypes);
      
      return {
        ...post,
        creatorMetadata: {
          platforms,
          contentTypes,
          monetizationStrategies,
          creatorScore,
          category: creatorCategory,
          isHighlyRelevant: creatorScore > 0.6,
          hasBusinessFocus: monetizationStrategies.length > 0,
          isMultiPlatform: platforms.length > 1
        }
      };
    });
  }

  /**
   * Detect creator keywords
   */
  detectCreatorKeywords(text) {
    const creatorKeywords = [
      'content creator', 'creator economy', 'influencer', 'youtuber',
      'podcaster', 'blogger', 'newsletter', 'audience building',
      'community building', 'personal brand', 'content strategy',
      'social media', 'engagement', 'followers', 'subscribers'
    ];
    
    const lowerText = text.toLowerCase();
    return creatorKeywords.filter(keyword => lowerText.includes(keyword));
  }

  /**
   * Detect platform mentions
   */
  detectPlatforms(text) {
    const platforms = [
      'youtube', 'tiktok', 'instagram', 'twitter', 'linkedin', 'facebook',
      'twitch', 'substack', 'medium', 'ghost', 'patreon', 'onlyfans',
      'discord', 'clubhouse', 'spotify', 'podcast', 'blog'
    ];
    
    const lowerText = text.toLowerCase();
    return platforms.filter(platform => lowerText.includes(platform));
  }

  /**
   * Detect monetization terms
   */
  detectMonetization(text) {
    const monetizationTerms = [
      'monetize', 'revenue', 'income', 'earnings', 'sponsorship',
      'affiliate', 'ads', 'advertisement', 'subscription', 'membership',
      'course', 'coaching', 'consultation', 'merchandise', 'product sales'
    ];
    
    const lowerText = text.toLowerCase();
    return monetizationTerms.filter(term => lowerText.includes(term));
  }

  /**
   * Detect audience terms
   */
  detectAudienceTerms(text) {
    const audienceTerms = [
      'audience', 'followers', 'subscribers', 'community', 'fans',
      'viewers', 'listeners', 'readers', 'engagement', 'reach'
    ];
    
    const lowerText = text.toLowerCase();
    return audienceTerms.filter(term => lowerText.includes(term));
  }

  /**
   * Detect content types
   */
  detectContentTypes(text) {
    const contentTypes = [
      'video', 'podcast', 'blog post', 'newsletter', 'course',
      'livestream', 'webinar', 'ebook', 'guide', 'tutorial'
    ];
    
    const lowerText = text.toLowerCase();
    return contentTypes.filter(type => lowerText.includes(type));
  }

  /**
   * Detect creator platforms
   */
  detectCreatorPlatforms(text) {
    const platforms = [
      'youtube', 'tiktok', 'instagram', 'twitter', 'linkedin',
      'substack', 'medium', 'patreon', 'ko-fi', 'gumroad',
      'teachable', 'thinkific', 'convertkit', 'mailchimp'
    ];
    
    const lowerText = text.toLowerCase();
    return platforms.filter(platform => lowerText.includes(platform));
  }

  /**
   * Detect content formats
   */
  detectContentFormats(text) {
    const formats = [
      'video content', 'written content', 'audio content', 'visual content',
      'educational content', 'entertainment', 'tutorial', 'review',
      'interview', 'case study', 'behind the scenes'
    ];
    
    const lowerText = text.toLowerCase();
    return formats.filter(format => lowerText.includes(format));
  }

  /**
   * Detect monetization strategies
   */
  detectMonetizationStrategies(text) {
    const strategies = [
      'subscription model', 'affiliate marketing', 'sponsored content',
      'product sales', 'course sales', 'coaching', 'consulting',
      'merchandise', 'donations', 'membership', 'advertising revenue'
    ];
    
    const lowerText = text.toLowerCase();
    return strategies.filter(strategy => 
      strategy.split(' ').every(word => lowerText.includes(word))
    );
  }

  /**
   * Calculate creator relevance score
   */
  calculateCreatorRelevanceScore(post, platforms, contentTypes, monetizationStrategies) {
    let score = 0;
    
    // Base score from creator indicators
    if (post.creatorIndicators.hasCreatorKeywords.length > 0) score += 0.4;
    if (post.creatorIndicators.hasPlatformMention.length > 0) score += 0.3;
    if (post.creatorIndicators.hasMonetization.length > 0) score += 0.2;
    if (post.creatorIndicators.hasAudience.length > 0) score += 0.2;
    if (post.creatorIndicators.hasContent.length > 0) score += 0.2;
    if (post.creatorIndicators.hasLink) score += 0.1;
    
    // Platform and content bonuses
    score += platforms.length * 0.05;
    score += contentTypes.length * 0.03;
    score += monetizationStrategies.length * 0.04;
    
    // Creator keywords in title bonus
    const titleCreator = post.title.toLowerCase();
    if (titleCreator.includes('creator') || titleCreator.includes('content')) score += 0.15;
    if (titleCreator.includes('audience') || titleCreator.includes('community')) score += 0.1;
    if (titleCreator.includes('monetize') || titleCreator.includes('revenue')) score += 0.1;
    
    return Math.min(score, 1.0); // Cap at 1.0
  }

  /**
   * Classify creator category
   */
  classifyCreatorCategory(post, platforms, contentTypes) {
    const text = (post.title + ' ' + post.content).toLowerCase();
    
    if (text.includes('youtube') || text.includes('video')) {
      return 'video-creator';
    } else if (text.includes('podcast') || text.includes('audio')) {
      return 'audio-creator';
    } else if (text.includes('newsletter') || text.includes('blog') || text.includes('writing')) {
      return 'writer-creator';
    } else if (text.includes('course') || text.includes('education') || text.includes('tutorial')) {
      return 'educator-creator';
    } else if (text.includes('business') || text.includes('entrepreneur')) {
      return 'business-creator';
    } else {
      return 'general-creator';
    }
  }

  /**
   * Extract creator metrics from element
   */
  extractCreatorMetrics(element) {
    const metrics = {
      followers: 0,
      subscribers: 0,
      views: 0,
      revenue: null
    };
    
    // Look for metrics in the post content
    const text = element.textContent;
    const followersMatch = text.match(/(\d+[\d,]*)\s*(followers|subscribers)/i);
    if (followersMatch) {
      metrics.followers = parseInt(followersMatch[1].replace(/,/g, ''));
    }
    
    const viewsMatch = text.match(/(\d+[\d,]*)\s*views/i);
    if (viewsMatch) {
      metrics.views = parseInt(viewsMatch[1].replace(/,/g, ''));
    }
    
    const revenueMatch = text.match(/\$(\d+[\d,]*)/);
    if (revenueMatch) {
      metrics.revenue = parseInt(revenueMatch[1].replace(/,/g, ''));
    }
    
    return metrics;
  }

  /**
   * Get creators category specific metrics
   */
  async getCreatorsMetrics() {
    return await this.browserManager.evaluateInPage(() => {
      const metrics = {
        totalCreatorPosts: 0,
        postsWithLinks: 0,
        postsWithMetrics: 0,
        uniqueCreators: new Set(),
        avgEngagement: 0,
        topPlatforms: new Map(),
        contentTypes: new Map()
      };
      
      const posts = document.querySelectorAll('[data-testid="post"], .post-item, .creator-post');
      metrics.totalCreatorPosts = posts.length;
      
      let totalEngagement = 0;
      
      posts.forEach(post => {
        // Check for external links
        if (post.querySelector('a[href*="http"]')) {
          metrics.postsWithLinks++;
        }
        
        // Check for metrics mentioned
        const postText = post.textContent.toLowerCase();
        if (postText.includes('followers') || postText.includes('subscribers') || 
            postText.includes('views') || postText.includes('revenue')) {
          metrics.postsWithMetrics++;
        }
        
        // Track creators/authors
        const creator = post.querySelector('.author-name, .creator-name, .user-name')?.textContent?.trim();
        if (creator) {
          metrics.uniqueCreators.add(creator);
        }
        
        // Calculate engagement
        const upvotes = post.querySelector('.upvote-count, .vote-count')?.textContent?.replace(/[^\d]/g, '') || '0';
        const comments = post.querySelector('.comment-count, .comments-count')?.textContent?.replace(/[^\d]/g, '') || '0';
        totalEngagement += parseInt(upvotes) + parseInt(comments);
        
        // Track platforms mentioned
        const platforms = ['youtube', 'tiktok', 'instagram', 'twitter', 'substack'];
        platforms.forEach(platform => {
          if (postText.includes(platform)) {
            metrics.topPlatforms.set(platform, 
              (metrics.topPlatforms.get(platform) || 0) + 1);
          }
        });
        
        // Track content types
        const types = ['video', 'podcast', 'newsletter', 'blog', 'course'];
        types.forEach(type => {
          if (postText.includes(type)) {
            metrics.contentTypes.set(type, 
              (metrics.contentTypes.get(type) || 0) + 1);
          }
        });
      });
      
      metrics.uniqueCreators = metrics.uniqueCreators.size;
      metrics.avgEngagement = posts.length > 0 ? 
        Math.round((totalEngagement / posts.length) * 100) / 100 : 0;
      
      // Convert Maps to Objects for serialization
      metrics.topPlatforms = Object.fromEntries(metrics.topPlatforms);
      metrics.contentTypes = Object.fromEntries(metrics.contentTypes);
      
      return metrics;
    });
  }
}

export default CreatorsScraper;