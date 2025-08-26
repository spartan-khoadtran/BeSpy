/**
 * Schema Validator for Twitter Unified Fetcher
 * Validates output against report_format.json schema
 */

class SchemaValidator {
  constructor() {
    this.errors = [];
  }

  /**
   * Validate data against the report format schema
   * @param {Object} data - Data to validate
   * @param {Object} schema - Schema to validate against
   * @returns {Object} - Validation result with valid flag and errors
   */
  validateAgainstSchema(data, schema) {
    this.errors = [];

    try {
      this.validateStructure(data, schema);
      
      return {
        valid: this.errors.length === 0,
        errors: this.errors
      };
    } catch (error) {
      this.errors.push(`Schema validation error: ${error.message}`);
      return {
        valid: false,
        errors: this.errors
      };
    }
  }

  /**
   * Validate the main data structure
   * @param {Object} data - Data to validate
   * @param {Object} schema - Expected schema
   */
  validateStructure(data, schema) {
    if (!data || typeof data !== 'object') {
      this.errors.push('Data must be an object');
      return;
    }

    // Validate top-level structure
    if (!data.hasOwnProperty('data')) {
      this.errors.push('Missing required field: data');
    }

    if (!data.hasOwnProperty('metadata')) {
      this.errors.push('Missing required field: metadata');
    }

    // Validate data.posts array
    if (data.data && data.data.posts) {
      if (!Array.isArray(data.data.posts)) {
        this.errors.push('data.posts must be an array');
      } else {
        data.data.posts.forEach((post, index) => {
          this.validatePost(post, `data.posts[${index}]`);
        });
      }
    }

    // Validate metadata
    if (data.metadata) {
      this.validateMetadata(data.metadata);
    }
  }

  /**
   * Validate a single post structure
   * @param {Object} post - Post to validate
   * @param {string} path - Path for error reporting
   */
  validatePost(post, path = 'post') {
    if (!post || typeof post !== 'object') {
      this.errors.push(`${path} must be an object`);
      return;
    }

    // Required fields for a post
    const requiredFields = {
      'post_id': 'string',
      'url': 'string',
      'author': 'object',
      'content': 'object',
      'metrics': 'object',
      'timestamps': 'object',
      'engagement_rate': 'number'
    };

    Object.entries(requiredFields).forEach(([field, expectedType]) => {
      if (!post.hasOwnProperty(field)) {
        this.errors.push(`${path}.${field} is required`);
      } else if (typeof post[field] !== expectedType) {
        this.errors.push(`${path}.${field} must be of type ${expectedType}`);
      }
    });

    // Validate nested structures
    if (post.author) {
      this.validateAuthor(post.author, `${path}.author`);
    }

    if (post.content) {
      this.validateContent(post.content, `${path}.content`);
    }

    if (post.metrics) {
      this.validateMetrics(post.metrics, `${path}.metrics`);
    }

    if (post.timestamps) {
      this.validateTimestamps(post.timestamps, `${path}.timestamps`);
    }

    // Validate comments if present
    if (post.comments) {
      if (!Array.isArray(post.comments)) {
        this.errors.push(`${path}.comments must be an array`);
      } else {
        post.comments.forEach((comment, index) => {
          this.validateComment(comment, `${path}.comments[${index}]`);
        });
      }
    }

    // Validate engagement rate range
    if (typeof post.engagement_rate === 'number') {
      if (post.engagement_rate < 0 || post.engagement_rate > 100) {
        this.errors.push(`${path}.engagement_rate must be between 0 and 100`);
      }
    }
  }

  /**
   * Validate author structure
   * @param {Object} author - Author object to validate
   * @param {string} path - Path for error reporting
   */
  validateAuthor(author, path = 'author') {
    const requiredFields = {
      'user_id': 'string',
      'username': 'string',
      'display_name': 'string',
      'verified': 'boolean',
      'follower_count': 'number'
    };

    Object.entries(requiredFields).forEach(([field, expectedType]) => {
      if (!author.hasOwnProperty(field)) {
        this.errors.push(`${path}.${field} is required`);
      } else if (typeof author[field] !== expectedType) {
        this.errors.push(`${path}.${field} must be of type ${expectedType}`);
      }
    });

    // Validate follower count is non-negative
    if (typeof author.follower_count === 'number' && author.follower_count < 0) {
      this.errors.push(`${path}.follower_count must be non-negative`);
    }
  }

  /**
   * Validate content structure
   * @param {Object} content - Content object to validate
   * @param {string} path - Path for error reporting
   */
  validateContent(content, path = 'content') {
    const requiredFields = {
      'text': 'string',
      'hashtags': 'array',
      'mentions': 'array',
      'urls': 'array'
    };

    Object.entries(requiredFields).forEach(([field, expectedType]) => {
      if (!content.hasOwnProperty(field)) {
        this.errors.push(`${path}.${field} is required`);
      } else {
        if (expectedType === 'array' && !Array.isArray(content[field])) {
          this.errors.push(`${path}.${field} must be an array`);
        } else if (expectedType !== 'array' && typeof content[field] !== expectedType) {
          this.errors.push(`${path}.${field} must be of type ${expectedType}`);
        }
      }
    });

    // Validate array elements are strings
    ['hashtags', 'mentions', 'urls'].forEach(field => {
      if (Array.isArray(content[field])) {
        content[field].forEach((item, index) => {
          if (typeof item !== 'string') {
            this.errors.push(`${path}.${field}[${index}] must be a string`);
          }
        });
      }
    });
  }

