#!/usr/bin/env node

/**
 * Test Suite Validation Script
 * Validates the completeness and correctness of the IndieHackers test suite
 */

const fs = require('fs').promises;
const path = require('path');

class TestSuiteValidator {
  constructor() {
    this.testDir = __dirname;
    this.requiredFiles = [
      // Unit tests
      'unit/scraper-functions.test.js',
      'unit/engagement-scoring.test.js', 
      'unit/duplicate-detection.test.js',
      
      // Integration tests
      'integration/end-to-end-workflow.test.js',
      'integration/cli-integration.test.js',
      'integration/data-validation.test.js',
      'integration/performance-reliability.test.js',
      'integration/error-handling.test.js',
      
      // Support files
      'fixtures/sample-posts.json',
      'mocks/mock-scraper.js',
      'utils/indiehackers-test-utils.js',
      
      // Configuration
      'jest.config.js',
      'package.json',
      'run-tests.js',
      'README.md'
    ];
  }

  /**
   * Check if all required files exist
   */
  async validateFileStructure() {
    console.log('🔍 Validating test suite file structure...');
    const results = { passed: 0, failed: 0, errors: [] };

    for (const filePath of this.requiredFiles) {
      const fullPath = path.join(this.testDir, filePath);
      
      try {
        await fs.access(fullPath);
        console.log(`✅ ${filePath}`);
        results.passed++;
      } catch (error) {
        console.log(`❌ ${filePath} - Missing`);
        results.failed++;
        results.errors.push(`Missing file: ${filePath}`);
      }
    }

    return results;
  }

  /**
   * Validate test file content structure
   */
  async validateTestContent() {
    console.log('\n📝 Validating test file content...');
    const results = { passed: 0, failed: 0, errors: [] };

    const testFiles = this.requiredFiles.filter(f => f.endsWith('.test.js'));

    for (const testFile of testFiles) {
      const fullPath = path.join(this.testDir, testFile);
      
      try {
        const content = await fs.readFile(fullPath, 'utf-8');
        const validation = this.validateTestFileContent(content, testFile);
        
        if (validation.valid) {
          console.log(`✅ ${testFile} - Valid structure`);
          results.passed++;
        } else {
          console.log(`❌ ${testFile} - Issues found:`);
          validation.issues.forEach(issue => {
            console.log(`   • ${issue}`);
          });
          results.failed++;
          results.errors.push(...validation.issues.map(issue => `${testFile}: ${issue}`));
        }
      } catch (error) {
        console.log(`❌ ${testFile} - Could not read file`);
        results.failed++;
        results.errors.push(`Could not read ${testFile}: ${error.message}`);
      }
    }

    return results;
  }

