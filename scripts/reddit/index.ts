#!/usr/bin/env node

import { RedditScraperV2 } from './reddit-scraper-v2';
import { program } from 'commander';
import * as fs from 'fs/promises';
import * as path from 'path';

program
  .name('reddit-scraper')
  .description('Scrape Reddit posts by keyword or get trending posts')
  .version('1.0.0');

program
  .command('search <keyword>')
  .description('Search Reddit for posts by keyword')
  .option('-m, --max <number>', 'Maximum number of posts to fetch', '10')
  .option('-f, --format <format>', 'Output format (json|markdown)', 'json')
  .option('-o, --output <file>', 'Output file path')
  .option('--no-headless', 'Run browser in non-headless mode')
  .action(async (keyword, options) => {
    const scraper = new RedditScraperV2();
    
    try {
      console.log(`🔍 Searching Reddit for: "${keyword}"`);
      await scraper.initialize(options.headless, true);
      
      const posts = await scraper.searchKeyword(keyword, {
        maxPosts: parseInt(options.max),
        outputFormat: options.format as 'json' | 'markdown'
      });
      
      console.log(`✅ Found ${posts.length} posts`);
      
      const output = scraper.formatOutput(posts, options.format as 'json' | 'markdown');
      
      if (options.output) {
        const outputPath = path.resolve(options.output);
        await fs.writeFile(outputPath, output);
        console.log(`📝 Results saved to: ${outputPath}`);
      } else {
        console.log('\n--- Results ---\n');
        console.log(output);
      }
      
      await scraper.close();
    } catch (error) {
      console.error('❌ Error:', error);
      await scraper.close();
      process.exit(1);
    }
  });

program
  .command('trending')
  .description('Get trending Reddit posts')
  .option('-d, --days <number>', 'Number of days to look back', '1')
  .option('-m, --max <number>', 'Maximum number of posts to fetch', '10')
  .option('-s, --min-score <number>', 'Minimum score for trending posts', '100')
  .option('-c, --min-comments <number>', 'Minimum comments for trending posts', '10')
  .option('-f, --format <format>', 'Output format (json|markdown)', 'json')
  .option('-o, --output <file>', 'Output file path')
  .option('--no-headless', 'Run browser in non-headless mode')
  .action(async (options) => {
    const scraper = new RedditScraperV2();
    
    try {
      console.log(`📈 Getting trending Reddit posts from the last ${options.days} day(s)`);
      await scraper.initialize(options.headless, true);
      
      const posts = await scraper.getTrendingPosts({
        days: parseInt(options.days),
        maxPosts: parseInt(options.max),
        minScore: parseInt(options.minScore),
        minComments: parseInt(options.minComments),
        outputFormat: options.format as 'json' | 'markdown'
      });
      
      console.log(`✅ Found ${posts.length} trending posts`);
      
      const output = scraper.formatOutput(posts, options.format as 'json' | 'markdown');
      
      if (options.output) {
        const outputPath = path.resolve(options.output);
        await fs.writeFile(outputPath, output);
        console.log(`📝 Results saved to: ${outputPath}`);
      } else {
        console.log('\n--- Results ---\n');
        console.log(output);
      }
      
      await scraper.close();
    } catch (error) {
      console.error('❌ Error:', error);
      await scraper.close();
      process.exit(1);
    }
  });

// Test command specifically for "buildpad" keyword
program
  .command('test')
  .description('Test the scraper with "buildpad" keyword')
  .option('--no-headless', 'Run browser in non-headless mode')
  .action(async (options) => {
    const scraper = new RedditScraperV2();
    
    try {
      console.log('🧪 Testing Reddit scraper with keyword: "buildpad"');
      await scraper.initialize(options.headless, true);
      
      const posts = await scraper.searchKeyword('buildpad', {
        maxPosts: 5,
        outputFormat: 'json'
      });
      
      if (posts.length === 0) {
        console.error('❌ Test FAILED: No results found for "buildpad"');
        console.log('Debugging: Trying with different search approach...');
        process.exit(1);
      } else {
        console.log(`✅ Test PASSED: Found ${posts.length} posts for "buildpad"`);
        console.log('\nSample results:');
        posts.slice(0, 2).forEach((post, i) => {
          console.log(`\n${i + 1}. ${post.title}`);
          console.log(`   Subreddit: ${post.subreddit}`);
          console.log(`   Score: ${post.score} | Comments: ${post.comments}`);
          console.log(`   URL: ${post.url}`);
        });
      }
      
      await scraper.close();
    } catch (error) {
      console.error('❌ Test error:', error);
      await scraper.close();
      process.exit(1);
    }
  });

program.parse(process.argv);

// If no command specified, show help
if (!process.argv.slice(2).length) {
  program.outputHelp();
}