/**
 * Configuration for IndieHackers Scraper
 */

export const config = {
  // Base URL for IndieHackers
  baseUrl: 'https://www.indiehackers.com',
  
  // Category definitions
  categories: {
    'starting-up': {
      name: 'Starting Up',
      url: 'https://www.indiehackers.com/starting-up',
      description: 'Startup-focused content'
    },
    'tech': {
      name: 'Tech',
      url: 'https://www.indiehackers.com/tech',
      description: 'Technical discussions'
    },
    'ai': {
      name: 'A.I.',
      url: 'https://www.indiehackers.com/tags/artificial-intelligence',
      description: 'AI-related posts'
    },
    'main': {
      name: 'IndieHackers',
      url: 'https://www.indiehackers.com/',
      description: 'Main feed'
    },
    'creators': {
      name: 'Creators',
      url: 'https://www.indiehackers.com/creators',
      description: 'Creator economy content'
    },
    'money': {
      name: 'Money',
      url: 'https://www.indiehackers.com/money',
      description: 'Financial/revenue discussions'
    }
  },

  // Scraping settings
  scraping: {
    // Default number of posts to scrape per category
    defaultPostsPerCategory: 50,
    
    // Maximum posts to scrape per category
    maxPostsPerCategory: 100,
    
    // Timeout for page loads (milliseconds)
    pageTimeout: 30000,
    
    // Delay between requests (milliseconds)
    requestDelay: 1000,
    
    // Browser settings
    browser: {
      headless: true,
      viewport: { width: 1280, height: 720 },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  },

  // Engagement scoring weights
  scoring: {
    weights: {
      comments: 0.6,    // Higher weight for comments
      upvotes: 0.3,     // Medium weight for upvotes
      recency: 0.1      // Lower weight for recency
    },
    
    // Recency scoring (higher score for newer posts)
    recencyHours: 24,   // Consider posts from last 24 hours as "recent"
    
    // Minimum engagement threshold
    minEngagement: 1
  },

  // Report generation settings
  reporting: {
    // Output directory structure
    outputDir: 'report/indiehacker',
    
    // Report file names
    reportFileName: 'report.md',
    dataFileName: 'raw-data.json',
    
    // Report content limits
    topPostsLimit: 10,
    postsPerCategoryLimit: 20,
    trendingThemesLimit: 5,
    
    // Template settings
    includeExecutiveSummary: true,
    includeCategoryBreakdown: true,
    includeTrendingThemes: true,
    includeRawDataBackup: true
  },

  // Content extraction selectors
  selectors: {
    // Post container
    postContainer: '.post-item, .story-item, [data-testid="post"]',
    
    // Post elements
    title: '.post-title, .story-title, h2 a, h3 a',
    author: '.post-author, .story-author, .author-name',
    url: '.post-link, .story-link, a[href*="/post/"]',
    upvotes: '.post-upvotes, .story-upvotes, .upvote-count',
    comments: '.post-comments, .story-comments, .comment-count',
    timestamp: '.post-timestamp, .story-timestamp, .time-ago',
    content: '.post-content, .story-content, .post-body',
    
    // Navigation and loading
    loadMoreButton: '.load-more, .show-more, button[data-testid="load-more"]',
    loadingIndicator: '.loading, .spinner, [data-testid="loading"]'
  },

  // Error handling
  errorHandling: {
    maxRetries: 3,
    retryDelay: 5000,
    continueOnError: true,
    logErrors: true
  },

  // Debug settings
  debug: {
    enabled: process.env.NODE_ENV === 'development',
    verbose: false,
    saveScreenshots: false,
    screenshotDir: 'debug/screenshots'
  }
};

export default config;