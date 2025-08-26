/**
 * Integration Tests for End-to-End IndieHackers Scraping Workflow
 * Tests complete pipeline from scraping to report generation
 */

const MockIndieHackersScraper = require('../mocks/mock-scraper');
const IndieHackersTestUtils = require('../utils/indiehackers-test-utils');
const path = require('path');
const fs = require('fs').promises;

describe('End-to-End IndieHackers Workflow', () => {
  let scraper;
  let testUtils;
  let testOutputDir;

  beforeEach(async () => {
    scraper = new MockIndieHackersScraper();
    testUtils = new IndieHackersTestUtils();
    testOutputDir = await testUtils.createTestOutputDir('e2e-workflow');
  });

  afterEach(async () => {
    scraper.reset();
    await testUtils.cleanupTestFiles(testOutputDir);
  });

  describe('Complete Scraping Pipeline', () => {
    test('should execute full scraping workflow for all categories', async () => {
      const performanceTest = measurePerformance('full-workflow');
      
      // 1. Scrape all categories
      const scrapedData = await scraper.scrapeAll();
      
      // 2. Process and deduplicate
      const allPosts = Object.values(scrapedData).flat().filter(post => !post.error);
      const processedPosts = scraper.processPosts(allPosts);
      const uniquePosts = scraper.removeDuplicates(processedPosts);
      
      // 3. Generate report
      const report = scraper.generateReport(scrapedData);
      
      // 4. Validate results
      expect(scrapedData).toBeDefined();
      expect(Object.keys(scrapedData).length).toBeGreaterThan(0);
      expect(uniquePosts.length).toBeGreaterThan(0);
      expect(report).toBeDefined();
      expect(report.metadata).toBeDefined();
      expect(report.summary).toBeDefined();
      expect(report.top_posts).toBeDefined();
      
      const performanceResults = performanceTest.end();
      expect(parseFloat(performanceResults.duration)).toBeLessThan(5000); // Less than 5 seconds
    });

    test('should handle mixed success/failure scenarios', async () => {
      const partialFailureScraper = new MockIndieHackersScraper({
        failureRate: 0.3 // 30% failure rate
      });

      const scrapedData = await partialFailureScraper.scrapeAll();
      
      // Should have both successful results and errors
      const successfulCategories = Object.entries(scrapedData)
        .filter(([, posts]) => Array.isArray(posts));
      const failedCategories = Object.entries(scrapedData)
        .filter(([, result]) => result.error);

      expect(successfulCategories.length).toBeGreaterThan(0);
      expect(failedCategories.length).toBeGreaterThan(0);
      
      // Should still generate a valid report
      const report = partialFailureScraper.generateReport(scrapedData);
      expect(report).toBeDefined();
      expect(report.errors).toBeDefined();
      expect(report.errors.length).toBe(failedCategories.length);
    });

    test('should maintain data flow integrity throughout pipeline', async () => {
      const scrapedData = await scraper.scrapeAll();
      const allPosts = Object.values(scrapedData).flat().filter(post => !post.error);
      
      // Track a specific post through the pipeline
      const trackingPost = allPosts[0];
      const originalId = trackingPost.id;
      const originalTitle = trackingPost.title;
      
      // Process posts
      const processedPosts = scraper.processPosts(allPosts);
      const trackedAfterProcessing = processedPosts.find(p => p.id === originalId);
      
      expect(trackedAfterProcessing).toBeDefined();
      expect(trackedAfterProcessing.title).toBe(originalTitle);
      expect(trackedAfterProcessing).toHaveProperty('engagement_score');
      expect(trackedAfterProcessing).toHaveProperty('processed_at');
      
      // Remove duplicates
      const uniquePosts = scraper.removeDuplicates(processedPosts);
      const trackedAfterDeduplication = uniquePosts.find(p => p.id === originalId);
      
      if (trackedAfterDeduplication) {
        expect(trackedAfterDeduplication.title).toBe(originalTitle);
        expect(trackedAfterDeduplication).toHaveProperty('engagement_score');
      }
      
      // Generate report
      const report = scraper.generateReport(scrapedData);
      const trackedInReport = report.top_posts.find(p => p.id === originalId);
      
      if (trackedInReport) {
        expect(trackedInReport.title).toBe(originalTitle);
      }
    });

    test('should handle empty category responses gracefully', async () => {
      const emptyScraper = new MockIndieHackersScraper();
      // Mock empty responses
      jest.spyOn(emptyScraper, 'scrapeCategory').mockResolvedValue([]);
      
      const scrapedData = await emptyScraper.scrapeAll();
      const report = emptyScraper.generateReport(scrapedData);
      
      expect(report).toBeDefined();
      expect(report.metadata.total_posts).toBe(0);
      expect(report.summary.total_posts_analyzed).toBe(0);
      expect(report.top_posts).toEqual([]);
    });
  });

  describe('Category-Specific Workflows', () => {
    test('should process starting-up category end-to-end', async () => {
      const posts = await scraper.scrapeCategory('starting-up');
      const processedPosts = scraper.processPosts(posts);
      const uniquePosts = scraper.removeDuplicates(processedPosts);
      
      expect(posts.length).toBeGreaterThan(0);
      expect(processedPosts.length).toBe(posts.length);
      expect(uniquePosts.length).toBeLessThanOrEqual(posts.length);
      
      // Validate all posts are from the correct category
      uniquePosts.forEach(post => {
        expect(post.category).toBe('starting-up');
        const validation = testUtils.validatePostStructure(post);
        expect(validation.valid).toBe(true);
      });
    });

    test('should process tech category with proper sorting', async () => {
      const posts = await scraper.scrapeCategory('tech');
      const processedPosts = scraper.processPosts(posts);
      
      // Verify posts are sorted by engagement score
      for (let i = 1; i < processedPosts.length; i++) {
        expect(processedPosts[i-1].engagement_score)
          .toBeGreaterThanOrEqual(processedPosts[i].engagement_score);
      }
    });

    test('should handle AI category with trend analysis', async () => {
      const posts = await scraper.scrapeCategory('artificial-intelligence');
      const trends = scraper.analyzeTrends(posts);
      
      expect(trends).toBeDefined();
      expect(trends.topTags).toBeDefined();
      expect(trends.topThemes).toBeDefined();
      expect(Array.isArray(trends.topTags)).toBe(true);
      expect(Array.isArray(trends.topThemes)).toBe(true);
    });
  });

  describe('Report Generation Pipeline', () => {
    test('should generate complete markdown report', async () => {
      const scrapedData = await scraper.scrapeAll();
      const report = scraper.generateReport(scrapedData);
      
      // Convert to markdown (this would be implemented in actual scraper)
      const markdownContent = generateMarkdownFromReport(report);
      
      const validation = testUtils.validateMarkdownReport(markdownContent);
      expect(validation.valid).toBe(true);
      expect(validation.errors.length).toBe(0);
      
      // Save and validate file
      const reportPath = path.join(testOutputDir, 'test-report.md');
      await fs.writeFile(reportPath, markdownContent);
      
      const savedContent = await fs.readFile(reportPath, 'utf-8');
      expect(savedContent).toBe(markdownContent);
    });

    test('should include all required report sections', async () => {
      const scrapedData = await scraper.scrapeAll();
      const report = scraper.generateReport(scrapedData);
      
      // Validate report structure matches PRD
      const validation = testUtils.validateReportStructure(report);
      expect(validation.valid).toBe(true);
      
      // Check specific requirements
      expect(report.summary.total_posts_analyzed).toBeGreaterThan(0);
      expect(report.summary.top_engagement_category).toBeDefined();
      expect(Array.isArray(report.summary.trending_topics)).toBe(true);
      expect(Array.isArray(report.top_posts)).toBe(true);
      expect(typeof report.category_breakdown).toBe('object');
      expect(report.trending_themes).toBeDefined();
    });

    test('should prioritize posts correctly in report', async () => {
      const scrapedData = await scraper.scrapeAll();
      const report = scraper.generateReport(scrapedData);
      
      // Top posts should be sorted by engagement score
      const topPosts = report.top_posts;
      for (let i = 1; i < topPosts.length; i++) {
        expect(topPosts[i-1].engagement_score || 0)
          .toBeGreaterThanOrEqual(topPosts[i].engagement_score || 0);
      }
      
      // Should include post details required by PRD
      topPosts.forEach(post => {
        expect(post).toHaveProperty('title');
        expect(post).toHaveProperty('author');
        expect(post).toHaveProperty('category');
        expect(post).toHaveProperty('url');
        expect(post).toHaveProperty('engagement');
      });
    });

    test('should generate category breakdown correctly', async () => {
      const scrapedData = await scraper.scrapeAll();
      const report = scraper.generateReport(scrapedData);
      
      const breakdown = report.category_breakdown;
      const categories = Object.keys(breakdown);
      
      expect(categories.length).toBeGreaterThan(0);
      
      categories.forEach(category => {
        const categoryData = breakdown[category];
        if (!categoryData.error) {
          expect(categoryData).toHaveProperty('post_count');
          expect(categoryData).toHaveProperty('avg_engagement');
          expect(categoryData).toHaveProperty('top_post');
          expect(typeof categoryData.post_count).toBe('number');
          expect(typeof categoryData.avg_engagement).toBe('number');
        }
      });
    });
  });

  describe('Error Recovery and Resilience', () => {
    test('should recover from network errors and continue processing', async () => {
      const unreliableScraper = new MockIndieHackersScraper({
        failureRate: 0.5, // 50% failure rate
        mockNetworkLatency: 100
      });

      const scrapedData = await unreliableScraper.scrapeAll();
      
      // Should have some successful results
      const successfulResults = Object.entries(scrapedData)
        .filter(([, posts]) => Array.isArray(posts));
      expect(successfulResults.length).toBeGreaterThan(0);
      
      // Should still generate a report
      const report = unreliableScraper.generateReport(scrapedData);
      expect(report).toBeDefined();
      expect(report.errors).toBeDefined();
    });

    test('should handle timeout scenarios gracefully', async () => {
      const timeoutTest = async () => {
        const slowScraper = new MockIndieHackersScraper({
          mockNetworkLatency: 100
        });

        const startTime = Date.now();
        const result = await Promise.race([
          slowScraper.scrapeAll(),
          new Promise(resolve => setTimeout(() => resolve({ timeout: true }), 2000))
        ]);
        const elapsed = Date.now() - startTime;
        
        // Should either complete successfully or timeout gracefully
        expect(result).toBeDefined();
        expect(elapsed).toBeLessThan(3000);
      };

      await timeoutTest();
    });

    test('should maintain data consistency during error recovery', async () => {
      const flakyScaper = new MockIndieHackersScraper({
        failureRate: 0.3
      });

      // Multiple attempts should be consistent for successful categories
      const results = [];
      for (let i = 0; i < 3; i++) {
        const data = await flakyScaper.scrapeAll();
        results.push(data);
      }

      // Compare successful results across runs
      const successfulCategories = [];
      results[0] && Object.entries(results[0]).forEach(([category, posts]) => {
        if (Array.isArray(posts)) {
          successfulCategories.push(category);
        }
      });

      // Check consistency for successful categories
      successfulCategories.forEach(category => {
        const categoryResults = results
          .map(result => result[category])
          .filter(posts => Array.isArray(posts));
        
        if (categoryResults.length > 1) {
          // Should have consistent post structures
          categoryResults.forEach(posts => {
            posts.forEach(post => {
              const validation = testUtils.validatePostStructure(post);
              expect(validation.valid).toBe(true);
            });
          });
        }
      });
    });
  });

  describe('Performance and Scalability', () => {
    test('should complete full workflow within time limits', async () => {
      const performanceTest = measurePerformance('full-pipeline-performance');
      
      const scrapedData = await scraper.scrapeAll();
      const allPosts = Object.values(scrapedData).flat().filter(post => !post.error);
      const processedPosts = scraper.processPosts(allPosts);
      const uniquePosts = scraper.removeDuplicates(processedPosts);
      const trends = scraper.analyzeTrends(uniquePosts);
      const report = scraper.generateReport(scrapedData);
      
      const results = performanceTest.end();
      
      expect(parseFloat(results.duration)).toBeLessThan(3000); // Less than 3 seconds
      expect(parseFloat(results.memoryDelta)).toBeLessThan(100); // Less than 100MB
      expect(report).toBeDefined();
    });

    test('should handle concurrent category processing', async () => {
      const categories = ['starting-up', 'tech', 'creators'];
      const startTime = Date.now();
      
      // Process categories concurrently
      const promises = categories.map(category => 
        scraper.scrapeCategory(category)
      );
      
      const results = await Promise.all(promises);
      const elapsed = Date.now() - startTime;
      
      expect(results.length).toBe(3);
      results.forEach((posts, index) => {
        expect(Array.isArray(posts)).toBe(true);
        posts.forEach(post => {
          expect(post.category).toBe(categories[index]);
        });
      });
      
      // Should be faster than sequential processing
      expect(elapsed).toBeLessThan(1000);
    });

    test('should maintain memory efficiency with large datasets', async () => {
      const largeScraper = new MockIndieHackersScraper();
      
      // Mock large dataset
      const largeData = {};
      testUtils.categories.forEach(category => {
        largeData[category] = testUtils.generatePerformanceTestData(200);
      });
      
      const initialMemory = process.memoryUsage().heapUsed;
      
      const report = largeScraper.generateReport(largeData);
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = (finalMemory - initialMemory) / 1024 / 1024;
      
      expect(report).toBeDefined();
      expect(memoryIncrease).toBeLessThan(200); // Less than 200MB
    });
  });
});

