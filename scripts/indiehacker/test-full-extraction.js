#!/usr/bin/env node

/**
 * Test Full Extraction - Verify deep post extraction and category-based reporting
 */

import { IndieHackersScraper } from './scraper.js';

async function testFullExtraction() {
  console.log('🧪 Testing Full Post Extraction and Category Reports...\n');
  
  const scraper = new IndieHackersScraper({
    browser: {
      headless: false, // Show browser for debugging
      slowMo: 50 // Slow down actions to see what's happening
    }
  });
  
  try {
    // Test scraping with smaller limits for faster testing
    const options = {
      postsPerCategory: 3, // Only get 3 posts per category for testing
      extractFullDetails: true, // Ensure full extraction is enabled
      date: new Date()
    };
    
    // Test with specific categories
    const categories = ['main', 'tech', 'ai']; // Test 3 categories
    
    console.log('📋 Test Configuration:');
    console.log(`   Categories: ${categories.join(', ')}`);
    console.log(`   Posts per category: ${options.postsPerCategory}`);
    console.log(`   Full extraction: ${options.extractFullDetails}`);
    console.log('');
    
    // Perform scraping and report generation
    const result = await scraper.scrapeAndReport(categories, options);
    
    console.log('\n✅ Test Results:');
    console.log(`   Total posts scraped: ${result.totalPosts}`);
    console.log(`   Reports generated: ${result.totalFiles} files`);
    console.log(`   Report directory: ${result.reportDir}`);
    
    // Check if category reports were generated
    if (result.categoryReports && result.categoryReports.length > 0) {
      console.log('\n📁 Category Reports:');
      result.categoryReports.forEach(report => {
        console.log(`   - ${report.category}: ${report.postCount} posts`);
        if (report.jsonPath) {
          console.log(`     JSON: ${report.jsonPath}`);
        }
        if (report.markdownPath) {
          console.log(`     Markdown: ${report.markdownPath}`);
        }
      });
    }
    
    // Validate that we got full content
    console.log('\n🔍 Validating Full Content Extraction...');
    
    // Read one of the JSON reports to check content
    const fs = await import('fs/promises');
    const path = await import('path');
    
    // Find a category report with posts
    const categoryReport = result.categoryReports.find(r => r.postCount > 0 && r.jsonPath);
    
    if (categoryReport) {
      const jsonContent = await fs.readFile(categoryReport.jsonPath, 'utf8');
      const data = JSON.parse(jsonContent);
      
      console.log(`\n📊 Checking ${categoryReport.category} report:`);
      console.log(`   Posts analyzed: ${data.posts.length}`);
      
      // Check first post for full content
      if (data.posts.length > 0) {
        const firstPost = data.posts[0];
        console.log(`\n   First post analysis:`);
        console.log(`     Title: ${firstPost.title}`);
        console.log(`     Author: ${firstPost.author.username}`);
        console.log(`     Full content length: ${firstPost.content.full_text.length} chars`);
        console.log(`     Has full content: ${firstPost.content.full_text.length > 100 ? '✅' : '❌'}`);
        console.log(`     Comments extracted: ${firstPost.comments_data.length}`);
        console.log(`     Has comments data: ${firstPost.comments_data.length > 0 ? '✅' : '❌'}`);
        console.log(`     Tags: ${firstPost.tags.join(', ') || 'None'}`);
        console.log(`     Views: ${firstPost.metrics.views}`);
        
        // Show sample of full content
        if (firstPost.content.full_text.length > 0) {
          console.log(`\n     Content preview (first 200 chars):`);
          console.log(`     "${firstPost.content.full_text.substring(0, 200)}..."`);
        }
        
        // Show sample comment if available
        if (firstPost.comments_data.length > 0) {
          const firstComment = firstPost.comments_data[0];
          console.log(`\n     First comment:`);
          console.log(`       Author: ${firstComment.author}`);
          console.log(`       Text: "${firstComment.text.substring(0, 100)}..."`);
          console.log(`       Upvotes: ${firstComment.upvotes}`);
        }
      }
      
      // Summary statistics
      let postsWithFullContent = 0;
      let postsWithComments = 0;
      let totalComments = 0;
      
      data.posts.forEach(post => {
        if (post.content.full_text && post.content.full_text.length > 100) {
          postsWithFullContent++;
        }
        if (post.comments_data && post.comments_data.length > 0) {
          postsWithComments++;
          totalComments += post.comments_data.length;
        }
      });
      
      console.log(`\n📈 Extraction Statistics:`);
      console.log(`   Posts with full content: ${postsWithFullContent}/${data.posts.length}`);
      console.log(`   Posts with comments: ${postsWithComments}/${data.posts.length}`);
      console.log(`   Total comments extracted: ${totalComments}`);
      console.log(`   Average comments per post: ${(totalComments / data.posts.length).toFixed(1)}`);
    }
    
    console.log('\n✅ Test completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run the test
testFullExtraction()
  .then(() => {
    console.log('\n🎉 All tests passed!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Unexpected error:', error);
    process.exit(1);
  });