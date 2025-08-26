/**
 * AI Category Scraper
 * Specialized scraper for IndieHackers AI/Artificial Intelligence section
 */

import { config } from '../config.js';
import BrowserManager from '../utils/browser-manager.js';

export class AIScraper {
  constructor(browserManager) {
    this.browserManager = browserManager || new BrowserManager();
    this.categoryInfo = config.categories['ai'];
  }

  /**
   * Scrape AI category posts
   */
  async scrape(options = {}) {
    try {
      console.log('🤖 Scraping AI category...');
      
      // Navigate to AI tags page
      await this.browserManager.navigateTo(this.categoryInfo.url);
      
      // Wait for AI-specific content
      await this.browserManager.waitForElement('[data-testid="post"], .post-item, .tag-post');
      await this.browserManager.delay(2500); // AI pages might load slower due to more complex content
      
      // Load more AI content
      await this.loadAIContent(options.postsPerCategory || config.scraping.defaultPostsPerCategory);
      
      // Extract AI posts
      const posts = await this.extractAIPosts();
      
      // Enhance posts with AI-specific analysis
      const enhancedPosts = await this.enhanceAIPosts(posts);
      
      console.log(`✅ AI scraping completed: ${enhancedPosts.length} posts`);
      return enhancedPosts;
      
    } catch (error) {
      console.error('❌ AI scraping failed:', error.message);
      throw error;
    }
  }

