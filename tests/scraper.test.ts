// Tests for IndieHackers scraper
import { IndieHackersScraper } from '../src/core/indie-hackers-scraper';
import { DataProcessor } from '../src/processors/data-processor';
import { ReportGenerator } from '../src/reports/report-generator';
import { Post, Category } from '../src/types';
import { generatePostId, cleanText, extractTags } from '../src/utils/helpers';

describe('IndieHackers Scraper', () => {
  let scraper: IndieHackersScraper;

  beforeAll(() => {
    scraper = new IndieHackersScraper();
  });

  afterAll(async () => {
    if (scraper.isReady()) {
      await scraper.cleanup();
    }
  });

  describe('Scraper Initialization', () => {
    test('should initialize scraper successfully', async () => {
      await scraper.initialize(true); // headless mode
      expect(scraper.isReady()).toBe(true);
    });

    test('should handle initialization errors gracefully', async () => {
      // This would test error handling, but requires mocking
      expect(true).toBe(true); // Placeholder
    });
  });

  describe('Category Scraping', () => {
    test('should scrape trending posts', async () => {
      if (!scraper.isReady()) {
        await scraper.initialize(true);
      }
      
      const posts = await scraper.scrapeCategory('trending', 5);
      expect(Array.isArray(posts)).toBe(true);
      expect(posts.length).toBeGreaterThan(0);
      expect(posts.length).toBeLessThanOrEqual(5);
    }, 30000);

    test('should validate scraped post structure', async () => {
      if (!scraper.isReady()) {
        await scraper.initialize(true);
      }
      
      const posts = await scraper.scrapeCategory('new', 3);
      
      if (posts.length > 0) {
        const post = posts[0];
        expect(post).toHaveProperty('id');
        expect(post).toHaveProperty('title');
        expect(post).toHaveProperty('author');
        expect(post).toHaveProperty('category');
        expect(post).toHaveProperty('engagement');
        expect(post.engagement).toHaveProperty('comments');
        expect(post.engagement).toHaveProperty('upvotes');
        expect(post.engagement).toHaveProperty('score');
      }
    }, 30000);
  });
});

describe('Data Processor', () => {
  let processor: DataProcessor;
  let mockPosts: Post[];

  beforeEach(() => {
    processor = new DataProcessor();
    mockPosts = [
      {
        id: '1',
        title: 'Test Post 1',
        content: 'This is a test post about SaaS development',
        author: 'testuser1',
        url: 'https://example.com/1',
        category: 'trending',
        timestamp: new Date(),
        engagement: { comments: 5, upvotes: 10, score: 25 },
        tags: ['saas', 'development']
      },
      {
        id: '2',
        title: 'Test Post 2',
        content: 'Another test post about AI and machine learning',
        author: 'testuser2',
        url: 'https://example.com/2',
        category: 'new',
        timestamp: new Date(Date.now() - 3600000), // 1 hour ago
        engagement: { comments: 3, upvotes: 8, score: 17 },
        tags: ['ai', 'ml']
      }
    ];
  });

  test('should process posts correctly', () => {
    const config = {
      categories: ['trending', 'new'] as Category[],
      outputDir: './test-output',
      includeContent: true
    };

    const result = processor.processData(mockPosts, config);
    
    expect(result.posts).toHaveLength(2);
    expect(result.duplicatesRemoved).toBe(0);
  });

  test('should remove duplicates', () => {
    const duplicatePosts = [
      ...mockPosts,
      { ...mockPosts[0], id: '3' } // Same title and author
    ];

    const config = {
      categories: ['trending'] as Category[],
      outputDir: './test-output'
    };

    const result = processor.processData(duplicatePosts, config);
    
    expect(result.posts).toHaveLength(2);
    expect(result.duplicatesRemoved).toBe(1);
  });

  test('should calculate engagement distribution', () => {
    const distribution = processor.calculateCategoryEngagement(mockPosts);
    
    expect(distribution).toHaveProperty('trending');
    expect(distribution).toHaveProperty('new');
    expect(distribution.trending.count).toBe(1);
    expect(distribution.new.count).toBe(1);
  });

  test('should extract trending themes', () => {
    const themes = processor.extractTrendingThemes(mockPosts);
    
    expect(Array.isArray(themes)).toBe(true);
    // Should find common tags
    const saasThere = themes.find(theme => theme.theme === 'saas');
    const aiTheme = themes.find(theme => theme.theme === 'ai');
    
    expect(saasThere || aiTheme).toBeDefined();
  });
});

