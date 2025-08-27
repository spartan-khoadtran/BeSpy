#!/usr/bin/env node

/**
 * Report Validation Script
 * Checks if reports are generated correctly according to the rules
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

/**
 * Get expected date folder name
 */
function getExpectedDateFolder() {
  const date = new Date();
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                     'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${date.getDate()}-${monthNames[date.getMonth()]}-${date.getFullYear()}`;
}

/**
 * Check if a file exists and is valid JSON
 */
async function validateJsonFile(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    JSON.parse(content);
    return { exists: true, valid: true, size: content.length };
  } catch (error) {
    if (error.code === 'ENOENT') {
      return { exists: false, valid: false, size: 0 };
    }
    return { exists: true, valid: false, size: 0, error: error.message };
  }
}

/**
 * Check if a file exists
 */
async function checkFile(filePath) {
  try {
    const stats = await fs.stat(filePath);
    return { exists: true, size: stats.size };
  } catch {
    return { exists: false, size: 0 };
  }
}

/**
 * Validate IndieHacker reports
 */
async function validateIndieHacker(dateFolder = null) {
  console.log(`\n${colors.blue}━━━ IndieHacker Report Validation ━━━${colors.reset}\n`);
  
  const expectedDate = dateFolder || getExpectedDateFolder();
  const reportDir = path.join(__dirname, '..', 'report', 'indiehacker', expectedDate);
  
  console.log(`📁 Checking folder: ${colors.cyan}report/indiehacker/${expectedDate}/${colors.reset}`);
  
  // Check if folder exists
  try {
    await fs.access(reportDir);
    console.log(`${colors.green}✅ Date folder exists${colors.reset}`);
  } catch {
    console.log(`${colors.red}❌ Date folder not found!${colors.reset}`);
    console.log(`   Expected: ${reportDir}`);
    return false;
  }
  
  // Required files for IndieHacker
  const requiredFiles = [
    { name: 'starting-up-data.json', type: 'json' },
    { name: 'starting-up-report.md', type: 'md' },
    { name: 'tech-data.json', type: 'json' },
    { name: 'tech-report.md', type: 'md' },
    { name: 'main-data.json', type: 'json' },
    { name: 'main-report.md', type: 'md' },
    { name: 'all-categories.json', type: 'json' },
    { name: 'summary.md', type: 'md' }
  ];
  
  let allValid = true;
  let fileCount = 0;
  
  console.log(`\n${colors.yellow}Required Files:${colors.reset}`);
  
  for (const file of requiredFiles) {
    const filePath = path.join(reportDir, file.name);
    
    if (file.type === 'json') {
      const result = await validateJsonFile(filePath);
      if (result.exists && result.valid) {
        console.log(`  ${colors.green}✅${colors.reset} ${file.name} (${result.size} bytes)`);
        fileCount++;
      } else if (result.exists && !result.valid) {
        console.log(`  ${colors.yellow}⚠️${colors.reset}  ${file.name} - Invalid JSON!`);
        allValid = false;
      } else {
        console.log(`  ${colors.red}❌${colors.reset} ${file.name} - Missing!`);
        allValid = false;
      }
    } else {
      const result = await checkFile(filePath);
      if (result.exists) {
        console.log(`  ${colors.green}✅${colors.reset} ${file.name} (${result.size} bytes)`);
        fileCount++;
      } else {
        console.log(`  ${colors.red}❌${colors.reset} ${file.name} - Missing!`);
        allValid = false;
      }
    }
  }
  
  // Check for extra files
  const allFiles = await fs.readdir(reportDir);
  const extraFiles = allFiles.filter(f => !requiredFiles.find(r => r.name === f));
  
  if (extraFiles.length > 0) {
    console.log(`\n${colors.cyan}Extra Files:${colors.reset}`);
    extraFiles.forEach(f => console.log(`  📄 ${f}`));
  }
  
  // Summary
  console.log(`\n${colors.blue}Summary:${colors.reset}`);
  console.log(`  Total files: ${fileCount}/${requiredFiles.length}`);
  
  if (allValid && fileCount === requiredFiles.length) {
    console.log(`  ${colors.green}✅ All IndieHacker reports are valid!${colors.reset}`);
    return true;
  } else {
    console.log(`  ${colors.red}❌ Some files are missing or invalid!${colors.reset}`);
    return false;
  }
}