  /**
   * Validate metrics structure
   * @param {Object} metrics - Metrics object to validate
   * @param {string} path - Path for error reporting
   */
  validateMetrics(metrics, path = 'metrics') {
    const requiredFields = [
      'impressions', 'likes', 'retweets', 'replies', 'bookmarks', 'shares'
    ];

    requiredFields.forEach(field => {
      if (!metrics.hasOwnProperty(field)) {
        this.errors.push(`${path}.${field} is required`);
      } else if (typeof metrics[field] !== 'number') {
        this.errors.push(`${path}.${field} must be a number`);
      } else if (metrics[field] < 0) {
        this.errors.push(`${path}.${field} must be non-negative`);
      }
    });
  }

  /**
   * Validate timestamps structure
   * @param {Object} timestamps - Timestamps object to validate
   * @param {string} path - Path for error reporting
   */
  validateTimestamps(timestamps, path = 'timestamps') {
    const requiredFields = ['created_at', 'last_updated'];

    requiredFields.forEach(field => {
      if (!timestamps.hasOwnProperty(field)) {
        this.errors.push(`${path}.${field} is required`);
      } else if (typeof timestamps[field] !== 'string') {
        this.errors.push(`${path}.${field} must be a string`);
      } else {
        // Validate ISO 8601 format
        const dateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
        if (!dateRegex.test(timestamps[field])) {
          this.errors.push(`${path}.${field} must be in ISO 8601 format`);
        }
      }
    });
  }

  /**
   * Validate comment structure
   * @param {Object} comment - Comment to validate
   * @param {string} path - Path for error reporting
   */
  validateComment(comment, path = 'comment') {
    if (!comment || typeof comment !== 'object') {
      this.errors.push(`${path} must be an object`);
      return;
    }

    const requiredFields = {
      'comment_id': 'string',
      'parent_post_id': 'string',
      'url': 'string',
      'author': 'object',
      'content': 'object',
      'metrics': 'object',
      'timestamps': 'object',
      'is_reply': 'boolean',
      'reply_depth': 'number'
    };

    Object.entries(requiredFields).forEach(([field, expectedType]) => {
      if (!comment.hasOwnProperty(field)) {
        this.errors.push(`${path}.${field} is required`);
      } else if (typeof comment[field] !== expectedType) {
        this.errors.push(`${path}.${field} must be of type ${expectedType}`);
      }
    });

    // Validate nested structures
    if (comment.author) {
      this.validateAuthor(comment.author, `${path}.author`);
    }

    if (comment.content) {
      this.validateContent(comment.content, `${path}.content`);
    }

    if (comment.metrics) {
      this.validateMetrics(comment.metrics, `${path}.metrics`);
    }

    if (comment.timestamps) {
      this.validateTimestamps(comment.timestamps, `${path}.timestamps`);
    }

    // Validate reply depth is positive
    if (typeof comment.reply_depth === 'number' && comment.reply_depth < 1) {
      this.errors.push(`${path}.reply_depth must be positive for replies`);
    }
  }

  /**
   * Validate metadata structure
   * @param {Object} metadata - Metadata to validate
   * @param {string} path - Path for error reporting
   */
  validateMetadata(metadata, path = 'metadata') {
    const requiredFields = {
      'total_posts': 'number',
      'total_comments': 'number',
      'data_collected_at': 'string',
      'api_version': 'string'
    };

    Object.entries(requiredFields).forEach(([field, expectedType]) => {
      if (!metadata.hasOwnProperty(field)) {
        this.errors.push(`${path}.${field} is required`);
      } else if (typeof metadata[field] !== expectedType) {
        this.errors.push(`${path}.${field} must be of type ${expectedType}`);
      }
    });

    // Validate counts are non-negative
    if (typeof metadata.total_posts === 'number' && metadata.total_posts < 0) {
      this.errors.push(`${path}.total_posts must be non-negative`);
    }

    if (typeof metadata.total_comments === 'number' && metadata.total_comments < 0) {
      this.errors.push(`${path}.total_comments must be non-negative`);
    }

    // Validate timestamp format
    if (typeof metadata.data_collected_at === 'string') {
      const dateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
      if (!dateRegex.test(metadata.data_collected_at)) {
        this.errors.push(`${path}.data_collected_at must be in ISO 8601 format`);
      }
    }
  }

  /**
   * Validate post structure (simplified for unit testing)
   * @param {Object} post - Post to validate
   * @returns {boolean} - True if valid
   */
  validatePostStructure(post) {
    if (!post || typeof post !== 'object') return false;

    const requiredFields = [
      'post_id', 'url', 'author', 'content', 'metrics', 'timestamps', 'engagement_rate'
    ];

    return requiredFields.every(field => post.hasOwnProperty(field));
  }

  /**
   * Validate comment structure (simplified for unit testing)
   * @param {Object} comment - Comment to validate
   * @returns {boolean} - True if valid
   */
  validateCommentStructure(comment) {
    if (!comment || typeof comment !== 'object') return false;

    const requiredFields = [
      'comment_id', 'parent_post_id', 'url', 'author', 'content', 
      'metrics', 'timestamps', 'is_reply', 'reply_depth'
    ];

    return requiredFields.every(field => comment.hasOwnProperty(field));
  }

  /**
   * Validate metadata structure (simplified for unit testing)
   * @param {Object} metadata - Metadata to validate
   * @returns {boolean} - True if valid
   */
  validateMetadataStructure(metadata) {
    if (!metadata || typeof metadata !== 'object') return false;

    const requiredFields = [
      'total_posts', 'total_comments', 'data_collected_at', 'api_version'
    ];

    return requiredFields.every(field => metadata.hasOwnProperty(field));
  }
}

module.exports = new SchemaValidator();