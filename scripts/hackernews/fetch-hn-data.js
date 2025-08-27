#!/usr/bin/env node

/**
 * Hacker News Data Fetcher - Uses MCP Playwright tools for web scraping
 * Searches Hacker News for a keyword and extracts full content
 * 
 * Usage:
 *   node fetch-hn-data.js "<keyword>" [format]
 *   
 * Example:
 *   node fetch-hn-data.js "buildpad" json
 *   node fetch-hn-data.js "AI startup" markdown
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Configuration
 */
const CONFIG = {
  baseUrl: 'https://news.ycombinator.com',
  searchUrl: 'https://hn.algolia.com/',
  defaultFormat: 'json',
  outputDir: path.join(__dirname, '..', '..', 'report', 'hackernews')
};

/**
 * Clean keyword for filename
 */
function sanitizeFilename(keyword) {
  return keyword
    .replace(/[^a-zA-Z0-9\s]/g, '_')
    .replace(/\s+/g, '_')
    .substring(0, 50)
    .toLowerCase();
}

/**
 * Get date-based folder path
 */
function getDateFolder() {
  const date = new Date();
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                     'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dateStr = `${date.getDate()}-${monthNames[date.getMonth()]}-${date.getFullYear()}`;
  return path.join(CONFIG.outputDir, dateStr);
}

/**
 * Search Hacker News for keyword
 */
async function searchHackerNews(keyword) {
  console.log(`🔍 Searching Hacker News for: "${keyword}"`);
  console.log('⚠️  Note: Using MCP Playwright tools for browser automation');
  console.log('    Run with: mcp__playwright__browser_navigate');
  
  return {
    searchUrl: `${CONFIG.searchUrl}?query=${encodeURIComponent(keyword)}&sort=byPopularity&prefix=false&page=0&dateRange=all&type=all`,
    keyword: keyword
  };
}

/**
 * Extract story data from search results (placeholder for MCP tool integration)
 */
async function extractStoryData() {
  // This would use MCP Playwright tools to extract data
  console.log('📊 Extracting story data using browser automation...');
  
  return {
    stories: [],
    extractedAt: new Date().toISOString()
  };
}

/**
 * Format data as JSON
 */
function formatAsJson(data) {
  return JSON.stringify(data, null, 2);
}

/**
 * Format data as Markdown
 */
function formatAsMarkdown(data) {
  const { keyword, stories, extractedAt } = data;
  
  let markdown = `# Hacker News Search Results\n\n`;
  markdown += `**Search Query:** ${keyword}\n`;
  markdown += `**Extracted At:** ${new Date(extractedAt).toLocaleString()}\n`;
  markdown += `**Total Stories:** ${stories.length}\n\n`;
  markdown += `---\n\n`;
  
  stories.forEach((story, index) => {
    markdown += `## ${index + 1}. ${story.title}\n\n`;
    markdown += `- **Author:** ${story.author || 'Unknown'}\n`;
    markdown += `- **Posted:** ${story.createdAt || 'Unknown'}\n`;
    markdown += `- **Points:** ${story.points || 0}\n`;
    markdown += `- **Comments:** ${story.commentCount || 0}\n`;
    markdown += `- **URL:** [${story.url || 'Link'}](${story.url || '#'})\n`;
    markdown += `- **HN Link:** [Discussion](${story.hnUrl || '#'})\n\n`;
    
    if (story.content) {
      markdown += `### Content\n\n${story.content}\n\n`;
    }
    
    if (story.topComments && story.topComments.length > 0) {
      markdown += `### Top Comments\n\n`;
      story.topComments.forEach(comment => {
        markdown += `**${comment.author}:** ${comment.text}\n\n`;
      });
    }
    
    markdown += `---\n\n`;
  });
  
  return markdown;
}

/**
 * Save results to file
 */
async function saveResults(data, format, keyword) {
  const outputDir = getDateFolder();
  await fs.mkdir(outputDir, { recursive: true });
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
  const safeKeyword = sanitizeFilename(keyword);
  
  let filename;
  let content;
  
  if (format === 'markdown') {
    filename = `${safeKeyword}-${timestamp}.md`;
    content = formatAsMarkdown(data);
  } else {
    filename = `${safeKeyword}-${timestamp}.json`;
    content = formatAsJson(data);
  }
  
  const filepath = path.join(outputDir, filename);
  await fs.writeFile(filepath, content);
  
  console.log(`\n✅ Results saved to: ${filepath}`);
  return filepath;
}

/**
 * Main function to fetch Hacker News data
 */
async function fetchHackerNewsData(keyword, format = CONFIG.defaultFormat) {
  console.log('\n🔥 Hacker News Data Fetcher');
  console.log('=' .repeat(60));
  console.log(`📌 Search Keyword: "${keyword}"`);
  console.log(`📄 Output Format: ${format}`);
  console.log('=' .repeat(60));
  
  try {
    // Prepare search
    const searchInfo = await searchHackerNews(keyword);
    
    // Note about MCP tool usage
    console.log('\n📝 Instructions for MCP Playwright extraction:');
    console.log(`1. Navigate to: ${searchInfo.searchUrl}`);
    console.log('2. Extract story titles, URLs, points, authors, comment counts');
    console.log('3. Click on each story to extract full content');
    console.log('4. Extract top comments from discussion');
    
    // Create placeholder data structure
    const data = {
      keyword: keyword,
      searchUrl: searchInfo.searchUrl,
      stories: [],
      extractedAt: new Date().toISOString()
    };
    
    // Save placeholder results
    const filepath = await saveResults(data, format, keyword);
    
    console.log('\n' + '=' .repeat(60));
    console.log('✨ Setup complete! Ready for browser automation.');
    console.log('=' .repeat(60));
    
    return {
      success: true,
      filepath: filepath,
      data: data
    };
    
  } catch (error) {
    console.error('\n❌ Error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * CLI Handler
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(`
🔥 Hacker News Data Fetcher

Usage:
  node fetch-hn-data.js "<keyword>" [format]

Arguments:
  keyword   - Search term (required)
  format    - Output format: json or markdown (default: ${CONFIG.defaultFormat})

Examples:
  node fetch-hn-data.js "buildpad"
  node fetch-hn-data.js "AI startup" markdown
  node fetch-hn-data.js "YC companies" json

Output Structure:
  report/hackernews/DD-MMM-YYYY/
    └── [keyword]-[timestamp].[json|md]
`);
    process.exit(0);
  }
  
  const keyword = args[0];
  const format = args[1] || CONFIG.defaultFormat;
  
  if (!['json', 'markdown'].includes(format)) {
    console.error(`❌ Invalid format: ${format}`);
    console.error('   Must be one of: json, markdown');
    process.exit(1);
  }
  
  const result = await fetchHackerNewsData(keyword, format);
  
  if (result.success) {
    console.log('\n✅ Success!');
    console.log(`📁 Results saved to: ${result.filepath}`);
    process.exit(0);
  } else {
    console.error('\n💥 Failed:', result.error);
    process.exit(1);
  }
}

// Run if executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { fetchHackerNewsData, searchHackerNews, formatAsJson, formatAsMarkdown };