/**
 * Validate Twitter reports
 */
async function validateTwitter(dateFolder = null, keyword = null) {
  console.log(`\n${colors.blue}━━━ Twitter Report Validation ━━━${colors.reset}\n`);
  
  const expectedDate = dateFolder || getExpectedDateFolder();
  const reportDir = path.join(__dirname, '..', 'report', 'twitter', expectedDate);
  
  console.log(`📁 Checking folder: ${colors.cyan}report/twitter/${expectedDate}/${colors.reset}`);
  
  // Check if folder exists
  try {
    await fs.access(reportDir);
    console.log(`${colors.green}✅ Date folder exists${colors.reset}`);
  } catch {
    console.log(`${colors.red}❌ Date folder not found!${colors.reset}`);
    console.log(`   Expected: ${reportDir}`);
    return false;
  }
  
  // Get all files in directory
  const allFiles = await fs.readdir(reportDir);
  
  // Check for required file patterns
  const jsonFiles = allFiles.filter(f => f.endsWith('-data.json') || f.endsWith('.json'));
  const mdFiles = allFiles.filter(f => f.endsWith('-report.md') || f.endsWith('.md'));
  const csvFiles = allFiles.filter(f => f.endsWith('.csv'));
  
  console.log(`\n${colors.yellow}Files Found:${colors.reset}`);
  console.log(`  JSON files: ${jsonFiles.length}`);
  console.log(`  Markdown files: ${mdFiles.length}`);
  console.log(`  CSV files: ${csvFiles.length}`);
  
  let allValid = true;
  
  // Validate JSON files
  if (jsonFiles.length > 0) {
    console.log(`\n${colors.cyan}JSON Files:${colors.reset}`);
    for (const file of jsonFiles) {
      const filePath = path.join(reportDir, file);
      const result = await validateJsonFile(filePath);
      if (result.exists && result.valid) {
        console.log(`  ${colors.green}✅${colors.reset} ${file} (${result.size} bytes)`);
      } else {
        console.log(`  ${colors.red}❌${colors.reset} ${file} - Invalid JSON!`);
        allValid = false;
      }
    }
  } else {
    console.log(`  ${colors.red}❌ No JSON files found!${colors.reset}`);
    allValid = false;
  }
  
  // Check for markdown reports
  if (mdFiles.length > 0) {
    console.log(`\n${colors.cyan}Markdown Reports:${colors.reset}`);
    mdFiles.forEach(f => console.log(`  📄 ${f}`));
  } else {
    console.log(`  ${colors.red}❌ No Markdown files found!${colors.reset}`);
    allValid = false;
  }
  
  // Check for CSV files
  if (csvFiles.length > 0) {
    console.log(`\n${colors.cyan}CSV Files:${colors.reset}`);
    csvFiles.forEach(f => console.log(`  📊 ${f}`));
  } else {
    console.log(`  ${colors.yellow}⚠️  No CSV files found${colors.reset}`);
  }
  
  // Check for summary
  const hasSummary = allFiles.some(f => f.includes('summary'));
  if (hasSummary) {
    console.log(`\n${colors.green}✅ Summary file found${colors.reset}`);
  } else {
    console.log(`\n${colors.yellow}⚠️  No summary file found${colors.reset}`);
  }
  
  // Summary
  console.log(`\n${colors.blue}Summary:${colors.reset}`);
  const minRequired = jsonFiles.length > 0 && mdFiles.length > 0;
  
  if (minRequired && allValid) {
    console.log(`  ${colors.green}✅ Twitter reports are valid!${colors.reset}`);
    return true;
  } else {
    console.log(`  ${colors.red}❌ Missing required Twitter report files!${colors.reset}`);
    return false;
  }
}

/**
 * Check for common mistakes
 */
