/**
 * Jest Setup Configuration
 * Runs before all tests to configure the test environment
 */

const fs = require('fs').promises;
const path = require('path');

// Global test timeout
jest.setTimeout(300000); // 5 minutes

// Setup test directories
beforeAll(async () => {
  const testDirs = [
    'tests/output',
    'tests/comparison',
    'tests/reports',
    'tests/temp'
  ];

  for (const dir of testDirs) {
    try {
      await fs.mkdir(path.join(__dirname, '..', dir), { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
  }
});

// Cleanup after all tests
afterAll(async () => {
  const testDirs = [
    'tests/output',
    'tests/comparison',
    'tests/temp'
  ];

  for (const dir of testDirs) {
    try {
      await fs.rmdir(path.join(__dirname, '..', dir), { recursive: true });
    } catch (error) {
      // Directory might not exist or might not be empty
    }
  }
});

// Global error handler
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

// Mock console methods for cleaner test output
global.mockConsole = () => {
  const originalConsole = { ...console };
  
  console.log = jest.fn();
  console.info = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();
  
  return () => {
    Object.assign(console, originalConsole);
  };
};

// Test utilities
global.sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

global.waitForCondition = async (condition, timeout = 10000, interval = 100) => {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return true;
    }
    await sleep(interval);
  }
  
  throw new Error(`Condition not met within ${timeout}ms`);
};

// Performance monitoring
global.measurePerformance = (testName) => {
  const startTime = process.hrtime.bigint();
  const startMemory = process.memoryUsage();
  
  return {
    end: () => {
      const endTime = process.hrtime.bigint();
      const endMemory = process.memoryUsage();
      
      const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
      const memoryDelta = endMemory.heapUsed - startMemory.heapUsed;
      
      return {
        testName,
        duration: `${duration.toFixed(2)}ms`,
        memoryDelta: `${(memoryDelta / 1024 / 1024).toFixed(2)}MB`,
        peakMemory: `${(endMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`
      };
    }
  };
};

// Custom matchers
expect.extend({
  toBeValidTwitterPost(received) {
    const requiredFields = [
      'post_id', 'url', 'author', 'content', 'metrics', 'timestamps', 'engagement_rate'
    ];
    
    const missingFields = requiredFields.filter(field => !received.hasOwnProperty(field));
    
    if (missingFields.length > 0) {
      return {
        message: () => `Expected valid Twitter post, but missing fields: ${missingFields.join(', ')}`,
        pass: false
      };
    }
    
    return {
      message: () => `Expected not to be a valid Twitter post`,
      pass: true
    };
  },
  
  toHaveValidEngagementRate(received) {
    const rate = received.engagement_rate;
    
    if (typeof rate !== 'number' || rate < 0 || rate > 100) {
      return {
        message: () => `Expected engagement rate to be between 0 and 100, received ${rate}`,
        pass: false
      };
    }
    
    return {
      message: () => `Expected engagement rate not to be valid`,
      pass: true
    };
  },
  
  toHaveValidTimestamp(received, field = 'created_at') {
    const timestamp = received.timestamps?.[field];
    const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
    
    if (!timestamp || !iso8601Regex.test(timestamp)) {
      return {
        message: () => `Expected valid ISO 8601 timestamp in ${field}, received ${timestamp}`,
        pass: false
      };
    }
    
    return {
      message: () => `Expected timestamp not to be valid`,
      pass: true
    };
  }
});