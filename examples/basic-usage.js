// Basic usage example for IndieHackers scraper
const { IndieHackersScraper, ReportGenerator } = require('../dist');
const path = require('path');
const fs = require('fs');

async function basicScrapeExample() {
  const scraper = new IndieHackersScraper();
  
  try {
    console.log('🚀 Initializing scraper...');
    await scraper.initialize(true); // headless mode
    
    console.log('📊 Scraping trending posts...');
    const posts = await scraper.scrapeCategory('trending', 5);
    
    console.log(`✅ Found ${posts.length} trending posts:`);
    posts.forEach((post, index) => {
      console.log(`\n${index + 1}. ${post.title}`);
      console.log(`   Author: ${post.author}`);
      console.log(`   Engagement: ${post.engagement.comments} comments, ${post.engagement.upvotes} upvotes`);
      console.log(`   Score: ${post.engagement.score}`);
      console.log(`   Tags: ${post.tags.join(', ')}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await scraper.cleanup();
  }
}

async function fullScrapeExample() {
  const scraper = new IndieHackersScraper();
  const reportGenerator = new ReportGenerator();
  
  try {
    console.log('🚀 Starting full scrape...');
    await scraper.initialize(true);
    
    const config = {
      categories: ['trending', 'new', 'ask-ih'],
      outputDir: './output',
      maxPostsPerCategory: 10,
      includeContent: true
    };
    
    const result = await scraper.scrape(config);
    
    // Generate report
    const reportData = reportGenerator.prepareReportData(result.posts, result.metadata);
    const markdown = reportGenerator.generateMarkdownReport(reportData);
    
    // Ensure output directory exists
    if (!fs.existsSync('./output')) {
      fs.mkdirSync('./output');
    }
    
    // Save results
    fs.writeFileSync('./output/posts.json', JSON.stringify(result, null, 2));
    fs.writeFileSync('./output/report.md', markdown);
    
    console.log('✅ Results saved to ./output/');
    console.log(`📊 Total posts: ${result.posts.length}`);
    console.log(`🔄 Duplicates removed: ${result.metadata.duplicatesRemoved}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await scraper.cleanup();
  }
}

// Run example based on command line argument
const example = process.argv[2] || 'basic';

if (example === 'basic') {
  basicScrapeExample();
} else if (example === 'full') {
  fullScrapeExample();
} else {
  console.log('Usage: node basic-usage.js [basic|full]');
}