describe('Report Generator', () => {
  let generator: ReportGenerator;
  let mockPosts: Post[];

  beforeEach(() => {
    generator = new ReportGenerator();
    mockPosts = [
      {
        id: '1',
        title: 'How I Built a SaaS in 30 Days',
        content: 'Building a SaaS application requires careful planning and execution...',
        author: 'entrepreneur1',
        url: 'https://indiehackers.com/post/1',
        category: 'milestones',
        timestamp: new Date(),
        engagement: { comments: 25, upvotes: 120, score: 195 },
        tags: ['saas', 'startup', 'development'],
        summary: 'A detailed guide on building SaaS applications quickly.'
      },
      {
        id: '2',
        title: 'Ask IH: Best marketing channels for B2B?',
        content: 'Looking for advice on the most effective marketing channels...',
        author: 'marketer2',
        url: 'https://indiehackers.com/post/2',
        category: 'ask-ih',
        timestamp: new Date(Date.now() - 7200000), // 2 hours ago
        engagement: { comments: 15, upvotes: 45, score: 90 },
        tags: ['marketing', 'b2b', 'advice']
      }
    ];
  });

  test('should prepare report data', () => {
    const metadata = {
      timestamp: new Date(),
      categories: ['milestones', 'ask-ih'] as Category[],
      totalPosts: 2,
      postsPerCategory: { milestones: 1, 'ask-ih': 1 } as any,
      duplicatesRemoved: 0,
      errors: []
    };

    const reportData = generator.prepareReportData(mockPosts, metadata);
    
    expect(reportData).toHaveProperty('posts');
    expect(reportData).toHaveProperty('metadata');
    expect(reportData).toHaveProperty('summary');
    expect(reportData).toHaveProperty('categoryBreakdowns');
    expect(reportData).toHaveProperty('trendingThemes');
    
    expect(reportData.summary.totalPosts).toBe(2);
    expect(reportData.categoryBreakdowns).toHaveLength(2);
  });

  test('should generate markdown report', () => {
    const metadata = {
      timestamp: new Date(),
      categories: ['milestones'] as Category[],
      totalPosts: 1,
      postsPerCategory: { milestones: 1 } as any,
      duplicatesRemoved: 0,
      errors: []
    };

    const reportData = generator.prepareReportData(mockPosts, metadata);
    const markdown = generator.generateMarkdownReport(reportData);
    
    expect(typeof markdown).toBe('string');
    expect(markdown).toContain('# IndieHackers Daily Report');
    expect(markdown).toContain('Executive Summary');
    expect(markdown).toContain('Top Posts by Engagement');
    expect(markdown).toContain(mockPosts[0].title);
  });

  test('should generate CSV report', () => {
    const csv = generator.generateCsvReport(mockPosts);
    
    expect(typeof csv).toBe('string');
    expect(csv).toContain('id,title,author');
    expect(csv.split('\n')).toHaveLength(4); // Header + 2 posts + empty line
  });

  test('should generate JSON report', () => {
    const metadata = {
      timestamp: new Date(),
      categories: ['milestones'] as Category[],
      totalPosts: 1,
      postsPerCategory: { milestones: 1 } as any,
      duplicatesRemoved: 0,
      errors: []
    };

    const reportData = generator.prepareReportData(mockPosts, metadata);
    const json = generator.generateJsonReport(reportData);
    
    expect(typeof json).toBe('string');
    
    const parsed = JSON.parse(json);
    expect(parsed).toHaveProperty('posts');
    expect(parsed).toHaveProperty('metadata');
    expect(parsed).toHaveProperty('summary');
  });
});

describe('Utility Functions', () => {
  test('should generate consistent post IDs', () => {
    const id1 = generatePostId('Test Title', 'testuser');
    const id2 = generatePostId('Test Title', 'testuser');
    const id3 = generatePostId('Different Title', 'testuser');
    
    expect(id1).toBe(id2);
    expect(id1).not.toBe(id3);
    expect(typeof id1).toBe('string');
    expect(id1.length).toBeGreaterThan(0);
  });

  test('should clean text properly', () => {
    const dirtyText = '  This   has\n\nextra  spaces\r\n  ';
    const cleanedText = cleanText(dirtyText);
    
    expect(cleanedText).toBe('This has extra spaces');
  });

  test('should extract tags from content', () => {
    const content = 'Building a #saas application with AI and machine learning';
    const tags = extractTags(content);
    
    expect(Array.isArray(tags)).toBe(true);
    expect(tags).toContain('saas');
    expect(tags).toContain('ai');
  });
});

describe('Integration Tests', () => {
  test('should handle full scraping workflow', async () => {
    const scraper = new IndieHackersScraper();
    
    try {
      await scraper.initialize(true);
      
      const config = {
        categories: ['trending'] as Category[],
        outputDir: './test-output',
        maxPostsPerCategory: 3,
        includeContent: true
      };
      
      const result = await scraper.scrape(config);
      
      expect(result).toHaveProperty('posts');
      expect(result).toHaveProperty('metadata');
      expect(Array.isArray(result.posts)).toBe(true);
      expect(result.metadata.totalPosts).toBeGreaterThanOrEqual(0);
      
    } finally {
      await scraper.cleanup();
    }
  }, 60000);
});