# IndieHackers Analytics Scraper - System Architecture Design

## Executive Summary

The IndieHackers Analytics Scraper is designed as a modular, scalable system that automates content extraction across multiple categories, processes engagement data, and generates comprehensive daily reports. The architecture follows clean separation of concerns with robust error handling, performance optimization, and extensible design patterns.

## 1. System Overview

### 1.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CLI Interface Layer                          │
├─────────────────────────────────────────────────────────────────────┤
│                     Core Orchestration Engine                       │
├─────────────────────────────────────────────────────────────────────┤
│  Category    │  Data         │  Content      │  Report            │
│  Handlers    │  Processing   │  Analysis     │  Generation        │
├─────────────────────────────────────────────────────────────────────┤
│                    Browser Automation Layer                         │
├─────────────────────────────────────────────────────────────────────┤
│  Error       │  Rate         │  Cache        │  Data              │
│  Handling    │  Limiting     │  Management   │  Persistence       │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.2 Core Design Principles

- **Modularity**: Each category handler is independent and pluggable
- **Concurrency**: Parallel processing of multiple categories
- **Resilience**: Comprehensive error handling and retry mechanisms
- **Performance**: Intelligent caching and resource optimization
- **Extensibility**: Easy addition of new categories and data sources

## 2. Directory Structure Design

```
src/
├── core/
│   ├── orchestrator.js          # Main coordination engine
│   ├── config-manager.js        # Configuration and settings
│   ├── data-processor.js        # Data transformation and analysis
│   └── report-generator.js      # Report creation and formatting
├── scrapers/
│   ├── base-scraper.js          # Abstract scraper with common functionality
│   ├── indiehacker-scraper.js   # Main IndieHacker scraping logic
│   └── category-handlers/
│       ├── starting-up.js       # Starting Up category handler
│       ├── tech.js              # Tech category handler
│       ├── ai.js                # AI category handler
│       ├── creators.js          # Creators category handler
│       ├── money.js             # Money category handler
│       └── main-feed.js         # Main feed handler
├── processors/
│   ├── engagement-scorer.js     # Engagement scoring algorithm
│   ├── content-analyzer.js      # Content analysis and summarization
│   ├── duplicate-detector.js    # Duplicate post detection
│   └── trend-analyzer.js        # Trending topics extraction
├── utils/
│   ├── browser-manager.js       # Browser lifecycle management
│   ├── rate-limiter.js          # Request rate limiting
│   ├── cache-manager.js         # Data caching system
│   ├── logger.js                # Structured logging
│   └── validators.js            # Data validation utilities
├── templates/
│   ├── report-template.js       # Markdown report template
│   └── data-schema.js           # Data structure definitions
└── cli/
    └── index.js                 # CLI entry point

config/
├── categories.json              # Category definitions and selectors
├── selectors.json              # CSS/XPath selectors for scraping
├── scoring-weights.json        # Engagement scoring configuration
└── report-config.json          # Report formatting options

tests/
├── unit/                       # Unit tests for individual modules
├── integration/                # Integration tests for full workflows
└── fixtures/                   # Test data and mock responses

report/
└── indiehacker/
    └── {YYYY-MM-DD}/
        ├── report.md           # Generated markdown report
        ├── raw-data.json       # Backup of scraped data
        ├── processed-data.json # Cleaned and processed data
        └── metrics.json        # Collection and processing metrics
```

## 3. Core Components Architecture

### 3.1 Orchestration Engine (`src/core/orchestrator.js`)

```javascript
class IndieHackerOrchestrator {
  constructor(config) {
    this.config = config;
    this.categoryHandlers = new Map();
    this.dataProcessor = new DataProcessor();
    this.reportGenerator = new ReportGenerator();
    this.browserManager = new BrowserManager();
  }

  async execute(options) {
    const { date, categories, output } = options;
    
    // Phase 1: Initialize browser and handlers
    await this.initializeBrowser();
    await this.loadCategoryHandlers(categories);
    
    // Phase 2: Concurrent data collection
    const scrapingTasks = categories.map(category => 
      this.scrapeCategory(category, date)
    );
    const rawData = await Promise.allSettled(scrapingTasks);
    
    // Phase 3: Data processing and analysis
    const processedData = await this.dataProcessor.process(rawData);
    
    // Phase 4: Report generation
    const report = await this.reportGenerator.generate(processedData, date);
    
    // Phase 5: Persistence and cleanup
    await this.persistResults(report, processedData, output, date);
    await this.cleanup();
    
    return report;
  }
}
```

