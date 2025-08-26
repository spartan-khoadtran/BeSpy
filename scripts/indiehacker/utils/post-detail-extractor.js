/**
 * Post Detail Extractor
 * Clicks into individual posts to extract full content and comments
 */

import { config } from '../config.js';

export class PostDetailExtractor {
  constructor(browserManager) {
    this.browserManager = browserManager;
    this.page = null;
  }

  /**
   * Extract full details for a list of posts
   */
  async extractFullDetails(posts, category) {
    console.log(`\n🔍 Extracting full details for ${posts.length} posts from ${category}...`);
    
    const detailedPosts = [];
    
    for (let i = 0; i < posts.length; i++) {
      const post = posts[i];
      
      // Skip if no URL
      if (!post.url) {
        console.log(`⚠️ Skipping post ${i + 1}: No URL`);
        detailedPosts.push(post);
        continue;
      }
      
      try {
        console.log(`📖 [${i + 1}/${posts.length}] Extracting: ${post.title?.substring(0, 50)}...`);
        
        // Create new page for each post to avoid navigation issues
        this.page = await this.browserManager.newPage();
        
        // Navigate to post detail page
        await this.page.goto(post.url, {
          waitUntil: 'domcontentloaded',
          timeout: 30000
        });
        
        // Wait for content to load
        await this.page.waitForSelector('body', { timeout: 5000 });
        await this.browserManager.delay(1000);
        
        // Extract full post details
        const fullDetails = await this.extractPostPageData();
        
        // Merge with existing post data - ensure we keep the full content
        const detailedPost = {
          ...post,
          fullContent: fullDetails.content || '', // Store the actual full content
          comments: fullDetails.comments || [],
          commentCount: fullDetails.comments?.length || 0,
          author: fullDetails.author || post.author,
          timestamp: fullDetails.timestamp || post.timestamp,
          tags: fullDetails.tags || [],
          views: fullDetails.views || 0
        };
        
        // Log extraction success
        if (fullDetails.content && fullDetails.content.length > 100) {
          console.log(`  ✅ Got ${fullDetails.content.length} chars of content`);
        }
        if (fullDetails.comments && fullDetails.comments.length > 0) {
          console.log(`  ✅ Got ${fullDetails.comments.length} comments`);
        }
        
        // Also update engagement to include actual comment count
        if (fullDetails.comments && fullDetails.comments.length > 0) {
          detailedPost.engagement = {
            ...post.engagement,
            comments: fullDetails.comments.length,
            raw_comments: fullDetails.comments
          };
        }
        
        detailedPosts.push(detailedPost);
        
        // Close the page
        await this.page.close();
        
        // Add delay between posts to be respectful
        if (i < posts.length - 1) {
          await this.browserManager.delay(config.scraping.requestDelay);
        }
        
      } catch (error) {
        console.error(`❌ Error extracting details for post ${i + 1}:`, error.message);
        
        // Add original post data even if detail extraction fails
        detailedPosts.push(post);
        
        // Try to close page if it exists
        if (this.page) {
          try {
            await this.page.close();
          } catch (e) {
            // Ignore close errors
          }
        }
      }
    }
    
    console.log(`✅ Extracted details for ${detailedPosts.length} posts`);
    return detailedPosts;
  }

