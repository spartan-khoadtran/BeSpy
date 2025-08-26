# Twitter Data Fetcher with Claude CLI & Playwright MCP

## 📋 Overview

This system enables automated Twitter data collection using Claude CLI with Playwright MCP integration. It can:
- Search Twitter for any keyword
- Fetch the 10 latest posts
- Extract detailed post information (text, author, engagement metrics)
- Generate reports in Markdown and CSV formats

## 🚀 Quick Start

### Method 1: Using Claude CLI with MCP Tools

When using Claude CLI, the MCP tools are already available. Simply ask Claude to:

```
claude "Fetch 10 latest Twitter posts about AI technology and generate a report"
```

Claude will automatically use the MCP tools:
- `twitter_search` - Navigate and search Twitter
- `twitter_fetch_posts` - Extract post data
- `twitter_generate_report` - Create reports

### Method 2: Direct Script Execution

```bash
# 1. Navigate to project directory
cd bespy-playwright

# 2. Install dependencies
npm install

# 3. Run the Twitter fetcher
node scripts/fetch-twitter-data.mjs "AI technology"
```

## 📂 Project Structure

```
bespy-playwright/
├── playwright-mcp-bespy/
│   ├── browser-data/       # Persistent browser profile (maintains login)
│   ├── lib/
│   │   ├── tools/
│   │   │   └── twitter.js  # MCP Twitter tools implementation
│   │   └── utils/
│   │       └── reportGenerator.js  # Report generation logic
├── scripts/
│   ├── fetch-twitter-data.mjs     # Main integration script
│   └── test-mcp-twitter.mjs       # Testing script
├── report/                         # Generated reports directory
│   ├── twitter_*.md               # Markdown reports
│   ├── twitter_*.csv              # CSV reports
│   ├── latest.md                  # Most recent report (markdown)
│   └── latest.csv                 # Most recent report (CSV)
└── docs/
    └── TWITTER_USAGE.md           # This file

```

## 🔧 Configuration

### First-Time Setup

1. **Browser Login Session**
   - The first time you run the tool, a browser window will open
   - Log in to Twitter/X manually
   - The session is saved in `playwright-mcp-bespy/browser-data/`
   - Future runs will use this saved session

2. **MCP Server (if using MCP tools directly)**
   ```bash
   # Start the MCP server
   npx playwright-mcp-bespy
   ```

## 🎯 Usage Examples

### Example 1: Search for AI Technology
```bash
node scripts/fetch-twitter-data.mjs "AI technology"
```

Output:
```
🐦 Twitter Data Fetcher - MCP Integration
=========================================

🔍 Searching for: "AI technology"
📊 Fetching 10 latest posts
📁 Reports will be saved to: report/

🌐 Launching browser with persistent session...
✅ Browser launched successfully

📍 Navigating to Twitter search...
✅ Successfully navigated to search results

📝 Extracting tweet data...
✅ Extracted 10 tweets

📊 Summary Statistics:
  - Total Posts: 10
  - Total Likes: 156
  - Total Retweets: 42
  - Est. Impressions: 15,420

📝 Markdown report saved: report/twitter-ai_technology-2025-08-26T10-30-00.md
📊 CSV report saved: report/twitter-ai_technology-2025-08-26T10-30-00.csv

✅ Reports generated successfully!
📁 Check the report/ folder for your data
```

### Example 2: Using Claude CLI

```bash
claude

> Fetch Twitter posts about "machine learning" and create a report
```

Claude will:
1. Use `mcp__playwright__twitter_search` to search Twitter
2. Use `mcp__playwright__twitter_fetch_posts` to extract data
3. Use `mcp__playwright__twitter_generate_report` to create reports

### Example 3: Complete Workflow with MCP

```javascript
// The MCP tools handle the complete workflow
await twitter_fetch_and_report({
  keyword: "blockchain",
  maxPosts: 10,
  sortBy: "latest",
  format: "both"
});
```

## 📊 Report Formats

### Markdown Report
- Human-readable format
- Includes summary statistics
- Detailed post information with formatting
- Engagement metrics for each post
- Direct links to original tweets

### CSV Report
- Machine-readable format
- Easy to import into Excel/Google Sheets
- Columns: Index, Author, Handle, Timestamp, Text, URL, Likes, Retweets, Impressions, Replies

## 🔍 Available MCP Tools

### 1. twitter_search
Search Twitter for a specific keyword
```javascript
{
  keyword: "your search term",
  sortBy: "latest" | "top" | "people"
}
```

### 2. twitter_fetch_posts
Extract post data from current page
```javascript
{
  maxPosts: 10  // Number of posts to fetch
}
```

### 3. twitter_generate_report
Generate reports from fetched data
```javascript
{
  keyword: "search term used",
  format: "markdown" | "csv" | "both"
}
```

### 4. twitter_fetch_and_report
Complete workflow in one tool
```javascript
{
  keyword: "search term",
  maxPosts: 10,
  sortBy: "latest",
  format: "both"
}
```

## 🐛 Troubleshooting

### Issue: Not logged in to Twitter
**Solution:** 
1. The browser will open automatically
2. Log in manually
3. Press Enter in terminal to continue
4. Session will be saved for future use

### Issue: No tweets found
**Possible causes:**
- Not logged in to Twitter
- Search term has no recent results
- Twitter HTML structure changed
- Rate limiting

### Issue: MCP server not running
**Solution:**
```bash
npx playwright-mcp-bespy
```

### Issue: Browser doesn't launch
**Solution:**
```bash
# Install Playwright browsers
npx playwright install chromium
```

## 📈 Testing

Run the test script to verify everything works:

```bash
node scripts/test-mcp-twitter.mjs
```

This will test:
- MCP server connection
- Browser launch
- Twitter navigation
- Data extraction

## 🔒 Security Notes

- Login credentials are stored locally in browser profile
- Never commit `browser-data/` directory to git
- Reports may contain public Twitter data only
- No private/direct messages are accessed

## 📝 Success Criteria Checklist

- [x] User can run script with keyword input
- [x] Playwright MCP opens Twitter successfully
- [x] Uses existing login session (persistent)
- [x] Collects 10 latest posts for keyword
- [x] Extracts: text, author, timestamp, engagement metrics
- [x] Generates report.md in report/ folder
- [x] Generates report.csv in report/ folder
- [x] Summary statistics included in reports

## 💡 Tips

1. **Batch Processing**: Process multiple keywords by running the script multiple times
2. **Custom Reports**: Modify report generation functions in the script
3. **Scheduling**: Use cron jobs to run periodically
4. **Rate Limiting**: Add delays between searches to avoid rate limits

## 🚀 Next Steps

- Add sentiment analysis
- Support for multiple keywords in one run
- Real-time streaming capabilities
- Advanced filtering options
- Export to other formats (JSON, Excel)