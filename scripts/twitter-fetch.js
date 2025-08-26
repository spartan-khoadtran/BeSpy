#!/usr/bin/env node

/**
 * Twitter Data Fetch CLI
 * Usage: node scripts/twitter-fetch.js "keyword" [maxPosts] [format]
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Parse command line arguments
const keyword = process.argv[2];
const maxPosts = parseInt(process.argv[3]) || 10;
const format = process.argv[4] || 'both';

if (!keyword) {
  console.error('Usage: node twitter-fetch.js "keyword" [maxPosts] [format]');
  console.error('  keyword: Search term (required)');
  console.error('  maxPosts: Number of posts to fetch (default: 10)');
  console.error('  format: Report format - markdown, csv, or both (default: both)');
  process.exit(1);
}

console.log(`Fetching Twitter data for keyword: "${keyword}"`);
console.log(`Maximum posts: ${maxPosts}`);
console.log(`Report format: ${format}`);

// Start MCP server
const mcpServerPath = join(__dirname, '..', 'playwright-mcp-bespy', 'cli.js');
const mcpServer = spawn('node', [mcpServerPath], {
  stdio: 'inherit',
  env: {
    ...process.env,
    DEBUG: 'pw:mcp:*'
  }
});

mcpServer.on('error', (error) => {
  console.error('Failed to start MCP server:', error);
  process.exit(1);
});

mcpServer.on('close', (code) => {
  console.log(`MCP server exited with code ${code}`);
});

// Handle cleanup
process.on('SIGINT', () => {
  mcpServer.kill();
  process.exit(0);
});

console.log('\nMCP server started. You can now use Claude to interact with the Twitter tools.');
console.log('\nExample commands in Claude:');
console.log('  1. Use the "twitter_fetch_and_report" tool with:');
console.log(`     - keyword: "${keyword}"`);
console.log(`     - maxPosts: ${maxPosts}`);
console.log(`     - format: "${format}"`);
console.log('\n  OR step by step:');
console.log('  1. Use "twitter_search" to search for the keyword');
console.log('  2. Use "twitter_fetch_posts" to extract post data');
console.log('  3. Use "twitter_generate_report" to create the report');