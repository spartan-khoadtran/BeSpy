#!/usr/bin/env node

const HackerNewsScraper = require('./scraper');
const { formatAsJson, formatAsMarkdown } = require('./formatters');
const { findTrendingPosts } = require('./trending');
const fs = require('fs').promises;
const path = require('path');

async function testSearch() {
  console.log('🔍 Testing search functionality with keyword "buildpad"...\n');
  
  const scraper = new HackerNewsScraper();
  
  try {
    await scraper.init();
    
    const results = await scraper.search('buildpad');
    
    if (results.length === 0) {
      console.error('❌ TEST FAILED: No results found for "buildpad"');
      console.log('This indicates the implementation may be incorrect.');
      return false;
    }
    
    console.log(`✅ Found ${results.length} results for "buildpad"\n`);
    
    // Test JSON formatting
    const jsonOutput = formatAsJson(results);
    console.log('📋 JSON Output (first result):');
    const firstResult = JSON.parse(jsonOutput)[0];
    console.log(JSON.stringify(firstResult, null, 2));
    
    // Save full results
    const reportDir = path.join(__dirname, '../../report/hackernews');
    await fs.mkdir(reportDir, { recursive: true });
    
    await fs.writeFile(
      path.join(reportDir, 'search-buildpad.json'),
      jsonOutput
    );
    
    // Test Markdown formatting
    const markdownOutput = formatAsMarkdown(results, 'BuildPad Search Results');
    await fs.writeFile(
      path.join(reportDir, 'search-buildpad.md'),
      markdownOutput
    );
    
    console.log('\n✅ Search test passed!');
    console.log(`📁 Results saved to ${reportDir}`);
    
    return true;
    
  } catch (error) {
    console.error('❌ Search test failed:', error.message);
    return false;
  } finally {
    await scraper.close();
  }
}

async function testTrending() {
  console.log('\n📈 Testing trending posts functionality...\n');
  
  const scraper = new HackerNewsScraper();
  
  try {
    await scraper.init();
    
    const trendingPosts = await findTrendingPosts(scraper, 2);
    
    if (trendingPosts.length === 0) {
      console.error('❌ TEST FAILED: No trending posts found');
      return false;
    }
    
    console.log(`✅ Found ${trendingPosts.length} trending posts from last 2 days\n`);
    
    // Display top 3 trending
    console.log('Top 3 Trending Posts:');
    trendingPosts.slice(0, 3).forEach((post, i) => {
      console.log(`${i + 1}. ${post.title}`);
      console.log(`   Score: ${post.trendingScore.toFixed(2)}, Points: ${post.points}, Comments: ${post.comments}`);
    });
    
    // Save results
    const reportDir = path.join(__dirname, '../../report/hackernews');
    await fs.mkdir(reportDir, { recursive: true });
    
    await fs.writeFile(
      path.join(reportDir, 'trending.json'),
      formatAsJson(trendingPosts)
    );
    
    await fs.writeFile(
      path.join(reportDir, 'trending.md'),
      formatAsMarkdown(trendingPosts, 'Trending Posts (Last 2 Days)')
    );
    
    console.log('\n✅ Trending test passed!');
    
    return true;
    
  } catch (error) {
    console.error('❌ Trending test failed:', error.message);
    return false;
  } finally {
    await scraper.close();
  }
}

async function runAllTests() {
  console.log('🚀 Starting HackerNews Scraper Tests\n');
  console.log('=' .repeat(50));
  
  const searchPassed = await testSearch();
  const trendingPassed = await testTrending();
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 Test Results Summary:');
  console.log(`  Search Test: ${searchPassed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`  Trending Test: ${trendingPassed ? '✅ PASSED' : '❌ FAILED'}`);
  
  if (searchPassed && trendingPassed) {
    console.log('\n🎉 All tests passed successfully!');
    process.exit(0);
  } else {
    console.log('\n⚠️ Some tests failed. Please review the implementation.');
    process.exit(1);
  }
}

if (require.main === module) {
  runAllTests();
}

module.exports = { testSearch, testTrending };