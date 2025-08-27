#!/usr/bin/env node

/**
 * Twitter extraction script using MCP Playwright
 * Saves reports to date-based folders: report/twitter/DD-MMM-YYYY/
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Get date-based folder path for Twitter reports
 */
function getDateFolder() {
  const date = new Date();
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                     'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dateStr = `${date.getDate()}-${monthNames[date.getMonth()]}-${date.getFullYear()}`;
  return path.join(__dirname, '..', '..', 'report', 'twitter', dateStr);
}

/**
 * Generate markdown report from Twitter data
 */
function generateMarkdownReport(data, keyword) {
  const now = new Date();
  let markdown = `# Twitter Report: ${keyword}

**Generated:** ${now.toLocaleString()}  
**Total Posts:** ${data.posts?.length || 0}  
**Search Type:** ${data.sortBy || 'latest'}  

## Summary Statistics

- **Total Likes:** ${data.totalLikes || 0}
- **Total Retweets:** ${data.totalRetweets || 0}
- **Total Impressions:** ${data.totalImpressions || 0}
- **Average Engagement:** ${data.averageEngagement || '0'}%

---

## Posts

`;

  if (data.posts && data.posts.length > 0) {
    data.posts.forEach((post, index) => {
      markdown += `### ${index + 1}. ${post.author || 'Unknown'} (@${post.authorHandle || 'unknown'})

**Posted:** ${post.timestamp || 'N/A'}  
**Link:** [View on Twitter](${post.url || '#'})  

**Content:**
\`\`\`
${post.text || ''}
\`\`\`

**Engagement Metrics:**
- 👁️ Impressions: ${post.impressions || 0}
- ❤️ Likes: ${post.likes || 0}
- 🔁 Retweets: ${post.retweets || 0}
- 💬 Replies: ${post.replies || 0}

`;

      if (post.hashtags && post.hashtags.length > 0) {
        markdown += `**Hashtags:** ${post.hashtags.map(h => `#${h}`).join(', ')}  \n`;
      }

      if (post.mentions && post.mentions.length > 0) {
        markdown += `**Mentions:** ${post.mentions.map(m => `@${m}`).join(', ')}  \n`;
      }

      markdown += `\n---\n\n`;
    });
  } else {
    markdown += `*No posts found for the search term "${keyword}"*\n`;
  }

  return markdown;
}

/**
 * Generate CSV report from Twitter data
 */
function generateCSVReport(data) {
  const headers = [
    'Index',
    'Author',
    'Handle',
    'Timestamp',
    'Text',
    'URL',
    'Likes',
    'Retweets',
    'Impressions',
    'Replies',
    'Hashtags',
    'Mentions'
  ];

  let csv = headers.join(',') + '\n';

  if (data.posts && data.posts.length > 0) {
    data.posts.forEach((post, index) => {
      const row = [
        index + 1,
        `"${(post.author || '').replace(/"/g, '""')}"`,
        post.authorHandle || '',
        post.timestamp || '',
        `"${(post.text || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`,
        post.url || '',
        post.likes || 0,
        post.retweets || 0,
        post.impressions || 0,
        post.replies || 0,
        `"${(post.hashtags || []).join(', ')}"`,
        `"${(post.mentions || []).join(', ')}"`
      ];
      csv += row.join(',') + '\n';
    });
  }

  return csv;
}

/**
 * Extract tweets for a keyword
 */
