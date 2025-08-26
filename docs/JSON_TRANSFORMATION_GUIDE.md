# JSON Transformation Guide

## Overview

The `twitter-unified-fetcher.mjs` script has been enhanced with comprehensive data transformation functions that convert simple post objects into a detailed structured format matching the `report_format.json` schema.

## Key Transformations Implemented

### 1. Post Data Transformation

**Original Format:**
```javascript
{
  text: "Hello world! #test @user",
  author: "John Doe",
  handle: "johndoe",
  url: "https://twitter.com/johndoe/status/123",
  likes: 100,
  retweets: 10,
  replies: 5,
  impressions: 5000,
  timestamp: "2024-08-26T14:30:00Z"
}
```

**Transformed Format:**
```javascript
{
  post_id: "123",
  url: "https://twitter.com/johndoe/status/123",
  author: {
    user_id: "user_abc123def",
    username: "johndoe",
    display_name: "John Doe",
    verified: false,
    follower_count: 0,
    following_count: 0,
    profile_image_url: "",
    account_creation_date: "2024-08-26T20:00:00.000Z"
  },
  content: {
    text: "Hello world! #test @user",
    language: "en",
    hashtags: ["test"],
    mentions: ["user"],
    urls: [],
    media: []
  },
  metrics: {
    impressions: 5000,
    likes: 100,
    retweets: 10,
    replies: 5,
    bookmarks: 0,
    shares: 0
  },
  timestamps: {
    created_at: "2024-08-26T14:30:00Z",
    last_updated: "2024-08-26T14:30:00Z"
  },
  engagement_rate: 2.3,
  comments: [...]
}
```

### 2. Comment Structure Transformation

**Original Comment:**
```javascript
{
  text: "Great post!",
  author: "Jane Smith",
  handle: "janesmith",
  likes: 15,
  retweets: 2,
  replies: 1,
  timestamp: "2024-08-26T14:45:00Z"
}
```

**Transformed Comment:**
```javascript
{
  comment_id: "123_comment_0_1724707200000",
  parent_post_id: "123",
  url: "https://twitter.com/janesmith/status/123_comment_0_1724707200000",
  author: {
    user_id: "user_def456ghi",
    username: "janesmith",
    display_name: "Jane Smith",
    verified: false,
    follower_count: 0,
    following_count: 0,
    profile_image_url: "",
    account_creation_date: "2024-08-26T20:00:00.000Z"
  },
  content: {
    text: "Great post!",
    language: "en",
    hashtags: [],
    mentions: [],
    urls: [],
    media: []
  },
  metrics: {
    impressions: 150,
    likes: 15,
    retweets: 2,
    replies: 1,
    bookmarks: 0,
    shares: 0
  },
  timestamps: {
    created_at: "2024-08-26T14:45:00Z",
    last_updated: "2024-08-26T14:45:00Z"
  },
  is_reply: true,
  reply_depth: 1
}
```

### 3. Complete Dataset Structure

The final output matches the `report_format.json` schema:

```javascript
{
  data: {
    posts: [/* transformed posts array */]
  },
  metadata: {
    search_query: "startup AI",
    collection_timestamp: "2024-08-26T20:00:00.000Z",
    total_posts: 50,
    total_comments: 127,
    language_filter: "english_only",
    sort_method: "latest",
    data_source: "direct_playwright",
    collection_duration_seconds: 45,
    api_version: "2.0",
    rate_limit_remaining: null
  }
}
```

## Transformation Functions

### Core Functions

1. **`extractPostId(url)`** - Extracts Twitter post ID from URL or generates unique ID
2. **`parseContent(text)`** - Extracts hashtags, mentions, and URLs from tweet text
3. **`calculateEngagementRate(metrics)`** - Calculates engagement rate as percentage
4. **`formatTimestamp(timestamp)`** - Converts various timestamp formats to ISO string
5. **`transformPost(post, index)`** - Transforms a single post to structured format
6. **`transformComments(comments, parentPostId)`** - Transforms comments array
7. **`transformToStructuredFormat(posts, keyword, startTime)`** - Main transformation function
8. **`validateStructuredFormat(structuredData)`** - Validates output against schema

### Content Parsing Features

- **Hashtag Extraction**: Finds all `#hashtag` patterns and removes the `#` symbol
- **Mention Extraction**: Finds all `@mention` patterns and removes the `@` symbol  
- **URL Extraction**: Finds all HTTP/HTTPS URLs in the text
- **Language Detection**: Uses the `isEnglish()` function to detect language

### Engagement Rate Calculation

```javascript
function calculateEngagementRate(metrics) {
  if (!metrics.impressions || metrics.impressions === 0) {
    return 0;
  }
  const totalEngagement = (metrics.likes || 0) + (metrics.retweets || 0) + (metrics.replies || 0);
  return Math.round((totalEngagement / metrics.impressions) * 10000) / 100; // Round to 2 decimal places
}
```

### Data Validation

The `validateStructuredFormat()` function ensures:
- Required top-level fields (`data`, `metadata`) exist
- `data.posts` is an array
- Each post has required fields (`post_id`, `author.username`, `content.text`, `metrics`, `timestamps.created_at`)

## Updated Script Workflow

1. **Data Collection**: Uses existing MCP or Playwright methods
2. **Language Filtering**: Applies English-only filter if enabled
3. **Transformation**: Converts simple objects to structured format
4. **Validation**: Validates output against schema
5. **Report Generation**: Generates reports in structured format

## Integration Points

### Both `fetchWithMcp()` and `fetchWithPlaywright()` now:
- Accept `startTime` parameter for duration calculation
- Call `transformToStructuredFormat()` before returning
- Return structured data instead of simple arrays

### Report generation functions updated:
- `generateMarkdownReportFromStructured()` - Handles new field names
- `generateCsvReportFromStructured()` - Uses structured format
- `calculateStatsFromStructured()` - Works with new metrics structure

### Main function changes:
- Tracks start time for duration calculation
- Works with structured data throughout
- Displays enhanced statistics

## Usage Examples

### Generate JSON with structured format:
```bash
node scripts/twitter-unified-fetcher.mjs --keyword="AI startup" --posts=10 --format=json
```

### Generate all formats with detailed template:
```bash
node scripts/twitter-unified-fetcher.mjs --keyword="blockchain" --posts=25 --template=detailed --format=all
```

### Use direct Playwright with comments:
```bash
node scripts/twitter-unified-fetcher.mjs --keyword="tech news" --posts=20 --comments --noMcp --format=json
```

## Benefits

1. **Standardized Output**: All data follows consistent schema
2. **Rich Metadata**: Comprehensive information about each post and comment
3. **Automated Parsing**: Hashtags, mentions, and URLs extracted automatically
4. **Engagement Metrics**: Calculated engagement rates for better analysis
5. **Validation**: Built-in schema validation ensures data quality
6. **Backward Compatibility**: Original functionality preserved
7. **Flexible Reporting**: Enhanced report formats with new data structure

## File Locations

- **Main Script**: `/scripts/twitter-unified-fetcher.mjs`
- **Target Schema**: `/report/report_format.json`
- **Documentation**: `/docs/JSON_TRANSFORMATION_GUIDE.md`
- **Output Directory**: `/report/` (configurable with `--outputDir`)

The transformation functions maintain all existing functionality while providing a much richer, structured output format suitable for advanced analysis and reporting.