### 3.2 Category Handler Architecture

```javascript
class BaseCategoryHandler {
  constructor(config, browserPage) {
    this.config = config;
    this.page = browserPage;
    this.selectors = config.selectors;
    this.rateLimiter = new RateLimiter(config.rateLimit);
  }

  async scrape(date) {
    await this.navigateToCategory();
    await this.applyDateFilter(date);
    
    const posts = [];
    let hasMorePages = true;
    
    while (hasMorePages && posts.length < this.config.maxPosts) {
      const pagePosts = await this.extractPostsFromCurrentPage();
      posts.push(...pagePosts);
      
      hasMorePages = await this.navigateToNextPage();
      await this.rateLimiter.wait();
    }
    
    return this.enrichPostData(posts);
  }
  
  async extractPostsFromCurrentPage() {
    return await this.page.evaluate((selectors) => {
      return Array.from(document.querySelectorAll(selectors.postContainer))
        .map(post => this.extractPostData(post, selectors));
    }, this.selectors);
  }
}
```

### 3.3 Data Processing Pipeline

```javascript
class DataProcessor {
  constructor() {
    this.engagementScorer = new EngagementScorer();
    this.duplicateDetector = new DuplicateDetector();
    this.contentAnalyzer = new ContentAnalyzer();
    this.trendAnalyzer = new TrendAnalyzer();
  }

  async process(rawDataResults) {
    // Step 1: Consolidate data from all categories
    const allPosts = this.consolidateData(rawDataResults);
    
    // Step 2: Remove duplicates across categories
    const uniquePosts = await this.duplicateDetector.removeDuplicates(allPosts);
    
    // Step 3: Calculate engagement scores
    const scoredPosts = await this.engagementScorer.scoreAll(uniquePosts);
    
    // Step 4: Content analysis and summarization
    const analyzedPosts = await this.contentAnalyzer.analyzeAll(scoredPosts);
    
    // Step 5: Trend and theme extraction
    const trends = await this.trendAnalyzer.extractTrends(analyzedPosts);
    
    return {
      posts: analyzedPosts.sort((a, b) => b.engagementScore - a.engagementScore),
      trends,
      metadata: this.generateMetadata(rawDataResults, analyzedPosts)
    };
  }
}
```

## 4. Data Flow Architecture

### 4.1 Data Collection Flow

```
User Input (CLI) → Configuration Loading → Browser Initialization
        ↓
Category Handler Selection → Parallel Scraping → Raw Data Collection
        ↓
Error Handling & Retry Logic → Data Validation → Temporary Storage
```

### 4.2 Data Processing Flow

```
Raw Data → Consolidation → Duplicate Detection → Data Enrichment
        ↓
Engagement Scoring → Content Analysis → Trend Extraction
        ↓
Data Validation → Report Generation → File Persistence
```

### 4.3 Engagement Scoring Algorithm

```javascript
class EngagementScorer {
  constructor(weights = {}) {
    this.weights = {
      comments: 0.5,     // Primary engagement indicator
      upvotes: 0.3,      // Secondary engagement
      recency: 0.2,      // Time-based relevance
      ...weights
    };
  }

  calculateScore(post) {
    const now = new Date();
    const postTime = new Date(post.timestamp);
    const hoursAgo = (now - postTime) / (1000 * 60 * 60);
    
    // Recency decay: posts lose 5% relevance per hour
    const recencyFactor = Math.max(0.1, 1 - (hoursAgo * 0.05));
    
    const commentScore = (post.commentCount || 0) * this.weights.comments;
    const upvoteScore = (post.upvotes || 0) * this.weights.upvotes;
    const recencyScore = recencyFactor * this.weights.recency * 100;
    
    return Math.round(commentScore + upvoteScore + recencyScore);
  }
}
```

