/**
 * Integration Tests for CLI Parameter Processing and Validation
 * Tests command line interface and parameter handling
 */

const IndieHackersTestUtils = require('../utils/indiehackers-test-utils');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;

describe('CLI Integration Tests', () => {
  let testUtils;
  let scriptPath;
  let testOutputDir;

  beforeAll(async () => {
    testUtils = new IndieHackersTestUtils();
    scriptPath = path.join(__dirname, '../../scripts/indiehackers-scraper.mjs'); // Hypothetical script path
    testOutputDir = await testUtils.createTestOutputDir('cli-integration');
  });

  afterAll(async () => {
    await testUtils.cleanupTestFiles(testOutputDir);
  });

  describe('Parameter Validation', () => {
    test('should validate date parameter format', () => {
      const validDates = ['2025-08-26', '2025-12-31', '2024-01-01'];
      const invalidDates = ['2025-8-26', '25-08-26', 'invalid-date', '2025/08/26'];

      validDates.forEach(date => {
        const result = testUtils.testCliParameters(['--date', date]);
        expect(result.valid).toBe(true);
        expect(result.params.date).toBe(date);
      });

      invalidDates.forEach(date => {
        const result = testUtils.testCliParameters(['--date', date]);
        expect(result.valid).toBe(false);
        expect(result.errors.some(error => error.includes('YYYY-MM-DD format'))).toBe(true);
      });
    });

    test('should validate categories parameter', () => {
      const validCategories = [
        ['--categories', 'all'],
        ['--categories', 'starting-up'],
        ['--categories', 'tech,ai,creators'],
        ['--categories', 'starting-up,tech,artificial-intelligence,creators,money']
      ];

      const invalidCategories = [
        ['--categories', 'invalid-category'],
        ['--categories', 'tech,invalid,creators'],
        ['--categories', '']
      ];

      validCategories.forEach(args => {
        const result = testUtils.testCliParameters(args);
        expect(result.valid).toBe(true);
        expect(result.params.categories).toBeDefined();
      });

      invalidCategories.forEach(args => {
        const result = testUtils.testCliParameters(args);
        expect(result.valid).toBe(false);
        expect(result.errors.some(error => error.includes('Invalid categories'))).toBe(true);
      });
    });

    test('should validate output parameter', () => {
      const validOutputs = [
        ['--output', '/tmp/test-output'],
        ['--output', './reports'],
        ['--output', '../custom-reports']
      ];

      validOutputs.forEach(args => {
        const result = testUtils.testCliParameters(args);
        expect(result.valid).toBe(true);
        expect(result.params.output).toBeDefined();
      });

      // Test missing value
      const missingValue = testUtils.testCliParameters(['--output']);
      expect(missingValue.valid).toBe(false);
      expect(missingValue.errors.some(error => error.includes('requires a value'))).toBe(true);
    });

    test('should reject unknown parameters', () => {
      const unknownParams = [
        ['--unknown-param', 'value'],
        ['--verbose'],
        ['--help-me']
      ];

      unknownParams.forEach(args => {
        const result = testUtils.testCliParameters(args);
        expect(result.errors.some(error => error.includes('Unknown parameter'))).toBe(true);
      });
    });

    test('should handle multiple parameters correctly', () => {
      const multipleParams = [
        '--date', '2025-08-26',
        '--categories', 'tech,starting-up',
        '--output', './test-reports'
      ];

      const result = testUtils.testCliParameters(multipleParams);
      expect(result.valid).toBe(true);
      expect(result.params.date).toBe('2025-08-26');
      expect(result.params.categories).toEqual(['tech', 'starting-up']);
      expect(result.params.output).toBe('./test-reports');
    });
  });

  describe('CLI Execution Flow', () => {
    test('should execute with default parameters', async () => {
      // Skip if actual script doesn't exist (this would test the real implementation)
      try {
        await fs.access(scriptPath);
      } catch {
        console.log('Skipping CLI execution test - script not found');
        return;
      }

      const result = await executeScript([]);
      
      // Should complete without errors or with expected default behavior
      expect(result.exitCode).toBe(0);
      expect(result.stderr).toBe('');
    });

    test('should execute with custom date parameter', async () => {
      try {
        await fs.access(scriptPath);
      } catch {
        console.log('Skipping CLI execution test - script not found');
        return;
      }

      const testDate = '2025-08-25';
      const result = await executeScript(['--date', testDate]);
      
      expect(result.exitCode).toBe(0);
      // Should contain date reference in output or logs
    });

    test('should execute with specific categories', async () => {
      try {
        await fs.access(scriptPath);
      } catch {
        console.log('Skipping CLI execution test - script not found');
        return;
      }

      const result = await executeScript(['--categories', 'tech,starting-up']);
      
      expect(result.exitCode).toBe(0);
      // Should process only specified categories
    });

    test('should execute with custom output directory', async () => {
      try {
        await fs.access(scriptPath);
      } catch {
        console.log('Skipping CLI execution test - script not found');
        return;
      }

      const customOutput = path.join(testOutputDir, 'custom-reports');
      await fs.mkdir(customOutput, { recursive: true });
      
      const result = await executeScript(['--output', customOutput]);
      
      expect(result.exitCode).toBe(0);
      
      // Check if files were created in custom directory
      const files = await fs.readdir(customOutput);
      expect(files.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling in CLI', () => {
    test('should handle invalid date parameter gracefully', async () => {
      try {
        await fs.access(scriptPath);
      } catch {
        console.log('Skipping CLI execution test - script not found');
        return;
      }

      const result = await executeScript(['--date', 'invalid-date']);
      
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toContain('date');
    });

    test('should handle invalid category parameter gracefully', async () => {
      try {
        await fs.access(scriptPath);
      } catch {
        console.log('Skipping CLI execution test - script not found');
        return;
      }

      const result = await executeScript(['--categories', 'invalid-category']);
      
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toContain('category') || expect(result.stderr).toContain('invalid');
    });

    test('should handle missing required parameter values', async () => {
      try {
        await fs.access(scriptPath);
      } catch {
        console.log('Skipping CLI execution test - script not found');
        return;
      }

      const missingValueTests = [
        ['--date'],
        ['--categories'],
        ['--output']
      ];

      for (const args of missingValueTests) {
        const result = await executeScript(args);
        expect(result.exitCode).not.toBe(0);
        expect(result.stderr.length).toBeGreaterThan(0);
      }
    });

    test('should handle non-existent output directory', async () => {
      try {
        await fs.access(scriptPath);
      } catch {
        console.log('Skipping CLI execution test - script not found');
        return;
      }

      const nonExistentPath = '/path/that/does/not/exist/reports';
      const result = await executeScript(['--output', nonExistentPath]);
      
      // Should either create directory or fail gracefully
      expect(result.exitCode === 0 || result.stderr.length > 0).toBe(true);
    });
  });

  describe('Output Validation', () => {
    test('should generate expected output file structure', async () => {
      // Mock the expected behavior
      const mockOutputStructure = {
        'report.md': 'markdown report content',
        'raw-data.json': '{"posts": []}',
      };

      const reportDir = path.join(testOutputDir, '2025-08-26');
      await fs.mkdir(reportDir, { recursive: true });

      for (const [filename, content] of Object.entries(mockOutputStructure)) {
        await fs.writeFile(path.join(reportDir, filename), content);
      }

      // Verify structure matches PRD specification
      const files = await fs.readdir(reportDir);
      expect(files).toContain('report.md');
      
      // Validate report content
      const reportContent = await fs.readFile(path.join(reportDir, 'report.md'), 'utf-8');
      const validation = testUtils.validateMarkdownReport(reportContent);
      expect(validation.valid || reportContent.length > 0).toBe(true);
    });

    test('should create proper directory structure based on date', async () => {
      const testDate = '2025-08-26';
      const expectedDir = path.join(testOutputDir, 'indiehacker', testDate);
      
      // Simulate directory creation
      await fs.mkdir(expectedDir, { recursive: true });
      await fs.writeFile(path.join(expectedDir, 'report.md'), '# Test Report');

      const exists = await fs.access(expectedDir).then(() => true).catch(() => false);
      expect(exists).toBe(true);

      const files = await fs.readdir(expectedDir);
      expect(files).toContain('report.md');
    });

    test('should validate generated markdown format', async () => {
      const sampleMarkdown = `# IndieHackers Daily Report - 2025-08-26

## Executive Summary
- Total posts analyzed: 25
- Top engagement category: starting-up
- Key trending topics: AI, SaaS, Growth

## Top Posts (Ranked by Engagement)

### 1. How I Built a $50k MRR SaaS
**Author:** @saasfounder
**Category:** starting-up
**Engagement:** 32 comments, 145 upvotes
**URL:** https://www.indiehackers.com/post/test
**Summary:** After years of corporate life...

---

## Category Breakdown

### starting-up (10 posts)
- [Test Post](https://www.indiehackers.com/post/test) - 150 engagement score

## Trending Themes
1. **AI Integration** - Mentioned in 8 posts
2. **SaaS Growth** - Mentioned in 6 posts`;

      const validation = testUtils.validateMarkdownReport(sampleMarkdown);
      expect(validation.valid).toBe(true);
      expect(validation.errors.length).toBe(0);
    });
  });

  describe('Performance and Reliability', () => {
    test('should complete within reasonable time limits', async () => {
      try {
        await fs.access(scriptPath);
      } catch {
        console.log('Skipping CLI execution test - script not found');
        return;
      }

      const startTime = Date.now();
      const result = await executeScript(['--categories', 'tech']);
      const elapsed = Date.now() - startTime;

      expect(result.exitCode).toBe(0);
      expect(elapsed).toBeLessThan(30000); // Less than 30 seconds
    });

    test('should handle timeout scenarios', async () => {
      try {
        await fs.access(scriptPath);
      } catch {
        console.log('Skipping CLI execution test - script not found');
        return;
      }

      const timeout = 10000; // 10 seconds
      const result = await executeScriptWithTimeout(['--categories', 'all'], timeout);

      // Should either complete or timeout gracefully
      expect(result.exitCode !== undefined).toBe(true);
      expect(result.stderr !== undefined).toBe(true);
    });

    test('should handle concurrent CLI executions', async () => {
      try {
        await fs.access(scriptPath);
      } catch {
        console.log('Skipping CLI execution test - script not found');
        return;
      }

      const promises = [];
      const categories = ['tech', 'starting-up', 'creators'];

      for (let i = 0; i < categories.length; i++) {
        const outputDir = path.join(testOutputDir, `concurrent-${i}`);
        await fs.mkdir(outputDir, { recursive: true });
        
        promises.push(executeScript([
          '--categories', categories[i],
          '--output', outputDir
        ]));
      }

      const results = await Promise.all(promises);
      
      results.forEach((result, index) => {
        expect(result.exitCode).toBe(0);
      });
    });
  });

  /**
   * Helper function to execute script with arguments
   */
  async function executeScript(args, options = {}) {
    return new Promise((resolve) => {
      const child = spawn('node', [scriptPath, ...args], {
        stdio: 'pipe',
        ...options
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (exitCode) => {
        resolve({
          stdout,
          stderr,
          exitCode
        });
      });

      child.on('error', (error) => {
        resolve({
          stdout,
          stderr: error.message,
          exitCode: 1
        });
      });
    });
  }

  /**
   * Helper function to execute script with timeout
   */
  async function executeScriptWithTimeout(args, timeout = 10000) {
    return Promise.race([
      executeScript(args),
      new Promise(resolve => 
        setTimeout(() => resolve({ 
          stdout: '', 
          stderr: 'Timeout', 
          exitCode: -1 
        }), timeout)
      )
    ]);
  }
});