/**
 * Helper function to generate markdown from report object
 * (This would be implemented in the actual scraper)
 */
function generateMarkdownFromReport(report) {
  const date = new Date().toISOString().split('T')[0];
  
  let markdown = `# IndieHackers Daily Report - ${date}\n\n`;
  
  // Executive Summary
  markdown += `## Executive Summary\n`;
  markdown += `- Total posts analyzed: ${report.summary.total_posts_analyzed}\n`;
  markdown += `- Top engagement category: ${report.summary.top_engagement_category}\n`;
  markdown += `- Key trending topics: ${report.summary.trending_topics.join(', ')}\n\n`;
  
  // Top Posts
  markdown += `## Top Posts (Ranked by Engagement)\n\n`;
  report.top_posts.slice(0, 5).forEach((post, index) => {
    markdown += `### ${index + 1}. ${post.title}\n`;
    markdown += `**Author:** @${post.author?.username || 'unknown'}\n`;
    markdown += `**Category:** ${post.category}\n`;
    markdown += `**Engagement:** ${post.engagement?.comments || 0} comments, ${post.engagement?.upvotes || 0} upvotes\n`;
    markdown += `**URL:** ${post.url}\n`;
    markdown += `**Summary:** ${post.content_preview || 'No preview available'}\n\n`;
    markdown += `---\n\n`;
  });
  
  // Category Breakdown
  markdown += `## Category Breakdown\n\n`;
  Object.entries(report.category_breakdown).forEach(([category, data]) => {
    if (!data.error) {
      markdown += `### ${category} (${data.post_count} posts)\n`;
      if (data.top_post) {
        markdown += `- [${data.top_post.title}](${data.top_post.url}) - ${data.top_post.engagement_score || 0} engagement score\n`;
      }
      markdown += `\n`;
    }
  });
  
  // Trending Themes
  markdown += `## Trending Themes\n`;
  if (report.trending_themes?.topThemes) {
    report.trending_themes.topThemes.forEach((theme, index) => {
      markdown += `${index + 1}. **${theme.item}** - Mentioned in ${theme.count} posts\n`;
    });
  }
  
  return markdown;
}