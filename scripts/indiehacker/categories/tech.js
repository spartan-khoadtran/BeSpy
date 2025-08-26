/**
 * Tech Category Scraper
 * Specialized scraper for IndieHackers Tech section
 */

import { config } from '../config.js';
import BrowserManager from '../utils/browser-manager.js';

export class TechScraper {
  constructor(browserManager) {
    this.browserManager = browserManager || new BrowserManager();
    this.categoryInfo = config.categories['tech'];
  }

  /**
   * Scrape Tech category posts
   */
  async scrape(options = {}) {
    try {
      console.log('💻 Scraping Tech category...');
      
      // Navigate to Tech page
      await this.browserManager.navigateTo(this.categoryInfo.url);
      
      // Wait for tech-specific content
      await this.browserManager.waitForElement('[data-testid="post"], .post-item, .tech-post');
      await this.browserManager.delay(2000);
      
      // Load more tech content
      await this.loadTechContent(options.postsPerCategory || config.scraping.defaultPostsPerCategory);
      
      // Extract tech posts
      const posts = await this.extractTechPosts();
      
      // Enhance posts with tech-specific data
      const enhancedPosts = await this.enhanceTechPosts(posts);
      
      console.log(`✅ Tech scraping completed: ${enhancedPosts.length} posts`);
      return enhancedPosts;
      
    } catch (error) {
      console.error('❌ Tech scraping failed:', error.message);
      throw error;
    }
  }

