#!/usr/bin/env node
import { Command } from 'commander';
import { RedditScraperEnhanced } from './reddit-scraper-enhanced';
import * as path from 'path';
const chalk = require('chalk');

const program = new Command();

program
  .name('reddit-scraper')
  .description('Reddit Content Scraper - Extract posts and comments from Reddit')
  .version('2.0.0');

// Keyword search command
program
  .command('search')
  .description('Search Reddit for posts containing a keyword')
  .option('--keyword <keyword>', 'Keyword to search for')
  .option('--format <format>', 'Output format (json|markdown)', 'json')
  .option('--limit <number>', 'Maximum number of posts', '25')
  .option('--with-comments', 'Fetch comments for each post')
  .option('--output <file>', 'Output file name (will be saved to report/reddit/)')
  .action(async (options) => {
    if (!options.keyword) {
      console.error(chalk.red('❌ Error: --keyword is required'));
      process.exit(1);
    }

    console.log(chalk.blue(`🔍 Searching Reddit for: "${options.keyword}"`));
    console.log(chalk.gray(`Format: ${options.format} | Limit: ${options.limit}`));
    
    const scraper = new RedditScraperEnhanced({ debug: false });
    
    try {
      await scraper.initialize();
      console.log(chalk.green('✓ Browser initialized'));
      
      const posts = await scraper.searchByKeyword(options.keyword, parseInt(options.limit));
      console.log(chalk.green(`✓ Found ${posts.length} posts`));
      
      // Fetch comments if requested
      if (options.withComments && posts.length > 0) {
        console.log(chalk.blue('💬 Fetching comments...'));
        const postsToFetchComments = posts.slice(0, 5); // Limit to first 5 posts
        for (const post of postsToFetchComments) {
          post.comments = await scraper.fetchComments(post.url, 5);
          console.log(chalk.gray(`  ✓ Fetched ${post.comments.length} comments for: ${post.title.substring(0, 50)}...`));
        }
      }
      
      // Format output
      let output: string;
      if (options.format === 'markdown') {
        output = scraper.formatAsMarkdown(posts, `Reddit Search: ${options.keyword}`);
      } else {
        output = scraper.formatAsJSON({
          posts,
          metadata: {
            searchTime: new Date().toISOString(),
            keyword: options.keyword,
            totalPosts: posts.length
          }
        });
      }
      
      // Save or display output
      if (options.output) {
        // Extract just the filename, removing any path components
        const baseFilename = path.basename(options.output);
        const filename = baseFilename.endsWith('.json') || baseFilename.endsWith('.md') 
          ? baseFilename 
          : `${baseFilename}.${options.format === 'markdown' ? 'md' : 'json'}`;
        
        const savedPath = await scraper.saveToFile(output, filename);
        console.log(chalk.green(`✅ Results saved to: ${savedPath}`));
      } else {
        console.log(output);
      }
      
      // Summary
      if (posts.length > 0) {
        console.log(chalk.cyan('\n📊 Summary:'));
        console.log(chalk.gray(`  - Total posts: ${posts.length}`));
        console.log(chalk.gray(`  - Top post: "${posts[0].title.substring(0, 50)}..." (${posts[0].score} upvotes)`));
      }
      
    } catch (error) {
      console.error(chalk.red('❌ Error during search:'), error);
      process.exit(1);
    } finally {
      await scraper.close();
    }
  });

// Trending posts command
program
  .command('trending')
  .description('Get trending posts from specified subreddits')
  .option('--days <number>', 'Time range in days (1, 7, or 30)', '1')
  .option('--subreddits <list>', 'Comma-separated list of subreddits')
  .option('--format <format>', 'Output format (json|markdown)', 'json')
  .option('--output <file>', 'Output file name (will be saved to report/reddit/)')
  .action(async (options) => {
    const subredditList = options.subreddits 
      ? options.subreddits.split(',').map((s: string) => s.trim())
      : ['programming', 'technology', 'startup', 'entrepreneur'];
    
    console.log(chalk.blue(`📈 Fetching trending posts from the last ${options.days} day(s)`));
    console.log(chalk.gray(`Subreddits: ${subredditList.join(', ')}`));
    
    const scraper = new RedditScraperEnhanced({ debug: false });
    
    try {
      await scraper.initialize();
      console.log(chalk.green('✓ Browser initialized'));
      
      const posts = await scraper.getTrendingPosts(subredditList, parseInt(options.days));
      console.log(chalk.green(`✓ Found ${posts.length} trending posts`));
      
      // Format output
      let output: string;
      if (options.format === 'markdown') {
        output = scraper.formatAsMarkdown(posts, `Trending Reddit Posts (${options.days} day${options.days > 1 ? 's' : ''})`);
      } else {
        output = scraper.formatAsJSON({
          posts,
          metadata: {
            searchTime: new Date().toISOString(),
            subreddits: subredditList,
            totalPosts: posts.length
          }
        });
      }
      
      // Save or display output
      if (options.output) {
        // Extract just the filename, removing any path components
        const baseFilename = path.basename(options.output);
        const filename = baseFilename.endsWith('.json') || baseFilename.endsWith('.md') 
          ? baseFilename 
          : `${baseFilename}.${options.format === 'markdown' ? 'md' : 'json'}`;
        
        const savedPath = await scraper.saveToFile(output, filename);
        console.log(chalk.green(`✅ Results saved to: ${savedPath}`));
      } else {
        console.log(output);
      }
      
      // Summary
      if (posts.length > 0) {
        const topPost = posts[0];
        console.log(chalk.cyan('\n📊 Summary:'));
        console.log(chalk.gray(`  - Total trending posts: ${posts.length}`));
        console.log(chalk.gray(`  - Top trending: "${topPost.title.substring(0, 50)}..." (Score: ${topPost.trending_score})`));
        console.log(chalk.gray(`  - From r/${topPost.subreddit} with ${topPost.score} upvotes and ${topPost.num_comments} comments`));
      }
      
    } catch (error) {
      console.error(chalk.red('❌ Error fetching trending posts:'), error);
      process.exit(1);
    } finally {
      await scraper.close();
    }
  });

