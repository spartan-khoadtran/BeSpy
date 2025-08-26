#!/usr/bin/env node

/**
 * Extract latest 5 posts from Starting Up category
 */

import { chromium } from 'playwright';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function extractStartingUpPosts() {
  console.log('🚀 Starting extraction of Starting Up posts...\n');
  
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 720 }
    });
    
    const page = await context.newPage();
    
    // Define the 5 post URLs from Starting Up section
    const postUrls = [
      'https://www.indiehackers.com/post/2yrltzVCaaRd5JVr1O5r',
      'https://www.indiehackers.com/post/q0KVJJ8uOLWq4Ix63v39',
      'https://www.indiehackers.com/post/K0jduUTlji9mhx1aCwHh',
      'https://www.indiehackers.com/post/QJtkwSZTqDRzFhLByZCQ',
      'https://www.indiehackers.com/post/ljBIkTQtEbwUwqrGoobq'
    ];
    
    const posts = [];
    
    for (let i = 0; i < postUrls.length; i++) {
      const url = postUrls[i];
      console.log(`📄 Extracting post ${i + 1}/5: ${url}`);
      
      try {
        await page.goto(url, {
          waitUntil: 'domcontentloaded',
          timeout: 30000
        });
        
        // Wait a bit for dynamic content
        await page.waitForTimeout(2000);
        
        // Extract post data
        const postData = await page.evaluate(() => {
          const data = {};
          
          // Get title
          const titleElement = document.querySelector('h1');
          data.title = titleElement?.textContent?.trim() || '';
          
          // Get author
          const authorElement = document.querySelector('a[href*="/u/"], a[href*="/@"]');
          data.author = authorElement?.textContent?.trim() || 'Unknown';
          data.authorUrl = authorElement?.href || '';
          
          // Get date
          const timeElement = document.querySelector('time');
          data.publishedAt = timeElement?.getAttribute('datetime') || '';
          data.publishedAtText = timeElement?.textContent?.trim() || '';
          
          // Get main content - look for article or main content area
          const contentSelectors = [
            'article .prose',
            'article',
            '[class*="post-content"]',
            '[class*="post-body"]',
            'main'
          ];
          
          let content = '';
          for (const selector of contentSelectors) {
            const element = document.querySelector(selector);
            if (element && element.textContent.length > 100) {
              content = element.textContent.trim();
              break;
            }
          }
          data.fullContent = content.substring(0, 10000); // Limit to 10k chars
          
          // Get engagement metrics
          const voteButton = document.querySelector('button[class*="vote"], button[class*="upvote"]');
          const voteText = voteButton?.textContent || '';
          data.upvotes = parseInt(voteText.match(/\d+/)?.[0] || '0');
          
          // Get comments count
          const commentLink = document.querySelector('a[href*="#comments"]');
          const commentText = commentLink?.textContent || '';
          data.commentCount = parseInt(commentText.match(/\d+/)?.[0] || '0');
          
          // Get tags
          const tagElements = document.querySelectorAll('a[href*="/tag"], a[href*="/tags"]');
          data.tags = Array.from(tagElements).map(tag => tag.textContent.trim());
          
          // Get URL
          data.url = window.location.href;
          data.postId = window.location.pathname.split('/').pop();
          
          // Get category
          data.category = 'starting-up';
          
          return data;
        });
        
        // Extract comments if available
        const comments = await page.evaluate(() => {
          const commentElements = document.querySelectorAll('[class*="comment"]:not([class*="count"])');
          const extractedComments = [];
          
          commentElements.forEach(comment => {
            const authorEl = comment.querySelector('a[href*="/u/"], a[href*="/@"]');
            const textEl = comment.querySelector('[class*="text"], [class*="content"], p');
            const voteEl = comment.querySelector('[class*="vote"], [class*="upvote"]');
            const timeEl = comment.querySelector('time, [class*="ago"]');
            
            if (textEl && textEl.textContent.trim()) {
              extractedComments.push({
                author: authorEl?.textContent?.trim() || 'Unknown',
                text: textEl.textContent.trim(),
                upvotes: parseInt(voteEl?.textContent?.match(/\d+/)?.[0] || '0'),
                timestamp: timeEl?.textContent?.trim() || ''
              });
            }
          });
          
          return extractedComments;
        });
        
        postData.comments = comments;
        
        // Add extraction metadata
        postData.extractedAt = new Date().toISOString();
        postData.contentLength = postData.fullContent.length;
        
        posts.push(postData);
        
        console.log(`  ✅ Extracted: ${postData.title}`);
        console.log(`     Author: ${postData.author}`);
        console.log(`     Date: ${postData.publishedAtText}`);
        console.log(`     Content length: ${postData.contentLength} chars`);
        console.log(`     Engagement: ${postData.upvotes} upvotes, ${postData.commentCount} comments`);
        console.log(`     Comments extracted: ${comments.length}`);
        
      } catch (error) {
        console.error(`  ❌ Failed to extract ${url}:`, error.message);
        
        // Add failed post with basic info
        posts.push({
          url: url,
          postId: url.split('/').pop(),
          title: 'Failed to extract',
          error: error.message,
          category: 'starting-up',
          extractedAt: new Date().toISOString()
        });
      }
      
      // Small delay between requests
      if (i < postUrls.length - 1) {
        await page.waitForTimeout(1000);
      }
    }
    
    // Save results
    const outputDir = path.join(__dirname, '..', '..', 'report', 'indiehacker');
    await fs.mkdir(outputDir, { recursive: true });
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    const outputFile = path.join(outputDir, `starting-up-posts-${timestamp}.json`);
    
    await fs.writeFile(outputFile, JSON.stringify({
      category: 'starting-up',
      extractedAt: new Date().toISOString(),
      totalPosts: posts.length,
      posts: posts
    }, null, 2));
    
    console.log(`\n💾 Results saved to: ${outputFile}`);
    
    // Display summary
    console.log('\n📊 Extraction Summary:');
    console.log(`  Total posts extracted: ${posts.length}`);
    console.log(`  Successful extractions: ${posts.filter(p => !p.error).length}`);
    console.log(`  Failed extractions: ${posts.filter(p => p.error).length}`);
    
    const totalComments = posts.reduce((sum, p) => sum + (p.comments?.length || 0), 0);
    console.log(`  Total comments extracted: ${totalComments}`);
    
    return posts;
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

// Run the extraction
extractStartingUpPosts()
  .then(posts => {
    console.log('\n🎉 Extraction completed successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Extraction failed:', error);
    process.exit(1);
  });