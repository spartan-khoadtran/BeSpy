#!/usr/bin/env node

/**
 * Browser Login Setup Script
 * 
 * This script opens a browser with persistent profile storage
 * allowing you to login to Twitter once and reuse the session
 */

import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function setupBrowserLogin() {
  console.log('🔐 Browser Login Setup for Twitter');
  console.log('===================================\n');

  // Use the browser-data directory in project root
  const userDataDir = path.join(__dirname, '..', 'browser-data');
  
  // Ensure directory exists
  if (!fs.existsSync(userDataDir)) {
    fs.mkdirSync(userDataDir, { recursive: true });
    console.log('✅ Created browser-data directory\n');
  } else {
    console.log('📂 Using existing browser-data directory\n');
  }

  console.log(`📍 Profile location: ${userDataDir}`);
  console.log('\n⚠️  IMPORTANT: This browser profile will store your login session');
  console.log('    Keep the browser-data directory secure!\n');

  try {
    // Launch browser with persistent storage
    console.log('🚀 Launching browser...\n');
    const browser = await chromium.launchPersistentContext(userDataDir, {
      headless: false,
      viewport: { width: 1280, height: 800 },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      args: [
        '--disable-blink-features=AutomationControlled',
        '--no-sandbox'
      ]
    });

    const page = await browser.newPage();
    
    // Navigate to Twitter
    console.log('📱 Navigating to Twitter...\n');
    await page.goto('https://x.com/login', { waitUntil: 'networkidle' });
    
    console.log('✅ Browser opened successfully!\n');
    console.log('📝 INSTRUCTIONS:');
    console.log('1. Log in to your Twitter account');
    console.log('2. Complete any two-factor authentication if required');
    console.log('3. Once logged in, you can close this browser');
    console.log('4. Your session will be saved for future use\n');
    console.log('⏳ Waiting for you to complete login...');
    console.log('   (The script will stay open - press Ctrl+C when done)\n');

    // Keep the browser open
    await new Promise(() => {}); // This will keep running until user stops it

  } catch (error) {
    if (error.message.includes('Target closed')) {
      console.log('\n✅ Browser closed. Login session saved!');
      console.log('🎉 You can now use the unified fetcher without logging in again.\n');
    } else {
      console.error('❌ Error:', error.message);
    }
  }
}

// Run the setup
setupBrowserLogin().catch(console.error);