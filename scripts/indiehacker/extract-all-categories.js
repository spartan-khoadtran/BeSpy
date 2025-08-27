#!/usr/bin/env node

/**
 * Extract last 10 articles from each IndieHackers category
 */

import { chromium } from 'playwright';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Define all IndieHackers categories
const CATEGORIES = [
  { name: 'starting-up', url: 'https://www.indiehackers.com/starting-up', displayName: 'Starting Up' },
  { name: 'tech', url: 'https://www.indiehackers.com/tech', displayName: 'Tech' },
  { name: 'ai', url: 'https://www.indiehackers.com/tags/artificial-intelligence', displayName: 'A.I.' },
  { name: 'creators', url: 'https://www.indiehackers.com/creators', displayName: 'Creators' },
  { name: 'lifestyle', url: 'https://www.indiehackers.com/lifestyle', displayName: 'Lifestyle' },
  { name: 'money', url: 'https://www.indiehackers.com/money', displayName: 'Money' }
];

async function extractCategoryPosts(page, category, maxPosts = 10) {
  console.log(`\n📂 Extracting ${category.displayName} category...`);
  
  try {
    // Navigate to category page
    console.log(`   Navigating to: ${category.url}`);
    await page.goto(category.url, {
      waitUntil: 'networkidle',
      timeout: 60000
    });
    
    // Wait for content to load
    await page.waitForTimeout(3000);
    
    // Extract post links and basic info from the category page
    const posts = await page.evaluate((categoryName) => {
      const extractedPosts = [];
      
      // Try multiple selectors to find posts
      const selectors = [
        'a[href*="/post/"]',
        'article a[href*="/post/"]',
        '[class*="post"] a[href*="/post/"]',
        '[class*="item"] a[href*="/post/"]',
        '[class*="card"] a[href*="/post/"]'
      ];
      
      const postLinks = new Set();
      
      for (const selector of selectors) {
        const links = document.querySelectorAll(selector);
        links.forEach(link => {
          const href = link.href;
          if (href && href.includes('/post/') && !href.includes('#')) {
            postLinks.add(href);
          }
        });
      }
      
      // Convert to array and extract post info
      Array.from(postLinks).forEach(url => {
        const postId = url.split('/post/')[1]?.split('?')[0];
        if (postId) {
          // Try to find the post container for this link
          const link = document.querySelector(`a[href*="${postId}"]`);
          let container = link;
          let title = '';
          let author = '';
          let date = '';
          let preview = '';
          
          // Walk up the DOM to find the post container
          while (container && container.parentElement) {
            container = container.parentElement;
            
            // Look for title
            if (!title) {
              const titleEl = container.querySelector('h1, h2, h3, [class*="title"]');
              if (titleEl) {
                title = titleEl.textContent?.trim() || '';
              }
            }
            
            // Look for author
            if (!author) {
              const authorEl = container.querySelector('a[href*="/u/"], a[href*="/@"]');
              if (authorEl) {
                author = authorEl.textContent?.trim() || '';
              }
            }
            
            // Look for date
            if (!date) {
              const dateEl = container.querySelector('time, [class*="date"], [class*="ago"]');
              if (dateEl) {
                date = dateEl.textContent?.trim() || '';
              }
            }
            
            // Look for preview text
            if (!preview && container.textContent?.length > 100) {
              preview = container.textContent.substring(0, 300);
            }
            
            // Don't go too high in the DOM
            if (container.tagName === 'BODY' || container.tagName === 'HTML') {
              break;
            }
          }
          
          // If no title found, try to extract from link text
          if (!title && link) {
            title = link.textContent?.trim() || '';
          }
          
          extractedPosts.push({
            url: url,
            postId: postId,
            title: title,
            author: author,
            date: date,
            preview: preview,
            category: categoryName
          });
        }
      });
      
      return extractedPosts;
    }, category.name);
    
    console.log(`   Found ${posts.length} post links`);
    
    // Limit to maxPosts
    const postsToExtract = posts.slice(0, maxPosts);
    console.log(`   Will extract details for ${postsToExtract.length} posts`);
    
    // Extract full content for each post
    const fullPosts = [];
    for (let i = 0; i < postsToExtract.length; i++) {
      const post = postsToExtract[i];
      console.log(`   [${i + 1}/${postsToExtract.length}] Extracting: ${post.url}`);
      
      try {
        // Navigate to post page
        await page.goto(post.url, {
          waitUntil: 'domcontentloaded',
          timeout: 30000
        });
        
        await page.waitForTimeout(2000);
        
        // Extract detailed post data
        const detailedPost = await page.evaluate(() => {
          const data = {};
          
          // Title
          const titleEl = document.querySelector('h1, article h1, [class*="title"] h1');
          data.title = titleEl?.textContent?.trim() || '';
          
          // Author
          const authorEl = document.querySelector('a[href*="/u/"], a[href*="/@"], [class*="author"] a');
          data.author = authorEl?.textContent?.trim() || '';
          data.authorUrl = authorEl?.href || '';
          
          // Date
          const timeEl = document.querySelector('time');
          data.publishedAt = timeEl?.getAttribute('datetime') || '';
          data.publishedAtText = timeEl?.textContent?.trim() || '';
          
          // Content - try multiple strategies
          let content = '';
          const contentSelectors = [
            'article .prose',
            'article [class*="content"]',
            'article',
            '[class*="post-content"]',
            '[class*="post-body"]',
            'main article',
            'main'
          ];
          
          for (const selector of contentSelectors) {
            const element = document.querySelector(selector);
            if (element && element.textContent.length > 200) {
              // Remove navigation, comments, etc.
              const clone = element.cloneNode(true);
              
              // Remove unwanted elements
              const removeSelectors = [
                'nav', 'header', 'footer', 
                '[class*="comment"]', '[class*="sidebar"]',
                '[class*="share"]', '[class*="related"]'
              ];
              
              removeSelectors.forEach(sel => {
                clone.querySelectorAll(sel).forEach(el => el.remove());
              });
              
              content = clone.textContent.trim();
              if (content.length > 200) break;
            }
          }
          
          data.content = content.substring(0, 5000); // Limit content length
          
          // Engagement metrics
          const voteButton = document.querySelector('button[class*="vote"], button[class*="upvote"], [class*="vote-count"]');
          const voteText = voteButton?.textContent || '';
          data.upvotes = parseInt(voteText.match(/\d+/)?.[0] || '0');
          
          // Comments
          const commentLink = document.querySelector('a[href*="#comments"], [class*="comment-count"]');
          const commentText = commentLink?.textContent || '';
          data.commentCount = parseInt(commentText.match(/\d+/)?.[0] || '0');
          
          // Extract some comments
          const commentElements = document.querySelectorAll('[class*="comment"]:not([class*="count"])');
          data.comments = [];
          
          Array.from(commentElements).slice(0, 5).forEach(comment => {
            const authorEl = comment.querySelector('a[href*="/u/"], a[href*="/@"]');
            const textEl = comment.querySelector('[class*="text"], [class*="content"], p');
            const voteEl = comment.querySelector('[class*="vote"], [class*="upvote"]');
            
            if (textEl && textEl.textContent.trim()) {
              data.comments.push({
                author: authorEl?.textContent?.trim() || 'Unknown',
                text: textEl.textContent.trim().substring(0, 500),
                upvotes: parseInt(voteEl?.textContent?.match(/\d+/)?.[0] || '0')
              });
            }
          });
          
          // Tags
          const tagElements = document.querySelectorAll('a[href*="/tag"], a[href*="/tags"]');
          data.tags = Array.from(tagElements).map(tag => tag.textContent.trim());
          
          // URL and ID
          data.url = window.location.href;
          data.postId = window.location.pathname.split('/').pop();
          
          return data;
        });
        
        // Merge with basic post data
        fullPosts.push({
          ...post,
          ...detailedPost,
          category: category.name,
          categoryDisplayName: category.displayName,
          extractedAt: new Date().toISOString()
        });
        
        // Small delay between requests
        await page.waitForTimeout(1000);
        
      } catch (error) {
        console.log(`   ⚠️ Failed to extract details: ${error.message}`);
        // Add basic post data even if full extraction failed
        fullPosts.push({
          ...post,
          error: error.message,
          extractedAt: new Date().toISOString()
        });
      }
    }
    
    return fullPosts;
    
  } catch (error) {
    console.error(`   ❌ Failed to extract ${category.displayName}: ${error.message}`);
    return [];
  }
}

