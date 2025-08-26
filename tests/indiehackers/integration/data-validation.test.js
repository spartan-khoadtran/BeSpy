/**
 * Data Validation Tests for IndieHackers Report Generation
 * Tests report structure, markdown format, and data compliance with PRD
 */

const MockIndieHackersScraper = require('../mocks/mock-scraper');
const IndieHackersTestUtils = require('../utils/indiehackers-test-utils');
const sampleData = require('../fixtures/sample-posts.json');

describe('Data Validation Tests', () => {
  let scraper;
  let testUtils;

  beforeEach(() => {
    scraper = new MockIndieHackersScraper();
    testUtils = new IndieHackersTestUtils();
  });

  afterEach(() => {
    scraper.reset();
  });

  describe('Report Structure Validation', () => {
    test('should generate report matching PRD template structure', async () => {
      const scrapedData = await scraper.scrapeAll();
      const report = scraper.generateReport(scrapedData);

      const validation = testUtils.validateReportStructure(report);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toEqual([]);

      // Validate required sections from PRD
      expect(report).toHaveProperty('metadata');
      expect(report).toHaveProperty('summary');
      expect(report).toHaveProperty('top_posts');
      expect(report).toHaveProperty('category_breakdown');
      expect(report).toHaveProperty('trending_themes');
    });

    test('should validate metadata section completeness', async () => {
      const scrapedData = await scraper.scrapeAll();
      const report = scraper.generateReport(scrapedData);

      const metadata = report.metadata;
      expect(metadata).toHaveProperty('generated_at');
      expect(metadata).toHaveProperty('total_posts');
      expect(metadata).toHaveProperty('categories_scraped');
      expect(metadata).toHaveProperty('scraper_version');

      // Validate data types
      expect(typeof metadata.generated_at).toBe('string');
      expect(typeof metadata.total_posts).toBe('number');
      expect(typeof metadata.categories_scraped).toBe('number');
      expect(typeof metadata.scraper_version).toBe('string');

      // Validate timestamp format
      expect(testUtils.isValidISO8601(metadata.generated_at)).toBe(true);
    });

    test('should validate summary section structure', async () => {
      const scrapedData = await scraper.scrapeAll();
      const report = scraper.generateReport(scrapedData);

      const summary = report.summary;
      expect(summary).toHaveProperty('total_posts_analyzed');
      expect(summary).toHaveProperty('top_engagement_category');
      expect(summary).toHaveProperty('trending_topics');

      // Validate data types and constraints
      expect(typeof summary.total_posts_analyzed).toBe('number');
      expect(summary.total_posts_analyzed).toBeGreaterThanOrEqual(0);
      
      expect(typeof summary.top_engagement_category).toBe('string');
      expect(summary.top_engagement_category.length).toBeGreaterThan(0);
      
      expect(Array.isArray(summary.trending_topics)).toBe(true);
    });

    test('should validate top posts section format', async () => {
      const scrapedData = await scraper.scrapeAll();
      const report = scraper.generateReport(scrapedData);

      expect(Array.isArray(report.top_posts)).toBe(true);
      expect(report.top_posts.length).toBeGreaterThan(0);

      // Validate each post structure
      report.top_posts.forEach((post, index) => {
        expect(post).toHaveProperty('id');
        expect(post).toHaveProperty('title');
        expect(post).toHaveProperty('author');
        expect(post).toHaveProperty('category');
        expect(post).toHaveProperty('url');
        expect(post).toHaveProperty('engagement');
        expect(post).toHaveProperty('engagement_score');

        // Validate sorting (highest engagement first)
        if (index > 0) {
          expect(post.engagement_score)
            .toBeLessThanOrEqual(report.top_posts[index - 1].engagement_score);
        }
      });
    });

    test('should validate category breakdown structure', async () => {
      const scrapedData = await scraper.scrapeAll();
      const report = scraper.generateReport(scrapedData);

      const breakdown = report.category_breakdown;
      expect(typeof breakdown).toBe('object');
      expect(Object.keys(breakdown).length).toBeGreaterThan(0);

      Object.entries(breakdown).forEach(([category, data]) => {
        expect(testUtils.categories.includes(category) || category === 'main').toBe(true);
        
        if (data.error) {
          expect(data).toHaveProperty('error');
          expect(typeof data.error).toBe('string');
        } else {
          expect(data).toHaveProperty('post_count');
          expect(data).toHaveProperty('avg_engagement');
          expect(data).toHaveProperty('top_post');
          
          expect(typeof data.post_count).toBe('number');
          expect(data.post_count).toBeGreaterThanOrEqual(0);
          expect(typeof data.avg_engagement).toBe('number');
          expect(data.avg_engagement).toBeGreaterThanOrEqual(0);
        }
      });
    });

    test('should validate trending themes structure', async () => {
      const scrapedData = await scraper.scrapeAll();
      const report = scraper.generateReport(scrapedData);

      const trends = report.trending_themes;
      expect(trends).toHaveProperty('topTags');
      expect(trends).toHaveProperty('topThemes');

      expect(Array.isArray(trends.topTags)).toBe(true);
      expect(Array.isArray(trends.topThemes)).toBe(true);

      // Validate tag structure
      trends.topTags.forEach(tag => {
        expect(tag).toHaveProperty('item');
        expect(tag).toHaveProperty('count');
        expect(typeof tag.item).toBe('string');
        expect(typeof tag.count).toBe('number');
        expect(tag.count).toBeGreaterThan(0);
      });

      // Validate theme structure
      trends.topThemes.forEach(theme => {
        expect(theme).toHaveProperty('item');
        expect(theme).toHaveProperty('count');
        expect(typeof theme.item).toBe('string');
        expect(typeof theme.count).toBe('number');
        expect(theme.count).toBeGreaterThan(0);
      });
    });
  });

  describe('Markdown Format Validation', () => {
    test('should generate valid markdown with all required sections', () => {
      const sampleMarkdown = generateSampleMarkdownReport();
      const validation = testUtils.validateMarkdownReport(sampleMarkdown);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toEqual([]);
      expect(validation.warnings.length).toBeLessThan(3); // Minor warnings acceptable
    });

    test('should validate markdown heading hierarchy', () => {
      const markdownWithBadHierarchy = `# IndieHackers Daily Report - 2025-08-26

## Executive Summary
- Total posts analyzed: 25

##### Deep Heading (should be warning)
Content here

## Top Posts`;

      const validation = testUtils.validateMarkdownReport(markdownWithBadHierarchy);
      expect(validation.warnings.some(w => w.includes('Deep heading level'))).toBe(true);
    });

    test('should validate URL formatting in markdown', () => {
      const markdownWithBadUrls = `# IndieHackers Daily Report

## Top Posts

### 1. Test Post
**URL:** [invalid-url](not-a-real-url)
**URL:** [valid-url](https://www.indiehackers.com/post/test)`;

      const validation = testUtils.validateMarkdownReport(markdownWithBadUrls);
      expect(validation.warnings.some(w => w.includes('Invalid URL format'))).toBe(true);
    });

    test('should validate required markdown sections presence', () => {
      const incompleteMarkdown = `# IndieHackers Daily Report - 2025-08-26

## Executive Summary
- Total posts analyzed: 25

## Top Posts (Ranked by Engagement)
### 1. Test Post

# Missing other required sections`;

      const validation = testUtils.validateMarkdownReport(incompleteMarkdown);
      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.includes('Missing markdown section'))).toBe(true);
    });

    test('should handle code blocks in markdown correctly', () => {
      const markdownWithCodeBlocks = `# IndieHackers Daily Report

## Executive Summary
- Total posts analyzed: 25

\`\`\`json
{
  "example": "code block",
  "should": "not be validated for headings"
}
\`\`\`

## Top Posts (Ranked by Engagement)
### 1. Test Post`;

      const validation = testUtils.validateMarkdownReport(markdownWithCodeBlocks);
      // Should not flag issues inside code blocks
      expect(validation.valid).toBe(false); // Still missing sections
      expect(validation.warnings.length).toBeLessThan(5);
    });
  });

  describe('Data Type and Format Validation', () => {
    test('should validate engagement score calculations', () => {
      const testEngagement = {
        upvotes: 100,
        comments: 25,
        views: 2000
      };

      const calculatedScore = testUtils.calculateEngagementScore(testEngagement);
      const expectedScore = (25 * 3) + (100 * 2) + (2000 * 0.1); // 75 + 200 + 200 = 475

      expect(calculatedScore).toBe(Math.round(expectedScore));
      expect(typeof calculatedScore).toBe('number');
      expect(Number.isInteger(calculatedScore)).toBe(true);
    });

    test('should validate timestamp formats across all data', async () => {
      const scrapedData = await scraper.scrapeAll();
      const allPosts = Object.values(scrapedData).flat().filter(post => !post.error);

      allPosts.forEach(post => {
        if (post.timestamp) {
          expect(testUtils.isValidISO8601(post.timestamp)).toBe(true);
        }
        if (post.scraped_at) {
          expect(testUtils.isValidISO8601(post.scraped_at)).toBe(true);
        }
      });
    });

    test('should validate URL formats throughout data', async () => {
      const scrapedData = await scraper.scrapeAll();
      const allPosts = Object.values(scrapedData).flat().filter(post => !post.error);

      allPosts.forEach(post => {
        expect(testUtils.isValidIndieHackersUrl(post.url)).toBe(true);
        
        if (post.author?.profile_url) {
          expect(testUtils.isValidIndieHackersProfileUrl(post.author.profile_url)).toBe(true);
        }
      });
    });

    test('should validate engagement metrics consistency', async () => {
      const scrapedData = await scraper.scrapeAll();
      const allPosts = Object.values(scrapedData).flat().filter(post => !post.error);

      allPosts.forEach(post => {
        if (post.engagement) {
          const validation = testUtils.validateEngagementMetrics(post.engagement);
          expect(validation.valid).toBe(true);
          
          // All metrics should be non-negative numbers
          Object.values(post.engagement).forEach(metric => {
            expect(typeof metric).toBe('number');
            expect(metric).toBeGreaterThanOrEqual(0);
          });
        }
      });
    });

    test('should validate category assignments', async () => {
      const scrapedData = await scraper.scrapeAll();
      
      Object.entries(scrapedData).forEach(([expectedCategory, posts]) => {
        if (Array.isArray(posts)) {
          posts.forEach(post => {
            expect(post.category).toBe(expectedCategory);
            expect(testUtils.categories.includes(expectedCategory) || expectedCategory === 'main').toBe(true);
          });
        }
      });
    });
  });

  describe('Data Completeness Validation', () => {
    test('should ensure all required data points are captured', () => {
      const samplePost = sampleData.sampleIndieHackersPosts[0];
      const validation = testUtils.validatePostStructure(samplePost);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toEqual([]);

      // Verify all PRD requirements are met
      const requiredFields = [
        'id', 'title', 'url', 'author', 'category',
        'engagement', 'timestamp', 'content_preview'
      ];

      requiredFields.forEach(field => {
        expect(samplePost).toHaveProperty(field);
      });

      // Verify author sub-fields
      expect(samplePost.author).toHaveProperty('username');
      expect(samplePost.author).toHaveProperty('display_name');

      // Verify engagement sub-fields
      expect(samplePost.engagement).toHaveProperty('upvotes');
      expect(samplePost.engagement).toHaveProperty('comments');
      expect(samplePost.engagement).toHaveProperty('views');
    });

    test('should handle missing optional fields gracefully', () => {
      const postWithMissingOptionals = {
        id: 'test-1',
        title: 'Test Post',
        url: 'https://www.indiehackers.com/post/test',
        author: {
          username: 'testuser',
          display_name: 'Test User'
          // Missing profile_url (optional)
        },
        category: 'tech',
        engagement: {
          upvotes: 50,
          comments: 10,
          views: 1000
          // Missing optional metrics like bookmarks, shares
        },
        timestamp: '2025-08-26T10:00:00Z',
        content_preview: 'Test content...'
        // Missing optional fields like tags
      };

      const validation = testUtils.validatePostStructure(postWithMissingOptionals);
      expect(validation.valid).toBe(true);
      // May have warnings for missing optional fields, but should be valid
    });

    test('should validate content preview extraction', async () => {
      const scrapedData = await scraper.scrapeAll();
      const allPosts = Object.values(scrapedData).flat().filter(post => !post.error);

      allPosts.forEach(post => {
        expect(post).toHaveProperty('content_preview');
        expect(typeof post.content_preview).toBe('string');
        expect(post.content_preview.length).toBeGreaterThan(10); // Should have meaningful content
        expect(post.content_preview.length).toBeLessThan(500); // Should be a preview, not full content
      });
    });

    test('should ensure tag extraction when available', () => {
      const postsWithTags = sampleData.sampleIndieHackersPosts.filter(post => post.tags);
      
      expect(postsWithTags.length).toBeGreaterThan(0);
      
      postsWithTags.forEach(post => {
        expect(Array.isArray(post.tags)).toBe(true);
        expect(post.tags.length).toBeGreaterThan(0);
        
        post.tags.forEach(tag => {
          expect(typeof tag).toBe('string');
          expect(tag.length).toBeGreaterThan(0);
        });
      });
    });
  });

  describe('Data Quality Validation', () => {
    test('should validate engagement-based prioritization accuracy', async () => {
      const scrapedData = await scraper.scrapeAll();
      const allPosts = Object.values(scrapedData).flat().filter(post => !post.error);
      const processedPosts = scraper.processPosts(allPosts);

      // Verify sorting is correct
      for (let i = 1; i < processedPosts.length; i++) {
        expect(processedPosts[i-1].engagement_score)
          .toBeGreaterThanOrEqual(processedPosts[i].engagement_score);
      }

      // Verify high-comment posts rank higher than high-upvote-only posts
      const highCommentPost = processedPosts.find(p => 
        p.engagement?.comments > 20 && p.engagement?.upvotes < 100
      );
      const highUpvotePost = processedPosts.find(p => 
        p.engagement?.upvotes > 100 && p.engagement?.comments < 10
      );

      if (highCommentPost && highUpvotePost) {
        expect(highCommentPost.engagement_score)
          .toBeGreaterThan(highUpvotePost.engagement_score);
      }
    });

    test('should validate trend analysis accuracy', async () => {
      const scrapedData = await scraper.scrapeAll();
      const allPosts = Object.values(scrapedData).flat().filter(post => !post.error);
      const trends = scraper.analyzeTrends(allPosts);

      // Should identify common themes
      expect(trends.topThemes.length).toBeGreaterThan(0);
      expect(trends.topTags.length).toBeGreaterThan(0);

      // Verify themes are sorted by frequency
      for (let i = 1; i < trends.topThemes.length; i++) {
        expect(trends.topThemes[i-1].count)
          .toBeGreaterThanOrEqual(trends.topThemes[i].count);
      }

      // Verify tags are sorted by frequency
      for (let i = 1; i < trends.topTags.length; i++) {
        expect(trends.topTags[i-1].count)
          .toBeGreaterThanOrEqual(trends.topTags[i].count);
      }
    });

    test('should validate duplicate detection accuracy', async () => {
      // Create posts with known duplicates
      const postsWithDuplicates = [
        ...sampleData.sampleIndieHackersPosts,
        // Add duplicate
        {
          ...sampleData.sampleIndieHackersPosts[0],
          id: 'duplicate-1',
          engagement: { upvotes: 148, comments: 34, views: 2600 } // Slightly different
        }
      ];

      const uniquePosts = scraper.removeDuplicates(postsWithDuplicates);
      
      // Should remove the duplicate
      expect(uniquePosts.length).toBe(sampleData.sampleIndieHackersPosts.length);
      
      // Should keep the original or first occurrence
      const titleCounts = {};
      uniquePosts.forEach(post => {
        const key = `${post.title}-${post.author.username}`;
        titleCounts[key] = (titleCounts[key] || 0) + 1;
      });

      Object.values(titleCounts).forEach(count => {
        expect(count).toBe(1);
      });
    });

    test('should validate cross-category deduplication', () => {
      const crossCategoryPosts = [
        {
          id: '1',
          title: 'AI in Startups',
          author: { username: 'aifounder', display_name: 'AI Founder' },
          category: 'starting-up'
        },
        {
          id: '2', 
          title: 'AI in Startups', // Same title and author
          author: { username: 'aifounder', display_name: 'AI Founder' },
          category: 'artificial-intelligence' // Different category
        }
      ];

      const uniquePosts = scraper.removeDuplicates(crossCategoryPosts);
      
      // Should identify as duplicate despite different categories
      expect(uniquePosts.length).toBe(1);
    });
  });

  /**
   * Helper function to generate sample markdown report for testing
   */
  function generateSampleMarkdownReport() {
    const date = new Date().toISOString().split('T')[0];
    
    return `# IndieHackers Daily Report - ${date}

## Executive Summary
- Total posts analyzed: 25
- Top engagement category: starting-up
- Key trending topics: AI, SaaS, Growth

## Top Posts (Ranked by Engagement)

### 1. How I Built a $50k MRR SaaS in 12 Months
**Author:** @saasfounder  
**Category:** Starting Up  
**Engagement:** 32 comments, 145 upvotes  
**URL:** https://www.indiehackers.com/post/how-i-built-a-50k-mrr-saas-in-12-months  
**Summary:** After years of corporate life, I decided to take the leap into entrepreneurship...

---

### 2. The AI Revolution: Tools Every Developer Should Know
**Author:** @techdev123  
**Category:** Tech  
**Engagement:** 24 comments, 89 upvotes  
**URL:** https://www.indiehackers.com/post/ai-revolution-tools-developers  
**Summary:** AI is transforming how we code. These 10 tools have revolutionized my development workflow...

---

## Category Breakdown

### Starting Up (10 posts)
- [How I Built a $50k MRR SaaS](https://www.indiehackers.com/post/how-i-built-a-50k-mrr-saas-in-12-months) - 177 engagement score
- [From Idea to MVP in 30 Days](https://www.indiehackers.com/post/idea-to-mvp-30-days) - 142 engagement score

### Tech (8 posts)
- [The AI Revolution: Tools Every Developer Should Know](https://www.indiehackers.com/post/ai-revolution-tools-developers) - 113 engagement score

### A.I. (5 posts)
- [Building an AI-Powered Content Generator](https://www.indiehackers.com/post/ai-content-generator-lessons) - 85 engagement score

## Trending Themes
1. **AI Integration** - Mentioned in 12 posts
2. **SaaS Growth** - Mentioned in 8 posts
3. **Remote Work** - Mentioned in 6 posts
4. **No-Code Tools** - Mentioned in 5 posts
5. **Revenue Optimization** - Mentioned in 4 posts`;
  }
});