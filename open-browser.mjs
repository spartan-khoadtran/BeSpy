#!/usr/bin/env node

/**
 * Open Chromium browser with the existing browser-data profile
 * This allows manual setup and configuration of the browser profile
 */

import { chromium } from 'playwright';
import path from 'path';

async function openBrowser() {
  console.log('🚀 Opening Chromium with your browser-data profile...\n');
  
  const userDataDir = path.join(process.cwd(), 'browser-data');
  console.log(`📂 Using profile directory: ${userDataDir}`);
  
  try {
    // Clean up any lock files first
    const { promises: fs } = await import('fs');
    const lockFiles = ['SingletonLock', 'SingletonCookie', 'SingletonSocket'];
    
    for (const lockFile of lockFiles) {
      const lockPath = path.join(userDataDir, lockFile);
      try {
        await fs.unlink(lockPath);
        console.log(`🧹 Cleaned up ${lockFile}`);
      } catch {
        // Ignore if lock file doesn't exist
      }
    }
    
    // Launch browser with your persistent profile
    const context = await chromium.launchPersistentContext(userDataDir, {
      headless: false, // Visible browser
      viewport: { width: 1400, height: 900 },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      
      // Keep your existing settings
      args: [
        '--disable-features=RendererCodeIntegrity',
        '--disable-web-security', // Sometimes helps with Twitter
        '--disable-blink-features=AutomationControlled'
      ],
      
      // Don't block resources for setup
      bypassCSP: true,
      ignoreHTTPSErrors: true
    });
    
    console.log('✅ Browser opened successfully!');
    console.log('🔧 You can now:');
    console.log('   • Login to Twitter/X if needed');
    console.log('   • Adjust any settings');
    console.log('   • Install extensions');
    console.log('   • Configure preferences');
    console.log('\n💡 The browser will stay open until you close it manually.');
    console.log('📌 All changes will be saved to your browser-data profile.');
    
    // Get the page
    const page = context.pages()[0] || await context.newPage();
    
    // Navigate to Twitter/X if not already there
    const currentUrl = page.url();
    if (!currentUrl.includes('x.com') && !currentUrl.includes('twitter.com')) {
      console.log('🌐 Navigating to X.com...');
      await page.goto('https://x.com', { waitUntil: 'domcontentloaded' });
    }
    
    // Keep the script running so browser stays open
    console.log('\n⏳ Browser is running... Press Ctrl+C to close when done.');
    
    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n🛑 Closing browser...');
      await context.close();
      console.log('✅ Browser closed. Profile saved.');
      process.exit(0);
    });
    
    // Keep the process alive
    setInterval(() => {
      // Check if context is still alive
      if (context.pages().length === 0) {
        console.log('🚪 Browser was closed by user.');
        process.exit(0);
      }
    }, 5000);
    
  } catch (error) {
    console.error('❌ Error opening browser:', error.message);
    
    if (error.message.includes('Failed to launch')) {
      console.log('\n💡 Troubleshooting tips:');
      console.log('   • Make sure no other browser is using this profile');
      console.log('   • Try running: pkill -f "chrome"');
      console.log('   • Or restart your computer if needed');
    }
    
    process.exit(1);
  }
}

// Run the script
openBrowser().catch(console.error);