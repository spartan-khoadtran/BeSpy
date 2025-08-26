# Unified Twitter Data Fetcher - User Guide

## Overview

The Unified Twitter Data Fetcher is a consolidated solution that replaces multiple single-purpose scripts with one powerful, parameterized tool for fetching Twitter data and generating comprehensive reports.

## Features

- 🔍 **Flexible Search**: Search by any keyword or phrase
- 📊 **Multiple Report Formats**: Markdown, CSV, JSON, or all formats
- 💬 **Comment Fetching**: Optional fetching of comments/replies for each post
- 📈 **Customizable Templates**: Standard, Detailed, Minimal, or Custom templates
- 🎯 **Sorting Options**: Latest, Top, or People
- 🚀 **Dual Mode**: Use MCP server or direct Playwright
- 📁 **Organized Output**: All reports saved to designated directory

## Installation

1. Ensure you have Node.js installed (v16 or higher)
2. Install dependencies:
```bash
npm install @modelcontextprotocol/sdk playwright
```

## Usage

### Basic Usage

```bash
# Fetch 30 latest posts about AI
node scripts/twitter-unified-fetcher.mjs --keyword="AI"

# Fetch 50 posts about startups with comments
node scripts/twitter-unified-fetcher.mjs -k "startup" -p 50 -c

# Fetch top posts about blockchain in CSV format only
node scripts/twitter-unified-fetcher.mjs --keyword="blockchain" --sortBy=top --format=csv
```

### Command Line Options

| Option | Short | Default | Description |
|--------|-------|---------|-------------|
| `--keyword` | `-k` | "AI" | Search keyword or phrase |
| `--posts` | `-p` | 30 | Number of posts to fetch |
| `--comments` | `-c` | false | Include comments for each post |
| `--format` | `-f` | "all" | Report format: markdown, csv, json, all |
| `--template` | `-t` | "standard" | Report template: standard, detailed, minimal, custom |
| `--sortBy` | `-s` | "latest" | Sort by: latest, top, people |
| `--outputDir` | `-o` | "report" | Output directory for reports |
| `--useMcp` | `-m` | true | Use MCP server (true) or direct Playwright (false) |
| `--help` | `-h` | - | Show help message |

### Examples

#### Example 1: Comprehensive Analysis
```bash
node scripts/twitter-unified-fetcher.mjs \
  --keyword="AI technology" \
  --posts=100 \
  --comments \
  --format=all \
  --template=detailed
```
This fetches 100 posts about "AI technology", includes comments, generates reports in all formats using the detailed template.

#### Example 2: Quick Minimal Report
```bash
node scripts/twitter-unified-fetcher.mjs \
  -k "web3" \
  -p 20 \
  -f markdown \
  -t minimal
```
This fetches 20 posts about "web3" and generates a minimal markdown report.

#### Example 3: Custom Template
```bash
# First, edit config/report-template.json to customize your template
node scripts/twitter-unified-fetcher.mjs \
  --keyword="solo founder" \
  --posts=50 \
  --template=custom
```

## Report Templates

### Standard Template
- Basic metrics (likes, retweets, impressions)
- Author information
- Timestamps and links
- Hashtags and mentions
- Summary statistics

### Detailed Template
Everything in Standard plus:
- Engagement trends visualization
- Author analysis table
- Topic clustering
- Extended metrics
- Top comments (if enabled)

### Minimal Template
- Post content
- Basic engagement metrics (likes, retweets)
- No additional analysis

### Custom Template
Edit `config/report-template.json` to create your own template with specific fields and analysis options.

## Output Formats

### Markdown (.md)
- Human-readable format
- Includes formatting, headers, and sections
- Ideal for documentation and sharing

### CSV (.csv)
- Spreadsheet-compatible format
- Easy to import into Excel or Google Sheets
- Good for data analysis

### JSON (.json)
- Machine-readable format
- Complete data structure
- Perfect for further processing

## Report Structure

Reports are saved in the format:
```
report/twitter_[keyword]_[date].[format]
```

Example:
```
report/twitter_ai_technology_2025-08-26.md
report/twitter_ai_technology_2025-08-26.csv
report/twitter_ai_technology_2025-08-26.json
```

## Advanced Features

### Comment Fetching
When enabled with `-c` or `--comments`, the script fetches up to 5 top comments for each post. This provides deeper insight into engagement and discussion.

### Topic Clustering
The detailed template automatically analyzes posts and groups them by detected topics:
- AI/Technology
- Business
- Development
- Marketing
- Product

### Author Analysis
Identifies top authors by:
- Post count
- Total engagement
- Average engagement per post

### Engagement Trends
Visual ASCII chart showing likes distribution across posts for quick pattern recognition.

## Troubleshooting

### Issue: Script hangs or times out
**Solution**: Try using direct Playwright mode with `--useMcp=false`

### Issue: No posts found
**Solution**: 
- Check your search keyword
- Try different sorting (latest vs top)
- Ensure you're logged into Twitter in the browser

### Issue: Comments not fetching
**Solution**: Comments require additional page loads. Ensure stable internet connection and try reducing post count.

## Migration from Old Scripts

Replace old script usage as follows:

| Old Script | New Command |
|------------|-------------|
| `fetch-30-posts.mjs` | `twitter-unified-fetcher.mjs -p 30` |
| `fetch-solo-founder-50.mjs` | `twitter-unified-fetcher.mjs -k "solo founder" -p 50` |
| `quick-fetch-30.mjs` | `twitter-unified-fetcher.mjs -p 30 -t minimal` |

## Performance Tips

1. **Batch Processing**: Fetch larger amounts of data in one go rather than multiple small requests
2. **Template Selection**: Use minimal template for large datasets to reduce processing time
3. **Format Selection**: Generate only needed formats with `-f` option
4. **MCP vs Direct**: MCP server is generally faster for repeated operations

## Custom Template Configuration

Edit `config/report-template.json` to customize:

```json
{
  "name": "Your Template Name",
  "includeMetrics": true,
  "includeEngagement": true,
  "includeComments": true,
  "summaryStats": true,
  "topicClustering": true,
  "authorAnalysis": true,
  "engagementTrends": true
}
```

## Contributing

To add new features or report formats:

1. Extend the report templates object
2. Add new generation functions
3. Update command line options
4. Submit a pull request

## Support

For issues or questions:
- Check the troubleshooting section
- Review example commands
- Ensure all dependencies are installed
- Check browser login status for Twitter

## License

This tool is for educational and research purposes. Please respect Twitter's Terms of Service and rate limits.