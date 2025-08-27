#!/usr/bin/env node

const HackerNewsScraper = require('./scraper');
const { formatAsJson, formatAsMarkdown } = require('./formatters');
const { findTrendingPosts } = require('./trending');

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage:');
    console.log('  Search: node index.js search <keyword> [format]');
    console.log('  Trending: node index.js trending [days] [format]');
    console.log('  Formats: json (default), markdown');
    process.exit(0);
  }

  const command = args[0];
  const scraper = new HackerNewsScraper();

  try {
    await scraper.init();

    if (command === 'search') {
      const keyword = args[1];
      if (!keyword) {
        console.error('Please provide a search keyword');
        process.exit(1);
      }
      
      const format = args[2] || 'json';
      console.log(`Searching HackerNews for: ${keyword}`);
      
      const results = await scraper.search(keyword);
      
      if (results.length === 0) {
        console.log('No results found');
      } else {
        const output = format === 'markdown' 
          ? formatAsMarkdown(results, keyword)
          : formatAsJson(results);
        
        console.log(output);
      }
      
    } else if (command === 'trending') {
      const days = parseInt(args[1]) || 2;
      const format = args[2] || 'json';
      
      console.log(`Finding trending posts from last ${days} days...`);
      
      const trendingPosts = await findTrendingPosts(scraper, days);
      
      const output = format === 'markdown'
        ? formatAsMarkdown(trendingPosts, `Trending (${days} days)`)
        : formatAsJson(trendingPosts);
        
      console.log(output);
      
    } else {
      console.error('Unknown command:', command);
      process.exit(1);
    }

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await scraper.close();
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };