# Reddit Content Scraper - Product Requirements Document

## Overview
A robust Reddit scraping tool using Playwright to extract posts, comments, and trending content from Reddit based on search keywords or subreddit scanning.

## Core Features

### 1. Keyword Search Mode
- **Input**: Search keyword (e.g., "buildpad")
- **Process**: Search Reddit for posts containing the keyword
- **Output**: Structured data of matching posts with full content
- **Format**: JSON (default) with Markdown support

### 2. Trending Posts Mode  
- **Input**: Time range (default: last 1 day) and subreddit list
- **Process**: Scan specified subreddits for trending posts
- **Trending Criteria**:
  - High upvote ratio (>0.8)
  - Recent activity (comments in last 24h)
  - Engagement score: `(upvotes + comments * 2) / hours_since_posted`
- **Output**: Top trending posts with comments

### 3. Subreddit Batch Mode
- **Input**: List of subreddits
- **Process**: Fetch top 10 posts per subreddit
- **Sorting**: By trending score (upvotes, comments, recency)
- **Output**: Aggregated results across subreddits

## Data Structure

### Post Object
```json
{
  "id": "post_id",
  "title": "Post Title",
  "url": "https://reddit.com/r/subreddit/...",
  "author": "username",
  "subreddit": "subreddit_name",
  "created_utc": "2025-08-27T10:00:00Z",
  "score": 1234,
  "upvote_ratio": 0.95,
  "num_comments": 56,
  "content": "Full post content/selftext",
  "link_url": "external_link_if_any",
  "trending_score": 45.6,
  "comments": [
    {
      "id": "comment_id",
      "author": "commenter",
      "body": "Comment text",
      "score": 23,
      "created_utc": "2025-08-27T11:00:00Z",
      "replies": []
    }
  ]
}
```

## Technical Requirements

### Architecture
- **Location**: `scripts/reddit/`
- **Rate Limiting**: Respectful delays between requests
- **Error Handling**: Robust retry mechanisms

### Command Line Interface
```bash
# Keyword search mode
node scripts/reddit/index.js search --keyword "buildpad" --format json
node scripts/reddit/index.js search --keyword "buildpad" --format markdown

# Trending mode
node scripts/reddit/index.js trending --days 1 --subreddits "startup,entrepreneur"

# Batch subreddit mode  
node scripts/reddit/index.js batch --subreddits "startup,entrepreneur,SaaS" --limit 10
```

### Output Formats

#### JSON (Default)
Standard JSON structure as defined above

#### Markdown
```markdown
# Reddit Search Results: buildpad

## Post: [Title](url)
- **Author**: username
- **Subreddit**: r/subreddit
- **Score**: 1234 (95% upvoted)
- **Comments**: 56

Content goes here...

### Comments (Top 3)
1. **commenter** (23 points): Comment text...
```

## Success Criteria
1. Successfully finds and extracts "buildpad" keyword results (>0 results) for example, keyword must be enter from user
2. Properly extracts post content, metadata, and comments
3. Trending algorithm identifies genuinely popular recent posts
4. Handles rate limiting and errors gracefully
5. Outputs clean, structured data in both JSON and Markdown

## Performance Requirements
- Handle network timeouts and retries
- Respect Reddit's robots.txt and rate limits
- Memory efficient for large result sets

## Error Handling
- Graceful degradation when posts are deleted/private
- Retry logic for network failures  
- Validation of scraped data completeness
- Clear error messages for troubleshooting
