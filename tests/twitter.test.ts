import { describe, it, expect } from '@playwright/test';
import { TwitterReport, TwitterPost } from '../playwright-mcp-bespy/src/models/twitter.js';
import { ReportGenerator } from '../playwright-mcp-bespy/src/utils/reportGenerator.js';

describe('Twitter Report Generator', () => {
  it('should generate markdown report', () => {
    const generator = new ReportGenerator('./test-reports');
    
    const mockPosts: TwitterPost[] = [
      {
        id: '1',
        text: 'Test post about AI',
        author: 'Test User',
        authorHandle: 'testuser',
        timestamp: '2025-08-26T10:00:00Z',
        likes: 100,
        retweets: 50,
        impressions: 1000,
        replies: 10,
        url: 'https://twitter.com/testuser/status/1',
        hashtags: ['AI', 'Technology'],
        mentions: ['otheruser']
      }
    ];
    
    const report: TwitterReport = {
      keyword: 'AI',
      fetchedAt: '2025-08-26T10:00:00Z',
      totalPosts: 1,
      posts: mockPosts,
      summary: {
        totalLikes: 100,
        totalRetweets: 50,
        totalImpressions: 1000,
        averageEngagement: 16,
        topAuthor: 'Test User'
      }
    };
    
    const markdown = generator.generateMarkdown(report);
    expect(markdown).toContain('# Twitter Report: AI');
    expect(markdown).toContain('Test User');
    expect(markdown).toContain('100');
  });
  
  it('should generate CSV report', () => {
    const generator = new ReportGenerator('./test-reports');
    
    const mockPosts: TwitterPost[] = [
      {
        id: '1',
        text: 'Test post',
        author: 'Test User',
        authorHandle: 'testuser',
        timestamp: '2025-08-26T10:00:00Z',
        likes: 100,
        retweets: 50,
        impressions: 1000,
        replies: 10,
        url: 'https://twitter.com/testuser/status/1',
        hashtags: ['test'],
        mentions: []
      }
    ];
    
    const report: TwitterReport = {
      keyword: 'test',
      fetchedAt: '2025-08-26T10:00:00Z',
      totalPosts: 1,
      posts: mockPosts,
      summary: {
        totalLikes: 100,
        totalRetweets: 50,
        totalImpressions: 1000,
        averageEngagement: 16,
        topAuthor: 'Test User'
      }
    };
    
    const csv = generator.generateCSV(report);
    expect(csv).toContain('Index,Author,Handle');
    expect(csv).toContain('Test User');
    expect(csv).toContain('100');
  });
});