## 5. Configuration System

### 5.1 Category Configuration (`config/categories.json`)

```json
{
  "categories": {
    "starting-up": {
      "name": "Starting Up",
      "url": "https://www.indiehackers.com/starting-up",
      "enabled": true,
      "maxPosts": 50,
      "priority": 1,
      "selectors": {
        "postContainer": "[data-test='post-item']",
        "title": ".post-title a",
        "author": ".post-author-name",
        "upvotes": ".vote-count",
        "comments": ".comment-count",
        "timestamp": ".post-time",
        "content": ".post-content"
      }
    }
  }
}
```

### 5.2 Scoring Configuration (`config/scoring-weights.json`)

```json
{
  "engagementWeights": {
    "comments": 0.5,
    "upvotes": 0.3,
    "recency": 0.2
  },
  "qualityFactors": {
    "contentLength": 0.1,
    "authorReputation": 0.1,
    "responseRate": 0.05
  },
  "categoryMultipliers": {
    "starting-up": 1.0,
    "tech": 0.9,
    "ai": 1.1,
    "creators": 0.8,
    "money": 1.0,
    "main-feed": 0.7
  }
}
```

## 6. Error Handling & Resilience

### 6.1 Retry Strategy

```javascript
class RetryHandler {
  constructor(maxRetries = 3, baseDelay = 1000) {
    this.maxRetries = maxRetries;
    this.baseDelay = baseDelay;
  }

  async executeWithRetry(operation, context) {
    let lastError;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        if (this.isRetriableError(error) && attempt < this.maxRetries) {
          const delay = this.baseDelay * Math.pow(2, attempt - 1);
          await this.wait(delay);
          continue;
        }
        
        throw error;
      }
    }
    
    throw lastError;
  }
  
  isRetriableError(error) {
    return error.name === 'TimeoutError' || 
           error.message.includes('429') ||
           error.message.includes('503');
  }
}
```

### 6.2 Circuit Breaker Pattern

```javascript
class CircuitBreaker {
  constructor(threshold = 5, timeout = 60000) {
    this.failureThreshold = threshold;
    this.timeout = timeout;
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
  }

  async execute(operation) {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
}
```

## 7. Performance Optimization

### 7.1 Concurrent Processing Strategy

- **Category-Level Parallelism**: Process each category in parallel
- **Page-Level Batching**: Process multiple posts per page evaluation
- **Smart Rate Limiting**: Adaptive delays based on server response times
- **Resource Pooling**: Reuse browser contexts across categories

### 7.2 Caching Strategy

```javascript
class CacheManager {
  constructor() {
    this.memoryCache = new Map();
    this.diskCache = new DiskCache('./cache');
  }

  async get(key, fallback, ttl = 3600000) {
    // Check memory cache first
    if (this.memoryCache.has(key)) {
      const cached = this.memoryCache.get(key);
      if (Date.now() - cached.timestamp < ttl) {
        return cached.data;
      }
    }

    // Check disk cache
    const diskData = await this.diskCache.get(key);
    if (diskData && Date.now() - diskData.timestamp < ttl) {
      this.memoryCache.set(key, diskData);
      return diskData.data;
    }

    // Execute fallback and cache result
    const data = await fallback();
    const cacheEntry = { data, timestamp: Date.now() };
    
    this.memoryCache.set(key, cacheEntry);
    await this.diskCache.set(key, cacheEntry);
    
    return data;
  }
}
```

## 8. CLI Interface Design

### 8.1 Command Structure

```bash
# Basic usage
npm run scrape:indiehacker

# With parameters
npm run scrape:indiehacker -- --date=2025-08-26 --categories=ai,tech,money --output=./custom-reports

# Advanced options
npm run scrape:indiehacker -- --date=2025-08-26 --categories=all --max-posts=100 --include-comments --debug
```

### 8.2 CLI Implementation

