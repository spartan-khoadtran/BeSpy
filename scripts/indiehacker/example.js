#!/usr/bin/env node

/**
 * Example usage of IndieHackers Scraper
 * Demonstrates how to use the scraper programmatically
 */

import IndieHackersScraper from './scraper.js';
import { config } from './config.js';

async function runExample() {
  try {
    console.log('🚀 IndieHackers Scraper Example\n');

    // Example 1: Quick scrape of main feed
    console.log('📋 Example 1: Quick scrape of main feed (5 posts)');
    const scraper1 = new IndieHackersScraper({
      browser: { headless: true }
    });

    const quickResult = await scraper1.scrape('main', {
      postsPerCategory: 5
    });

    if (quickResult.success) {
      console.log(`✅ Found ${quickResult.posts.length} posts from main feed`);
      
      if (quickResult.posts.length > 0) {
        const topPost = quickResult.posts[0];
        console.log(`🔝 Top post: "${topPost.title}"`);
        console.log(`   By: @${topPost.author.username}`);
        console.log(`   Engagement: ${topPost.engagement.comments} comments, ${topPost.engagement.upvotes} upvotes`);
        console.log(`   Score: ${topPost.engagementScore}`);
      }
    } else {
      console.log('❌ Quick scrape failed');
    }

    console.log('\n' + '='.repeat(60) + '\n');

    // Example 2: Scrape specific categories
    console.log('📋 Example 2: Scrape Tech and AI categories (3 posts each)');
    const scraper2 = new IndieHackersScraper({
      browser: { headless: true }
    });

    const categoryResult = await scraper2.scrape(['tech', 'ai'], {
      postsPerCategory: 3
    });

    if (categoryResult.success) {
      console.log(`✅ Found ${categoryResult.posts.length} posts from tech and AI categories`);
      
      // Group posts by category
      const byCategory = categoryResult.posts.reduce((acc, post) => {
        if (!acc[post.category.key]) acc[post.category.key] = [];
        acc[post.category.key].push(post);
        return acc;
      }, {});

      Object.entries(byCategory).forEach(([category, posts]) => {
        console.log(`\n💻 ${config.categories[category]?.name || category}: ${posts.length} posts`);
        posts.slice(0, 2).forEach((post, index) => {
          console.log(`   ${index + 1}. ${post.title.substring(0, 50)}...`);
          console.log(`      Score: ${post.engagementScore}`);
        });
      });
    } else {
      console.log('❌ Category scrape failed');
    }

    console.log('\n' + '='.repeat(60) + '\n');

    // Example 3: Full scrape with report generation
    console.log('📋 Example 3: Full scrape with report generation (2 posts per category)');
    const scraper3 = new IndieHackersScraper({
      browser: { headless: true }
    });

    const fullResult = await scraper3.scrapeAndReport(['starting-up', 'money'], {
      postsPerCategory: 2,
      date: new Date()
    });

    console.log(`✅ Full workflow completed!`);
    console.log(`   Total posts analyzed: ${fullResult.totalPosts}`);
    console.log(`   Report saved to: ${fullResult.reportPath}`);
    
    if (fullResult.dataPath) {
      console.log(`   Raw data saved to: ${fullResult.dataPath}`);
    }
    
    console.log(`   Duration: ${fullResult.scrapingStats.duration}s`);

  } catch (error) {
    console.error('❌ Example failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the example if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runExample();
}

export { runExample };