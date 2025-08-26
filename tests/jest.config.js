/**
 * Jest Configuration for Twitter Unified Fetcher Tests
 */

module.exports = {
  // Test environment
  testEnvironment: 'node',

  // Root directories for tests
  roots: ['<rootDir>/tests'],

  // Test file patterns
  testMatch: [
    '**/tests/**/*.test.js',
    '**/tests/**/*.spec.js'
  ],

  // Coverage configuration
  collectCoverage: true,
  collectCoverageFrom: [
    'scripts/**/*.{js,mjs}',
    'tests/utils/**/*.js',
    '!tests/fixtures/**',
    '!**/node_modules/**'
  ],
  coverageDirectory: 'tests/coverage',
  coverageReporters: ['text', 'html', 'json', 'lcov'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 75,
      lines: 75,
      statements: 75
    }
  },

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],

  // Module path mapping
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/scripts/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1'
  },

  // Test timeout (in milliseconds)
  testTimeout: 300000, // 5 minutes for integration tests

  // Transform configuration
  transform: {
    '^.+\\.m?js$': 'babel-jest'
  },
  extensionsToTreatAsEsm: ['.mjs'],
  globals: {
    'ts-jest': {
      useESM: true
    }
  },

  // Verbose output
  verbose: true,

  // Force exit after tests complete
  forceExit: true,

  // Clear mocks between tests
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,

  // Test result processors
  reporters: [
    'default',
    ['jest-html-reporters', {
      publicPath: './tests/reports',
      filename: 'test-report.html',
      expand: true
    }],
    ['jest-junit', {
      outputDirectory: './tests/reports',
      outputName: 'junit-report.xml'
    }]
  ],

  // Error handling
  errorOnDeprecated: true,
  bail: false,

  // Performance monitoring
  detectOpenHandles: true,
  detectLeaks: true,

  // Test sequence
  maxWorkers: 4,
  maxConcurrency: 5
};