async function extractAllCategories() {
  console.log('🚀 Starting IndieHackers multi-category extraction...');
  console.log(`   Categories to extract: ${CATEGORIES.map(c => c.displayName).join(', ')}`);
  
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      viewport: { width: 1280, height: 720 }
    });
    
    const page = await context.newPage();
    
    // Extract posts from each category
    const allResults = {};
    
    for (const category of CATEGORIES) {
      const posts = await extractCategoryPosts(page, category, 10);
      allResults[category.name] = {
        category: category.displayName,
        url: category.url,
        postCount: posts.length,
        posts: posts
      };
      
      console.log(`   ✅ Extracted ${posts.length} posts from ${category.displayName}`);
    }
    
    // Save results
    const outputDir = path.join(__dirname, '..', '..', 'report', 'indiehacker');
    await fs.mkdir(outputDir, { recursive: true });
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    
    // Save combined results
    const combinedPath = path.join(outputDir, `all-categories-${timestamp}.json`);
    await fs.writeFile(combinedPath, JSON.stringify({
      extractedAt: new Date().toISOString(),
      categories: Object.keys(allResults).length,
      totalPosts: Object.values(allResults).reduce((sum, cat) => sum + cat.postCount, 0),
      results: allResults
    }, null, 2));
    
    console.log(`\n💾 Combined results saved to: ${combinedPath}`);
    
    // Save individual category files
    for (const [categoryName, data] of Object.entries(allResults)) {
      const categoryPath = path.join(outputDir, `${categoryName}-${timestamp}.json`);
      await fs.writeFile(categoryPath, JSON.stringify(data, null, 2));
      console.log(`   📁 ${data.category}: ${categoryPath}`);
    }
    
    // Display summary
    console.log('\n📊 Extraction Summary:');
    console.log(`   Total categories: ${Object.keys(allResults).length}`);
    console.log(`   Total posts extracted: ${Object.values(allResults).reduce((sum, cat) => sum + cat.postCount, 0)}`);
    
    for (const [categoryName, data] of Object.entries(allResults)) {
      console.log(`   - ${data.category}: ${data.postCount} posts`);
    }
    
    return allResults;
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

// Run the extraction
extractAllCategories()
  .then(results => {
    console.log('\n🎉 All categories extracted successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Extraction failed:', error);
    process.exit(1);
  });