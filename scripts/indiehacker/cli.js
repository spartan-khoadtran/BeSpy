#!/usr/bin/env node

/**
 * IndieHackers Scraper CLI
 * Command-line interface for running the scraper
 */

import { Command } from 'commander';
import IndieHackersScraper from './scraper.js';
import { config } from './config.js';

const program = new Command();

program
  .name('indie-hackers-scraper')
  .description('IndieHackers Analytics Scraper - Extract and analyze content from IndieHackers.com')
  .version('1.0.0');

// Main scrape command
program
  .command('scrape')
  .description('Scrape IndieHackers posts from specified categories')
  .option('-c, --categories <categories>', 'Categories to scrape (comma-separated or "all")', 'all')
  .option('-n, --posts <number>', 'Number of posts per category', config.scraping.defaultPostsPerCategory.toString())
  .option('-o, --output <path>', 'Output directory for reports', config.reporting.outputDir)
  .option('-d, --date <date>', 'Target date (YYYY-MM-DD)', new Date().toISOString().split('T')[0])
  .option('--headless <boolean>', 'Run browser in headless mode', 'true')
  .option('--verbose', 'Enable verbose logging')
  .option('--dry-run', 'Run scraper without generating report')
  .action(async (options) => {
    try {
      console.log('🚀 Starting IndieHackers scraper...\n');
      
      // Parse options
      const scraperOptions = {
        postsPerCategory: parseInt(options.posts),
        date: new Date(options.date),
        browser: {
          headless: options.headless === 'true'
        }
      };
      
      if (options.verbose) {
        config.debug.enabled = true;
        config.debug.verbose = true;
      }
      
      // Initialize scraper
      const scraper = new IndieHackersScraper(scraperOptions);
      
      if (options.dryRun) {
        console.log('🧪 Dry run mode - scraping only, no report generation\n');
        const result = await scraper.scrape(options.categories, scraperOptions);
        
        console.log('\n📊 Scraping Results:');
        console.log(`   Total posts: ${result.posts.length}`);
        console.log(`   Categories processed: ${result.stats.categoriesProcessed}`);
        console.log(`   Duration: ${result.stats.duration}s`);
        console.log(`   Posts per second: ${result.stats.postsPerSecond}`);
        
        if (result.stats.errors.length > 0) {
          console.log('\n⚠️ Errors encountered:');
          result.stats.errors.forEach(error => {
            console.log(`   ${error.category || 'General'}: ${error.error || error.general}`);
          });
        }
      } else {
        // Full scrape and report workflow
        const result = await scraper.scrapeAndReport(options.categories, scraperOptions);
        
        console.log('\n🎉 Scraping and report generation completed!');
        console.log(`   Report saved: ${result.reportPath}`);
        console.log(`   Total posts analyzed: ${result.totalPosts}`);
        console.log(`   Duration: ${result.scrapingStats.duration}s`);
        
        if (result.dataPath) {
          console.log(`   Raw data saved: ${result.dataPath}`);
        }
      }
      
    } catch (error) {
      console.error('❌ Scraping failed:', error.message);
      process.exit(1);
    }
  });

// List categories command
program
  .command('categories')
  .description('List available categories to scrape')
  .action(() => {
    console.log('📋 Available IndieHackers Categories:\n');
    
    Object.entries(config.categories).forEach(([key, category]) => {
      console.log(`   ${key.padEnd(12)} - ${category.name}`);
      console.log(`   ${''.padEnd(12)}   ${category.description}`);
      console.log(`   ${''.padEnd(12)}   ${category.url}\n`);
    });
    
    console.log('Usage examples:');
    console.log('   npm run scrape:indie -- --categories all');
    console.log('   npm run scrape:indie -- --categories starting-up,tech,ai');
    console.log('   npm run scrape:indie -- --categories money --posts 100');
  });

// Config command
program
  .command('config')
  .description('Show current configuration')
  .action(() => {
    console.log('⚙️ Current Configuration:\n');
    
    console.log('📝 Scraping Settings:');
    console.log(`   Default posts per category: ${config.scraping.defaultPostsPerCategory}`);
    console.log(`   Max posts per category: ${config.scraping.maxPostsPerCategory}`);
    console.log(`   Page timeout: ${config.scraping.pageTimeout}ms`);
    console.log(`   Request delay: ${config.scraping.requestDelay}ms`);
    console.log(`   Headless mode: ${config.scraping.browser.headless}`);
    
    console.log('\n📊 Engagement Scoring:');
    console.log(`   Comments weight: ${config.scoring.weights.comments}`);
    console.log(`   Upvotes weight: ${config.scoring.weights.upvotes}`);
    console.log(`   Recency weight: ${config.scoring.weights.recency}`);
    console.log(`   Min engagement threshold: ${config.scoring.minEngagement}`);
    
    console.log('\n📝 Report Generation:');
    console.log(`   Output directory: ${config.reporting.outputDir}`);
    console.log(`   Top posts limit: ${config.reporting.topPostsLimit}`);
    console.log(`   Posts per category limit: ${config.reporting.postsPerCategoryLimit}`);
    console.log(`   Include raw data backup: ${config.reporting.includeRawDataBackup}`);
    
    console.log('\n🐛 Debug Settings:');
    console.log(`   Debug enabled: ${config.debug.enabled}`);
    console.log(`   Verbose logging: ${config.debug.verbose}`);
    console.log(`   Save screenshots: ${config.debug.saveScreenshots}`);
  });