  /**
   * Validate individual test file content
   */
  validateTestFileContent(content, fileName) {
    const issues = [];

    // Check for required elements
    if (!content.includes('describe(')) {
      issues.push('Missing describe blocks');
    }

    if (!content.includes('test(') && !content.includes('it(')) {
      issues.push('Missing test cases');
    }

    if (!content.includes('expect(')) {
      issues.push('Missing assertions');
    }

    // Check for setup/teardown
    if (!content.includes('beforeEach') && !content.includes('beforeAll')) {
      issues.push('Missing test setup (consider beforeEach/beforeAll)');
    }

    // Check for async handling
    if (fileName.includes('integration') && !content.includes('async')) {
      issues.push('Integration tests should handle async operations');
    }

    // Check for error handling tests
    if (fileName.includes('error-handling') && !content.includes('toThrow')) {
      issues.push('Error handling tests should test for exceptions');
    }

    // Check for performance tests
    if (fileName.includes('performance') && !content.includes('measurePerformance')) {
      issues.push('Performance tests should measure execution time');
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }

  /**
   * Validate configuration files
   */
  async validateConfiguration() {
    console.log('\n⚙️  Validating configuration files...');
    const results = { passed: 0, failed: 0, errors: [] };

    // Validate Jest config
    try {
      const jestConfigPath = path.join(this.testDir, 'jest.config.js');
      const jestConfig = require(jestConfigPath);
      
      const requiredJestConfig = [
        'testEnvironment',
        'testMatch',
        'collectCoverage',
        'coverageDirectory',
        'coverageThreshold'
      ];

      const missingConfig = requiredJestConfig.filter(key => !jestConfig[key]);
      
      if (missingConfig.length === 0) {
        console.log('✅ jest.config.js - Valid configuration');
        results.passed++;
      } else {
        console.log('❌ jest.config.js - Missing configuration:');
        missingConfig.forEach(key => console.log(`   • ${key}`));
        results.failed++;
        results.errors.push(`Jest config missing: ${missingConfig.join(', ')}`);
      }
    } catch (error) {
      console.log('❌ jest.config.js - Invalid or missing');
      results.failed++;
      results.errors.push(`Jest config error: ${error.message}`);
    }

    // Validate package.json
    try {
      const packageJsonPath = path.join(this.testDir, 'package.json');
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
      
      const requiredPackageFields = ['name', 'scripts', 'devDependencies'];
      const missingFields = requiredPackageFields.filter(field => !packageJson[field]);
      
      if (missingFields.length === 0 && packageJson.scripts.test) {
        console.log('✅ package.json - Valid configuration');
        results.passed++;
      } else {
        console.log('❌ package.json - Issues found:');
        if (missingFields.length > 0) {
          console.log(`   • Missing fields: ${missingFields.join(', ')}`);
        }
        if (!packageJson.scripts?.test) {
          console.log('   • Missing test script');
        }
        results.failed++;
        results.errors.push('Package.json configuration issues');
      }
    } catch (error) {
      console.log('❌ package.json - Invalid or missing');
      results.failed++;
      results.errors.push(`Package.json error: ${error.message}`);
    }

    return results;
  }

  /**
   * Validate test data and fixtures
   */
  async validateTestData() {
    console.log('\n📊 Validating test data and fixtures...');
    const results = { passed: 0, failed: 0, errors: [] };

    // Validate sample posts fixture
    try {
      const samplePostsPath = path.join(this.testDir, 'fixtures/sample-posts.json');
      const samplePosts = JSON.parse(await fs.readFile(samplePostsPath, 'utf-8'));
      
      if (samplePosts.sampleIndieHackersPosts && 
          Array.isArray(samplePosts.sampleIndieHackersPosts) &&
          samplePosts.sampleIndieHackersPosts.length > 0) {
        
        // Validate post structure
        const firstPost = samplePosts.sampleIndieHackersPosts[0];
        const requiredPostFields = ['id', 'title', 'url', 'author', 'category', 'engagement'];
        const missingPostFields = requiredPostFields.filter(field => !firstPost[field]);
        
        if (missingPostFields.length === 0) {
          console.log('✅ Sample posts fixture - Valid structure');
          results.passed++;
        } else {
          console.log('❌ Sample posts fixture - Invalid post structure');
          results.failed++;
          results.errors.push(`Sample posts missing fields: ${missingPostFields.join(', ')}`);
        }
      } else {
        console.log('❌ Sample posts fixture - Invalid data structure');
        results.failed++;
        results.errors.push('Sample posts fixture has invalid structure');
      }
    } catch (error) {
      console.log('❌ Sample posts fixture - Could not validate');
      results.failed++;
      results.errors.push(`Sample posts error: ${error.message}`);
    }

    return results;
  }

  /**
   * Check test coverage expectations
   */
  async validateCoverageExpectations() {
    console.log('\n📈 Validating coverage expectations...');
    const results = { passed: 0, failed: 0, errors: [] };

    try {
      const jestConfigPath = path.join(this.testDir, 'jest.config.js');
      const jestConfig = require(jestConfigPath);
      
      if (jestConfig.coverageThreshold?.global) {
        const thresholds = jestConfig.coverageThreshold.global;
        const expectedMinimums = {
          branches: 70,
          functions: 75,
          lines: 75,
          statements: 75
        };

        let allThresholdsMet = true;
        Object.entries(expectedMinimums).forEach(([metric, minimum]) => {
          if (!thresholds[metric] || thresholds[metric] < minimum) {
            allThresholdsMet = false;
            console.log(`⚠️  Coverage threshold for ${metric} should be at least ${minimum}%`);
          }
        });

        if (allThresholdsMet) {
          console.log('✅ Coverage thresholds - Adequate levels set');
          results.passed++;
        } else {
          console.log('❌ Coverage thresholds - Some thresholds below recommended levels');
          results.failed++;
          results.errors.push('Coverage thresholds below recommended levels');
        }
      } else {
        console.log('❌ Coverage thresholds - Not configured');
        results.failed++;
        results.errors.push('Coverage thresholds not configured');
      }
    } catch (error) {
      console.log('❌ Coverage validation failed');
      results.failed++;
      results.errors.push(`Coverage validation error: ${error.message}`);
    }

    return results;
  }

  /**
   * Generate validation report
   */
  generateReport(validationResults) {
    console.log('\n' + '='.repeat(80));
    console.log('📋 TEST SUITE VALIDATION REPORT');
    console.log('='.repeat(80));

    let totalPassed = 0;
    let totalFailed = 0;
    let allErrors = [];

    Object.entries(validationResults).forEach(([category, result]) => {
      totalPassed += result.passed;
      totalFailed += result.failed;
      allErrors.push(...result.errors);
      
      console.log(`\n${category.toUpperCase()}:`);
      console.log(`  ✅ Passed: ${result.passed}`);
      console.log(`  ❌ Failed: ${result.failed}`);
    });

    console.log('\n' + '-'.repeat(80));
    console.log(`OVERALL RESULTS:`);
    console.log(`  ✅ Total Passed: ${totalPassed}`);
    console.log(`  ❌ Total Failed: ${totalFailed}`);
    console.log(`  📊 Success Rate: ${((totalPassed / (totalPassed + totalFailed)) * 100).toFixed(1)}%`);

    if (allErrors.length > 0) {
      console.log('\n🚨 ISSUES FOUND:');
      allErrors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
    }

    const overallSuccess = totalFailed === 0;
    console.log('\n' + '='.repeat(80));
    
    if (overallSuccess) {
      console.log('🎉 TEST SUITE VALIDATION PASSED!');
      console.log('All components are properly configured and ready for testing.');
    } else {
      console.log('⚠️  TEST SUITE VALIDATION FAILED!');
      console.log('Please address the issues above before running tests.');
    }
    
    console.log('='.repeat(80));

    return overallSuccess;
  }

  /**
   * Run complete validation
   */
  async validate() {
    console.log('🧪 IndieHackers Test Suite Validator');
    console.log('Validating comprehensive test suite for IndieHackers scraper...\n');

    try {
      const validationResults = {
        fileStructure: await this.validateFileStructure(),
        testContent: await this.validateTestContent(),
        configuration: await this.validateConfiguration(),
        testData: await this.validateTestData(),
        coverage: await this.validateCoverageExpectations()
      };

      const success = this.generateReport(validationResults);
      return success;
    } catch (error) {
      console.error('❌ Validation failed with error:', error);
      return false;
    }
  }
}

// Run validation if called directly
if (require.main === module) {
  const validator = new TestSuiteValidator();
  validator.validate().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = TestSuiteValidator;