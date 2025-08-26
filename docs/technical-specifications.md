# IndieHackers Scraper Technical Specifications
*Comprehensive technical guide for reliable IndieHackers data extraction*

## 1. Website Structure Analysis

### 1.1 Category URL Patterns
Based on analysis of all 6 target categories from the PRD:

| Category | URL Pattern | Page Type | JavaScript Required |
|----------|-------------|-----------|-------------------|
| Starting Up | `/starting-up` | Content/Guide Page | Yes |
| Tech | `/tech` | Standard Post Listing | Yes |
| A.I. | `/tags/artificial-intelligence` | Tagged Post Listing | Yes |
| IndieHackers (Main) | `/` | Mixed Feed (Products/Stories) | Yes |
| Creators | `/creators` | Standard Post Listing | Yes |
| Money | `/money` | Standard Post Listing | Yes |

### 1.2 Page Load Requirements
**Critical**: All pages require JavaScript rendering with minimum 3-second wait time.
- Use Playwright's `page.waitForTimeout(3000)` after navigation
- Content is dynamically loaded via React components
- Initial page load shows minimal content without JavaScript execution

## 2. HTML Selectors & Data Extraction Patterns

### 2.1 Post Container Selectors
```css
/* Main post containers - varies by page type */
div[data-test-id] /* Standard post listings */
.feed-item /* Main page feed items */
article /* Individual post containers */
```

### 2.2 Post Title Extraction
```css
/* Title selectors (order of priority) */
h2 a /* Most common pattern */
h3 a /* Alternative heading level */
.title-link /* Class-based selector */
[data-test-id*="title"] /* Test ID fallback */
```

### 2.3 Author Information
```css
/* Author patterns */
a[href^="/@"] /* Profile links (primary) */
.author-link /* Class-based author links */
[data-test-id*="author"] /* Test ID author containers */

/* Author extraction pattern */
- Username: Extract from href="/@ username" or text content
- Display name: Text content of author links
- Profile URL: Full href attribute
```

### 2.4 Engagement Metrics
```css
/* Upvotes/Likes */
button[aria-label*="upvote"] /* Upvote buttons */
.vote-count /* Vote count displays */
[data-test-id*="upvote"] /* Test ID upvote elements */

/* Comments */
[data-test-id*="comment"] /* Comment count elements */
.comment-count /* Comment counter displays */
a[href*="#comments"] /* Comment section links */

/* Views (when available) */
.view-count /* View counter displays */
[data-test-id*="view"] /* Test ID view elements */
```

### 2.5 Timestamp Patterns
```css
/* Timestamp selectors */
time /* HTML5 time elements */
[datetime] /* Elements with datetime attributes */
.timestamp /* Class-based timestamps */
[data-test-id*="time"] /* Test ID time elements */

/* Time format extraction */
- Look for ISO 8601 format in datetime attributes
- Parse relative times ("2 hours ago") from text content
- Convert to ISO 8601: new Date(parsedTime).toISOString()
```

### 2.6 Content Preview
```css
/* Content preview patterns */
.post-content /* Main content containers */
.excerpt /* Content excerpts */
.description /* Post descriptions */
[data-test-id*="content"] /* Test ID content areas */

/* Extraction logic */
- Limit to first 200 characters
- Strip HTML tags
- Clean whitespace and line breaks
- Fallback to post title if no preview available
```

## 3. Category-Specific Implementation Details

### 3.1 Starting Up Category (`/starting-up`)
**Special Case**: Content/guide page rather than standard post listing
```javascript
// Different extraction approach needed
const contentSections = await page.$$eval('.content-section', sections => {
  return sections.map(section => ({
    title: section.querySelector('h2')?.textContent,
    content: section.querySelector('.description')?.textContent,
    type: 'guide-section'
  }));
});
```

### 3.2 Standard Post Listings (`/tech`, `/creators`, `/money`)
```javascript
// Standard extraction pattern
const posts = await page.$$eval('[data-test-id], .feed-item', items => {
  return items.map(item => {
    const titleElement = item.querySelector('h2 a, h3 a');
    const authorElement = item.querySelector('a[href^="/@"]');
    const upvoteElement = item.querySelector('[data-test-id*="upvote"], .vote-count');
    const commentElement = item.querySelector('[data-test-id*="comment"], .comment-count');
    const timeElement = item.querySelector('time, [datetime], .timestamp');
    
    return {
      title: titleElement?.textContent?.trim(),
      url: titleElement?.href,
      author: {
        username: authorElement?.href?.replace('/@ ', ''),
        display_name: authorElement?.textContent?.trim(),
        profile_url: authorElement?.href
      },
      engagement: {
        upvotes: parseInt(upvoteElement?.textContent?.match(/\d+/)?.[0] || '0'),
        comments: parseInt(commentElement?.textContent?.match(/\d+/)?.[0] || '0'),
        views: 0 // Usually not available on listing pages
      },
      timestamp: timeElement?.getAttribute('datetime') || timeElement?.textContent,
      category: 'tech' // Set based on current category
    };
  });
});
```

