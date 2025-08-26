#!/usr/bin/env node

/**
 * IndieHackers Test Runner
 * Provides convenient test execution with different configurations
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;

class IndieHackersTestRunner {
  constructor() {
    this.testDir = __dirname;
    this.jestConfig = path.join(this.testDir, 'jest.config.js');
    this.reportsDir = path.join(this.testDir, 'reports');
    this.coverageDir = path.join(this.testDir, 'coverage');
  }

  /**
   * Parse command line arguments
   */
  parseArguments() {
    const args = process.argv.slice(2);
    const config = {
      category: 'all',
      coverage: false,
      watch: false,
      verbose: false,
      bail: false,
      maxWorkers: undefined,
      timeout: undefined,
      pattern: undefined,
      updateSnapshots: false
    };

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      const nextArg = args[i + 1];

      switch (arg) {
        case '--unit':
          config.category = 'unit';
          break;
        case '--integration':
          config.category = 'integration';
          break;
        case '--performance':
          config.category = 'performance';
          break;
        case '--coverage':
          config.coverage = true;
          break;
        case '--watch':
          config.watch = true;
          break;
        case '--verbose':
          config.verbose = true;
          break;
        case '--bail':
          config.bail = true;
          break;
        case '--pattern':
          if (nextArg && !nextArg.startsWith('--')) {
            config.pattern = nextArg;
            i++;
          }
          break;
        case '--timeout':
          if (nextArg && !isNaN(nextArg)) {
            config.timeout = parseInt(nextArg);
            i++;
          }
          break;
        case '--workers':
          if (nextArg && !isNaN(nextArg)) {
            config.maxWorkers = parseInt(nextArg);
            i++;
          }
          break;
        case '--update-snapshots':
          config.updateSnapshots = true;
          break;
        case '--help':
          this.showHelp();
          process.exit(0);
          break;
        default:
          if (arg.startsWith('--')) {
            console.warn(`Unknown option: ${arg}`);
          }
      }
    }

    return config;
  }

  /**
   * Show help information
   */
  showHelp() {
    console.log(`
IndieHackers Scraper Test Runner

Usage: node run-tests.js [options]

Options:
  --unit                 Run unit tests only
  --integration          Run integration tests only  
  --performance          Run performance tests only
  --coverage             Generate coverage report
  --watch               Run tests in watch mode
  --verbose             Verbose output
  --bail                Stop on first failure
  --pattern <pattern>   Run tests matching pattern
  --timeout <ms>        Test timeout in milliseconds
  --workers <num>       Number of worker processes
  --update-snapshots    Update test snapshots
  --help                Show this help message

Examples:
  node run-tests.js                           # Run all tests
  node run-tests.js --unit --coverage         # Run unit tests with coverage
  node run-tests.js --integration --verbose   # Run integration tests verbosely
  node run-tests.js --pattern engagement      # Run tests matching 'engagement'
  node run-tests.js --performance --timeout 60000  # Run performance tests with 60s timeout
  node run-tests.js --watch                   # Run tests in watch mode
`);
  }

  /**
   * Build Jest command line arguments
   */
  buildJestArgs(config) {
    const args = [
      '--config', this.jestConfig
    ];

    // Test category filtering
    if (config.category !== 'all') {
      args.push('--testPathPattern', config.category);
    }

    // Coverage
    if (config.coverage) {
      args.push('--coverage');
    }

    // Watch mode
    if (config.watch) {
      args.push('--watch');
    }

    // Verbose output
    if (config.verbose) {
      args.push('--verbose');
    }

    // Bail on first failure
    if (config.bail) {
      args.push('--bail');
    }

    // Test pattern
    if (config.pattern) {
      args.push('--testNamePattern', config.pattern);
    }

    // Timeout
    if (config.timeout) {
      args.push('--testTimeout', config.timeout.toString());
    }

    // Max workers
    if (config.maxWorkers) {
      args.push('--maxWorkers', config.maxWorkers.toString());
    }

    // Update snapshots
    if (config.updateSnapshots) {
      args.push('--updateSnapshot');
    }

    return args;
  }

  /**
   * Setup test environment
   */
  async setupEnvironment() {
    try {
      // Create reports directory
      await fs.mkdir(this.reportsDir, { recursive: true });
      
      // Create coverage directory
      await fs.mkdir(this.coverageDir, { recursive: true });
      
      // Clean previous reports
      const reportFiles = await fs.readdir(this.reportsDir);
      for (const file of reportFiles) {
        if (file.endsWith('.html') || file.endsWith('.xml')) {
          await fs.unlink(path.join(this.reportsDir, file));
        }
      }
    } catch (error) {
      console.warn('Warning: Could not setup test environment:', error.message);
    }
  }

  /**
   * Execute Jest with given configuration
   */
  async executeTests(config) {
    const jestArgs = this.buildJestArgs(config);
    
    console.log('🧪 Starting IndieHackers Scraper Tests...');
    console.log(`📁 Test Directory: ${this.testDir}`);
    console.log(`📊 Category: ${config.category}`);
    console.log(`⚙️  Configuration: ${JSON.stringify(config, null, 2)}`);
    console.log('');

    return new Promise((resolve, reject) => {
      const jest = spawn('npx', ['jest', ...jestArgs], {
        stdio: 'inherit',
        cwd: this.testDir
      });

      jest.on('close', (code) => {
        if (code === 0) {
          resolve({ success: true, exitCode: code });
        } else {
          resolve({ success: false, exitCode: code });
        }
      });

      jest.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Generate test summary
   */
  async generateSummary(result, config) {
    console.log('\n' + '='.repeat(60));
    console.log('🎯 Test Execution Summary');
    console.log('='.repeat(60));

    if (result.success) {
      console.log('✅ Tests completed successfully!');
    } else {
      console.log('❌ Tests failed with exit code:', result.exitCode);
    }

    console.log(`📁 Category: ${config.category}`);
    console.log(`⏱️  Configuration: ${JSON.stringify(config, null, 2)}`);

    // Check for generated reports
    try {
      const reportFiles = await fs.readdir(this.reportsDir);
      const htmlReports = reportFiles.filter(f => f.endsWith('.html'));
      const xmlReports = reportFiles.filter(f => f.endsWith('.xml'));

      if (htmlReports.length > 0) {
        console.log(`📊 HTML Reports: ${htmlReports.join(', ')}`);
        console.log(`📂 Report Location: ${this.reportsDir}`);
      }

      if (xmlReports.length > 0) {
        console.log(`📋 JUnit Reports: ${xmlReports.join(', ')}`);
      }
    } catch (error) {
      // Reports directory might not exist, that's ok
    }

    // Check for coverage reports
    if (config.coverage) {
      try {
        const coverageExists = await fs.access(path.join(this.coverageDir, 'index.html'))
          .then(() => true)
          .catch(() => false);

        if (coverageExists) {
          console.log(`📈 Coverage Report: ${path.join(this.coverageDir, 'index.html')}`);
        }
      } catch (error) {
        // Coverage might not be generated
      }
    }

    console.log('='.repeat(60));
    return result;
  }

  /**
   * Main execution method
   */
  async run() {
    try {
      const config = this.parseArguments();
      
      await this.setupEnvironment();
      
      const result = await this.executeTests(config);
      
      await this.generateSummary(result, config);
      
      process.exit(result.exitCode);
    } catch (error) {
      console.error('❌ Test execution failed:', error);
      process.exit(1);
    }
  }
}

// Performance shortcuts
const shortcuts = {
  // Quick test commands
  'unit': ['--unit'],
  'integration': ['--integration'],
  'performance': ['--performance'],
  'all': [],
  
  // Coverage commands
  'unit-coverage': ['--unit', '--coverage'],
  'integration-coverage': ['--integration', '--coverage'],
  'full-coverage': ['--coverage'],
  
  // Development commands
  'watch': ['--watch'],
  'watch-unit': ['--unit', '--watch'],
  'quick': ['--unit', '--bail'],
  
  // CI commands
  'ci': ['--coverage', '--verbose'],
  'ci-unit': ['--unit', '--coverage', '--verbose'],
  'ci-integration': ['--integration', '--coverage', '--verbose']
};

// Check for shortcuts
const firstArg = process.argv[2];
if (shortcuts[firstArg]) {
  process.argv.splice(2, 1, ...shortcuts[firstArg]);
}

// Execute test runner
if (require.main === module) {
  const runner = new IndieHackersTestRunner();
  runner.run();
}

module.exports = IndieHackersTestRunner;