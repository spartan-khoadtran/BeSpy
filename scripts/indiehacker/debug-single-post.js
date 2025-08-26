#!/usr/bin/env node

/**
 * Debug script to test extraction from a single IndieHackers post
 */

import { chromium } from 'playwright';
import path from 'path';

async function debugSinglePost() {
  const postUrl = 'https://www.indiehackers.com/post/textideo-veo3-vs-openai-sora-2025-side-by-side-comparison-7f5d17d69a';
  
  console.log('🔍 Debugging single post extraction...');
  console.log(`📌 URL: ${postUrl}\n`);
  
  // Set up browser with profile
  const userDataDir = path.join(process.cwd(), 'browser-data');
  const browser = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    slowMo: 500
  });
  
  const page = await browser.newPage();
  
  try {
    // Navigate to post
    console.log('🌐 Navigating to post...');
    await page.goto(postUrl, { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });
    
    // Wait for content to load
    await page.waitForTimeout(3000);
    
    // Take screenshot
    await page.screenshot({ path: 'debug-post-page.png', fullPage: false });
    console.log('📸 Screenshot saved as debug-post-page.png');
    
    // Try to extract content with detailed debugging
    const extractedData = await page.evaluate(() => {
      const cleanText = (text) => text?.trim().replace(/\s+/g, ' ') || '';
      
      const result = {
        title: '',
        content: '',
        author: '',
        comments: [],
        debug: {
          selectors_tried: [],
          content_elements_found: [],
          comment_elements_found: 0
        }
      };
      
      // Try to find title
      const titleSelectors = ['h1', 'h2', '.post-title', '[data-testid="post-title"]'];
      for (const selector of titleSelectors) {
        const el = document.querySelector(selector);
        if (el) {
          result.title = cleanText(el.textContent);
          result.debug.selectors_tried.push(`title: ${selector} ✓`);
          break;
        } else {
          result.debug.selectors_tried.push(`title: ${selector} ✗`);
        }
      }
      
      // Try to find main content with different strategies
      console.log('Looking for main content...');
      
      // Strategy 1: Look for article or main content container
      const contentSelectors = [
        'article',
        'main article',
        '.post-content',
        '.post-body',
        '[role="article"]',
        '.prose',
        '.content'
      ];
      
      for (const selector of contentSelectors) {
        const elements = document.querySelectorAll(selector);
        result.debug.selectors_tried.push(`content: ${selector} (found ${elements.length})`);
        
        if (elements.length > 0) {
          elements.forEach((el, idx) => {
            const text = el.textContent?.trim() || '';
            if (text.length > 100) {
              result.debug.content_elements_found.push({
                selector,
                index: idx,
                textLength: text.length,
                preview: text.substring(0, 100) + '...'
              });
              
              // Use the longest content found
              if (text.length > result.content.length) {
                result.content = text;
              }
            }
          });
        }
      }
      
      // Strategy 2: If no content found, look for paragraphs
      if (!result.content) {
        const paragraphs = document.querySelectorAll('p');
        const combinedText = Array.from(paragraphs)
          .map(p => p.textContent?.trim())
          .filter(text => text && text.length > 50)
          .join('\n\n');
        
        if (combinedText.length > 100) {
          result.content = combinedText;
          result.debug.content_elements_found.push({
            selector: 'p elements',
            textLength: combinedText.length,
            paragraphCount: paragraphs.length
          });
        }
      }
      
      // Try to find comments
      const commentSelectors = [
        '.comment',
        '[data-testid="comment"]',
        'div[id*="comment"]',
        '[class*="comment-item"]'
      ];
      
      for (const selector of commentSelectors) {
        const elements = document.querySelectorAll(selector);
        result.debug.selectors_tried.push(`comments: ${selector} (found ${elements.length})`);
        
        if (elements.length > 0) {
          result.debug.comment_elements_found = elements.length;
          
          elements.forEach((el, idx) => {
            // Extract comment details
            const authorEl = el.querySelector('a[href*="/u/"], .author, .username');
            const textEl = el.querySelector('p, .comment-text, .comment-body') || el;
            
            const comment = {
              author: authorEl ? cleanText(authorEl.textContent) : 'Unknown',
              text: cleanText(textEl.textContent).substring(0, 200),
              index: idx
            };
            
            if (comment.text && comment.text.length > 20) {
              result.comments.push(comment);
            }
          });
          
          if (result.comments.length > 0) break;
        }
      }
      
      // Get page structure info
      result.debug.pageInfo = {
        url: window.location.href,
        title: document.title,
        hasH1: !!document.querySelector('h1'),
        hasArticle: !!document.querySelector('article'),
        totalTextLength: document.body.textContent?.length || 0
      };
      
      return result;
    });
    
    // Display results
    console.log('\n📊 Extraction Results:');
    console.log('=====================================\n');
    
    console.log('Title:', extractedData.title || 'NOT FOUND');
    console.log('\nContent:');
    console.log('  Length:', extractedData.content.length, 'characters');
    console.log('  Preview:', extractedData.content.substring(0, 200) + '...\n');
    
    console.log('Comments found:', extractedData.comments.length);
    if (extractedData.comments.length > 0) {
      console.log('Sample comments:');
      extractedData.comments.slice(0, 3).forEach((c, i) => {
        console.log(`  ${i+1}. ${c.author}: ${c.text.substring(0, 100)}...`);
      });
    }
    
    console.log('\n🔍 Debug Information:');
    console.log('=====================================');
    console.log('Page Info:', extractedData.debug.pageInfo);
    console.log('\nSelectors Tried:', extractedData.debug.selectors_tried);
    console.log('\nContent Elements Found:', extractedData.debug.content_elements_found);
    console.log('\nComment Elements:', extractedData.debug.comment_elements_found);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    console.log('\n🔄 Keeping browser open for manual inspection...');
    console.log('Press Ctrl+C to close');
    
    // Keep browser open for debugging
    await new Promise(() => {});
  }
}

// Run debug
debugSinglePost().catch(console.error);