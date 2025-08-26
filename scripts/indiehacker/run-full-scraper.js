#!/usr/bin/env node

/**
 * Production script for running the IndieHackers scraper
 * This script runs the full scraper with all categories and complete data extraction
 */

import IndieHackersScraper from './scraper.js';

async function runFullScraper() {
  console.log('🚀 Starting IndieHackers full scraper with deep extraction...\n');
  console.log('📌 Configuration:');
  console.log('   - Scraping all categories');
  console.log('   - Deep extraction enabled (full content + comments)');
  console.log('   - Using browser-data profile for persistence');
  console.log('   - Posts per category: 20\n');
  
  const scraper = new IndieHackersScraper({
    browser: {
      headless: false, // Set to true for production
      slowMo: 0 // No slowdown in production
    }
  });
  
  try {
    // Run full scraper with all categories
    const result = await scraper.scrapeAndReport('all', {
      postsPerCategory: 20, // Get 20 posts per category
      extractFullDetails: true, // Enable deep extraction
      date: new Date()
    });
    
    console.log('\n✅ Scraping completed successfully!');
    console.log('📊 Final Results:');
    console.log(`   - Total posts analyzed: ${result.totalPosts}`);
    console.log(`   - Report location: ${result.reportPath}`);
    console.log(`   - JSON data: ${result.jsonPath}`);
    console.log(`   - Posts with full content: ${result.stats?.hasFullContent || 0}`);
    
    // Show summary statistics
    if (result.scrapingStats) {
      console.log('\n📈 Performance Statistics:');
      console.log(`   - Duration: ${result.scrapingStats.duration}s`);
      console.log(`   - Posts per second: ${result.scrapingStats.postsPerSecond}`);
      console.log(`   - Categories processed: ${result.scrapingStats.categoriesProcessed}`);
      
      if (result.scrapingStats.errors && result.scrapingStats.errors.length > 0) {
        console.log('\n⚠️ Errors encountered:');
        result.scrapingStats.errors.forEach(err => {
          console.log(`   - ${err.category || 'General'}: ${err.error}`);
        });
      }
    }
    
    console.log('\n🎉 All done! Check the report directory for results.');
    
  } catch (error) {
    console.error('\n❌ Scraping failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Command line argument handling
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
IndieHackers Scraper - Full Production Run

Usage: node run-full-scraper.js [options]

Options:
  --help, -h     Show this help message
  --headless     Run browser in headless mode (no UI)
  --categories   Comma-separated list of categories (default: all)
  --posts        Number of posts per category (default: 20)

Examples:
  node run-full-scraper.js
  node run-full-scraper.js --headless
  node run-full-scraper.js --categories main,tech,ai --posts 10
  `);
  process.exit(0);
}

// Run the scraper
runFullScraper().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});