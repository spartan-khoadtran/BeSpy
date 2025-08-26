# Product Requirements Document (PRD)
## IndieHackers Data Scraper & Report Generator

### 1. Overview

**Product Name:** IndieHackers Analytics Scraper  
**Version:** 2.0  
**Date:** August 2025  
**Status:** Implemented & Production Ready

**Purpose:** Advanced web scraper using Playwright browser automation to extract comprehensive content from IndieHackers, including deep post analysis with full content and comment extraction, engagement metrics analysis, and generation of detailed daily reports in Markdown format with JSON data backups.

### 2. Objectives

- Automate data collection from IndieHackers across 6 key categories
- **Deep extraction**: Click into each post to extract full content and all comments
- Generate comprehensive daily summaries with engagement-based prioritization  
- Provide detailed insights including comment discussions and community engagement
- Enable trend analysis through consistent daily data capture with full context
- Store both formatted reports (Markdown) and raw data (JSON) for further analysis

### 3. Target Categories

| Category | URL | Description |
|----------|-----|-------------|
| Starting Up | https://www.indiehackers.com/starting-up | Startup-focused content |
| Tech | https://www.indiehackers.com/tech | Technical discussions |
| A.I. | https://www.indiehackers.com/tags/artificial-intelligence | AI-related posts |
| IndieHackers | https://www.indiehackers.com/ | Main feed |
| Creators | https://www.indiehackers.com/creators | Creator economy content |
| Money | https://www.indiehackers.com/money | Financial/revenue discussions |

### 4. Functional Requirements

#### 4.1 Data Collection
- **Input:** Date parameter (default: today/last 24h)
- **Method:** Playwright browser automation with deep extraction
- **Two-Phase Extraction:**
  
  **Phase 1 - List Extraction:**
  - Post title
  - Author information (username, display name)
  - Post URL (direct link to full post)
  - Basic engagement metrics (upvotes, comments count)
  - Category tag
  
  **Phase 2 - Deep Extraction (Click-through):**
  - Full post content
  - All comments with:
    - Comment author
    - Comment text
    - Comment upvotes
    - Comment timestamp
  - Post tags
  - View count
  - Detailed timestamp

#### 4.2 Data Processing
- **Engagement Scoring Algorithm:**
  - Comments: 60% weight
  - Upvotes: 30% weight  
  - Recency: 10% weight
- **Content Processing:**
  - Full content extraction from individual post pages
  - Comment thread analysis
  - Automatic summarization for long content
- **Duplicate Handling:** Smart deduplication across categories
- **Validation:** Minimum engagement threshold (configurable)

#### 4.3 Report Generation
- **Output Formats:** 
  - Markdown (.md) for human-readable reports
  - JSON for structured data (follows `report/indiehacker/report_format.json`)
- **File Structure:** 
  - `report/indiehacker/{YYYY-MM-DD}/report.md`
  - `report/indiehacker/{YYYY-MM-DD}/raw-data.json`
- **Content Organization:**
  - Executive summary with metrics
  - Top posts by engagement score
  - Category breakdown with statistics
  - Trending topics/themes analysis
  - Full comment threads for top posts

### 5. JSON Output Format

The scraper outputs data in the standardized JSON format defined in `report/indiehacker/report_format.json`:

```json
{
  "metadata": {
    "report_date": "YYYY-MM-DD",
    "generated_at": "ISO 8601 timestamp",
    "scraper_version": "2.0",
    "total_posts_analyzed": number,
    "categories_covered": number,
    "top_engagement_category": string,
    "average_engagement_per_post": number,
    "total_community_engagement": number
  },
  "posts": [
    {
      "post_id": string,
      "title": string,
      "url": string,
      "author": {
        "username": string,
        "display_name": string,
        "verified": boolean
      },
      "category": string,
      "content": {
        "summary": string,
        "full_text": string  // From deep extraction
      },
      "metrics": {
        "comments": number,
        "upvotes": number,
        "engagement_score": number,
        "views": number  // When available
      },
      "comments_data": [  // From deep extraction
        {
          "author": string,
          "text": string,
          "upvotes": number,
          "timestamp": string
        }
      ],
      "tags": [string],  // From deep extraction
      "timestamps": {
        "posted_at": "ISO 8601 or null",
        "scraped_at": "ISO 8601"
      },
      "ranking": number
    }
  ],
  "categories": {
    "category_name": {
      "post_count": number,
      "total_engagement": number,
      "average_engagement": number,
      "top_post": {
        "title": string,
        "engagement_score": number
      }
    }
  },
  "trending_themes": [
    {
      "keyword": string,
      "frequency": number,
      "related_posts": [
        {
          "post_id": string,
          "title": string,
          "url": string,
          "comments": number
        }
      ]
    }
  ],
  "engagement_scoring": {
    "algorithm": {
      "comments_weight": 0.6,
      "upvotes_weight": 0.3,
      "recency_weight": 0.1
    },
    "description": "Posts ranked by engagement score calculated from weighted metrics"
  }
}
```

