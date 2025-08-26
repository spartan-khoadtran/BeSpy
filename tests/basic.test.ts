// Basic test to validate core functionality
import { generatePostId, cleanText, extractTags } from '../src/utils/helpers';
import { DataProcessor } from '../src/processors/data-processor';
import { ReportGenerator } from '../src/reports/report-generator';
import { Post, Category } from '../src/types';

describe('Basic Functionality', () => {
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
    expect(tags.length).toBeGreaterThan(0);
  });

  test('should process mock post data', () => {
    const processor = new DataProcessor();
    const mockPosts: Post[] = [
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
      }
    ];

    const config = {
      categories: ['trending'] as Category[],
      outputDir: './test-output',
      includeContent: true
    };

    const result = processor.processData(mockPosts, config);
    
    expect(result.posts).toHaveLength(1);
    expect(result.duplicatesRemoved).toBe(0);
  });

  test('should generate report from mock data', () => {
    const generator = new ReportGenerator();
    const mockPosts: Post[] = [
      {
        id: '1',
        title: 'How I Built a SaaS in 30 Days',
        content: 'Building a SaaS application requires careful planning...',
        author: 'entrepreneur1',
        url: 'https://indiehackers.com/post/1',
        category: 'milestones',
        timestamp: new Date(),
        engagement: { comments: 25, upvotes: 120, score: 195 },
        tags: ['saas', 'startup'],
        summary: 'A guide on building SaaS applications.'
      }
    ];

    const metadata = {
      timestamp: new Date(),
      categories: ['milestones'] as Category[],
      totalPosts: 1,
      postsPerCategory: { milestones: 1 } as any,
      duplicatesRemoved: 0,
      errors: []
    };

    const reportData = generator.prepareReportData(mockPosts, metadata);
    expect(reportData.summary.totalPosts).toBe(1);

    const markdown = generator.generateMarkdownReport(reportData);
    expect(typeof markdown).toBe('string');
    expect(markdown).toContain('IndieHackers Daily Report');
  });
});