  /**
   * Load more AI content with AI tag-specific patterns
   */
  async loadAIContent(targetPosts) {
    console.log(`🤖 Loading AI content (target: ${targetPosts} posts)...`);
    
    let loadedPosts = 0;
    let attempts = 0;
    const maxAttempts = 10; // AI content might need more attempts
    
    while (loadedPosts < targetPosts && attempts < maxAttempts) {
      // Scroll to load AI content
      await this.browserManager.evaluateInPage(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      
      await this.browserManager.delay(config.scraping.requestDelay * 1.5); // Longer delay for AI content
      
      // Look for AI tag page specific load more patterns
      const loadMoreClicked = await this.browserManager.evaluateInPage(() => {
        // AI tag pages might have different pagination
        const loadMoreSelectors = [
          'button[data-testid="load-more"]',
          '.load-more-posts',
          '.tag-pagination button',
          '.pagination-next',
          '.show-more-ai',
          '[aria-label*="Load more"]'
        ];
        
        for (const selector of loadMoreSelectors) {
          const button = document.querySelector(selector);
          if (button && button.offsetParent !== null && !button.disabled) {
            button.click();
            console.log(`Clicked AI load more button: ${selector}`);
            return true;
          }
        }
        
        // Try generic buttons for AI tag pages
        const buttons = document.querySelectorAll('button');
        for (const button of buttons) {
          const text = button.textContent.toLowerCase();
          if ((text.includes('load') || text.includes('more') || text.includes('next')) && 
              button.offsetParent !== null && !button.disabled) {
            button.click();
            console.log(`Clicked AI generic button: ${text}`);
            return true;
          }
        }
        
        return false;
      });
      
      if (loadMoreClicked) {
        await this.browserManager.delay(config.scraping.requestDelay * 3); // Longer wait for AI content
      }
      
      // Count current AI posts
      const currentCount = await this.browserManager.evaluateInPage(() => {
        return document.querySelectorAll('[data-testid="post"], .post-item, .tag-post, article').length;
      });
      
      console.log(`🤖 AI posts loaded: ${currentCount}`);
      
      if (currentCount === loadedPosts) {
        attempts++;
      } else {
        loadedPosts = currentCount;
        attempts = 0;
      }
    }
  }

  /**
   * Extract AI posts with AI-specific selectors
   */
  async extractAIPosts() {
    return await this.browserManager.evaluateInPage(() => {
      console.log('🤖 Extracting AI posts...');
      
      // AI-specific container selectors for tag pages
      const containerSelectors = [
        '[data-testid="post"]',
        '.tag-post',
        '.post-item',
        '.story-item', 
        'article[class*="ai"]',
        'article[class*="post"]',
        '.discussion-item',
        '.feed-item'
      ];
      
      let postElements = [];
      let usedSelector = '';
      
      for (const selector of containerSelectors) {
        postElements = Array.from(document.querySelectorAll(selector));
        if (postElements.length > 0) {
          usedSelector = selector;
          console.log(`AI: Using selector '${selector}': found ${postElements.length} posts`);
          break;
        }
      }
      
      if (postElements.length === 0) {
        console.warn('No AI posts found');
        return [];
      }
      
      return postElements.map((element, index) => {
        try {
          // Extract title with AI-specific patterns
          const titleSelectors = [
            'h2 a',
            'h3 a',
            '.ai-title a',
            '.post-title a',
            '.tag-post-title a',
            'a[href*="/post/"]',
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
          
          // Extract author with AI community focus
          const authorSelectors = [
            '.author-name',
            '.ai-author',
            '.user-name',
            '.post-author',
            '[data-testid="author"]',
            'a[href*="/users/"]',
            '.creator-name'
          ];
          
          let author = '';
          
          for (const selector of authorSelectors) {
            const authorEl = element.querySelector(selector);
            if (authorEl) {
              author = authorEl.textContent?.trim() || '';
              if (author) break;
            }
          }
          
          // Extract AI-specific engagement metrics
          const upvoteSelectors = [
            '.upvote-count',
            '.ai-votes',
            '.vote-count',
            '[data-testid="upvotes"]',
            '.points',
            '.score'
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
            '.ai-comments',
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
            '.ai-timestamp',
            '.timestamp',
            'time',
            '.post-date',
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
          
          // Extract AI content with focus on AI keywords
          const contentSelectors = [
            '.ai-content',
            '.post-content',
            '.post-body',
            '.discussion-content',
            '.tag-content',
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
          
          // Detect AI-specific indicators
          const aiIndicators = {
            hasAIKeywords: this.detectAIKeywords(title + ' ' + content),
            hasMLTerms: this.detectMLTerms(title + ' ' + content),
            hasAITools: this.detectAITools(title + ' ' + content),
            hasCode: element.querySelector('code, .code, .highlight') !== null,
            hasDemo: element.innerHTML.toLowerCase().includes('demo') || 
                    element.innerHTML.toLowerCase().includes('playground'),
            hasDataset: title.toLowerCase().includes('dataset') || 
                       content.toLowerCase().includes('dataset')
          };
          
          // Extract AI tags if present
          const aiTags = this.extractAITags(element);
          
          // Create AI post object
          const post = {
            title,
            author,
            url: postUrl,
            upvotes,
            comments,
            timestamp,
            content,
            category: 'ai',
            aiIndicators,
            aiTags,
            extractedAt: new Date().toISOString(),
            selector: usedSelector,
            index
          };
          
          // AI posts should have AI-relevant content
          if (title && title.length > 3 && 
              (upvotes > 0 || comments > 0 || content.length > 20 ||
               aiIndicators.hasAIKeywords || aiIndicators.hasMLTerms)) {
            return post;
          }
          
          return null;
          
        } catch (error) {
          console.error(`Error extracting AI post ${index}:`, error.message);
          return null;
        }
      }).filter(post => post !== null);
    });
  }

  /**
   * Enhance AI posts with AI-specific analysis
   */
  async enhanceAIPosts(posts) {
    return posts.map(post => {
      // Detect AI technologies and frameworks
      const aiTechnologies = this.detectAITechnologies(post.title + ' ' + post.content);
      
      // Detect AI use cases
      const useCases = this.detectAIUseCases(post.title + ' ' + post.content);
      
      // Calculate AI relevance score
      const aiScore = this.calculateAIRelevanceScore(post, aiTechnologies, useCases);
      
      // Classify AI category
      const aiCategory = this.classifyAICategory(post, aiTechnologies, useCases);
      
      return {
        ...post,
        aiMetadata: {
          technologies: aiTechnologies,
          useCases,
          aiScore,
          category: aiCategory,
          isHighlyRelevant: aiScore > 0.7,
          hasTechnicalContent: post.aiIndicators.hasCode || post.aiIndicators.hasMLTerms,
          hasDemo: post.aiIndicators.hasDemo
        }
      };
    });
  }

  /**
   * Detect AI keywords in text
   */
  detectAIKeywords(text) {
    const aiKeywords = [
      'artificial intelligence', 'machine learning', 'deep learning',
      'neural network', 'chatbot', 'gpt', 'llm', 'openai', 'claude',
      'ai model', 'algorithm', 'automation', 'prediction', 'classification',
      'natural language', 'computer vision', 'reinforcement learning'
    ];
    
    const lowerText = text.toLowerCase();
    return aiKeywords.filter(keyword => lowerText.includes(keyword));
  }

  /**
   * Detect machine learning terms
   */
  detectMLTerms(text) {
    const mlTerms = [
      'tensorflow', 'pytorch', 'keras', 'scikit-learn', 'pandas',
      'numpy', 'jupyter', 'regression', 'clustering', 'supervised',
      'unsupervised', 'training data', 'feature', 'model training',
      'hyperparameter', 'gradient descent', 'overfitting'
    ];
    
    const lowerText = text.toLowerCase();
    return mlTerms.filter(term => lowerText.includes(term));
  }

  /**
   * Detect AI tools and platforms
   */
  detectAITools(text) {
    const aiTools = [
      'chatgpt', 'midjourney', 'stable diffusion', 'hugging face',
      'langchain', 'vector database', 'pinecone', 'weaviate',
      'openai api', 'anthropic', 'cohere', 'replicate'
    ];
    
    const lowerText = text.toLowerCase();
    return aiTools.filter(tool => lowerText.includes(tool));
  }

  /**
   * Detect AI technologies and frameworks
   */
  detectAITechnologies(text) {
    const technologies = [
      'transformer', 'attention mechanism', 'bert', 'gpt', 'llama',
      'diffusion model', 'gan', 'cnn', 'rnn', 'lstm', 'gru',
      'autoencoder', 'embedding', 'fine-tuning', 'prompt engineering'
    ];
    
    const lowerText = text.toLowerCase();
    return technologies.filter(tech => lowerText.includes(tech));
  }

  /**
   * Detect AI use cases
   */
  detectAIUseCases(text) {
    const useCases = [
      'text generation', 'image generation', 'voice synthesis',
      'recommendation system', 'fraud detection', 'sentiment analysis',
      'content moderation', 'personalization', 'predictive analytics',
      'autonomous', 'robotics', 'medical diagnosis'
    ];
    
    const lowerText = text.toLowerCase();
    return useCases.filter(useCase => lowerText.includes(useCase));
  }

  /**
   * Calculate AI relevance score
   */
  calculateAIRelevanceScore(post, technologies, useCases) {
    let score = 0;
    
    // Base score from AI indicators
    if (post.aiIndicators.hasAIKeywords.length > 0) score += 0.4;
    if (post.aiIndicators.hasMLTerms.length > 0) score += 0.3;
    if (post.aiIndicators.hasAITools.length > 0) score += 0.2;
    if (post.aiIndicators.hasCode) score += 0.2;
    if (post.aiIndicators.hasDemo) score += 0.1;
    if (post.aiIndicators.hasDataset) score += 0.1;
    
    // Technology and use case bonuses
    score += technologies.length * 0.05;
    score += useCases.length * 0.03;
    
    // AI keywords in title bonus
    const titleAI = post.title.toLowerCase();
    if (titleAI.includes('ai') || titleAI.includes('artificial intelligence')) score += 0.2;
    if (titleAI.includes('ml') || titleAI.includes('machine learning')) score += 0.15;
    if (titleAI.includes('gpt') || titleAI.includes('chatbot')) score += 0.1;
    
    return Math.min(score, 1.0); // Cap at 1.0
  }

  /**
   * Classify AI category
   */
  classifyAICategory(post, technologies, useCases) {
    const text = (post.title + ' ' + post.content).toLowerCase();
    
    if (text.includes('chatbot') || text.includes('conversation') || text.includes('nlp')) {
      return 'conversational-ai';
    } else if (text.includes('image') || text.includes('vision') || text.includes('visual')) {
      return 'computer-vision';
    } else if (text.includes('generate') || text.includes('creative') || text.includes('content')) {
      return 'generative-ai';
    } else if (text.includes('business') || text.includes('startup') || text.includes('product')) {
      return 'ai-business';
    } else if (technologies.length > 0 || post.aiIndicators.hasCode) {
      return 'ai-technical';
    } else {
      return 'general-ai';
    }
  }

  /**
   * Extract AI tags from post element
   */
  extractAITags(element) {
    const tagSelectors = ['.tag', '.label', '.category', '.badge'];
    const tags = [];
    
    tagSelectors.forEach(selector => {
      const tagElements = element.querySelectorAll(selector);
      tagElements.forEach(tagEl => {
        const tagText = tagEl.textContent?.trim().toLowerCase();
        if (tagText && (tagText.includes('ai') || tagText.includes('ml') || 
                       tagText.includes('artificial') || tagText.includes('machine'))) {
          tags.push(tagText);
        }
      });
    });
    
    return [...new Set(tags)]; // Remove duplicates
  }

  /**
   * Get AI category specific metrics
   */
  async getAIMetrics() {
    return await this.browserManager.evaluateInPage(() => {
      const metrics = {
        totalAIPosts: 0,
        postsWithCode: 0,
        postsWithDemo: 0,
        uniqueAuthors: new Set(),
        avgEngagement: 0,
        aiKeywordFrequency: new Map(),
        topAITools: new Map()
      };
      
      const posts = document.querySelectorAll('[data-testid="post"], .post-item, .tag-post');
      metrics.totalAIPosts = posts.length;
      
      let totalEngagement = 0;
      
      posts.forEach(post => {
        // Check for code elements
        if (post.querySelector('code, .code, .highlight')) {
          metrics.postsWithCode++;
        }
        
        // Check for demos
        const postText = post.textContent.toLowerCase();
        if (postText.includes('demo') || postText.includes('playground')) {
          metrics.postsWithDemo++;
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
        
        // Track AI keywords
        const aiKeywords = ['ai', 'chatgpt', 'gpt', 'machine learning', 'ml', 'neural'];
        aiKeywords.forEach(keyword => {
          if (postText.includes(keyword)) {
            metrics.aiKeywordFrequency.set(keyword, 
              (metrics.aiKeywordFrequency.get(keyword) || 0) + 1);
          }
        });
      });
      
      metrics.uniqueAuthors = metrics.uniqueAuthors.size;
      metrics.avgEngagement = posts.length > 0 ? 
        Math.round((totalEngagement / posts.length) * 100) / 100 : 0;
      
      // Convert Maps to Objects for serialization
      metrics.aiKeywordFrequency = Object.fromEntries(metrics.aiKeywordFrequency);
      metrics.topAITools = Object.fromEntries(metrics.topAITools);
      
      return metrics;
    });
  }
}

export default AIScraper;