```javascript
// src/cli/index.js
import { program } from 'commander';
import { IndieHackerOrchestrator } from '../core/orchestrator.js';

program
  .name('indiehacker-scraper')
  .description('IndieHackers Analytics Scraper and Report Generator')
  .version('1.0.0');

program
  .command('scrape')
  .description('Scrape IndieHackers data and generate report')
  .option('-d, --date <date>', 'Target date (YYYY-MM-DD)', new Date().toISOString().split('T')[0])
  .option('-c, --categories <categories>', 'Categories to scrape (comma-separated or "all")', 'all')
  .option('-o, --output <path>', 'Output directory', './report')
  .option('--max-posts <number>', 'Maximum posts per category', '50')
  .option('--include-comments', 'Include comment analysis')
  .option('--debug', 'Enable debug logging')
  .action(async (options) => {
    try {
      const orchestrator = new IndieHackerOrchestrator();
      const result = await orchestrator.execute(options);
      console.log(`Report generated successfully: ${result.reportPath}`);
    } catch (error) {
      console.error('Scraping failed:', error.message);
      process.exit(1);
    }
  });

program.parse();
```

## 9. Data Structures & Interfaces

### 9.1 Post Data Structure

```typescript
interface IndieHackerPost {
  id: string;
  title: string;
  url: string;
  author: {
    username: string;
    displayName: string;
    profileUrl: string;
    reputation?: number;
  };
  category: string;
  content: {
    preview: string;
    summary: string;
    wordCount: number;
    topics: string[];
  };
  engagement: {
    upvotes: number;
    commentCount: number;
    score: number;
    rank: number;
  };
  metadata: {
    timestamp: Date;
    scrapedAt: Date;
    processingTime: number;
  };
  analysis?: {
    sentiment: 'positive' | 'neutral' | 'negative';
    topics: string[];
    readabilityScore: number;
  };
}
```

### 9.2 Report Data Structure

```typescript
interface DailyReport {
  date: string;
  summary: {
    totalPosts: number;
    categoriesProcessed: string[];
    topCategory: string;
    processingTime: number;
  };
  topPosts: IndieHackerPost[];
  categoryBreakdown: CategorySummary[];
  trendingTopics: TrendingTopic[];
  metadata: {
    generatedAt: Date;
    version: string;
    configHash: string;
  };
}
```

## 10. Report Generation System

### 10.1 Markdown Template Engine

```javascript
class ReportGenerator {
  constructor(templateConfig) {
    this.templateConfig = templateConfig;
  }

  async generate(processedData, date) {
    const template = await this.loadTemplate();
    const context = this.buildReportContext(processedData, date);
    
    return this.renderTemplate(template, context);
  }

  buildReportContext(data, date) {
    return {
      date: this.formatDate(date),
      summary: this.generateSummary(data),
      topPosts: this.formatTopPosts(data.posts.slice(0, 20)),
      categoryBreakdown: this.generateCategoryBreakdown(data.posts),
      trendingTopics: this.formatTrendingTopics(data.trends),
      metadata: this.generateMetadata(data)
    };
  }
}
```

### 10.2 Report Template Structure

```markdown
# IndieHackers Daily Report - {{date}}

## Executive Summary
- **Total Posts Analyzed:** {{summary.totalPosts}}
- **Top Engagement Category:** {{summary.topCategory}}
- **Key Trending Topics:** {{summary.topTopics}}
- **Processing Time:** {{summary.processingTime}}

## Top Posts (Ranked by Engagement Score)

{{#each topPosts}}
### {{@index+1}}. [{{title}}]({{url}})
**Author:** [@{{author.username}}]({{author.profileUrl}})  
**Category:** {{category}}  
**Engagement:** {{engagement.commentCount}} comments, {{engagement.upvotes}} upvotes (Score: {{engagement.score}})  
**Summary:** {{content.summary}}

---
{{/each}}

## Category Breakdown

{{#each categoryBreakdown}}
### {{name}} ({{postCount}} posts)
{{#each topPosts}}
- [{{title}}]({{url}}) - {{engagement.score}} engagement score
{{/each}}
{{/each}}

## Trending Topics & Themes

{{#each trendingTopics}}
{{@index+1}}. **{{topic}}** - Mentioned in {{count}} posts
   {{description}}
{{/each}}

---
*Report generated on {{metadata.generatedAt}} using IndieHackers Analytics Scraper v{{metadata.version}}*
```