### 3.3 A.I. Category (`/tags/artificial-intelligence`)
Similar to standard post listings but with tag-specific filtering:
```javascript
// Additional tag extraction
const tags = await page.$$eval('.tag-list .tag', tags => 
  tags.map(tag => tag.textContent.trim())
);
```

### 3.4 Main Feed (`/`)
Mixed content types require different handling:
```javascript
// Detect content type and handle accordingly
const feedItems = await page.$$eval('.feed-item', items => {
  return items.map(item => {
    const type = item.getAttribute('data-type') || 'post';
    
    if (type === 'product') {
      // Handle product listings differently
      return extractProductData(item);
    } else {
      // Handle as standard post
      return extractPostData(item);
    }
  });
});
```

## 4. Pagination Handling

### 4.1 Pagination Detection
```css
/* Pagination selectors */
.pagination /* Standard pagination containers */
[aria-label*="pagination"] /* Accessible pagination */
.load-more /* Load more buttons */
[data-test-id*="pagination"] /* Test ID pagination */
```

### 4.2 Navigation Logic
```javascript
// Check for next page
const hasNextPage = await page.$('.pagination .next:not(.disabled)') !== null;

if (hasNextPage) {
  await page.click('.pagination .next');
  await page.waitForTimeout(3000); // Wait for content load
  // Continue extraction
}
```

### 4.3 Load More Buttons
```javascript
// Handle infinite scroll/load more
const loadMoreButton = await page.$('.load-more:not(.disabled)');
if (loadMoreButton) {
  await loadMoreButton.click();
  await page.waitForTimeout(2000);
  // Extract additional content
}
```

## 5. Error Handling & Rate Limiting

### 5.1 Network Errors
```javascript
// Implement retry logic
async function scrapeWithRetry(url, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await page.goto(url, { waitUntil: 'networkidle2' });
      await page.waitForTimeout(3000);
      return await extractData(page);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await page.waitForTimeout(5000 * (i + 1)); // Exponential backoff
    }
  }
}
```

### 5.2 Rate Limiting Detection
```javascript
// Check for rate limiting indicators
const isRateLimited = await page.$('.rate-limit-message') !== null;
if (isRateLimited) {
  await page.waitForTimeout(60000); // Wait 1 minute
  throw new Error('Rate limited - implement longer delay');
}
```

### 5.3 Content Loading Validation
```javascript
// Verify content loaded properly
const postCount = await page.$$eval('[data-test-id], .feed-item', items => items.length);
if (postCount === 0) {
  // Content didn't load - retry with longer wait
  await page.waitForTimeout(5000);
  return await extractData(page);
}
```

## 6. Data Schema & Validation

### 6.1 Required Post Structure
```javascript
const postSchema = {
  id: 'string', // Generated from URL or content hash
  title: 'string', // Required
  url: 'string', // Full IndieHackers URL
  author: {
    username: 'string', // Without @ symbol
    display_name: 'string',
    profile_url: 'string' // Optional
  },
  category: 'string', // One of the 6 categories
  engagement: {
    upvotes: 'number', // Default 0
    comments: 'number', // Default 0
    views: 'number' // Default 0, often unavailable
  },
  timestamp: 'string', // ISO 8601 format
  content_preview: 'string', // Max 200 characters
  tags: ['string'], // Optional array
  scraped_at: 'string', // ISO 8601 scraping timestamp
  scraper_version: 'string' // Version tracking
};
```

### 6.2 Data Cleaning Functions
```javascript
function cleanPostData(rawPost) {
  return {
    id: generatePostId(rawPost.url || rawPost.title),
    title: cleanTitle(rawPost.title),
    url: normalizeUrl(rawPost.url),
    author: {
      username: cleanUsername(rawPost.author?.username),
      display_name: rawPost.author?.display_name?.trim() || '',
      profile_url: normalizeUrl(rawPost.author?.profile_url)
    },
    category: mapCategory(rawPost.category),
    engagement: {
      upvotes: parseInt(rawPost.engagement?.upvotes) || 0,
      comments: parseInt(rawPost.engagement?.comments) || 0,
      views: parseInt(rawPost.engagement?.views) || 0
    },
    timestamp: normalizeTimestamp(rawPost.timestamp),
    content_preview: truncateContent(rawPost.content_preview, 200),
    tags: Array.isArray(rawPost.tags) ? rawPost.tags : [],
    scraped_at: new Date().toISOString(),
    scraper_version: '1.0.0'
  };
}
```

