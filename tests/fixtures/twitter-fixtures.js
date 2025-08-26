/**
 * Test Fixtures for Twitter Unified Fetcher Tests
 * Provides sample data for testing various scenarios
 */

const fixtures = {
  // Raw Twitter post data (as might come from API or DOM scraping)
  rawTwitterPost: {
    id: '1234567890123456789',
    text: 'Just launched our new #AI product! Excited to share this journey with @everyone. Check it out: https://company.com/product',
    author: 'John Doe',
    handle: 'john_doe',
    timestamp: '2024-08-26T14:30:00Z',
    likes: 1250,
    retweets: 89,
    replies: 23,
    impressions: 45320,
    url: 'https://twitter.com/john_doe/status/1234567890123456789',
    verified: true,
    follower_count: 15420
  },

  // Valid post structure according to schema
  validPost: {
    post_id: '1234567890123456789',
    url: 'https://twitter.com/john_doe/status/1234567890123456789',
    author: {
      user_id: '987654321',
      username: 'john_doe',
      display_name: 'John Doe',
      verified: true,
      follower_count: 15420
    },
    content: {
      text: 'Just launched our new #AI product! Excited to share this journey with @everyone. Check it out: https://company.com/product',
      hashtags: ['AI'],
      mentions: ['everyone'],
      urls: ['https://company.com/product']
    },
    metrics: {
      impressions: 45320,
      likes: 1250,
      retweets: 89,
      replies: 23,
      bookmarks: 156,
      shares: 34
    },
    timestamps: {
      created_at: '2024-08-26T14:30:00Z',
      last_updated: '2024-08-26T18:45:00Z'
    },
    engagement_rate: 3.4,
    comments: []
  },

  // Invalid post structure (missing required fields)
  invalidPost: {
    post_id: '1234567890123456789',
    // Missing url, author, content, metrics, timestamps, engagement_rate
    invalid_field: 'should not be here'
  },

  // Valid comment structure
  validComment: {
    comment_id: '1234567890123456790',
    parent_post_id: '1234567890123456789',
    url: 'https://twitter.com/jane_smith/status/1234567890123456790',
    author: {
      user_id: '456789123',
      username: 'jane_smith',
      display_name: 'Jane Smith',
      verified: false,
      follower_count: 892
    },
    content: {
      text: 'Congratulations! Can\'t wait to try it out. When will it be available?',
      hashtags: [],
      mentions: ['john_doe'],
      urls: []
    },
    metrics: {
      impressions: 1240,
      likes: 15,
      retweets: 2,
      replies: 1,
      bookmarks: 3,
      shares: 0
    },
    timestamps: {
      created_at: '2024-08-26T14:45:00Z',
      last_updated: '2024-08-26T14:45:00Z'
    },
    is_reply: true,
    reply_depth: 1
  },

  // Invalid comment structure
  invalidComment: {
    comment_id: '1234567890123456790',
    // Missing required fields
    text: 'This is not a valid comment structure'
  },

  // Valid metadata structure
  validMetadata: {
    total_posts: 2,
    total_comments: 3,
    data_collected_at: '2024-08-26T20:00:00Z',
    api_version: '2.0',
    rate_limit_remaining: 847,
    next_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
  },

  // Invalid metadata structure
  invalidMetadata: {
    total_posts: 'not a number',
    // Missing required fields
    invalid_field: 'should not be here'
  },

  // Sample complete report output
  sampleReportOutput: {
    data: {
      posts: [
        {
          post_id: '1234567890123456789',
          url: 'https://twitter.com/john_doe/status/1234567890123456789',
          author: {
            user_id: '987654321',
            username: 'john_doe',
            display_name: 'John Doe',
            verified: true,
            follower_count: 15420
          },
          content: {
            text: 'Just launched our new product! Excited to share this journey with everyone. #startup #innovation',
            hashtags: ['startup', 'innovation'],
            mentions: [],
            urls: []
          },
          metrics: {
            impressions: 45320,
            likes: 1250,
            retweets: 89,
            replies: 23,
            bookmarks: 156,
            shares: 34
          },
          timestamps: {
            created_at: '2024-08-26T14:30:00Z',
            last_updated: '2024-08-26T18:45:00Z'
          },
          engagement_rate: 3.4,
          comments: [
            {
              comment_id: '1234567890123456790',
              parent_post_id: '1234567890123456789',
              url: 'https://twitter.com/jane_smith/status/1234567890123456790',
              author: {
                user_id: '456789123',
                username: 'jane_smith',
                display_name: 'Jane Smith',
                verified: false,
                follower_count: 892
              },
              content: {
                text: 'Congratulations! Can\'t wait to try it out. When will it be available?',
                hashtags: [],
                mentions: ['john_doe'],
                urls: []
              },
              metrics: {
                impressions: 1240,
                likes: 15,
                retweets: 2,
                replies: 1,
                bookmarks: 3,
                shares: 0
              },
              timestamps: {
                created_at: '2024-08-26T14:45:00Z',
                last_updated: '2024-08-26T14:45:00Z'
              },
              is_reply: true,
              reply_depth: 1
            }
          ]
        }
      ]
    },
    metadata: {
      total_posts: 1,
      total_comments: 1,
      data_collected_at: '2024-08-26T20:00:00Z',
      api_version: '2.0',
      rate_limit_remaining: 847,
      next_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
    }
  },

  // Edge case data sets
  edgeCases: {
    emptyPost: {
      text: '',
      author: '',
      handle: '',
      likes: 0,
      retweets: 0,
      replies: 0,
      impressions: 0
    },

    postWithMissingMetrics: {
      text: 'Sample post text',
      author: 'Test User',
      handle: 'test_user'
      // Missing likes, retweets, etc.
    },

    postWithSpecialCharacters: {
      text: 'Test with émojis 🚀🎉 and spëcial çharacters ñoño',
      author: 'Tést Üser',
      handle: 'test_user_special',
      likes: 10,
      retweets: 5,
      replies: 2,
      impressions: 1000
    },

    postWithLongText: {
      text: 'A'.repeat(2000), // Very long text
      author: 'Long Text User',
      handle: 'long_text_user',
      likes: 100,
      retweets: 50,
      replies: 25,
      impressions: 10000
    },

    postWithNullValues: {
      text: 'Sample post',
      author: null,
      handle: 'test_user',
      likes: null,
      retweets: undefined,
      replies: 0,
      impressions: 1000
    }
  },

  // Performance test data
  performanceTestData: {
    smallDataset: Array.from({ length: 5 }, (_, i) => ({
      id: `post_${i}`,
      text: `Sample post ${i} with #test hashtag`,
      author: `User ${i}`,
      handle: `user_${i}`,
      likes: Math.floor(Math.random() * 100),
      retweets: Math.floor(Math.random() * 50),
      replies: Math.floor(Math.random() * 25),
      impressions: Math.floor(Math.random() * 10000)
    })),

    mediumDataset: Array.from({ length: 50 }, (_, i) => ({
      id: `post_${i}`,
      text: `Sample post ${i} with #test hashtag and @mention`,
      author: `User ${i}`,
      handle: `user_${i}`,
      likes: Math.floor(Math.random() * 1000),
      retweets: Math.floor(Math.random() * 500),
      replies: Math.floor(Math.random() * 250),
      impressions: Math.floor(Math.random() * 100000),
      comments: Array.from({ length: Math.floor(Math.random() * 10) }, (_, j) => ({
        id: `comment_${i}_${j}`,
        text: `Comment ${j} on post ${i}`,
        author: `Commenter ${j}`,
        handle: `commenter_${j}`,
        likes: Math.floor(Math.random() * 50)
      }))
    })),

    largeDataset: Array.from({ length: 200 }, (_, i) => ({
      id: `post_${i}`,
      text: `Sample post ${i} with multiple #hashtags #test #sample and @mentions @user1 @user2`,
      author: `User ${i}`,
      handle: `user_${i}`,
      likes: Math.floor(Math.random() * 5000),
      retweets: Math.floor(Math.random() * 2500),
      replies: Math.floor(Math.random() * 1000),
      impressions: Math.floor(Math.random() * 500000),
      comments: Array.from({ length: Math.floor(Math.random() * 50) }, (_, j) => ({
        id: `comment_${i}_${j}`,
        text: `This is comment ${j} on post ${i} with some additional content to test parsing`,
        author: `Commenter ${j}`,
        handle: `commenter_${j}`,
        likes: Math.floor(Math.random() * 100),
        replies: Math.floor(Math.random() * 10)
      }))
    }))
  },

  // API response mocks
  apiResponses: {
    mcpSuccessResponse: {
      content: [{
        text: JSON.stringify([
          {
            text: 'Sample MCP post',
            author: 'MCP User',
            handle: 'mcp_user',
            timestamp: '2024-08-26T15:00:00Z',
            likes: 50,
            retweets: 10,
            replies: 5,
            url: 'https://twitter.com/mcp_user/status/123'
          }
        ])
      }]
    },

    playwrightDomData: [
      {
        author: 'Playwright User',
        handle: 'playwright_user',
        timestamp: '2024-08-26T15:00:00Z',
        text: 'Sample Playwright post',
        url: 'https://twitter.com/playwright_user/status/456',
        likes: 75,
        retweets: 15,
        replies: 8,
        impressions: 2000
      }
    ],

    malformedApiResponse: {
      error: 'Invalid response format',
      data: 'not an array'
    }
  }
};

module.exports = fixtures;