  /**
   * Extract data from individual post page
   */
  async extractPostPageData() {
    try {
      const data = await this.page.evaluate(() => {
        // Helper function to clean text
        const cleanText = (text) => text?.trim().replace(/\s+/g, ' ') || '';
        
        // Extract main post content - try multiple approaches
        let content = '';
        
        // Strategy 1: Look for specific content containers
        const mainContentSelectors = [
          '.content', // This is what IndieHackers uses (from debug output)
          '.post-body',
          '.post-content',
          'article main',
          '[data-testid="post-content"]',
          '.prose',
          'article > div'
        ];
        
        // Find the content element with the most text
        let bestContentElement = null;
        let bestContentLength = 0;
        
        for (const selector of mainContentSelectors) {
          const elements = document.querySelectorAll(selector);
          for (const element of elements) {
            const elementText = element.textContent?.trim() || '';
            // Skip if it's likely a comment or navigation
            if (element.closest('.comment, .comments, nav, header')) continue;
            
            if (elementText.length > bestContentLength && elementText.length > 100) {
              bestContentElement = element;
              bestContentLength = elementText.length;
            }
          }
        }
        
        if (bestContentElement) {
          // Clone and clean the element
          const clone = bestContentElement.cloneNode(true);
          // Remove comments and other non-content elements
          const toRemove = clone.querySelectorAll('.comment, .comments, nav, header, .author-info');
          toRemove.forEach(el => el.remove());
          
          // Get the cleaned text
          content = clone.textContent?.trim() || '';
          console.log(`Found content with ${content.length} characters`);
        }
        
        // Fallback: get all paragraphs if no main content container found
        if (!content || content.length < 100) {
          const paragraphs = document.querySelectorAll('main p, article p, .content p');
          if (paragraphs.length > 0) {
            content = Array.from(paragraphs)
              .map(p => p.textContent?.trim())
              .filter(text => text && text.length > 20)
              .join('\n\n');
          }
        }
        
        // Extract author info - be more thorough
        let author = '';
        const authorSelectors = [
          'a[href*="/user/"]',
          'a[href*="/u/"]',
          'a[href*="?id="]',
          '.author-name',
          '.username',
          '[data-testid="author"]',
          '.post-author'
        ];
        
        for (const selector of authorSelectors) {
          const elements = document.querySelectorAll(selector);
          for (const el of elements) {
            // Skip if it's inside a comment
            if (el.closest('.comment, .comments')) continue;
            // Skip if it contains post title
            if (el.querySelector('h1, h2, h3')) continue;
            
            const text = cleanText(el.textContent);
            if (text && !text.match(/^\d+$/) && text.length > 1) {
              author = text;
              break;
            }
          }
          if (author) break;
        }
        
        // Extract timestamp
        let timestamp = '';
        const timeSelectors = [
          'time[datetime]',
          'time',
          '.timestamp',
          '.post-time',
          '.published-at',
          '[data-testid="timestamp"]'
        ];
        
        for (const selector of timeSelectors) {
          const el = document.querySelector(selector);
          if (el && !el.closest('.comment')) {
            timestamp = el.getAttribute('datetime') || cleanText(el.textContent);
            if (timestamp) break;
          }
        }
        
        // Extract comments with more detail
        const comments = [];
        
        // Try to find comment section
        const commentSectionSelectors = [
          '.comments-section',
          '.comments-list',
          '#comments',
          '[data-testid="comments"]',
          'section.comments'
        ];
        
        let commentContainer = null;
        for (const selector of commentSectionSelectors) {
          commentContainer = document.querySelector(selector);
          if (commentContainer) break;
        }
        
        // If no specific container, look for individual comments
        const commentSelectors = [
          '.comment-item',
          '.comment',
          'article.comment',
          '[data-testid="comment"]',
          '[class*="comment"]:not(.comment-count):not(.comments-count)'
        ];
        
        let commentElements = [];
        if (commentContainer) {
          for (const selector of commentSelectors) {
            commentElements = Array.from(commentContainer.querySelectorAll(selector));
            if (commentElements.length > 0) break;
          }
        } else {
          // Search globally but be careful
          for (const selector of commentSelectors) {
            const elements = Array.from(document.querySelectorAll(selector));
            // Filter out non-comment elements
            commentElements = elements.filter(el => {
              const text = el.textContent || '';
              // Must have some substantial text
              return text.length > 20 && !el.querySelector('h1, h2, h3');
            });
            if (commentElements.length > 0) break;
          }
        }
        
        console.log(`Found ${commentElements.length} comment elements`);
        
        commentElements.forEach((commentEl, index) => {
          try {
            // Extract comment author
            let commentAuthor = '';
            const authorSelectors = [
              'a[href*="/user/"]',
              'a[href*="/u/"]',
              '.comment-author',
              '.author',
              '.username'
            ];
            
            for (const selector of authorSelectors) {
              const authorEl = commentEl.querySelector(selector);
              if (authorEl) {
                commentAuthor = cleanText(authorEl.textContent);
                if (commentAuthor && !commentAuthor.match(/^\d+$/)) break;
              }
            }
            
            // Extract comment text
            let commentText = '';
            const textSelectors = [
              '.comment-text',
              '.comment-body',
              '.comment-content',
              'p'
            ];
            
            for (const selector of textSelectors) {
              const textEl = commentEl.querySelector(selector);
              if (textEl) {
                commentText = cleanText(textEl.textContent);
                if (commentText.length > 10) break;
              }
            }
            
            // Fallback: get all text but remove author and metadata
            if (!commentText) {
              const clone = commentEl.cloneNode(true);
              const toRemove = clone.querySelectorAll('.author, .metadata, time, .upvotes');
              toRemove.forEach(el => el.remove());
              commentText = cleanText(clone.textContent);
            }
            
            // Extract comment timestamp
            let commentTime = '';
            const timeEl = commentEl.querySelector('time, [datetime], .time-ago, .comment-time');
            if (timeEl) {
              commentTime = timeEl.getAttribute('datetime') || cleanText(timeEl.textContent);
            }
            
            // Extract upvotes for comment
            let commentUpvotes = 0;
            const upvoteSelectors = [
              '.comment-upvotes',
              '.upvote-count',
              '.votes',
              '[class*="vote"]'
            ];
            
            for (const selector of upvoteSelectors) {
              const upvoteEl = commentEl.querySelector(selector);
              if (upvoteEl) {
                const text = upvoteEl.textContent || '';
                const match = text.match(/(\d+)/);
                if (match) {
                  commentUpvotes = parseInt(match[1]);
                  break;
                }
              }
            }
            
            // Only add valid comments
            if (commentText && commentText.length > 10) {
              comments.push({
                author: commentAuthor || 'Anonymous',
                text: commentText.substring(0, 1000), // Limit length
                upvotes: commentUpvotes,
                timestamp: commentTime || null
              });
            }
          } catch (error) {
            console.error('Error extracting comment:', error);
          }
        });
        
        // Extract tags
        const tags = [];
        const tagSelectors = [
          'a[href*="/tags/"]',
          'a[href*="/tag/"]',
          '.tag',
          '.post-tag',
          '[data-testid="tag"]'
        ];
        
        const tagElements = document.querySelectorAll(tagSelectors.join(','));
        tagElements.forEach(el => {
          const tag = cleanText(el.textContent);
          if (tag && !tag.match(/^\d+$/) && tag.length > 1 && tag.length < 30) {
            tags.push(tag.replace('#', ''));
          }
        });
        
        // Extract view count
        let views = 0;
        const viewSelectors = [
          '.view-count',
          '.views',
          '.post-views',
          '[class*="view"]'
        ];
        
        for (const selector of viewSelectors) {
          const elements = document.querySelectorAll(selector);
          for (const el of elements) {
            const text = el.textContent || '';
            const match = text.match(/(\d+)\s*(views?|reads?|impressions?)/i);
            if (match) {
              views = parseInt(match[1]);
              break;
            }
          }
          if (views > 0) break;
        }
        
        // Also check for view count in metadata or stats section
        if (views === 0) {
          const statsText = document.body.textContent || '';
          const viewMatch = statsText.match(/(\d+)\s*(views?|reads?)/i);
          if (viewMatch) {
            views = parseInt(viewMatch[1]);
          }
        }
        
        return {
          content: content.substring(0, 5000), // Limit content length
          author,
          timestamp,
          comments,
          tags: [...new Set(tags)], // Remove duplicates
          views
        };
      });
      
      console.log(`📚 Extracted: ${data.content ? data.content.length : 0} chars of content, ${data.comments.length} comments`);
      return data;
    } catch (error) {
      console.error('❌ Error extracting post page data:', error.message);
      return {
        content: '',
        comments: [],
        tags: [],
        views: 0
      };
    }
  }

  /**
   * Extract comments with pagination support
   */
  async extractAllComments() {
    const allComments = [];
    let hasMore = true;
    let page = 1;
    
    while (hasMore && page <= 5) { // Limit to 5 pages of comments
      try {
        // Check for "Load More Comments" button
        const loadMoreButton = await this.page.$('[class*="load-more"], button:has-text("more comments"), button:has-text("show more")');
        
        if (loadMoreButton) {
          await loadMoreButton.click();
          await this.browserManager.delay(1000);
          page++;
        } else {
          hasMore = false;
        }
      } catch (error) {
        hasMore = false;
      }
    }
    
    // Extract all comments after loading
    return await this.extractPostPageData();
  }
}

export default PostDetailExtractor;