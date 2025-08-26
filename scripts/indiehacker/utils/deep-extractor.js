/**
 * Deep Extractor - Handles clicking into posts for full content extraction
 */

export class DeepExtractor {
  constructor(page) {
    this.page = page;
  }

  /**
   * Extract full post data by navigating to the post page
   */
  async extractFullPost(postUrl, postPreview = {}) {
    try {
      console.log(`📖 Deep extracting: ${postUrl}`);
      
      // Navigate to post page
      await this.page.goto(postUrl, { 
        waitUntil: 'domcontentloaded',  // Faster loading
        timeout: 30000 
      });

      // Wait for content to load
      await this.page.waitForTimeout(1500);

      // Extract full post data
      const fullData = await this.page.evaluate(() => {
        // Helper function to extract text safely
        const getText = (selector) => {
          const el = document.querySelector(selector);
          return el ? el.textContent.trim() : '';
        };

        const getNumber = (text) => {
          const cleaned = text.replace(/[^\d]/g, '');
          return parseInt(cleaned) || 0;
        };

        // Extract title
        const title = getText('h1') || 
                     getText('.post-title') || 
                     getText('[data-testid="post-title"]') ||
                     getText('h2');

        // Extract author
        const authorElement = document.querySelector('.author-name') ||
                            document.querySelector('[href*="/users/"]') ||
                            document.querySelector('.username') ||
                            document.querySelector('[class*="author"]');
        const author = authorElement ? authorElement.textContent.trim() : '';

        // Extract engagement metrics - look for various patterns
        let upvotes = 0;
        let comments = 0;

        // Try multiple selectors for upvotes
        const upvoteSelectors = [
          '.upvote-count',
          '.upvotes',
          '[data-testid="upvote-count"]',
          '.vote-count',
          '[class*="upvote"] span',
          '.points'
        ];

        for (const selector of upvoteSelectors) {
          const el = document.querySelector(selector);
          if (el) {
            const text = el.textContent.trim();
            const num = getNumber(text);
            if (num > 0 || text === '0') {
              upvotes = num;
              break;
            }
          }
        }

        // If still no upvotes, look for vote button with count
        if (upvotes === 0) {
          const voteButton = document.querySelector('button[class*="vote"], button[class*="upvote"]');
          if (voteButton) {
            const voteText = voteButton.textContent;
            const match = voteText.match(/(\d+)/);
            if (match) upvotes = parseInt(match[1]);
          }
        }

        // Try multiple selectors for comments
        const commentSelectors = [
          '.comment-count',
          '.comments-count',
          '[data-testid="comment-count"]',
          '[href*="#comments"]',
          '.discussion-count',
          '[class*="comment"] span'
        ];

        for (const selector of commentSelectors) {
          const el = document.querySelector(selector);
          if (el) {
            const text = el.textContent.trim();
            const num = getNumber(text);
            if (num > 0 || text === '0') {
              comments = num;
              break;
            }
          }
        }

        // If still no comments, count actual comment elements
        if (comments === 0) {
          const commentElements = document.querySelectorAll('.comment, [data-testid="comment"], .reply, [class*="comment-item"]');
          if (commentElements.length > 0) {
            comments = commentElements.length;
          }
        }

        // Look for comment/discussion text
        if (comments === 0) {
          const discussionText = document.body.textContent;
          const commentMatch = discussionText.match(/(\d+)\s*(comment|discussion|reply|replies)/i);
          if (commentMatch) {
            comments = parseInt(commentMatch[1]);
          }
        }

        // Extract full content
        let content = '';
        
        // Try multiple content selectors
        const contentSelectors = [
          '.post-content',
          '.post-body',
          '[data-testid="post-content"]',
          '.content',
          'article .prose',
          '.markdown-body',
          'main article'
        ];

        for (const selector of contentSelectors) {
          const el = document.querySelector(selector);
          if (el && el.textContent.length > 100) {
            content = el.textContent.trim();
            break;
          }
        }

        // If no content found, try to get the main article text
        if (!content) {
          const article = document.querySelector('article, main, .main-content');
          if (article) {
            // Remove header and comments to get just the post content
            const clone = article.cloneNode(true);
            const toRemove = clone.querySelectorAll('.comments, .comment, header, nav, .author-info');
            toRemove.forEach(el => el.remove());
            content = clone.textContent.trim();
          }
        }

        // Extract timestamp
        let timestamp = '';
        const timeSelectors = [
          'time',
          '.timestamp',
          '.post-date',
          '[datetime]',
          '.time-ago',
          '[class*="time"]'
        ];

        for (const selector of timeSelectors) {
          const el = document.querySelector(selector);
          if (el) {
            timestamp = el.getAttribute('datetime') || el.textContent.trim();
            break;
          }
        }

        // Extract tags/categories if available
        const tags = [];
        const tagElements = document.querySelectorAll('.tag, .category, [href*="/tags/"], [href*="/categories/"]');
        tagElements.forEach(el => {
          const tag = el.textContent.trim();
          if (tag && !tags.includes(tag)) {
            tags.push(tag);
          }
        });

        return {
          title,
          author,
          upvotes,
          comments,
          content: content.substring(0, 5000), // Limit content length
          timestamp,
          tags,
          hasFullContent: content.length > 100
        };
      });

      // Merge with preview data and add URL
      return {
        ...postPreview,
        ...fullData,
        url: postUrl,
        deepExtracted: true
      };

    } catch (error) {
      console.error(`❌ Failed to deep extract ${postUrl}:`, error.message);
      
      // Return preview data with error flag
      return {
        ...postPreview,
        url: postUrl,
        deepExtracted: false,
        extractionError: error.message
      };
    }
  }

  /**
   * Extract multiple posts with rate limiting
   */
  async extractMultiplePosts(postUrls, delay = 1500) {
    const results = [];
    
    for (let i = 0; i < postUrls.length; i++) {
      const url = typeof postUrls[i] === 'string' ? postUrls[i] : postUrls[i].url;
      const preview = typeof postUrls[i] === 'object' ? postUrls[i] : {};
      
      console.log(`🔄 Extracting post ${i + 1}/${postUrls.length}`);
      
      const fullPost = await this.extractFullPost(url, preview);
      results.push(fullPost);
      
      // Rate limiting
      if (i < postUrls.length - 1) {
        await this.page.waitForTimeout(delay);
      }
    }
    
    return results;
  }
}

export default DeepExtractor;