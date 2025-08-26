/**
 * Money Category Scraper
 * Specialized scraper for IndieHackers Money section
 */

import { config } from '../config.js';
import BrowserManager from '../utils/browser-manager.js';

export class MoneyScraper {
  constructor(browserManager) {
    this.browserManager = browserManager || new BrowserManager();
    this.categoryInfo = config.categories['money'];
  }

  /**
   * Scrape Money category posts
   */
  async scrape(options = {}) {
    try {
      console.log('💰 Scraping Money category...');
      
      // Navigate to Money page
      await this.browserManager.navigateTo(this.categoryInfo.url);
      
      // Wait for money-specific content
      await this.browserManager.waitForElement('[data-testid="post"], .post-item, .money-post');
      await this.browserManager.delay(2000);
      
      // Load more money content
      await this.loadMoneyContent(options.postsPerCategory || config.scraping.defaultPostsPerCategory);
      
      // Extract money posts
      const posts = await this.extractMoneyPosts();
      
      // Enhance posts with money-specific data
      const enhancedPosts = await this.enhanceMoneyPosts(posts);
      
      console.log(`✅ Money scraping completed: ${enhancedPosts.length} posts`);
      return enhancedPosts;
      
    } catch (error) {
      console.error('❌ Money scraping failed:', error.message);
      throw error;
    }
  }

