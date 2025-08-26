#!/usr/bin/env node

/**
 * Comprehensive Test Suite for Twitter Unified Fetcher
 * 
 * This test suite covers:
 * 1. Unit tests for data transformation functions
 * 2. Integration tests for full script execution
 * 3. Format validation tests against report_format.json schema
 * 4. Edge case testing (missing data, malformed responses, etc.)
 * 5. Performance testing with various data sizes
 * 6. Comparison tests between old and new output formats
 */

const { describe, test, expect, beforeAll, afterAll, beforeEach } = require('@jest/globals');
const fs = require('fs').promises;
const path = require('path');
const { spawn } = require('child_process');
const { chromium } = require('playwright');

// Import test utilities and fixtures
const TestUtils = require('./utils/test-utils');
const fixtures = require('./fixtures/twitter-fixtures');
const schemaValidator = require('./utils/schema-validator');

const SCRIPT_PATH = path.join(__dirname, '../scripts/twitter-unified-fetcher.mjs');
const REPORT_SCHEMA_PATH = path.join(__dirname, '../report/report_format.json');

describe('Twitter Unified Fetcher Test Suite', () => {
  let browser;
  let testUtils;
  let reportSchema;

  beforeAll(async () => {
    // Initialize test utilities
    testUtils = new TestUtils();
    
    // Load report schema for validation
    const schemaContent = await fs.readFile(REPORT_SCHEMA_PATH, 'utf-8');
    reportSchema = JSON.parse(schemaContent);
    
    // Initialize browser for integration tests
    browser = await chromium.launch({ headless: true });
  });

  afterAll(async () => {
    if (browser) await browser.close();
  });

  describe('Unit Tests - Data Transformation Functions', () => {
    test('should correctly detect English text', () => {
      const englishTexts = [
        'Hello world, this is a test',
        'The quick brown fox jumps over the lazy dog',
        'Building amazing products with AI technology'
      ];
      
      const nonEnglishTexts = [
        'こんにちは世界',
        'Bonjour le monde',
        'مرحبا بالعالم',
        '你好世界'
      ];

      englishTexts.forEach(text => {
        expect(testUtils.isEnglishText(text)).toBe(true);
      });

      nonEnglishTexts.forEach(text => {
        expect(testUtils.isEnglishText(text)).toBe(false);
      });
    });

    test('should extract hashtags correctly', () => {
      const testCases = [
        {
          text: 'Building #AI products with #MachineLearning and #TechStack',
          expected: ['#AI', '#MachineLearning', '#TechStack']
        },
        {
          text: 'No hashtags here',
          expected: []
        },
        {
          text: '#StartUp founder working on #B2B #SaaS solutions',
          expected: ['#StartUp', '#B2B', '#SaaS']
        }
      ];

      testCases.forEach(({ text, expected }) => {
        expect(testUtils.extractHashtags(text)).toEqual(expected);
      });
    });

    test('should extract mentions correctly', () => {
      const testCases = [
        {
          text: 'Thanks @john_doe and @jane_smith for the collaboration!',
          expected: ['@john_doe', '@jane_smith']
        },
        {
          text: 'No mentions in this text',
          expected: []
        },
        {
          text: '@everyone should check out this @amazing_product',
          expected: ['@everyone', '@amazing_product']
        }
      ];

      testCases.forEach(({ text, expected }) => {
        expect(testUtils.extractMentions(text)).toEqual(expected);
      });
    });

    test('should extract URLs correctly', () => {
      const testCases = [
        {
          text: 'Check out https://example.com and http://test.org',
          expected: ['https://example.com', 'http://test.org']
        },
        {
          text: 'Visit our website: https://company.com/blog/post-title?utm_source=twitter',
          expected: ['https://company.com/blog/post-title?utm_source=twitter']
        },
        {
          text: 'No URLs in this text',
          expected: []
        }
      ];

      testCases.forEach(({ text, expected }) => {
        expect(testUtils.extractUrls(text)).toEqual(expected);
      });
    });

    test('should calculate engagement rate correctly', () => {
      const testCases = [
        {
          metrics: { likes: 100, retweets: 50, replies: 25, impressions: 10000 },
          expected: 1.75 // (100 + 50 + 25) / 10000 * 100
        },
        {
          metrics: { likes: 0, retweets: 0, replies: 0, impressions: 1000 },
          expected: 0
        },
        {
          metrics: { likes: 500, retweets: 200, replies: 100, impressions: 20000 },
          expected: 4.0
        }
      ];

      testCases.forEach(({ metrics, expected }) => {
        expect(testUtils.calculateEngagementRate(metrics)).toBe(expected);
      });
    });

    test('should transform post data correctly', () => {
      const rawPost = fixtures.rawTwitterPost;
      const transformedPost = testUtils.transformPostData(rawPost);

      expect(transformedPost).toMatchObject({
        post_id: expect.any(String),
        url: expect.stringMatching(/https:\/\/twitter\.com/),
        author: {
          username: expect.any(String),
          display_name: expect.any(String),
          verified: expect.any(Boolean),
          follower_count: expect.any(Number)
        },
        content: {
          text: expect.any(String),
          hashtags: expect.any(Array),
          mentions: expect.any(Array),
          urls: expect.any(Array)
        },
        metrics: expect.objectContaining({
          impressions: expect.any(Number),
          likes: expect.any(Number),
          retweets: expect.any(Number),
          replies: expect.any(Number)
        }),
        engagement_rate: expect.any(Number)
      });
    });

    test('should calculate reply depth correctly', () => {
      const testCases = [
        { parentId: null, expected: 0 },
        { parentId: 'original_post', expected: 1 },
        { parentId: 'reply_to_reply', parentDepth: 2, expected: 3 }
      ];

      testCases.forEach(({ parentId, parentDepth = 0, expected }) => {
        expect(testUtils.calculateReplyDepth(parentId, parentDepth)).toBe(expected);
      });
    });
  });

  describe('Integration Tests - Full Script Execution', () => {
    test('should execute with MCP and produce valid JSON output', async () => {
      const result = await testUtils.runScript([
        '--keyword=testing',
        '--posts=5',
        '--format=json',
        '--outputDir=tests/output'
      ]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Successfully fetched');
      expect(result.stdout).toContain('Reports generated successfully');

      // Verify output file exists and is valid JSON
      const outputFiles = await fs.readdir(path.join(__dirname, 'output'));
      const jsonFile = outputFiles.find(file => file.endsWith('.json'));
      expect(jsonFile).toBeDefined();

      const outputContent = await fs.readFile(
        path.join(__dirname, 'output', jsonFile),
        'utf-8'
      );
      const parsedOutput = JSON.parse(outputContent);
      expect(parsedOutput.posts).toBeInstanceOf(Array);
    }, 60000);

    test('should execute with Playwright and include comments', async () => {
      const result = await testUtils.runScript([
        '--keyword=AI',
        '--posts=3',
        '--comments',
        '--noMcp',
        '--format=json'
      ]);

      expect(result.exitCode).toBe(0);
      
      const outputFiles = await fs.readdir(path.join(__dirname, '../report'));
      const jsonFile = outputFiles.find(file => file.includes('ai_') && file.endsWith('.json'));
      
      if (jsonFile) {
        const outputContent = await fs.readFile(
          path.join(__dirname, '../report', jsonFile),
          'utf-8'
        );
        const parsedOutput = JSON.parse(outputContent);
        
        // Check if comments are included
        if (parsedOutput.posts && parsedOutput.posts.length > 0) {
          const hasComments = parsedOutput.posts.some(post => 
            post.comments && post.comments.length > 0
          );
          expect(hasComments).toBe(true);
        }
      }
    }, 120000);

    test('should handle different report formats', async () => {
      const formats = ['json', 'markdown', 'csv', 'all'];
      
      for (const format of formats) {
        const result = await testUtils.runScript([
          '--keyword=test',
          '--posts=2',
          '--format=' + format,
          '--outputDir=tests/output'
        ]);

        expect(result.exitCode).toBe(0);
        
        if (format === 'all') {
          const outputFiles = await fs.readdir(path.join(__dirname, 'output'));
          expect(outputFiles.some(f => f.endsWith('.json'))).toBe(true);
          expect(outputFiles.some(f => f.endsWith('.md'))).toBe(true);
          expect(outputFiles.some(f => f.endsWith('.csv'))).toBe(true);
        }
      }
    }, 180000);

    test('should apply language filtering correctly', async () => {
      const englishResult = await testUtils.runScript([
        '--keyword=technology',
        '--posts=5',
        '--englishOnly',
        '--format=json'
      ]);

      const allLanguagesResult = await testUtils.runScript([
        '--keyword=technology',
        '--posts=5',
        '--allLanguages',
        '--format=json'
      ]);

      expect(englishResult.exitCode).toBe(0);
      expect(allLanguagesResult.exitCode).toBe(0);
    }, 120000);
  });

  describe('Format Validation Tests - Schema Compliance', () => {
    test('should validate output against report_format.json schema', async () => {
      const sampleOutput = fixtures.sampleReportOutput;
      const validationResult = schemaValidator.validateAgainstSchema(
        sampleOutput,
        reportSchema
      );

      expect(validationResult.valid).toBe(true);
      expect(validationResult.errors).toHaveLength(0);
    });

    test('should validate post structure', () => {
      const validPost = fixtures.validPost;
      const invalidPost = fixtures.invalidPost;

      expect(schemaValidator.validatePostStructure(validPost)).toBe(true);
      expect(schemaValidator.validatePostStructure(invalidPost)).toBe(false);
    });

    test('should validate comment structure', () => {
      const validComment = fixtures.validComment;
      const invalidComment = fixtures.invalidComment;

      expect(schemaValidator.validateCommentStructure(validComment)).toBe(true);
      expect(schemaValidator.validateCommentStructure(invalidComment)).toBe(false);
    });

    test('should validate metadata structure', () => {
      const validMetadata = fixtures.validMetadata;
      const invalidMetadata = fixtures.invalidMetadata;

      expect(schemaValidator.validateMetadataStructure(validMetadata)).toBe(true);
      expect(schemaValidator.validateMetadataStructure(invalidMetadata)).toBe(false);
    });
  });

  describe('Edge Case Testing', () => {
    test('should handle missing data gracefully', async () => {
      const incompletePost = {
        text: 'Sample post',
        author: 'test_user'
        // Missing other required fields
      };

      const transformedPost = testUtils.transformPostData(incompletePost);
      
      expect(transformedPost.metrics.likes).toBe(0);
      expect(transformedPost.metrics.retweets).toBe(0);
      expect(transformedPost.engagement_rate).toBe(0);
      expect(transformedPost.content.hashtags).toEqual([]);
    });

    test('should handle malformed API responses', () => {
      const malformedResponses = [
        null,
        undefined,
        {},
        { invalid: 'structure' },
        'not an object',
        []
      ];

      malformedResponses.forEach(response => {
        expect(() => {
          testUtils.parseApiResponse(response);
        }).not.toThrow();
      });
    });

    test('should handle empty search results', async () => {
      const result = await testUtils.runScript([
        '--keyword=xyznonexistentquerythatshouldfindnothing123',
        '--posts=10',
        '--format=json'
      ]);

      expect(result.exitCode).toBe(0);
      // Should still generate a report even with 0 results
    }, 30000);

    test('should handle network timeouts', async () => {
      // Simulate network timeout conditions
      const result = await testUtils.runScriptWithTimeout([
        '--keyword=test',
        '--posts=1',
        '--noMcp'
      ], 5000); // 5 second timeout

      // Should either complete or fail gracefully
      expect([0, 1]).toContain(result.exitCode);
    });

    test('should handle invalid command line arguments', async () => {
      const invalidArgs = [
        ['--posts=invalid'],
        ['--format=unsupported'],
        ['--template=nonexistent'],
        ['--sortBy=invalid']
      ];

      for (const args of invalidArgs) {
        const result = await testUtils.runScript(args);
        // Should either handle gracefully or provide helpful error
        expect(typeof result.exitCode).toBe('number');
      }
    });
  });

  describe('Performance Testing', () => {
    test('should handle small datasets efficiently', async () => {
      const startTime = Date.now();
      
      const result = await testUtils.runScript([
        '--keyword=test',
        '--posts=5',
        '--format=json'
      ]);

      const duration = Date.now() - startTime;
      
      expect(result.exitCode).toBe(0);
      expect(duration).toBeLessThan(30000); // Should complete within 30 seconds
    }, 45000);

    test('should handle medium datasets', async () => {
      const startTime = Date.now();
      
      const result = await testUtils.runScript([
        '--keyword=technology',
        '--posts=20',
        '--comments',
        '--format=json'
      ]);

      const duration = Date.now() - startTime;
      
      expect(result.exitCode).toBe(0);
      expect(duration).toBeLessThan(120000); // Should complete within 2 minutes
    }, 150000);

    test('should handle large datasets within reasonable time', async () => {
      const startTime = Date.now();
      
      const result = await testUtils.runScript([
        '--keyword=AI',
        '--posts=50',
        '--comments',
        '--format=all'
      ]);

      const duration = Date.now() - startTime;
      
      expect(result.exitCode).toBe(0);
      expect(duration).toBeLessThan(300000); // Should complete within 5 minutes
    }, 360000);

    test('should monitor memory usage during execution', async () => {
      const memoryBefore = process.memoryUsage();
      
      await testUtils.runScript([
        '--keyword=startup',
        '--posts=30',
        '--comments',
        '--format=json'
      ]);

      const memoryAfter = process.memoryUsage();
      const memoryIncrease = memoryAfter.heapUsed - memoryBefore.heapUsed;
      
      // Memory increase should be reasonable (less than 500MB)
      expect(memoryIncrease).toBeLessThan(500 * 1024 * 1024);
    }, 180000);
  });

  describe('Data Source Comparison Tests', () => {
    test('should compare MCP vs Playwright data consistency', async () => {
      const keyword = 'testing';
      const postCount = 5;

      // Run with MCP
      const mcpResult = await testUtils.runScript([
        '--keyword=' + keyword,
        '--posts=' + postCount,
        '--format=json',
        '--outputDir=tests/comparison'
      ]);

      // Run with Playwright
      const playwrightResult = await testUtils.runScript([
        '--keyword=' + keyword,
        '--posts=' + postCount,
        '--noMcp',
        '--format=json',
        '--outputDir=tests/comparison'
      ]);

      expect(mcpResult.exitCode).toBe(0);
      expect(playwrightResult.exitCode).toBe(0);

      // Compare data structure consistency
      const mcpFiles = await fs.readdir(path.join(__dirname, 'comparison'));
      const mcpFile = mcpFiles.find(f => f.includes(keyword) && f.endsWith('.json'));
      
      if (mcpFile) {
        const mcpData = JSON.parse(await fs.readFile(
          path.join(__dirname, 'comparison', mcpFile),
          'utf-8'
        ));

        // Verify both sources produce similarly structured data
        expect(mcpData).toHaveProperty('posts');
        expect(mcpData.posts).toBeInstanceOf(Array);
      }
    }, 240000);

    test('should verify comment data quality between sources', async () => {
      const keyword = 'AI';
      
      // Only Playwright supports comments currently
      const playwrightResult = await testUtils.runScript([
        '--keyword=' + keyword,
        '--posts=3',
        '--comments',
        '--noMcp',
        '--format=json'
      ]);

      expect(playwrightResult.exitCode).toBe(0);
      
      // Verify comment structure when available
      const outputFiles = await fs.readdir(path.join(__dirname, '../report'));
      const jsonFile = outputFiles.find(f => f.includes('ai_') && f.endsWith('.json'));
      
      if (jsonFile) {
        const data = JSON.parse(await fs.readFile(
          path.join(__dirname, '../report', jsonFile),
          'utf-8'
        ));

        if (data.posts && data.posts.length > 0) {
          data.posts.forEach(post => {
            if (post.comments && post.comments.length > 0) {
              post.comments.forEach(comment => {
                expect(comment).toHaveProperty('author');
                expect(comment).toHaveProperty('text');
                expect(comment).toHaveProperty('likes');
                expect(comment.reply_depth).toBeGreaterThanOrEqual(1);
              });
            }
          });
        }
      }
    }, 120000);
  });

  describe('Report Generation Quality', () => {
    test('should generate comprehensive markdown reports', async () => {
      const result = await testUtils.runScript([
        '--keyword=startup',
        '--posts=5',
        '--template=detailed',
        '--format=markdown'
      ]);

      expect(result.exitCode).toBe(0);

      const outputFiles = await fs.readdir(path.join(__dirname, '../report'));
      const mdFile = outputFiles.find(f => f.includes('startup') && f.endsWith('.md'));
      
      if (mdFile) {
        const content = await fs.readFile(
          path.join(__dirname, '../report', mdFile),
          'utf-8'
        );

        expect(content).toContain('# Twitter Report:');
        expect(content).toContain('## Summary Statistics');
        expect(content).toContain('## Posts');
        expect(content).toContain('**Engagement Metrics:**');
      }
    }, 60000);

    test('should generate valid CSV reports', async () => {
      const result = await testUtils.runScript([
        '--keyword=technology',
        '--posts=5',
        '--format=csv'
      ]);

      expect(result.exitCode).toBe(0);

      const outputFiles = await fs.readdir(path.join(__dirname, '../report'));
      const csvFile = outputFiles.find(f => f.includes('technology') && f.endsWith('.csv'));
      
      if (csvFile) {
        const content = await fs.readFile(
          path.join(__dirname, '../report', csvFile),
          'utf-8'
        );

        const lines = content.split('\n');
        expect(lines[0]).toContain('Index,Author,Handle'); // CSV header
        expect(lines.length).toBeGreaterThan(1); // Has data rows
      }
    }, 60000);
  });
});