async function extractTweets(keyword, maxPosts = 20, sortBy = 'latest') {
  console.log('🐦 Twitter Extraction Script');
  console.log('=' .repeat(50));
  console.log(`📌 Keyword: ${keyword}`);
  console.log(`📊 Max Posts: ${maxPosts}`);
  console.log(`🔄 Sort By: ${sortBy}`);
  console.log('=' .repeat(50));

  try {
    // Note: This is a placeholder for the actual MCP Playwright integration
    // In production, this would use the mcp__playwright__twitter_fetch_and_report tool
    // For now, we'll create a mock structure
    
    console.log('\n⚠️  Note: This script requires MCP Playwright tools to be available.');
    console.log('Please use the mcp__playwright__twitter_fetch_and_report tool directly in Claude Code.\n');

    // Create output directory
    const outputDir = getDateFolder();
    await fs.mkdir(outputDir, { recursive: true });
    console.log(`📁 Output directory: ${outputDir}`);

    // Generate timestamp for filenames
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    const safeKeyword = keyword.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);

    // Example data structure (would be populated from actual Twitter fetch)
    const mockData = {
      keyword,
      sortBy,
      maxPosts,
      posts: [],
      totalLikes: 0,
      totalRetweets: 0,
      totalImpressions: 0,
      averageEngagement: '0.00',
      extractedAt: new Date().toISOString()
    };

    // Save JSON data
    const jsonPath = path.join(outputDir, `${safeKeyword}-data-${timestamp}.json`);
    await fs.writeFile(jsonPath, JSON.stringify(mockData, null, 2));
    console.log(`✅ JSON saved: ${jsonPath}`);

    // Save Markdown report
    const markdownReport = generateMarkdownReport(mockData, keyword);
    const mdPath = path.join(outputDir, `${safeKeyword}-report-${timestamp}.md`);
    await fs.writeFile(mdPath, markdownReport);
    console.log(`✅ Markdown saved: ${mdPath}`);

    // Save CSV report
    const csvReport = generateCSVReport(mockData);
    const csvPath = path.join(outputDir, `${safeKeyword}-data-${timestamp}.csv`);
    await fs.writeFile(csvPath, csvReport);
    console.log(`✅ CSV saved: ${csvPath}`);

    // Create summary
    const summaryPath = path.join(outputDir, 'summary.md');
    const summaryContent = `# Twitter Extraction Summary

**Date:** ${new Date().toLocaleString()}

## Recent Extractions

### ${keyword}
- **Time:** ${new Date().toLocaleTimeString()}
- **Posts Found:** ${mockData.posts.length}
- **Sort Method:** ${sortBy}
- **Files Generated:**
  - JSON: ${path.basename(jsonPath)}
  - Markdown: ${path.basename(mdPath)}
  - CSV: ${path.basename(csvPath)}

---
`;

    // Append to summary or create new
    try {
      const existingSummary = await fs.readFile(summaryPath, 'utf-8');
      await fs.writeFile(summaryPath, existingSummary + '\n' + summaryContent);
    } catch {
      await fs.writeFile(summaryPath, summaryContent);
    }
    console.log(`📝 Summary updated: ${summaryPath}`);

    console.log('\n' + '='.repeat(50));
    console.log('✨ Extraction setup complete!');
    console.log('='.repeat(50));
    console.log('\n📌 To fetch actual Twitter data, use:');
    console.log('   mcp__playwright__twitter_fetch_and_report tool in Claude Code');
    console.log(`   with keyword: "${keyword}"`);
    console.log(`   and maxPosts: ${maxPosts}`);
    console.log(`\n📁 Reports will be saved to: ${outputDir}`);

    return mockData;

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

/**
 * CLI execution
 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const keyword = process.argv[2] || 'buildpad.io OR buildpad';
  const maxPosts = parseInt(process.argv[3]) || 20;
  const sortBy = process.argv[4] || 'latest';

  if (!keyword) {
    console.log('Usage: node extract-tweets.js "<keyword>" [maxPosts] [sortBy]');
    console.log('Example: node extract-tweets.js "buildpad.io OR buildpad" 20 latest');
    process.exit(1);
  }

  extractTweets(keyword, maxPosts, sortBy)
    .then(() => {
      console.log('\n✅ Done!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Failed:', error);
      process.exit(1);
    });
}

export { extractTweets, getDateFolder, generateMarkdownReport, generateCSVReport };