// Test category command (for debugging)
program
  .command('test-category <category>')
  .description('Test scraping a single category (for debugging)')
  .option('--posts <number>', 'Number of posts to scrape', '10')
  .option('--headless <boolean>', 'Run in headless mode', 'false')
  .action(async (category, options) => {
    try {
      if (!config.categories[category]) {
        console.error(`❌ Unknown category: ${category}`);
        console.log('\n📋 Available categories:');
        Object.keys(config.categories).forEach(key => {
          console.log(`   ${key}`);
        });
        process.exit(1);
      }
      
      console.log(`🧪 Testing category: ${category}\n`);
      
      const scraperOptions = {
        postsPerCategory: parseInt(options.posts),
        browser: {
          headless: options.headless === 'true'
        }
      };
      
      // Enable debug mode for testing
      config.debug.enabled = true;
      config.debug.verbose = true;
      config.debug.saveScreenshots = true;
      
      const scraper = new IndieHackersScraper(scraperOptions);
      const result = await scraper.scrape([category], scraperOptions);
      
      console.log('\n📊 Test Results:');
      console.log(`   Posts found: ${result.posts.length}`);
      console.log(`   Duration: ${result.stats.duration}s`);
      
      if (result.posts.length > 0) {
        console.log('\n🔝 Sample posts:');
        result.posts.slice(0, 3).forEach((post, index) => {
          console.log(`   ${index + 1}. ${post.title}`);
          console.log(`      Author: ${post.author.username}`);
          console.log(`      Engagement: ${post.engagement.comments} comments, ${post.engagement.upvotes} upvotes`);
          console.log(`      Score: ${post.engagementScore}`);
        });
      }
      
    } catch (error) {
      console.error('❌ Test failed:', error.message);
      process.exit(1);
    }
  });

// Quick run command
program
  .command('quick')
  .description('Quick scrape with default settings (main feed only)')
  .option('--posts <number>', 'Number of posts to scrape', '20')
  .action(async (options) => {
    try {
      console.log('⚡ Quick scrape - main feed only\n');
      
      const scraperOptions = {
        postsPerCategory: parseInt(options.posts),
        browser: {
          headless: true
        }
      };
      
      const scraper = new IndieHackersScraper(scraperOptions);
      const result = await scraper.scrapeAndReport('main', scraperOptions);
      
      console.log('\n⚡ Quick scrape completed!');
      console.log(`   Posts analyzed: ${result.totalPosts}`);
      console.log(`   Report: ${result.reportPath}`);
      
    } catch (error) {
      console.error('❌ Quick scrape failed:', error.message);
      process.exit(1);
    }
  });

// Status command
program
  .command('status')
  .description('Check system status and requirements')
  .action(async () => {
    console.log('🔍 System Status Check\n');
    
    // Check Node.js version
    const nodeVersion = process.version;
    console.log(`✅ Node.js version: ${nodeVersion}`);
    
    // Check if Playwright is available
    try {
      const { chromium } = await import('playwright');
      console.log('✅ Playwright available');
      
      // Try to launch browser briefly
      const browser = await chromium.launch({ headless: true });
      await browser.close();
      console.log('✅ Browser launch successful');
      
    } catch (error) {
      console.log('❌ Playwright not available:', error.message);
      console.log('   Run: npm install playwright');
    }
    
    // Check output directory
    try {
      const fs = await import('fs/promises');
      await fs.access(config.reporting.outputDir);
      console.log(`✅ Output directory accessible: ${config.reporting.outputDir}`);
    } catch (error) {
      console.log(`⚠️  Output directory not found: ${config.reporting.outputDir}`);
      console.log('   It will be created automatically when running scraper');
    }
    
    console.log('\n🎯 Ready to scrape IndieHackers!');
  });

// Handle unknown commands
program.on('command:*', () => {
  console.error('❌ Invalid command: %s\n', program.args.join(' '));
  program.help();
});

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.help();
}

program.parse(process.argv);