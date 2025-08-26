# Twitter Data Fetcher - Usage Guide

## Prerequisites

1. **Twitter Login**: Ensure you're logged into Twitter in your browser
2. **MCP Server**: The Playwright MCP server must be configured in `.mcp.json`
3. **Dependencies**: Run `npm install` in the `playwright-mcp-bespy` directory

## Quick Start

### Using Claude CLI

1. Start Claude CLI:
```bash
claude
```

2. Use the all-in-one tool:
```
Use the twitter_fetch_and_report tool to fetch 10 latest posts about "AI technology" and generate both markdown and csv reports
```

### Step-by-Step Process

1. **Search Twitter**:
```
Use the twitter_search tool to search for "AI technology" sorted by latest
```

2. **Fetch Posts**:
```
Use the twitter_fetch_posts tool to extract 10 posts from the current page
```

3. **Generate Report**:
```
Use the twitter_generate_report tool to create a report for keyword "AI technology" in both formats
```

## Available Tools

### twitter_search
- **Purpose**: Navigate to Twitter and search for posts
- **Parameters**:
  - `keyword`: Search term or phrase
  - `sortBy`: Sort by 'latest', 'top', or 'people' (default: 'latest')

### twitter_fetch_posts
- **Purpose**: Extract post details from current page
- **Parameters**:
  - `maxPosts`: Maximum number of posts to fetch (default: 10)

### twitter_generate_report
- **Purpose**: Generate report from fetched posts
- **Parameters**:
  - `keyword`: The search keyword used
  - `format`: 'markdown', 'csv', or 'both' (default: 'both')

### twitter_fetch_and_report
- **Purpose**: Complete workflow in one command
- **Parameters**:
  - `keyword`: Search term
  - `maxPosts`: Number of posts (default: 10)
  - `sortBy`: Sort method (default: 'latest')
  - `format`: Report format (default: 'both')

## Report Output

Reports are saved in the `report/` directory with the format:
- `twitter_[keyword]_[date].md` - Markdown report
- `twitter_[keyword]_[date].csv` - CSV report

### Markdown Report Contains:
- Summary statistics
- Individual post details
- Engagement metrics
- Hashtags and mentions

### CSV Report Contains:
- Tabular data for analysis
- All post metrics in columns
- Easy import to spreadsheet tools

## Error Handling

### Common Issues:

1. **Not Logged In**: 
   - Solution: Log into Twitter in your browser first

2. **No Posts Found**:
   - Solution: Try a different keyword or check network connection

3. **Rate Limiting**:
   - Solution: Wait a few minutes before retrying

## Examples

### Fetch Tech News:
```
Use twitter_fetch_and_report to get 20 posts about "machine learning" sorted by top posts
```

### Market Research:
```
Use twitter_fetch_and_report to analyze 15 posts about "cryptocurrency trends" with csv format only
```

### Brand Monitoring:
```
Use twitter_fetch_and_report to collect 10 posts mentioning "@YourBrand" sorted by latest
```

## Tips

1. Use specific keywords for better results
2. Start with fewer posts (5-10) for testing
3. Check the `report/` folder for generated files
4. Use CSV format for data analysis
5. Use Markdown format for readable reports