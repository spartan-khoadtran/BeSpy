/**
 * Test runner for IndieHackers scraper
 */

import { IndieHackersScraper } from './scraper.js';

async function testRun() {
  console.log('🧪 Starting test run with modified settings...');
  
  const scraper = new IndieHackersScraper({
    browser: {
      headless: false,  // Show browser for debugging
      viewport: { width: 1280, height: 720 }
    }
  });
  
  try {
    // Test with just the main page
    const results = await scraper.scrapeAndReport(['main'], {
      postsPerCategory: 10,  // Just get 10 posts for testing
      generateReport: true
    });
    
    console.log('\n✅ Test completed!');
    console.log('📊 Results:', {
      totalPosts: results.totalPosts,
      reportPath: results.reportPath,
      dataPath: results.dataPath,
      duration: results.scrapingStats?.duration
    });
    
    // Display some posts if found
    if (results.totalPosts > 0) {
      console.log('\n📝 Sample posts found - check the report for details');
    } else {
      console.log('\n⚠️ No posts found - the scraper may need adjustments for the current site structure');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n💡 Suggestions:');
    console.log('1. Check if IndieHackers site is accessible');
    console.log('2. The site structure may have changed');
    console.log('3. Try running with headless: false to see what\'s happening');
  }
}

// Run the test
testRun().catch(console.error);