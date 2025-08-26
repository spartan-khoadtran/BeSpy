/**
 * Debug extraction to see what data we're getting
 */

import { IndieHackersScraper } from './scraper.js';

async function debugExtraction() {
  const scraper = new IndieHackersScraper();
  
  try {
    console.log('🔍 Running debug extraction...\n');
    
    // Just scrape main page with 1 post
    const result = await scraper.scrape(['main'], { postsPerCategory: 1 });
    
    console.log('📊 Scraping result:', {
      success: result.success,
      totalPosts: result.posts?.length || 0
    });
    
    // Show raw extraction before processing
    if (result.posts && result.posts.length > 0) {
      console.log('\n✅ Found posts! First post:');
      console.log(JSON.stringify(result.posts[0], null, 2));
    } else {
      console.log('\n❌ No posts found after processing');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

debugExtraction();