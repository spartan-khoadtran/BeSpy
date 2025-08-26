/**
 * Jest Configuration for IndieHackers Test Suite
 * Specialized configuration for testing IndieHackers scraper functionality
 */

module.exports = {
  // Test environment
  testEnvironment: 'node',

  // Display name for this config
  displayName: 'IndieHackers Scraper Tests',

  // Root directory for this test suite
  rootDir: '.',

  // Test file patterns
  testMatch: [
    '<rootDir>/**/*.test.js',
    '<rootDir>/**/*.spec.js'
  ],

  // Coverage configuration
  collectCoverage: true,
  collectCoverageFrom: [
    '<rootDir>/../../scripts/indiehackers/**/*.{js,mjs}',
    '<rootDir>/mocks/**/*.js',
    '<rootDir>/utils/**/*.js',
    '!**/*.test.js',
    '!**/*.spec.js',
    '!**/node_modules/**',
    '!**/fixtures/**'
  ],
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text', 'html', 'json', 'lcov'],
  coverageThreshold: {
    global: {
      branches: 75,
      functions: 80,
      lines: 80,
      statements: 80
    },
    // Specific thresholds for different components
    '**/mocks/**/*.js': {
      branches: 70,
      functions: 75,
      lines: 75,
      statements: 75
    },
    '**/utils/**/*.js': {
      branches: 85,
      functions: 90,
      lines: 85,
      statements: 85
    }
  },

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/../setup.js'],

  // Global test timeout (5 minutes for integration tests)
  testTimeout: 300000,

  // Transform configuration for ESM modules
  transform: {
    '^.+\\.m?js$': 'babel-jest'
  },
  extensionsToTreatAsEsm: ['.mjs'],
  
  // Module path mapping
  moduleNameMapping: {
    '^@fixtures/(.*)$': '<rootDir>/fixtures/$1',
    '^@mocks/(.*)$': '<rootDir>/mocks/$1',
    '^@utils/(.*)$': '<rootDir>/utils/$1',
    '^@scripts/(.*)$': '<rootDir>/../../scripts/$1'
  },

  // Test result processors
  reporters: [
    'default',
    ['jest-html-reporters', {
      publicPath: '<rootDir>/reports',
      filename: 'indiehackers-test-report.html',
      expand: true,
      pageTitle: 'IndieHackers Scraper Test Results',
      logoImgPath: undefined,
      hideIcon: false,
      includeFailureMsg: true,
      includeSuiteFailure: true
    }],
    ['jest-junit', {
      outputDirectory: '<rootDir>/reports',
      outputName: 'indiehackers-junit-report.xml',
      suiteName: 'IndieHackers Scraper Tests',
      classNameTemplate: '{classname}',
      titleTemplate: '{title}',
      ancestorSeparator: ' › ',
      usePathForSuiteName: true
    }]
  ],

  // Verbose output for detailed test results
  verbose: true,

  // Force exit after tests complete
  forceExit: true,

  // Clear mocks between tests
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,

  // Error handling
  errorOnDeprecated: true,
  bail: false,

  // Performance monitoring
  detectOpenHandles: true,
  detectLeaks: true,

  // Test concurrency
  maxWorkers: '50%',
  maxConcurrency: 5,

  // Test categories and tags
  testPathIgnorePatterns: [
    '/node_modules/',
    '/coverage/',
    '/reports/'
  ],

  // Custom test environment variables
  testEnvironmentOptions: {
    // Any specific environment setup
  },

  // Global variables available in tests
  globals: {
    'ts-jest': {
      useESM: true
    }
  },

  // Watch mode configuration
  watchPathIgnorePatterns: [
    '/node_modules/',
    '/coverage/',
    '/reports/',
    '/fixtures/'
  ],

  // Snapshot configuration
  snapshotFormat: {
    escapeString: true,
    printBasicPrototype: true
  }
};