## 11. Quality Assurance & Validation

### 11.1 Data Validation Pipeline

```javascript
class DataValidator {
  static validatePost(post) {
    const errors = [];
    
    if (!post.title || post.title.length < 5) {
      errors.push('Title is required and must be at least 5 characters');
    }
    
    if (!post.url || !this.isValidUrl(post.url)) {
      errors.push('Valid URL is required');
    }
    
    if (!post.author?.username) {
      errors.push('Author username is required');
    }
    
    if (post.engagement.upvotes < 0 || post.engagement.commentCount < 0) {
      errors.push('Engagement metrics must be non-negative');
    }
    
    return { isValid: errors.length === 0, errors };
  }
}
```

### 11.2 Testing Strategy

- **Unit Tests**: Individual component functionality
- **Integration Tests**: End-to-end scraping workflows
- **Performance Tests**: Load testing and memory usage
- **Data Quality Tests**: Output validation and accuracy

## 12. Deployment & Operations

### 12.1 Environment Configuration

```javascript
// config/environment.js
export default {
  development: {
    browserOptions: { headless: false, devtools: true },
    logLevel: 'debug',
    maxConcurrency: 2,
    retryAttempts: 1
  },
  production: {
    browserOptions: { headless: true },
    logLevel: 'info',
    maxConcurrency: 5,
    retryAttempts: 3
  }
};
```

### 12.2 Monitoring & Logging

```javascript
class Logger {
  constructor(level = 'info') {
    this.level = level;
    this.logLevels = { debug: 0, info: 1, warn: 2, error: 3 };
  }

  log(level, message, metadata = {}) {
    if (this.logLevels[level] >= this.logLevels[this.level]) {
      const logEntry = {
        timestamp: new Date().toISOString(),
        level: level.toUpperCase(),
        message,
        metadata,
        sessionId: process.env.SESSION_ID || 'local'
      };
      
      console.log(JSON.stringify(logEntry, null, 2));
    }
  }
}
```

## 13. Future Extensibility

### 13.1 Plugin Architecture

The system is designed to support future enhancements:

- **New Data Sources**: Additional scraping targets (Reddit, HackerNews, etc.)
- **Analysis Plugins**: Sentiment analysis, AI-powered insights
- **Export Formats**: PDF, Excel, API endpoints
- **Notification Systems**: Email alerts, Slack integration
- **Machine Learning**: Predictive engagement scoring

### 13.2 API Integration Points

Future API development considerations:

```typescript
interface ScraperAPI {
  // Real-time data endpoints
  GET /api/v1/scrape/status
  POST /api/v1/scrape/trigger
  GET /api/v1/reports/latest
  
  // Historical data
  GET /api/v1/reports/date/{date}
  GET /api/v1/trends/weekly
  GET /api/v1/analytics/engagement
}
```

## Architecture Decision Records (ADRs)

### ADR-001: Playwright Over Puppeteer
**Decision**: Use Playwright as the browser automation framework
**Rationale**: Better cross-browser support, more stable API, active maintenance
**Trade-offs**: Slightly larger bundle size but better reliability

### ADR-002: Modular Category Handlers
**Decision**: Implement separate handlers for each IndieHackers category
**Rationale**: Enables parallel processing and category-specific optimizations
**Trade-offs**: More code to maintain but better performance and flexibility

### ADR-003: Markdown Report Format
**Decision**: Generate reports in Markdown format as primary output
**Rationale**: Human-readable, version-controllable, easily convertible to other formats
**Trade-offs**: Not as feature-rich as HTML but more portable and accessible

This architecture provides a solid foundation for the IndieHackers Analytics Scraper while maintaining flexibility for future enhancements and optimizations.