// Batch subreddit mode
program
  .command('batch')
  .description('Fetch top posts from multiple subreddits')
  .option('--subreddits <list>', 'Comma-separated list of subreddits')
  .option('--limit <number>', 'Posts per subreddit', '10')
  .option('--format <format>', 'Output format (json|markdown)', 'json')
  .option('--output <file>', 'Output file name (will be saved to report/reddit/)')
  .action(async (options) => {
    if (!options.subreddits) {
      console.error(chalk.red('❌ Error: --subreddits is required'));
      process.exit(1);
    }

    const subredditList = options.subreddits.split(',').map((s: string) => s.trim());
    
    console.log(chalk.blue('📦 Starting batch fetch...'));
    console.log(chalk.gray(`Subreddits: ${subredditList.join(', ')}`));
    console.log(chalk.gray(`Posts per subreddit: ${options.limit}`));
    
    const scraper = new RedditScraperEnhanced({ debug: false });
    
    try {
      await scraper.initialize();
      console.log(chalk.green('✓ Browser initialized'));
      
      const result = await scraper.batchFetchSubreddits(subredditList, parseInt(options.limit));
      console.log(chalk.green(`✓ Fetched ${result.posts.length} posts from ${subredditList.length} subreddits`));
      
      // Format output
      let output: string;
      if (options.format === 'markdown') {
        output = scraper.formatAsMarkdown(result, 'Reddit Batch Fetch Results');
      } else {
        output = scraper.formatAsJSON(result);
      }
      
      // Save or display output
      if (options.output) {
        // Extract just the filename, removing any path components
        const baseFilename = path.basename(options.output);
        const filename = baseFilename.endsWith('.json') || baseFilename.endsWith('.md') 
          ? baseFilename 
          : `${baseFilename}.${options.format === 'markdown' ? 'md' : 'json'}`;
        
        const savedPath = await scraper.saveToFile(output, filename);
        console.log(chalk.green(`✅ Results saved to: ${savedPath}`));
      } else {
        console.log(output);
      }
      
      // Summary by subreddit
      console.log(chalk.cyan('\n📊 Summary by subreddit:'));
      for (const subreddit of subredditList) {
        const subPosts = result.posts.filter(p => p.subreddit === subreddit);
        if (subPosts.length > 0) {
          const avgScore = Math.round(subPosts.reduce((sum, p) => sum + p.score, 0) / subPosts.length);
          console.log(chalk.gray(`  - r/${subreddit}: ${subPosts.length} posts (avg score: ${avgScore})`));
        }
      }
      
    } catch (error) {
      console.error(chalk.red('❌ Error during batch fetch:'), error);
      process.exit(1);
    } finally {
      await scraper.close();
    }
  });

// Test command for quick validation
program
  .command('test')
  .description('Test the scraper with sample keyword "buildpad"')
  .action(async () => {
    console.log(chalk.blue('🧪 Testing Reddit scraper with keyword: "buildpad"'));
    
    const scraper = new RedditScraperEnhanced({ debug: true });
    
    try {
      await scraper.initialize();
      console.log(chalk.green('✓ Browser initialized'));
      
      // Test search
      console.log(chalk.yellow('\nTest 1: Keyword Search'));
      const searchPosts = await scraper.searchByKeyword('buildpad', 5);
      
      if (searchPosts.length === 0) {
        console.log(chalk.yellow('⚠️ No results for "buildpad", trying "startup"...'));
        const altPosts = await scraper.searchByKeyword('startup', 5);
        console.log(chalk.green(`✓ Found ${altPosts.length} posts for "startup"`));
      } else {
        console.log(chalk.green(`✓ Found ${searchPosts.length} posts for "buildpad"`));
        console.log(chalk.gray(`  Sample: "${searchPosts[0]?.title?.substring(0, 50)}..."`));
      }
      
      // Test trending
      console.log(chalk.yellow('\nTest 2: Trending Posts'));
      const trendingPosts = await scraper.getTrendingPosts(['programming', 'technology'], 1);
      console.log(chalk.green(`✓ Found ${trendingPosts.length} trending posts`));
      if (trendingPosts.length > 0) {
        console.log(chalk.gray(`  Top trending: "${trendingPosts[0].title.substring(0, 50)}..." (Score: ${trendingPosts[0].trending_score})`));
      }
      
      // Test batch
      console.log(chalk.yellow('\nTest 3: Batch Fetch'));
      const batchResult = await scraper.batchFetchSubreddits(['startup', 'entrepreneur'], 3);
      console.log(chalk.green(`✓ Batch fetched ${batchResult.posts.length} posts`));
      
      // Save test results
      const testOutput = {
        testTime: new Date().toISOString(),
        searchTest: searchPosts.length,
        trendingTest: trendingPosts.length,
        batchTest: batchResult.posts.length,
        success: true
      };
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const testPath = await scraper.saveToFile(
        JSON.stringify(testOutput, null, 2),
        `test-results-${timestamp}.json`
      );
      
      console.log(chalk.green(`\n✅ All tests completed! Results saved to: ${testPath}`));
      
    } catch (error) {
      console.error(chalk.red('❌ Test failed:'), error);
      process.exit(1);
    } finally {
      await scraper.close();
    }
  });

program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}