## 7. Engagement Score Calculation

### 7.1 Scoring Algorithm
Based on PRD requirements and existing configuration:
```javascript
function calculateEngagementScore(engagement, category, timestamp) {
  const { comments = 0, upvotes = 0, views = 0 } = engagement;
  
  // Base weights from PRD
  const commentWeight = 3;
  const upvoteWeight = 2;
  const viewWeight = 0.1;
  
  // Calculate base score
  let score = (comments * commentWeight) + (upvotes * upvoteWeight) + (views * viewWeight);
  
  // Apply category multipliers
  const categoryMultipliers = {
    'starting-up': 1.0,
    'tech': 0.9,
    'artificial-intelligence': 1.1,
    'creators': 0.8,
    'money': 1.0,
    'main': 0.7
  };
  
  score *= (categoryMultipliers[category] || 1.0);
  
  // Apply recency decay
  const hoursOld = (Date.now() - new Date(timestamp).getTime()) / (1000 * 60 * 60);
  const decayFactor = Math.pow(0.5, hoursOld / 12); // 12-hour half-life
  score *= decayFactor;
  
  return Math.round(score);
}
```

## 8. Browser Configuration & Anti-Detection

### 8.1 Playwright Configuration
```javascript
const browser = await playwright.chromium.launch({
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-blink-features=AutomationControlled',
    '--disable-features=VizDisplayCompositor'
  ]
});

const context = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
});
```

### 8.2 Request Delays
```javascript
// Implement human-like delays between requests
const delays = {
  betweenCategories: 10000, // 10 seconds between categories
  betweenPages: 5000,       // 5 seconds between pagination
  pageLoad: 3000,           // 3 seconds after navigation
  errorRetry: 15000         // 15 seconds on errors
};
```

## 9. Testing & Validation

### 9.1 Validation Functions
Reference the existing test utilities at:
- `/Users/khoadtran/Documents/Code/Personal/bespy-playwright/tests/indiehackers/utils/indiehackers-test-utils.js`
- Uses comprehensive validation for post structure, engagement metrics, and report format

### 9.2 Mock Data Testing
- Sample data available at: `/Users/khoadtran/Documents/Code/Personal/bespy-playwright/tests/indiehackers/fixtures/sample-posts.json`
- Mock scraper implementation: `/Users/khoadtran/Documents/Code/Personal/bespy-playwright/tests/indiehackers/mocks/mock-scraper.js`

## 10. Performance Considerations

### 10.1 Concurrency Limits
- Maximum 2 concurrent browser instances
- Process categories sequentially to avoid rate limiting
- Implement connection pooling for database operations

### 10.2 Memory Management
```javascript
// Clean up after each category
async function cleanupBrowser(page, context) {
  await page.close();
  await context.close();
  if (global.gc) global.gc(); // Force garbage collection if available
}
```

### 10.3 Data Storage Optimization
- Stream large result sets to files instead of keeping in memory
- Use JSON streaming for large datasets
- Implement data compression for storage

## 11. Error Recovery & Monitoring

### 11.1 Common Error Patterns
```javascript
const errorPatterns = {
  'Network timeout': { retry: true, delay: 10000 },
  'Rate limited': { retry: true, delay: 60000 },
  'Page not found': { retry: false, skip: true },
  'Content not loaded': { retry: true, delay: 5000 }
};
```

### 11.2 Health Checks
```javascript
async function validateScraping(results) {
  const issues = [];
  
  if (results.length === 0) {
    issues.push('No data extracted');
  }
  
  const invalidPosts = results.filter(post => !post.title || !post.url);
  if (invalidPosts.length > 0) {
    issues.push(`${invalidPosts.length} posts missing required fields`);
  }
  
  return issues;
}
```

## 12. Implementation Checklist

- [ ] Set up Playwright with anti-detection configuration
- [ ] Implement category-specific extraction functions
- [ ] Add comprehensive error handling and retry logic
- [ ] Implement engagement score calculation
- [ ] Add data validation and cleaning functions
- [ ] Set up pagination handling for all page types
- [ ] Implement rate limiting and respectful scraping delays
- [ ] Add comprehensive logging and monitoring
- [ ] Test with mock data and validation utilities
- [ ] Implement report generation according to PRD template

This specification provides the complete technical foundation for implementing a reliable IndieHackers scraper that meets all PRD requirements while handling the complexities of each category type and potential edge cases.