### 6. Command Line Interface

**Parameters:**
- `--date`: Target date (YYYY-MM-DD format, default: today)
- `--categories`: Comma-separated list or "all" (default: main,starting-up,tech)
- `--posts`: Number of posts per category (default: 50)
- `--all`: Scrape all categories
- `--no-report`: Skip report generation
- `--output`: Custom output directory (optional)

### 7. Technical Implementation

#### 7.1 Architecture
- **Browser Automation:** Playwright with Chromium
- **Modular Design:** 
  - `BrowserManager`: Handles Playwright lifecycle
  - `PostDetailExtractor`: Deep extraction via click-through
  - `DataProcessor`: Validation, scoring, deduplication
  - `ReportGenerator`: Markdown and JSON output
- **Error Handling:** Retry logic, graceful degradation
- **Performance:** Parallel page processing, efficient scrolling

#### 7.2 Directory Structure
```
scripts/indiehacker/
├── index.js              # CLI entry point
├── scraper.js            # Main orchestrator
├── config.js             # Configuration
└── utils/
    ├── browser-manager.js      # Playwright browser control
    ├── post-detail-extractor.js # Deep extraction logic
    ├── data-processor.js       # Data processing & scoring
    └── report-generator.js     # Report generation

report/indiehacker/
├── report_format.json    # JSON schema definition
└── YYYY-MM-DD/
    ├── report.md        # Human-readable report
    └── raw-data.json    # Structured data
```

### 8. Markdown Report Template
```markdown
# IndieHackers Daily Report - [Date]

## Executive Summary
- Total posts analyzed: X
- Categories covered: Y
- Top engagement category: Z
- Average engagement per post: N
- Total community engagement: M interactions

## Top Posts (Ranked by Engagement)

### 1. [Post Title] 
**Author:** @username  
**Category:** Starting Up  
**Engagement:** 45 comments, 123 upvotes  
**Engagement Score:** 89.2
**Posted:** 2h ago
**Tags:** tag1, tag2, tag3
**Views:** 1,234
**URL:** https://www.indiehackers.com/post/xyz  

**Content:**
> Full post content extracted from the page...
> Multiple paragraphs of the actual post text...

**Comments (45 total):**

1. **@commenter1** (5 upvotes):
   > First comment text here...

2. **@commenter2** (3 upvotes):
   > Second comment text here...

3. **@commenter3** (1 upvote):
   > Third comment text here...

   *... and 42 more comments*

---

## Category Breakdown

### Starting Up (X posts)
1. **[Post Title](URL)**
   *By @author • 23 comments, 45 upvotes • Score: 78.5*

2. **[Post Title](URL)**
   *By @author • 15 comments, 30 upvotes • Score: 45.2*

[Continue for all categories...]

## Trending Themes
1. **AI Integration** - Mentioned in X posts
   - [Related Post 1](URL) (23 comments)
   - [Related Post 2](URL) (15 comments)

2. **SaaS Growth** - Y posts
   - [Related Post](URL) (18 comments)
```

### 9. Usage Examples

```bash
# Scrape all categories with default settings
node scripts/indiehacker/index.js --all

# Scrape specific categories with 20 posts each
node scripts/indiehacker/index.js --posts=20

# Scrape without generating report (data only)
node scripts/indiehacker/index.js --no-report

# Full scrape with maximum posts
node scripts/indiehacker/index.js --all --posts=100
```

### 10. Current Status & Known Limitations

**Status:** Production Ready (v2.0)

**Working Features:**
- ✅ Main feed extraction with full engagement metrics
- ✅ Deep extraction clicking into posts for full content
- ✅ Complete comment extraction with author and upvotes
- ✅ Engagement scoring algorithm
- ✅ Duplicate detection and removal
- ✅ Markdown report generation
- ✅ JSON data export following standard format

**Known Limitations:**
- Category pages (starting-up, tech, ai, creators, money) may require different selectors or authentication
- Timestamp extraction limited to relative times
- View counts not always available
- Some posts may not have author information

**Performance:**
- Typical extraction: 3-5 seconds per post with deep extraction
- Memory usage: ~200MB with Playwright
- Network: Respectful delays between requests