  /**
   * Load more money content
   */
  async loadMoneyContent(targetPosts) {
    console.log(`💰 Loading Money content (target: ${targetPosts} posts)...`);
    
    let loadedPosts = 0;
    let attempts = 0;
    const maxAttempts = 8;
    
    while (loadedPosts < targetPosts && attempts < maxAttempts) {
      // Scroll to load more money content
      await this.browserManager.evaluateInPage(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      
      await this.browserManager.delay(config.scraping.requestDelay);
      
      // Look for money-specific load more patterns
      const loadMoreClicked = await this.browserManager.evaluateInPage(() => {
        const loadMoreSelectors = [
          'button[data-testid="load-more"]',
          '.load-more-money',
          '.money-pagination button',
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
      
      // Count current money posts
      const currentCount = await this.browserManager.evaluateInPage(() => {
        return document.querySelectorAll('[data-testid="post"], .post-item, .money-post, article').length;
      });
      
      console.log(`💰 Money posts loaded: ${currentCount}`);
      
      if (currentCount === loadedPosts) {
        attempts++;
      } else {
        loadedPosts = currentCount;
        attempts = 0;
      }
    }
  }

  /**
   * Extract money posts with money-specific selectors
   */
  async extractMoneyPosts() {
    return await this.browserManager.evaluateInPage(() => {
      console.log('💰 Extracting Money posts...');
      
      // Money-specific container selectors
      const containerSelectors = [
        '[data-testid="post"]',
        '.money-post',
        '.post-item',
        '.story-item',
        'article[class*="money"]',
        'article[class*="revenue"]',
        'article[class*="post"]',
        '.discussion-item',
        '.financial-post'
      ];
      
      let postElements = [];
      let usedSelector = '';
      
      for (const selector of containerSelectors) {
        postElements = Array.from(document.querySelectorAll(selector));
        if (postElements.length > 0) {
          usedSelector = selector;
          console.log(`Money: Using selector '${selector}': found ${postElements.length} posts`);
          break;
        }
      }
      
      if (postElements.length === 0) {
        console.warn('No Money posts found');
        return [];
      }
      
      return postElements.map((element, index) => {
        try {
          // Extract title with money-specific patterns
          const titleSelectors = [
            'h2 a',
            'h3 a',
            '.money-title a',
            '.revenue-title a',
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
          
          // Extract author with financial focus
          const authorSelectors = [
            '.author-name',
            '.money-author',
            '.user-name',
            '.post-author',
            '[data-testid="author"]',
            'a[href*="/users/"]',
            '.founder-name'
          ];
          
          let author = '';
          
          for (const selector of authorSelectors) {
            const authorEl = element.querySelector(selector);
            if (authorEl) {
              author = authorEl.textContent?.trim() || '';
              if (author) break;
            }
          }
          
          // Extract money-specific engagement metrics
          const upvoteSelectors = [
            '.upvote-count',
            '.money-votes',
            '.vote-count',
            '[data-testid="upvotes"]',
            '.points'
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
            '.money-comments',
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
            '.money-timestamp',
            '.timestamp',
            'time',
            '.post-date',
            '.financial-date'
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
          
          // Extract money content with financial focus
          const contentSelectors = [
            '.money-content',
            '.financial-content',
            '.post-content',
            '.post-body',
            '.revenue-content',
            '.discussion-content',
            '.content'
          ];
          
          let content = '';
          
          for (const selector of contentSelectors) {
            const contentEl = element.querySelector(selector);
            if (contentEl) {
              content = contentEl.textContent?.trim() || '';
              if (content.length > 50) {
                content = content.substring(0, 300) + (content.length > 300 ? '...' : '');
                break;
              }
            }
          }
          
          // Detect money-specific indicators
          const moneyIndicators = {
            hasRevenueNumbers: this.detectRevenueNumbers(title + ' ' + content),
            hasFinancialTerms: this.detectFinancialTerms(title + ' ' + content),
            hasBusinessMetrics: this.detectBusinessMetrics(title + ' ' + content),
            hasMonetizationStrategy: this.detectMonetizationStrategy(title + ' ' + content),
            hasProfitLoss: this.detectProfitLoss(title + ' ' + content),
            hasGrowthMetrics: this.detectGrowthMetrics(title + ' ' + content)
          };
          
          // Extract financial figures if present
          const financialData = this.extractFinancialData(title + ' ' + content);
          
          // Create money post object
          const post = {
            title,
            author,
            url: postUrl,
            upvotes,
            comments,
            timestamp,
            content,
            category: 'money',
            moneyIndicators,
            financialData,
            extractedAt: new Date().toISOString(),
            selector: usedSelector,
            index
          };
          
          // Money posts should have financial relevance
          if (title && title.length > 3 && 
              (upvotes > 0 || comments > 0 || content.length > 20 ||
               moneyIndicators.hasRevenueNumbers.length > 0 ||
               moneyIndicators.hasFinancialTerms.length > 0)) {
            return post;
          }
          
          return null;
          
        } catch (error) {
          console.error(`Error extracting Money post ${index}:`, error.message);
          return null;
        }
      }).filter(post => post !== null);
    });
  }

  /**
   * Enhance money posts with financial analysis
   */
  async enhanceMoneyPosts(posts) {
    return posts.map(post => {
      // Detect business models
      const businessModels = this.detectBusinessModels(post.title + ' ' + post.content);
      
      // Detect revenue streams
      const revenueStreams = this.detectRevenueStreams(post.title + ' ' + post.content);
      
      // Detect financial strategies
      const financialStrategies = this.detectFinancialStrategies(post.title + ' ' + post.content);
      
      // Calculate money relevance score
      const moneyScore = this.calculateMoneyRelevanceScore(post, businessModels, revenueStreams, financialStrategies);
      
      // Classify money category
      const moneyCategory = this.classifyMoneyCategory(post, businessModels, revenueStreams);
      
      // Analyze financial sentiment
      const financialSentiment = this.analyzeFinancialSentiment(post.title + ' ' + post.content);
      
      return {
        ...post,
        moneyMetadata: {
          businessModels,
          revenueStreams,
          financialStrategies,
          moneyScore,
          category: moneyCategory,
          sentiment: financialSentiment,
          isHighValue: moneyScore > 0.7,
          hasSpecificNumbers: post.financialData.revenueNumbers.length > 0,
          isGrowthFocused: post.moneyIndicators.hasGrowthMetrics.length > 0
        }
      };
    });
  }

  /**
   * Detect revenue numbers in text
   */
  detectRevenueNumbers(text) {
    const revenuePatterns = [
      /\$[\d,]+(?:\.\d+)?[km]?(?:\s*(?:revenue|income|profit|sales|earnings))?/gi,
      /(?:revenue|income|profit|sales|earnings).*?\$[\d,]+(?:\.\d+)?[km]?/gi,
      /[\d,]+(?:\.\d+)?[km]?\s*(?:dollars?|usd|\$)/gi
    ];
    
    const matches = [];
    revenuePatterns.forEach(pattern => {
      const found = text.match(pattern);
      if (found) matches.push(...found);
    });
    
    return [...new Set(matches)]; // Remove duplicates
  }

  /**
   * Detect financial terms
   */
  detectFinancialTerms(text) {
    const financialTerms = [
      'revenue', 'profit', 'income', 'earnings', 'sales', 'mrr', 'arr',
      'cash flow', 'margin', 'roi', 'valuation', 'funding', 'investment',
      'bootstrap', 'break even', 'burn rate', 'runway', 'ltv', 'cac'
    ];
    
    const lowerText = text.toLowerCase();
    return financialTerms.filter(term => lowerText.includes(term));
  }

  /**
   * Detect business metrics
   */
  detectBusinessMetrics(text) {
    const businessMetrics = [
      'conversion rate', 'churn rate', 'growth rate', 'user acquisition',
      'customer lifetime value', 'cost per acquisition', 'monthly recurring revenue',
      'annual recurring revenue', 'gross margin', 'net margin'
    ];
    
    const lowerText = text.toLowerCase();
    return businessMetrics.filter(metric => 
      metric.split(' ').every(word => lowerText.includes(word))
    );
  }

  /**
   * Detect monetization strategies
   */
  detectMonetizationStrategy(text) {
    const strategies = [
      'subscription', 'freemium', 'affiliate', 'advertising', 'sponsorship',
      'course sales', 'consulting', 'saas', 'marketplace', 'commission',
      'licensing', 'white label', 'api pricing'
    ];
    
    const lowerText = text.toLowerCase();
    return strategies.filter(strategy => lowerText.includes(strategy));
  }

  /**
   * Detect profit/loss indicators
   */
  detectProfitLoss(text) {
    const profitLossTerms = [
      'profitable', 'profitability', 'break even', 'losses', 'debt',
      'in the black', 'in the red', 'positive cash flow', 'negative cash flow'
    ];
    
    const lowerText = text.toLowerCase();
    return profitLossTerms.filter(term => lowerText.includes(term));
  }

  /**
   * Detect growth metrics
   */
  detectGrowthMetrics(text) {
    const growthTerms = [
      'growth', 'scale', 'scaling', 'expansion', 'increase', 'growth rate',
      'month over month', 'year over year', 'exponential growth', 'viral growth'
    ];
    
    const lowerText = text.toLowerCase();
    return growthTerms.filter(term => lowerText.includes(term));
  }

  /**
   * Extract financial data from text
   */
  extractFinancialData(text) {
    return {
      revenueNumbers: this.detectRevenueNumbers(text),
      percentages: this.extractPercentages(text),
      timeframes: this.extractTimeframes(text)
    };
  }

  /**
   * Extract percentages
   */
  extractPercentages(text) {
    const percentagePattern = /\d+(?:\.\d+)?%/g;
    return text.match(percentagePattern) || [];
  }

  /**
   * Extract timeframes
   */
  extractTimeframes(text) {
    const timeframePatterns = [
      /\d+\s*(?:days?|weeks?|months?|years?)/gi,
      /(?:daily|weekly|monthly|yearly|annual)/gi,
      /per\s+(?:day|week|month|year)/gi
    ];
    
    const matches = [];
    timeframePatterns.forEach(pattern => {
      const found = text.match(pattern);
      if (found) matches.push(...found);
    });
    
    return [...new Set(matches)];
  }

  /**
   * Detect business models
   */
  detectBusinessModels(text) {
    const businessModels = [
      'saas', 'e-commerce', 'marketplace', 'subscription', 'freemium',
      'b2b', 'b2c', 'affiliate', 'dropshipping', 'consulting',
      'course creation', 'software licensing', 'api business'
    ];
    
    const lowerText = text.toLowerCase();
    return businessModels.filter(model => lowerText.includes(model));
  }

  /**
   * Detect revenue streams
   */
  detectRevenueStreams(text) {
    const revenueStreams = [
      'product sales', 'service fees', 'subscription fees', 'advertising revenue',
      'affiliate commissions', 'licensing fees', 'consulting fees',
      'course sales', 'sponsorship deals', 'transaction fees'
    ];
    
    const lowerText = text.toLowerCase();
    return revenueStreams.filter(stream => 
      stream.split(' ').every(word => lowerText.includes(word))
    );
  }

  /**
   * Detect financial strategies
   */
  detectFinancialStrategies(text) {
    const strategies = [
      'bootstrapping', 'venture capital', 'angel investment', 'crowdfunding',
      'revenue-based financing', 'debt financing', 'self-funding',
      'grant funding', 'pre-sales', 'partnerships'
    ];
    
    const lowerText = text.toLowerCase();
    return strategies.filter(strategy => 
      strategy.split(' ').every(word => lowerText.includes(word)) ||
      lowerText.includes(strategy.replace(' ', ''))
    );
  }

  /**
   * Calculate money relevance score
   */
  calculateMoneyRelevanceScore(post, businessModels, revenueStreams, financialStrategies) {
    let score = 0;
    
    // Base score from money indicators
    if (post.moneyIndicators.hasRevenueNumbers.length > 0) score += 0.4;
    if (post.moneyIndicators.hasFinancialTerms.length > 0) score += 0.3;
    if (post.moneyIndicators.hasBusinessMetrics.length > 0) score += 0.2;
    if (post.moneyIndicators.hasMonetizationStrategy.length > 0) score += 0.2;
    if (post.moneyIndicators.hasProfitLoss.length > 0) score += 0.1;
    if (post.moneyIndicators.hasGrowthMetrics.length > 0) score += 0.2;
    
    // Business model and strategy bonuses
    score += businessModels.length * 0.05;
    score += revenueStreams.length * 0.04;
    score += financialStrategies.length * 0.03;
    
    // Money keywords in title bonus
    const titleMoney = post.title.toLowerCase();
    if (titleMoney.includes('revenue') || titleMoney.includes('profit')) score += 0.2;
    if (titleMoney.includes('money') || titleMoney.includes('income')) score += 0.15;
    if (titleMoney.includes('sales') || titleMoney.includes('earnings')) score += 0.1;
    if (titleMoney.includes('$')) score += 0.1;
    
    return Math.min(score, 1.0); // Cap at 1.0
  }

  /**
   * Classify money category
   */
  classifyMoneyCategory(post, businessModels, revenueStreams) {
    const text = (post.title + ' ' + post.content).toLowerCase();
    
    if (text.includes('saas') || text.includes('subscription') || text.includes('mrr')) {
      return 'saas-revenue';
    } else if (text.includes('ecommerce') || text.includes('e-commerce') || text.includes('sales')) {
      return 'ecommerce-revenue';
    } else if (text.includes('funding') || text.includes('investment') || text.includes('venture')) {
      return 'funding-investment';
    } else if (text.includes('freelanc') || text.includes('consulting') || text.includes('service')) {
      return 'service-revenue';
    } else if (text.includes('course') || text.includes('education') || text.includes('coaching')) {
      return 'education-revenue';
    } else if (text.includes('affiliate') || text.includes('commission')) {
      return 'affiliate-revenue';
    } else {
      return 'general-money';
    }
  }

  /**
   * Analyze financial sentiment
   */
  analyzeFinancialSentiment(text) {
    const positiveTerms = ['profit', 'growth', 'success', 'increase', 'breakthrough', 'milestone'];
    const negativeTerms = ['loss', 'debt', 'struggle', 'decrease', 'failure', 'challenge'];
    
    const lowerText = text.toLowerCase();
    const positiveCount = positiveTerms.filter(term => lowerText.includes(term)).length;
    const negativeCount = negativeTerms.filter(term => lowerText.includes(term)).length;
    
    if (positiveCount > negativeCount) {
      return 'positive';
    } else if (negativeCount > positiveCount) {
      return 'negative';
    } else {
      return 'neutral';
    }
  }

  /**
   * Get money category specific metrics
   */
  async getMoneyMetrics() {
    return await this.browserManager.evaluateInPage(() => {
      const metrics = {
        totalMoneyPosts: 0,
        postsWithNumbers: 0,
        postsWithRevenue: 0,
        uniqueAuthors: new Set(),
        avgEngagement: 0,
        revenueRanges: new Map(),
        businessModels: new Map()
      };
      
      const posts = document.querySelectorAll('[data-testid="post"], .post-item, .money-post');
      metrics.totalMoneyPosts = posts.length;
      
      let totalEngagement = 0;
      
      posts.forEach(post => {
        const postText = post.textContent.toLowerCase();
        
        // Check for financial numbers
        if (postText.match(/\$[\d,]+/) || postText.includes('revenue') || postText.includes('profit')) {
          metrics.postsWithNumbers++;
        }
        
        // Check for revenue mentions
        if (postText.includes('revenue') || postText.includes('mrr') || postText.includes('arr')) {
          metrics.postsWithRevenue++;
        }
        
        // Track authors
        const author = post.querySelector('.author-name, .user-name, .post-author')?.textContent?.trim();
        if (author) {
          metrics.uniqueAuthors.add(author);
        }
        
        // Calculate engagement
        const upvotes = post.querySelector('.upvote-count, .vote-count')?.textContent?.replace(/[^\d]/g, '') || '0';
        const comments = post.querySelector('.comment-count, .comments-count')?.textContent?.replace(/[^\d]/g, '') || '0';
        totalEngagement += parseInt(upvotes) + parseInt(comments);
        
        // Track business models
        const businessModels = ['saas', 'ecommerce', 'consulting', 'course', 'affiliate'];
        businessModels.forEach(model => {
          if (postText.includes(model)) {
            metrics.businessModels.set(model, 
              (metrics.businessModels.get(model) || 0) + 1);
          }
        });
      });
      
      metrics.uniqueAuthors = metrics.uniqueAuthors.size;
      metrics.avgEngagement = posts.length > 0 ? 
        Math.round((totalEngagement / posts.length) * 100) / 100 : 0;
      
      // Convert Maps to Objects for serialization
      metrics.revenueRanges = Object.fromEntries(metrics.revenueRanges);
      metrics.businessModels = Object.fromEntries(metrics.businessModels);
      
      return metrics;
    });
  }
}

export default MoneyScraper;