async function checkCommonMistakes() {
  console.log(`\n${colors.yellow}━━━ Checking for Common Mistakes ━━━${colors.reset}\n`);
  
  const reportRoot = path.join(__dirname, '..', 'report');
  const rootFiles = await fs.readdir(reportRoot);
  
  // Check for files in root report folder
  const wrongFiles = rootFiles.filter(f => 
    f.endsWith('.json') || 
    f.endsWith('.md') || 
    f.endsWith('.csv')
  );
  
  if (wrongFiles.length > 0) {
    console.log(`${colors.red}❌ Found files in root report folder!${colors.reset}`);
    console.log(`   These should be in date-based subfolders:`);
    wrongFiles.forEach(f => console.log(`   - ${f}`));
    return false;
  }
  
  // Check for wrong date format folders
  const folders = rootFiles.filter(f => !f.startsWith('.'));
  for (const folder of folders) {
    const subPath = path.join(reportRoot, folder);
    const stats = await fs.stat(subPath);
    if (stats.isDirectory() && folder !== 'indiehacker' && folder !== 'twitter') {
      const subFolders = await fs.readdir(subPath);
      for (const sub of subFolders) {
        if (sub.match(/^\d{4}-\d{2}-\d{2}$/)) {
          console.log(`${colors.red}❌ Wrong date format: ${folder}/${sub}${colors.reset}`);
          console.log(`   Should be: DD-MMM-YYYY (e.g., 27-Aug-2025)`);
          return false;
        }
      }
    }
  }
  
  console.log(`${colors.green}✅ No common mistakes found${colors.reset}`);
  return true;
}

/**
 * Main validation function
 */
async function validateAll() {
  console.log(`\n${colors.cyan}${'='.repeat(50)}${colors.reset}`);
  console.log(`${colors.cyan}    Report Validation Tool    ${colors.reset}`);
  console.log(`${colors.cyan}${'='.repeat(50)}${colors.reset}`);
  
  const args = process.argv.slice(2);
  const platform = args[0];
  const dateFolder = args[1];
  
  let results = {
    commonMistakes: true,
    indieHacker: null,
    twitter: null
  };
  
  // Always check for common mistakes
  results.commonMistakes = await checkCommonMistakes();
  
  // Validate specific platform or all
  if (!platform || platform === 'all') {
    results.indieHacker = await validateIndieHacker(dateFolder);
    results.twitter = await validateTwitter(dateFolder);
  } else if (platform === 'indiehacker') {
    results.indieHacker = await validateIndieHacker(dateFolder);
  } else if (platform === 'twitter') {
    results.twitter = await validateTwitter(dateFolder);
  } else {
    console.log(`\n${colors.red}Unknown platform: ${platform}${colors.reset}`);
    console.log('Usage: node validate-reports.js [all|indiehacker|twitter] [date-folder]');
    console.log('Example: node validate-reports.js all 27-Aug-2025');
  }
  
  // Final summary
  console.log(`\n${colors.cyan}${'='.repeat(50)}${colors.reset}`);
  console.log(`${colors.cyan}    Final Results    ${colors.reset}`);
  console.log(`${colors.cyan}${'='.repeat(50)}${colors.reset}\n`);
  
  if (results.commonMistakes === false) {
    console.log(`${colors.red}⚠️  Fix common mistakes first!${colors.reset}`);
  }
  
  if (results.indieHacker !== null) {
    const status = results.indieHacker ? 
      `${colors.green}✅ PASS${colors.reset}` : 
      `${colors.red}❌ FAIL${colors.reset}`;
    console.log(`IndieHacker Reports: ${status}`);
  }
  
  if (results.twitter !== null) {
    const status = results.twitter ? 
      `${colors.green}✅ PASS${colors.reset}` : 
      `${colors.red}❌ FAIL${colors.reset}`;
    console.log(`Twitter Reports: ${status}`);
  }
  
  const allPass = results.commonMistakes && 
    (results.indieHacker === null || results.indieHacker) && 
    (results.twitter === null || results.twitter);
  
  if (allPass) {
    console.log(`\n${colors.green}🎉 All validations passed!${colors.reset}`);
    process.exit(0);
  } else {
    console.log(`\n${colors.red}💥 Some validations failed. Please fix the issues.${colors.reset}`);
    process.exit(1);
  }
}

// Run validation
validateAll().catch(error => {
  console.error(`${colors.red}Error: ${error.message}${colors.reset}`);
  process.exit(1);
});