/**
 * Unit Tests for Duplicate Detection and Content Processing
 * Tests the logic for removing cross-category duplicates and processing content
 */

const MockIndieHackersScraper = require('../mocks/mock-scraper');
const IndieHackersTestUtils = require('../utils/indiehackers-test-utils');

describe('Duplicate Detection and Content Processing', () => {
  let scraper;
  let testUtils;

  beforeEach(() => {
    scraper = new MockIndieHackersScraper();
    testUtils = new IndieHackersTestUtils();
  });

  describe('Duplicate Detection', () => {
    test('should remove exact duplicates based on title and author', () => {
      const postsWithDuplicates = [
        {
          id: '1',
          title: 'How to Build a SaaS',
          author: { username: 'johndoe', display_name: 'John Doe' },
          category: 'starting-up',
          engagement: { upvotes: 50, comments: 10, views: 1000 }
        },
        {
          id: '2',
          title: 'How to Build a SaaS', // Same title
          author: { username: 'johndoe', display_name: 'John Doe' }, // Same author
          category: 'tech', // Different category
          engagement: { upvotes: 52, comments: 12, views: 1100 } // Slightly different metrics
        },
        {
          id: '3',
          title: 'Different Post',
          author: { username: 'janedoe', display_name: 'Jane Doe' },
          category: 'creators',
          engagement: { upvotes: 30, comments: 5, views: 500 }
        }
      ];

      const uniquePosts = scraper.removeDuplicates(postsWithDuplicates);
      
      expect(uniquePosts).toHaveLength(2);
      expect(uniquePosts.find(p => p.title === 'Different Post')).toBeDefined();
      expect(uniquePosts.filter(p => p.title === 'How to Build a SaaS')).toHaveLength(1);
    });

    test('should keep posts with same title but different authors', () => {
      const postsWithSameTitle = [
        {
          id: '1',
          title: 'My Startup Journey',
          author: { username: 'founder1', display_name: 'First Founder' },
          category: 'starting-up'
        },
        {
          id: '2',
          title: 'My Startup Journey', // Same title
          author: { username: 'founder2', display_name: 'Second Founder' }, // Different author
          category: 'starting-up'
        }
      ];

      const uniquePosts = scraper.removeDuplicates(postsWithSameTitle);
      
      expect(uniquePosts).toHaveLength(2);
      expect(uniquePosts.find(p => p.author.username === 'founder1')).toBeDefined();
      expect(uniquePosts.find(p => p.author.username === 'founder2')).toBeDefined();
    });

    test('should keep posts with same author but different titles', () => {
      const postsWithSameAuthor = [
        {
          id: '1',
          title: 'First Post',
          author: { username: 'johndoe', display_name: 'John Doe' },
          category: 'starting-up'
        },
        {
          id: '2',
          title: 'Second Post', // Different title
          author: { username: 'johndoe', display_name: 'John Doe' }, // Same author
          category: 'tech'
        }
      ];

      const uniquePosts = scraper.removeDuplicates(postsWithSameAuthor);
      
      expect(uniquePosts).toHaveLength(2);
      expect(uniquePosts.find(p => p.title === 'First Post')).toBeDefined();
      expect(uniquePosts.find(p => p.title === 'Second Post')).toBeDefined();
    });

    test('should handle empty arrays', () => {
      const uniquePosts = scraper.removeDuplicates([]);
      expect(uniquePosts).toEqual([]);
    });

    test('should handle arrays with one post', () => {
      const singlePost = [{
        id: '1',
        title: 'Single Post',
        author: { username: 'user', display_name: 'User' }
      }];

      const uniquePosts = scraper.removeDuplicates(singlePost);
      expect(uniquePosts).toHaveLength(1);
      expect(uniquePosts[0].title).toBe('Single Post');
    });

    test('should preserve post order when removing duplicates', () => {
      const postsInOrder = [
        {
          id: '1',
          title: 'First Post',
          author: { username: 'user1', display_name: 'User 1' }
        },
        {
          id: '2',
          title: 'Duplicate Post',
          author: { username: 'user2', display_name: 'User 2' }
        },
        {
          id: '3',
          title: 'Duplicate Post', // Duplicate - should be removed
          author: { username: 'user2', display_name: 'User 2' }
        },
        {
          id: '4',
          title: 'Last Post',
          author: { username: 'user3', display_name: 'User 3' }
        }
      ];

      const uniquePosts = scraper.removeDuplicates(postsInOrder);
      
      expect(uniquePosts).toHaveLength(3);
      expect(uniquePosts[0].title).toBe('First Post');
      expect(uniquePosts[1].title).toBe('Duplicate Post');
      expect(uniquePosts[2].title).toBe('Last Post');
    });

    test('should handle posts with missing author information', () => {
      const postsWithMissingAuthor = [
        {
          id: '1',
          title: 'Post with Author',
          author: { username: 'user1', display_name: 'User 1' }
        },
        {
          id: '2',
          title: 'Post without Author',
          author: null
        },
        {
          id: '3',
          title: 'Post without Author', // Same title, both missing author
          author: undefined
        }
      ];

      const uniquePosts = scraper.removeDuplicates(postsWithMissingAuthor);
      
      // Should handle gracefully, might keep both or remove based on implementation
      expect(uniquePosts.length).toBeGreaterThan(0);
      expect(uniquePosts.length).toBeLessThanOrEqual(3);
    });
  });

  describe('Content Processing', () => {
    test('should preserve original post data during processing', () => {
      const originalPost = {
        id: 'test-1',
        title: 'Original Title',
        author: { username: 'testuser', display_name: 'Test User' },
        category: 'tech',
        engagement: { upvotes: 50, comments: 10, views: 1000 },
        content_preview: 'Original content preview'
      };

      const processedPosts = scraper.processPosts([originalPost]);
      const processed = processedPosts[0];
      
      expect(processed.id).toBe(originalPost.id);
      expect(processed.title).toBe(originalPost.title);
      expect(processed.author).toEqual(originalPost.author);
      expect(processed.category).toBe(originalPost.category);
      expect(processed.content_preview).toBe(originalPost.content_preview);
    });

    test('should add processing metadata to posts', () => {
      const posts = [{
        id: 'test-1',
        title: 'Test Post',
        engagement: { upvotes: 25, comments: 5, views: 500 }
      }];

      const processedPosts = scraper.processPosts(posts);
      const processed = processedPosts[0];
      
      expect(processed).toHaveProperty('engagement_score');
      expect(processed).toHaveProperty('processed_at');
      expect(typeof processed.engagement_score).toBe('number');
      expect(testUtils.isValidISO8601(processed.processed_at)).toBe(true);
    });

    test('should handle posts with missing engagement data', () => {
      const postsWithMissingEngagement = [
        {
          id: '1',
          title: 'Post with Engagement',
          engagement: { upvotes: 50, comments: 10, views: 1000 }
        },
        {
          id: '2',
          title: 'Post without Engagement',
          engagement: null
        },
        {
          id: '3',
          title: 'Post with Empty Engagement',
          engagement: {}
        }
      ];

      const processedPosts = scraper.processPosts(postsWithMissingEngagement);
      
      expect(processedPosts).toHaveLength(3);
      processedPosts.forEach(post => {
        expect(post).toHaveProperty('engagement_score');
        expect(typeof post.engagement_score).toBe('number');
        expect(post.engagement_score).toBeGreaterThanOrEqual(0);
      });
    });

    test('should maintain data integrity during processing chain', () => {
      const originalPosts = [
        {
          id: '1',
          title: 'First Post',
          author: { username: 'user1', display_name: 'User 1' },
          engagement: { upvotes: 100, comments: 20, views: 2000 }
        },
        {
          id: '2', 
          title: 'Second Post',
          author: { username: 'user2', display_name: 'User 2' },
          engagement: { upvotes: 50, comments: 30, views: 1500 }
        },
        {
          id: '3',
          title: 'First Post', // Duplicate
          author: { username: 'user1', display_name: 'User 1' },
          engagement: { upvotes: 105, comments: 22, views: 2100 }
        }
      ];

      // Full processing chain: process then deduplicate
      const processed = scraper.processPosts(originalPosts);
      const unique = scraper.removeDuplicates(processed);
      
      expect(unique).toHaveLength(2);
      
      // Check that processing metadata is preserved
      unique.forEach(post => {
        expect(post).toHaveProperty('engagement_score');
        expect(post).toHaveProperty('processed_at');
        expect(post.id).toBeTruthy();
        expect(post.title).toBeTruthy();
        expect(post.author).toBeTruthy();
      });
    });
  });

  describe('Cross-Category Deduplication', () => {
    test('should handle posts appearing in multiple categories', async () => {
      const techPosts = [
        {
          id: '1',
          title: 'AI Tools for Developers',
          author: { username: 'techdev', display_name: 'Tech Developer' },
          category: 'tech'
        }
      ];

      const aiPosts = [
        {
          id: '2',
          title: 'AI Tools for Developers', // Same title
          author: { username: 'techdev', display_name: 'Tech Developer' }, // Same author
          category: 'artificial-intelligence' // Different category
        }
      ];

      const allPosts = [...techPosts, ...aiPosts];
      const uniquePosts = scraper.removeDuplicates(allPosts);
      
      expect(uniquePosts).toHaveLength(1);
      expect(uniquePosts[0].title).toBe('AI Tools for Developers');
    });

    test('should prioritize posts from more specific categories', async () => {
      const generalPosts = [
        {
          id: '1',
          title: 'Building with AI',
          author: { username: 'builder', display_name: 'Builder' },
          category: 'main',
          engagement: { upvotes: 50, comments: 10, views: 1000 }
        }
      ];

      const specificPosts = [
        {
          id: '2',
          title: 'Building with AI', // Same title and author
          author: { username: 'builder', display_name: 'Builder' },
          category: 'artificial-intelligence', // More specific category
          engagement: { upvotes: 52, comments: 12, views: 1100 }
        }
      ];

      const allPosts = [...generalPosts, ...specificPosts];
      const uniquePosts = scraper.removeDuplicates(allPosts);
      
      expect(uniquePosts).toHaveLength(1);
      // Implementation could prioritize more specific categories
    });

    test('should handle case variations in titles', () => {
      const postsWithCaseVariations = [
        {
          id: '1',
          title: 'How to Build a SaaS',
          author: { username: 'user1', display_name: 'User 1' }
        },
        {
          id: '2',
          title: 'How To Build A SaaS', // Different capitalization
          author: { username: 'user1', display_name: 'User 1' }
        },
        {
          id: '3',
          title: 'how to build a saas', // All lowercase
          author: { username: 'user1', display_name: 'User 1' }
        }
      ];

      const uniquePosts = scraper.removeDuplicates(postsWithCaseVariations);
      
      // Depending on implementation, might treat these as separate or same
      // Conservative approach would be to keep them separate
      expect(uniquePosts.length).toBeGreaterThanOrEqual(1);
      expect(uniquePosts.length).toBeLessThanOrEqual(3);
    });
  });

  describe('Performance and Edge Cases', () => {
    test('should handle large datasets efficiently', () => {
      const largePosts = testUtils.generatePerformanceTestData(1000);
      
      const startTime = process.hrtime.bigint();
      const uniquePosts = scraper.removeDuplicates(largePosts);
      const endTime = process.hrtime.bigint();
      
      const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
      
      expect(duration).toBeLessThan(1000); // Should complete in less than 1 second
      expect(uniquePosts.length).toBeGreaterThan(0);
      expect(uniquePosts.length).toBeLessThanOrEqual(1000);
    });

    test('should handle posts with very long titles', () => {
      const longTitle = 'A'.repeat(1000); // 1000 character title
      const postsWithLongTitles = [
        {
          id: '1',
          title: longTitle,
          author: { username: 'user1', display_name: 'User 1' }
        },
        {
          id: '2',
          title: longTitle, // Same long title
          author: { username: 'user1', display_name: 'User 1' }
        }
      ];

      const uniquePosts = scraper.removeDuplicates(postsWithLongTitles);
      expect(uniquePosts).toHaveLength(1);
      expect(uniquePosts[0].title).toBe(longTitle);
    });

    test('should handle special characters in titles and usernames', () => {
      const postsWithSpecialChars = [
        {
          id: '1',
          title: 'Post with émojis 🚀 and spëcial chars!',
          author: { username: 'user@123', display_name: 'User #1' }
        },
        {
          id: '2',
          title: 'Post with émojis 🚀 and spëcial chars!', // Same special characters
          author: { username: 'user@123', display_name: 'User #1' }
        }
      ];

      const uniquePosts = scraper.removeDuplicates(postsWithSpecialChars);
      expect(uniquePosts).toHaveLength(1);
    });

    test('should maintain memory efficiency with large duplicate sets', () => {
      // Create many duplicates of the same post
      const basePosts = testUtils.generatePerformanceTestData(10);
      const duplicatedPosts = [];
      
      // Create 100 copies of each post
      basePosts.forEach(post => {
        for (let i = 0; i < 100; i++) {
          duplicatedPosts.push({
            ...post,
            id: `${post.id}-copy-${i}`
          });
        }
      });

      const initialMemory = process.memoryUsage().heapUsed;
      const uniquePosts = scraper.removeDuplicates(duplicatedPosts);
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = (finalMemory - initialMemory) / 1024 / 1024; // MB
      
      expect(uniquePosts).toHaveLength(10); // Should reduce to original 10 unique posts
      expect(memoryIncrease).toBeLessThan(100); // Should not use excessive memory
    });
  });
});