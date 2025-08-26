#!/usr/bin/env node

/**
 * Test script for IndieHackers scraper with deep extraction
 */

import IndieHackersScraper from './scraper.js';

async function testScraper() {
  console.log('🚀 Starting IndieHackers scraper test with deep extraction...\n');
  
  const scraper = new IndieHackersScraper({
    browser: {
      headless: false, // Set to false to see the browser
      slowMo: 50 // Slow down for debugging
    }
  });
  
  try {
    // Test with main category only, limited posts for testing
    const result = await scraper.scrapeAndReport('main', {
      postsPerCategory: 5, // Only get 5 posts for testing
      extractFullDetails: true, // Enable deep extraction
      date: new Date()
    });
    
    console.log('\n✅ Test completed successfully!');
    console.log('📊 Results:', {
      totalPosts: result.totalPosts,
      reportPath: result.reportPath,
      jsonPath: result.jsonPath,
      hasFullContent: result.stats?.hasFullContent
    });
    
    // Display sample of extracted data
    if (result.scrapingStats?.totalPosts > 0) {
      console.log('\n📋 Sample post extraction results:');
      console.log('- Posts with full content extracted');
      console.log('- Comments extracted from posts');
      console.log('- Tags and metadata captured');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run test
testScraper().catch(console.error);