  /**
   * Load more tech content with tech-specific patterns
   */
  async loadTechContent(targetPosts) {
    console.log(`💻 Loading Tech content (target: ${targetPosts} posts)...`);
    
    let loadedPosts = 0;
    let attempts = 0;
    const maxAttempts = 8;
    
    while (loadedPosts < targetPosts && attempts < maxAttempts) {
      // Scroll with tech page patterns
      await this.browserManager.evaluateInPage(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      
      await this.browserManager.delay(config.scraping.requestDelay);
      
      // Look for tech-specific load more patterns
      const loadMoreClicked = await this.browserManager.evaluateInPage(() => {
        // Tech pages might have different load more button patterns
        const loadMoreSelectors = [
          'button[data-testid="load-more"]',
          '.load-more-posts',
          '.pagination-next',
          'button:contains("Load More")',
          '.show-more-tech'
        ];
        
        for (const selector of loadMoreSelectors) {
          const button = document.querySelector(selector);
          if (button && button.offsetParent !== null) { // Check if visible
            button.click();
            return true;
          }
        }
        
        // Also try generic buttons with relevant text
        const buttons = document.querySelectorAll('button');
        for (const button of buttons) {
          const text = button.textContent.toLowerCase();
          if ((text.includes('load') || text.includes('more') || text.includes('next')) && 
              button.offsetParent !== null) {
            button.click();
            return true;
          }
        }
        
        return false;
      });
      
      if (loadMoreClicked) {
        await this.browserManager.delay(config.scraping.requestDelay * 2);
      }
      
      // Count current tech posts
      const currentCount = await this.browserManager.evaluateInPage(() => {
        return document.querySelectorAll('[data-testid="post"], .post-item, .tech-post, article').length;
      });
      
      console.log(`💻 Tech posts loaded: ${currentCount}`);
      
      if (currentCount === loadedPosts) {
        attempts++;
      } else {
        loadedPosts = currentCount;
        attempts = 0;
      }
    }
  }

  /**
   * Extract tech posts with tech-specific selectors
   */
  async extractTechPosts() {
    return await this.browserManager.evaluateInPage(() => {
      console.log('💻 Extracting Tech posts...');
      
      // Tech-specific container selectors
      const containerSelectors = [
        '[data-testid="post"]',
        '.tech-post',
        '.post-item',
        '.story-item',
        'article[class*="tech"]',
        'article[class*="post"]',
        '.discussion-item'
      ];
      
      let postElements = [];
      let usedSelector = '';
      
      for (const selector of containerSelectors) {
        postElements = Array.from(document.querySelectorAll(selector));
        if (postElements.length > 0) {
          usedSelector = selector;
          console.log(`Tech: Using selector '${selector}': found ${postElements.length} posts`);
          break;
        }
      }
      
      if (postElements.length === 0) {
        console.warn('No Tech posts found');
        return [];
      }
      
      return postElements.map((element, index) => {
        try {
          // Extract title with tech-specific patterns
          const titleSelectors = [
            'h2 a',
            'h3 a',
            '.tech-title a',
            '.post-title a',
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
          
          // Extract author with tech community patterns
          const authorSelectors = [
            '.author-name',
            '.tech-author',
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
          
          // Extract tech-specific engagement metrics
          const upvoteSelectors = [
            '.upvote-count',
            '.tech-votes',
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
            '.tech-comments',
            '.comments-count',
            '[data-testid="comments"]',
            'a[href*="#comments"]'
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
            '.tech-timestamp',
            '.timestamp',
            'time',
            '.post-date'
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
          
          // Extract tech content with code detection
          const contentSelectors = [
            '.tech-content',
            '.post-content',
            '.post-body',
            '.discussion-content',
            '.content'
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
          
          // Detect tech-specific indicators
          const techIndicators = {
            hasCode: element.querySelector('code, .code, .highlight') !== null,
            hasGithubLink: element.innerHTML.includes('github.com'),
            hasTechStack: this.detectTechStack(title + ' ' + content),
            hasDemo: element.innerHTML.toLowerCase().includes('demo') || 
                    element.innerHTML.toLowerCase().includes('live'),
            hasAPI: title.toLowerCase().includes('api') || 
                   content.toLowerCase().includes('api')
          };
          
          // Create tech post object
          const post = {
            title,
            author,
            url: postUrl,
            upvotes,
            comments,
            timestamp,
            content,
            category: 'tech',
            techIndicators,
            extractedAt: new Date().toISOString(),
            selector: usedSelector,
            index
          };
          
          // Tech posts should have meaningful technical content
          if (title && title.length > 3 && 
              (upvotes > 0 || comments > 0 || content.length > 20 ||
               Object.values(techIndicators).some(indicator => indicator))) {
            return post;
          }
          
          return null;
          
        } catch (error) {
          console.error(`Error extracting Tech post ${index}:`, error.message);
          return null;
        }
      }).filter(post => post !== null);
    });
  }

  /**
   * Enhance tech posts with additional tech-specific data
   */
  async enhanceTechPosts(posts) {
    return posts.map(post => {
      // Detect programming languages from title and content
      const languages = this.detectProgrammingLanguages(post.title + ' ' + post.content);
      
      // Detect frameworks and tools
      const frameworks = this.detectFrameworks(post.title + ' ' + post.content);
      
      // Calculate tech relevance score
      const techScore = this.calculateTechRelevanceScore(post, languages, frameworks);
      
      return {
        ...post,
        techMetadata: {
          languages,
          frameworks,
          techScore,
          isTechnical: techScore > 0.3,
          hasCodeExample: post.techIndicators.hasCode,
          hasExternalLinks: post.techIndicators.hasGithubLink || post.techIndicators.hasDemo
        }
      };
    });
  }

  /**
   * Detect programming languages in text
   */
  detectProgrammingLanguages(text) {
    const languages = [
      'javascript', 'typescript', 'python', 'java', 'c#', 'csharp', 'c++', 'cpp',
      'php', 'ruby', 'go', 'rust', 'swift', 'kotlin', 'dart', 'scala',
      'html', 'css', 'sql', 'r', 'matlab', 'perl', 'haskell', 'clojure'
    ];
    
    const lowerText = text.toLowerCase();
    return languages.filter(lang => {
      // Check for exact matches and common variations
      return lowerText.includes(lang) || 
             lowerText.includes(lang.replace('#', 'sharp')) ||
             lowerText.includes(lang + 'script');
    });
  }

  /**
   * Detect frameworks and tools in text
   */
  detectFrameworks(text) {
    const frameworks = [
      'react', 'vue', 'angular', 'svelte', 'next.js', 'nuxt', 'gatsby',
      'express', 'fastify', 'koa', 'django', 'flask', 'rails', 'laravel',
      'spring', 'node.js', 'deno', 'bun',
      'docker', 'kubernetes', 'aws', 'gcp', 'azure', 'vercel', 'netlify',
      'mongodb', 'postgresql', 'mysql', 'redis', 'elasticsearch',
      'webpack', 'vite', 'rollup', 'parcel', 'babel'
    ];
    
    const lowerText = text.toLowerCase();
    return frameworks.filter(framework => 
      lowerText.includes(framework.toLowerCase())
    );
  }

  /**
   * Calculate tech relevance score
   */
  calculateTechRelevanceScore(post, languages, frameworks) {
    let score = 0;
    
    // Base score from tech indicators
    if (post.techIndicators.hasCode) score += 0.3;
    if (post.techIndicators.hasGithubLink) score += 0.2;
    if (post.techIndicators.hasAPI) score += 0.2;
    if (post.techIndicators.hasDemo) score += 0.1;
    
    // Language detection bonus
    score += languages.length * 0.1;
    
    // Framework detection bonus
    score += frameworks.length * 0.05;
    
    // Tech keywords in title bonus
    const techKeywords = ['build', 'develop', 'code', 'api', 'framework', 'library', 'tool', 'app'];
    const titleWords = post.title.toLowerCase().split(' ');
    const techKeywordCount = titleWords.filter(word => techKeywords.includes(word)).length;
    score += techKeywordCount * 0.05;
    
    return Math.min(score, 1.0); // Cap at 1.0
  }

  /**
   * Get tech category specific metrics
   */
  async getTechMetrics() {
    return await this.browserManager.evaluateInPage(() => {
      const metrics = {
        totalTechPosts: 0,
        postsWithCode: 0,
        postsWithGithub: 0,
        uniqueAuthors: new Set(),
        avgEngagement: 0,
        topLanguages: new Map()
      };
      
      const posts = document.querySelectorAll('[data-testid="post"], .post-item, .tech-post');
      metrics.totalTechPosts = posts.length;
      
      let totalEngagement = 0;
      
      posts.forEach(post => {
        // Check for code elements
        if (post.querySelector('code, .code, .highlight')) {
          metrics.postsWithCode++;
        }
        
        // Check for GitHub links
        if (post.innerHTML.includes('github.com')) {
          metrics.postsWithGithub++;
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
      });
      
      metrics.uniqueAuthors = metrics.uniqueAuthors.size;
      metrics.avgEngagement = posts.length > 0 ? 
        Math.round((totalEngagement / posts.length) * 100) / 100 : 0;
      
      return metrics;
    });
  }
}

export default TechScraper;