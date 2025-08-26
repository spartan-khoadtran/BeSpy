#!/usr/bin/env node

/**
 * Unified Twitter Data Fetcher and Report Generator
 * Consolidates all Twitter fetching functionality into a single parameterized script
 * 
 * Usage:
 *   node twitter-unified-fetcher.mjs --keyword="AI" --posts=50 --comments --format=all
 *   node twitter-unified-fetcher.mjs -k "startup" -p 30 -c -f markdown
 *   node twitter-unified-fetcher.mjs --keyword="blockchain" --template=detailed
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { chromium } from 'playwright';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseArgs } from 'util';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Parse command line arguments
const options = {
  keyword: {
    type: 'string',
    short: 'k',
    default: 'AI',
    description: 'Search keyword or phrase'
  },
  posts: {
    type: 'string',
    short: 'p',
    default: '30',
    description: 'Number of posts to fetch'
  },
  comments: {
    type: 'boolean',
    short: 'c',
    default: false,
    description: 'Include comments for each post'
  },
  format: {
    type: 'string',
    short: 'f',
    default: 'all',
    description: 'Report format: markdown, csv, json, all'
  },
  template: {
    type: 'string',
    short: 't',
    default: 'standard',
    description: 'Report template: standard, detailed, minimal, custom'
  },
  sortBy: {
    type: 'string',
    short: 's',
    default: 'latest',
    description: 'Sort by: latest, top, people'
  },
  outputDir: {
    type: 'string',
    short: 'o',
    default: 'report',
    description: 'Output directory for reports'
  },
  noMcp: {
    type: 'boolean',
    short: 'n',
    default: false,
    description: 'Disable MCP server and use direct Playwright'
  },
  englishOnly: {
    type: 'boolean',
    short: 'e',
    default: true,
    description: 'Keep only English posts (default: true)'
  },
  allLanguages: {
    type: 'boolean',
    short: 'a',
    default: false,
    description: 'Include posts in all languages (overrides englishOnly)'
  },
  help: {
    type: 'boolean',
    short: 'h',
    default: false,
    description: 'Show help message'
  }
};

const { values } = parseArgs({ options });

if (values.help) {
  console.log(`
🐦 Unified Twitter Data Fetcher

Usage:
  node twitter-unified-fetcher.mjs [options]

Options:
  -k, --keyword     Search keyword or phrase (default: "AI")
  -p, --posts       Number of posts to fetch (default: 30)
  -c, --comments    Include comments for each post
  -f, --format      Report format: markdown, csv, json, all (default: all)
  -t, --template    Report template: standard, detailed, minimal, custom (default: standard)
  -s, --sortBy      Sort by: latest, top, people (default: latest)
  -o, --outputDir   Output directory for reports (default: report)
  -n, --noMcp       Disable MCP server and use direct Playwright
  -e, --englishOnly Keep only English posts (default: true)
  -a, --allLanguages Include posts in all languages (overrides englishOnly)
  -h, --help        Show this help message

Examples:
  node twitter-unified-fetcher.mjs --keyword="AI technology" --posts=50 --comments --format=all
  node twitter-unified-fetcher.mjs -k "solo founder" -p 100 -c -f markdown -t detailed
  node twitter-unified-fetcher.mjs --keyword="blockchain" --template=minimal --format=csv
`);
  process.exit(0);
}

// Convert string to number for posts
const maxPosts = parseInt(values.posts, 10);

// Handle language filtering logic
// If allLanguages is specified, override englishOnly setting
if (values.allLanguages) {
  values.englishOnly = false;
}

// Report Templates
const reportTemplates = {
  standard: {
    name: 'Standard Report',
    includeMetrics: true,
    includeEngagement: true,
    includeTimestamps: true,
    includeLinks: true,
    includeHashtags: true,
    includeMentions: true,
    includeComments: values.comments,
    summaryStats: true
  },
  detailed: {
    name: 'Detailed Report',
    includeMetrics: true,
    includeEngagement: true,
    includeTimestamps: true,
    includeLinks: true,
    includeHashtags: true,
    includeMentions: true,
    includeComments: values.comments,
    summaryStats: true,
    sentimentAnalysis: true,
    topicClustering: true,
    authorAnalysis: true,
    timeDistribution: true,
    engagementTrends: true
  },
  minimal: {
    name: 'Minimal Report',
    includeMetrics: false,
    includeEngagement: true,
    includeTimestamps: false,
    includeLinks: false,
    includeHashtags: false,
    includeMentions: false,
    includeComments: false,
    summaryStats: false
  },
  custom: {
    name: 'Custom Report',
    // Load custom template from config file if exists
    ...(await loadCustomTemplate())
  }
};

async function loadCustomTemplate() {
  try {
    const customPath = path.join(__dirname, '..', 'config', 'report-template.json');
    const content = await fs.readFile(customPath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return reportTemplates.standard;
  }
}

// Language filter for posts
function filterPostsByLanguage(posts, englishOnly = false) {
  const filtered = [];
  let filteredCount = 0;
  
  for (const post of posts) {
    const isEnglishPost = isEnglish(post.text);
    
    if (englishOnly) {
      // Keep only English posts
      if (isEnglishPost) {
        filtered.push(post);
      } else {
        filteredCount++;
      }
    } else {
      // Keep all posts
      filtered.push(post);
    }
  }
  
  if (filteredCount > 0) {
    const filterType = englishOnly ? 'non-English' : 'English';
    console.log(`  🔤 Filtered out ${filteredCount} ${filterType} posts`);
  }
  
  return filtered;
}

// Fetch posts and comments using MCP
async function fetchWithMcp(keyword, maxPosts, includeComments) {
  const transport = new StdioClientTransport({
    command: 'npx',
    args: ['playwright-mcp-bespy'],
    env: { ...process.env }
  });

  const client = new Client({ name: 'twitter-unified-fetcher', version: '2.0.0' }, { capabilities: {} });
  
  try {
    await client.connect(transport);
    console.log('✅ Connected to MCP server\n');
    
    // Search for posts
    console.log(`🔍 Searching Twitter for "${keyword}"...`);
    const searchResult = await client.callTool('twitter_search', {
      keyword,
      sortBy: values.sortBy
    });
    console.log('✅ Search completed\n');
    
    // Fetch posts
    console.log(`📥 Fetching ${maxPosts} posts...`);
    const fetchResult = await client.callTool('twitter_fetch_posts', {
      maxPosts
    });
    
    const posts = fetchResult.content[0].text;
    let postsData = JSON.parse(posts.match(/```json\n([\s\S]*?)\n```/)[1]);
    
    // Filter posts by language if enabled
    if (values.englishOnly) {
      postsData = filterPostsByLanguage(postsData, true);
      console.log(`✅ Successfully fetched ${postsData.length} English posts\n`);
    } else {
      console.log(`✅ Successfully fetched ${postsData.length} posts\n`);
    }
    
    // Fetch comments if requested (Note: MCP doesn't support comment fetching yet)
    if (includeComments) {
      console.log('💬 Comment fetching requested but not available via MCP');
      console.log('  ℹ️ Use --noMcp flag to fetch comments with direct Playwright\n');
      
      // Initialize empty comments array
      for (let post of postsData) {
        post.comments = [];
      }
    }
    
    return postsData;
  } finally {
    await client.close();
  }
}

// Detect if text is primarily English
function isEnglish(text) {
  if (!text) return false;
  
  // Common English patterns and words
  const englishPatterns = [
    /\b(the|be|to|of|and|a|in|that|have|i|it|for|not|on|with|he|as|you|do|at|this|but|his|by|from|they|we|say|her|she|or|an|will|my|one|all|would|there|their|what|so|up|out|if|about|who|get|which|go|me|when|make|can|like|time|no|just|him|know|take|people|into|year|your|good|some|could|them|see|other|than|then|now|look|only|come|its|over|think|also|back|after|use|two|how|our|work|first|well|way|even|new|want|because|any|these|give|day|most|us)\b/i
  ];
  
  // Check for English patterns
  const hasEnglishWords = englishPatterns.some(pattern => pattern.test(text));
  
  // Check for non-Latin scripts (indicates non-English)
  const nonLatinScript = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\u0600-\u06FF\u0750-\u077F\u0590-\u05FF\u0400-\u04FF\u1100-\u11FF\uAC00-\uD7AF]/;
  const hasNonLatin = nonLatinScript.test(text);
  
  // If it has non-Latin characters, it's likely not English
  if (hasNonLatin && !hasEnglishWords) return false;
  
  // Count English-like words
  const words = text.toLowerCase().split(/\s+/);
  const commonEnglishWords = ['the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i', 'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at'];
  const englishWordCount = words.filter(word => commonEnglishWords.includes(word)).length;
  
  // If more than 20% of words are common English words, consider it English
  return englishWordCount / words.length > 0.1 || (hasEnglishWords && !hasNonLatin);
}

// Fetch posts and comments using direct Playwright
async function fetchWithPlaywright(keyword, maxPosts, includeComments) {
  console.log('🌐 Using direct Playwright browser...\n');
  
  let context;
  let page;
  
  try {
    // First, try to use local browser-data directory (for persistent login)
    let userDataDir = path.join(process.cwd(), 'browser-data');
    let profileName = 'persistent-profile';
    
    // Check if local profile exists and has session data
    try {
      await fs.access(path.join(userDataDir, 'Default'));
      console.log(`  ✅ Found persistent profile in browser-data directory`);
    } catch {
      // Fallback to MCP Chrome profile if no local profile exists
      console.log(`  ℹ️ No persistent profile found, checking for MCP profile...`);
      const mcpProfileDir = path.join(process.env.HOME, 'Library', 'Caches', 'ms-playwright', 'mcp-chrome-377d6cd');
      
      try {
        await fs.access(mcpProfileDir);
        userDataDir = mcpProfileDir;
        profileName = 'mcp-chrome-377d6cd';
        console.log(`  ✅ Found MCP Chrome profile`);
      } catch {
        // Create new browser-data directory for first-time setup
        console.log(`  📂 Creating new browser-data directory for persistent login...`);
        await fs.mkdir(userDataDir, { recursive: true });
        console.log(`  ⚠️ First time setup detected!`);
        console.log(`  🔐 Please run: node scripts/setup-browser-login.mjs`);
        console.log(`     to login to Twitter first, then run this script again.`);
      }
    }
    
    console.log(`  📂 Attempting to use profile at: ${userDataDir}`);
    
    // Launch browser with the profile
    console.log(`  🚀 Launching browser with ${profileName}...`);
    
    try {
      // Kill any existing SingletonLock if using browser-data
      if (profileName === 'persistent-profile') {
        try {
          const lockFiles = ['SingletonLock', 'SingletonCookie', 'SingletonSocket'];
          for (const lockFile of lockFiles) {
            const lockPath = path.join(userDataDir, lockFile);
            try {
              await fs.unlink(lockPath);
            } catch {
              // Ignore if lock file doesn't exist
            }
          }
        } catch {
          // Continue even if lock cleanup fails
        }
      }
      
      context = await chromium.launchPersistentContext(userDataDir, {
        headless: false,
        viewport: { width: 1280, height: 800 },
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        // Block images and media to save bandwidth
        serviceWorkers: 'block',
        permissions: [],
        extraHTTPHeaders: {
          'Accept': 'application/json, text/plain, */*'
        },
        // Additional settings to ensure persistence
        bypassCSP: true,
        ignoreHTTPSErrors: true,
        // Force use of this profile even if locked
        args: ['--disable-features=RendererCodeIntegrity']
      });
      
      console.log(`  ✅ Successfully launched with ${profileName}`);
    } catch (profileError) {
      console.log(`  ⚠️ Error with ${profileName}: ${profileError.message}`);
      
      // Only fall back to temp if it's truly necessary
      if (profileError.message.includes('Failed to launch') || profileError.message.includes('crashed')) {
        console.log(`  📂 Creating fresh temporary profile...`);
        const tempProfileDir = path.join(process.cwd(), `browser-data-temp-${Date.now()}`);
        await fs.mkdir(tempProfileDir, { recursive: true });
        
        context = await chromium.launchPersistentContext(tempProfileDir, {
          headless: false,
          viewport: { width: 1280, height: 800 },
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          serviceWorkers: 'block',
          permissions: [],
          extraHTTPHeaders: {
            'Accept': 'application/json, text/plain, */*'
          },
          bypassCSP: true,
          ignoreHTTPSErrors: true
        });
        
        console.log(`  📂 Using temporary profile at: ${tempProfileDir}`);
        console.log(`  ⚠️ You'll need to login manually for this session`);
      } else {
        throw profileError;
      }
    }
    
    page = context.pages()[0] || await context.newPage();
    
    // Check if logged in to Twitter
    const currentUrl = page.url();
    if (!currentUrl.includes('twitter.com') && !currentUrl.includes('x.com')) {
      console.log('  🔐 First time using this profile. Please log in to Twitter manually.');
      await page.goto('https://twitter.com/login', { waitUntil: 'domcontentloaded' });
      console.log('  ⏳ Waiting for login... (you have 60 seconds)');
      
      // Wait for user to log in (check for home timeline or search page)
      try {
        await page.waitForURL(/^https:\/\/(twitter|x)\.com\/(home|search)/, { timeout: 60000 });
        console.log('  ✅ Successfully logged in!');
      } catch (e) {
        console.log('  ⚠️ Login timeout. Proceeding anyway...');
      }
    } else {
      console.log('  ✅ Using existing session');
    }
    
    // Block image and media requests to save bandwidth
    await page.route('**/*.{png,jpg,jpeg,gif,webp,svg,ico,woff,woff2,ttf,eot}', route => route.abort());
    await page.route('**/video**', route => route.abort());
    
    // Intercept Twitter API responses
    const interceptedPosts = [];
    page.on('response', async response => {
      const url = response.url();
      // Twitter API endpoints for timeline data
      if (url.includes('/SearchTimeline') || url.includes('/TweetDetail') || url.includes('/UserTweets')) {
        try {
          const data = await response.json();
          // Extract tweets from API response
          if (data?.data?.search_by_raw_query?.search_timeline?.timeline?.instructions) {
            const entries = data.data.search_by_raw_query.search_timeline.timeline.instructions
              .find(inst => inst.entries)?.entries || [];
            
            entries.forEach(entry => {
              if (entry.content?.itemContent?.tweet_results?.result?.legacy) {
                const tweet = entry.content.itemContent.tweet_results.result.legacy;
                const user = entry.content.itemContent.tweet_results.result.core?.user_results?.result?.legacy;
                
                if (tweet && user) {
                  const post = {
                    text: tweet.full_text,
                    author: user.name,
                    handle: user.screen_name,
                    timestamp: tweet.created_at,
                    likes: tweet.favorite_count || 0,
                    retweets: tweet.retweet_count || 0,
                    replies: tweet.reply_count || 0,
                    impressions: tweet.impression_count || 0,
                    url: `https://twitter.com/${user.screen_name}/status/${tweet.id_str}`,
                    lang: tweet.lang
                  };
                  
                  // Filter based on language preference
                  if (values.englishOnly) {
                    // Keep only English posts
                    if (isEnglish(post.text)) {
                      interceptedPosts.push(post);
                      console.log(`  📝 Captured English post: ${post.text.substring(0, 50)}...`);
                    }
                  } else {
                    // Keep all posts
                    interceptedPosts.push(post);
                    console.log(`  📝 Captured post (${post.lang}): ${post.text.substring(0, 50)}...`);
                  }
                }
              }
            });
          }
        } catch (e) {
          // Ignore parsing errors
        }
      }
    });
    
    // Navigate to Twitter search
    const searchUrl = `https://twitter.com/search?q=${encodeURIComponent(keyword)}&src=typed_query&f=${values.sortBy === 'top' ? 'top' : 'live'}`;
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
    
    await page.waitForTimeout(3000);
    
    // First try to get posts from intercepted API responses
    let posts = [];
    if (interceptedPosts.length > 0) {
      console.log(`  ✅ Using ${interceptedPosts.length} posts from API interception (bandwidth optimized)`);
      posts = interceptedPosts.slice(0, maxPosts);
    } else {
      // Fallback to DOM extraction if API interception didn't work
      console.log('  ⚠️ API interception failed, falling back to DOM extraction');
      posts = await extractPosts(page, maxPosts);
    }
    
    // Fetch comments if requested
    if (includeComments) {
      console.log('💬 Fetching all comments for each post...');
      let totalComments = 0;
      
      for (let i = 0; i < posts.length; i++) {
        const post = posts[i];
        console.log(`  📝 Post ${i + 1}/${posts.length}: "${post.text?.substring(0, 50) || 'No text'}..."`);
        
        post.comments = await fetchPostComments(page, post.url);
        totalComments += post.comments.length;
        
        if (post.comments.length > 0) {
          console.log(`    ✅ ${post.comments.length} comments fetched`);
          // Show top commenters
          const topComments = post.comments.slice(0, 3);
          topComments.forEach(c => {
            console.log(`      • @${c.handle}: "${c.text.substring(0, 40)}..." (${c.likes} likes)`);
          });
        } else {
          console.log(`    ⚠️ No comments found`);
        }
      }
      
      console.log(`\n✅ Total comments fetched: ${totalComments}\n`);
    }
    
    return posts;
  } finally {
    if (context) await context.close();
  }
}

// Extract posts from page
async function extractPosts(page, maxPosts) {
  const posts = [];
  let scrollAttempts = 0;
  const maxScrollAttempts = Math.ceil(maxPosts / 5);
  let englishFiltered = 0;
  
  console.log(`📥 Extracting up to ${maxPosts} posts${values.englishOnly ? ' (English only)' : ''}...`);
  
  while (posts.length < maxPosts && scrollAttempts < maxScrollAttempts) {
    const newPosts = await page.evaluate(() => {
      const tweets = document.querySelectorAll('[data-testid="tweet"]');
      return Array.from(tweets).map(tweet => {
        try {
          const authorElement = tweet.querySelector('[data-testid="User-Name"] a');
          const author = authorElement?.querySelector('span')?.textContent || '';
          const handle = authorElement?.href?.split('/').pop() || '';
          const textElement = tweet.querySelector('[data-testid="tweetText"]');
          const text = textElement?.textContent || '';
          const timestamp = tweet.querySelector('time')?.getAttribute('datetime') || '';
          const linkElement = tweet.querySelector('a[href*="/status/"]');
          const url = linkElement ? `https://twitter.com${linkElement.getAttribute('href')}` : '';
          
          // Extract metrics
          const metrics = {};
          tweet.querySelectorAll('[data-testid$="-button"] span').forEach((span, index) => {
            const value = parseInt(span.textContent.replace(/[^\d]/g, '')) || 0;
            if (index === 0) metrics.replies = value;
            if (index === 1) metrics.retweets = value;
            if (index === 2) metrics.likes = value;
          });
          
          const impressionsSpan = tweet.querySelector('[data-testid="app-text-transition-container"] span');
          metrics.impressions = parseInt(impressionsSpan?.textContent.replace(/[^\d]/g, '')) || 0;
          
          return {
            author,
            handle,
            timestamp,
            text,
            url,
            ...metrics
          };
        } catch (error) {
          return null;
        }
      }).filter(Boolean);
    });
    
    // Add unique posts based on language filter
    newPosts.forEach(post => {
      if (!posts.find(p => p.url === post.url)) {
        const isEnglishPost = isEnglish(post.text);
        
        if (values.englishOnly) {
          // Keep only English posts
          if (isEnglishPost) {
            if (posts.length < maxPosts) {
              posts.push(post);
              console.log(`  ✅ Added English post: "${post.text.substring(0, 50)}..."`);
            }
          } else {
            englishFiltered++;
            console.log(`  🌐 Filtered out non-English post: "${post.text.substring(0, 50)}..."`);
          }
        } else {
          // Keep all posts
          if (posts.length < maxPosts) {
            posts.push(post);
          }
        }
      }
    });
    
    // Scroll to load more
    await page.evaluate(() => window.scrollBy(0, 1000));
    await page.waitForTimeout(2000);
    scrollAttempts++;
    
    const filterMsg = values.englishOnly 
      ? ` (filtered ${englishFiltered} non-English posts)` 
      : '';
    console.log(`  📊 Collected ${posts.length}/${maxPosts} posts${englishFiltered > 0 ? filterMsg : ''}...`);
  }
  
  if (englishFiltered > 0) {
    const filterType = values.englishOnly ? 'non-English' : 'English';
    console.log(`  🔤 Total ${filterType} posts filtered: ${englishFiltered}`);
  }
  
  return posts.slice(0, maxPosts);
}

// Fetch comments for a specific post using API interception
async function fetchPostComments(page, postUrl) {
  const comments = [];
  
  try {
    console.log(`    💬 Fetching comments for: ${postUrl.substring(0, 50)}...`);
    
    // Navigate to the post in a new page to avoid disrupting main flow
    const newPage = await page.context().newPage();
    
    try {
      // Set up response interceptor for comments
      const commentPromise = new Promise((resolve) => {
        const collectedComments = [];
        
        const handler = async (response) => {
          const url = response.url();
          if (url.includes('/TweetDetail') || url.includes('/ConversationTimeline')) {
            try {
              const data = await response.json();
              const extractedComments = extractCommentsFromAPIResponse(data);
              collectedComments.push(...extractedComments);
            } catch (e) {
              // Ignore parsing errors
            }
          }
        };
        
        newPage.on('response', handler);
        
        // Resolve after timeout
        setTimeout(() => {
          newPage.off('response', handler);
          resolve(collectedComments);
        }, 5000);
      });
      
      // Navigate to the post
      await newPage.goto(postUrl, { waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => {});
      await newPage.waitForTimeout(3000);
      
      // Try API extraction first
      const apiComments = await commentPromise;
      
      if (apiComments.length > 0) {
        console.log(`      ✅ Found ${apiComments.length} comments via API`);
        return apiComments;
      }
      
      // Fallback to DOM extraction
      console.log(`      ⚠️ API extraction failed, trying DOM extraction...`);
      const domComments = await extractCommentsFromDOM(newPage);
      console.log(`      ✅ Found ${domComments.length} comments via DOM`);
      
      return domComments;
    } finally {
      await newPage.close();
    }
  } catch (error) {
    console.log(`      ❌ Error fetching comments: ${error.message}`);
    return [];
  }
}

// Extract comments from Twitter API response
function extractCommentsFromAPIResponse(data) {
  const comments = [];
  
  try {
    // Navigate through the API response structure
    const instructions = data?.data?.threaded_conversation_with_injections_v2?.instructions || [];
    
    for (const instruction of instructions) {
      const entries = instruction?.entries || [];
      
      for (const entry of entries) {
        if (entry.entryId && entry.entryId.includes('conversationthread')) {
          const items = entry.content?.items || [];
          
          for (const item of items) {
            const tweet = item.item?.itemContent?.tweet_results?.result;
            if (tweet && tweet.legacy) {
              const user = tweet.core?.user_results?.result?.legacy;
              
              if (user && tweet.legacy.full_text) {
                comments.push({
                  author: user.name,
                  handle: user.screen_name,
                  text: tweet.legacy.full_text,
                  likes: tweet.legacy.favorite_count || 0,
                  retweets: tweet.legacy.retweet_count || 0,
                  replies: tweet.legacy.reply_count || 0,
                  timestamp: tweet.legacy.created_at,
                  verified: user.verified || false
                });
              }
            }
          }
        }
      }
    }
  } catch (e) {
    // Silent error handling
  }
  
  return comments;
}

// Extract comments from DOM
async function extractCommentsFromDOM(page) {
  return await page.evaluate(() => {
    const comments = [];
    const tweets = document.querySelectorAll('[data-testid="tweet"]');
    
    // Skip the first tweet (it's the main post)
    for (let i = 1; i < tweets.length && comments.length < 100; i++) { // Limit to 100 comments
      const tweet = tweets[i];
      
      try {
        const authorElement = tweet.querySelector('[data-testid="User-Name"] a');
        const author = authorElement?.querySelector('span')?.textContent || '';
        const handle = authorElement?.href?.split('/').pop() || '';
        const textElement = tweet.querySelector('[data-testid="tweetText"]');
        const text = textElement?.textContent || '';
        const timestamp = tweet.querySelector('time')?.getAttribute('datetime') || '';
        
        // Extract metrics
        const likeButton = tweet.querySelector('[data-testid="like"]');
        const replyButton = tweet.querySelector('[data-testid="reply"]');
        const retweetButton = tweet.querySelector('[data-testid="retweet"]');
        
        const likes = parseInt(likeButton?.querySelector('span')?.textContent?.replace(/[^\d]/g, '') || '0');
        const replies = parseInt(replyButton?.querySelector('span')?.textContent?.replace(/[^\d]/g, '') || '0');
        const retweets = parseInt(retweetButton?.querySelector('span')?.textContent?.replace(/[^\d]/g, '') || '0');
        
        if (author && text) {
          comments.push({
            author,
            handle,
            text,
            likes,
            retweets,
            replies,
            timestamp,
            verified: tweet.querySelector('[data-testid="icon-verified"]') !== null
          });
        }
      } catch (e) {
        // Skip this comment if extraction fails
      }
    }
    
    // Try to scroll and load more comments if needed
    if (comments.length < 20) {
      window.scrollTo(0, document.body.scrollHeight);
    }
    
    return comments;
  });
}

// Legacy function - redirects to new implementation
async function fetchPostCommentsDirectly(page, postUrl) {
  return await fetchPostComments(page, postUrl);
}

// Generate reports in various formats
async function generateReports(posts, keyword, template, format) {
  const timestamp = new Date().toISOString().split('T')[0];
  const safeKeyword = keyword.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const outputDir = path.join(process.cwd(), values.outputDir);
  
  // Ensure output directory exists
  await fs.mkdir(outputDir, { recursive: true });
  
  const formats = format === 'all' ? ['markdown', 'csv', 'json'] : [format];
  const generatedFiles = [];
  
  for (const fmt of formats) {
    const filename = `twitter_${safeKeyword}_${timestamp}.${fmt === 'markdown' ? 'md' : fmt}`;
    const filepath = path.join(outputDir, filename);
    
    let content;
    switch (fmt) {
      case 'markdown':
        content = generateMarkdownReport(posts, keyword, template);
        break;
      case 'csv':
        content = generateCsvReport(posts, template);
        break;
      case 'json':
        content = JSON.stringify({ keyword, timestamp, template: template.name, posts }, null, 2);
        break;
    }
    
    await fs.writeFile(filepath, content, 'utf-8');
    generatedFiles.push(filename);
  }
  
  return generatedFiles;
}

// Generate Markdown report
function generateMarkdownReport(posts, keyword, template) {
  const now = new Date();
  let report = `# Twitter Report: ${keyword}\n\n`;
  report += `**Generated at:** ${now.toLocaleString()}\n`;
  report += `**Total Posts:** ${posts.length}\n`;
  report += `**Template:** ${template.name}\n\n`;
  
  if (template.summaryStats) {
    const stats = calculateStats(posts);
    report += `## Summary Statistics\n\n`;
    report += `- **Language Filter:** ${values.englishOnly ? 'English posts only' : 'All languages'}\n`;
    report += `- **Total Likes:** ${stats.totalLikes.toLocaleString()}\n`;
    report += `- **Total Retweets:** ${stats.totalRetweets.toLocaleString()}\n`;
    report += `- **Total Impressions:** ${stats.totalImpressions.toLocaleString()}\n`;
    report += `- **Average Engagement Rate:** ${stats.avgEngagement.toFixed(2)}%\n`;
    report += `- **Top Author:** ${stats.topAuthor}\n`;
    if (stats.mostLiked?.text) {
      report += `- **Most Liked Post:** ${stats.mostLiked.text.substring(0, 100)}...\n\n`;
    }
  }
  
  if (template.engagementTrends) {
    report += `## Engagement Trends\n\n`;
    report += generateEngagementChart(posts);
    report += `\n\n`;
  }
  
  report += `## Posts\n\n`;
  
  posts.forEach((post, index) => {
    report += `### ${index + 1}. ${post.author} (@${post.handle})\n\n`;
    
    if (template.includeTimestamps) {
      report += `**Posted:** ${post.timestamp}\n`;
    }
    
    if (template.includeLinks) {
      report += `**Link:** [View on Twitter](${post.url})\n\n`;
    }
    
    report += `**Content:**\n\`\`\`\n${post.text}\n\`\`\`\n\n`;
    
    if (template.includeEngagement) {
      report += `**Engagement Metrics:**\n`;
      if (template.includeMetrics) {
        report += `- 👁️ Impressions: ${post.impressions?.toLocaleString() || 0}\n`;
      }
      report += `- ❤️ Likes: ${post.likes || 0}\n`;
      report += `- 🔁 Retweets: ${post.retweets || 0}\n`;
      report += `- 💬 Replies: ${post.replies || 0}\n`;
    }
    
    if (template.includeHashtags) {
      const hashtags = post.text.match(/#\w+/g) || [];
      if (hashtags.length > 0) {
        report += `**Hashtags:** ${hashtags.join(', ')}\n`;
      }
    }
    
    if (template.includeMentions) {
      const mentions = post.text.match(/@\w+/g) || [];
      if (mentions.length > 0) {
        report += `**Mentions:** ${mentions.join(', ')}\n`;
      }
    }
    
    if (template.includeComments && post.comments?.length > 0) {
      report += `\n**💬 Comments (${post.comments.length} total):**\n\n`;
      
      // Show all comments with proper formatting
      post.comments.forEach((comment, idx) => {
        report += `  **${idx + 1}. ${comment.author}** (@${comment.handle})${comment.verified ? ' ✓' : ''}\n`;
        report += `  ${comment.text}\n`;
        report += `  *${comment.likes} likes • ${comment.retweets} retweets • ${comment.replies} replies*\n\n`;
      });
      
      // If there are many comments, add a summary
      if (post.comments.length > 10) {
        const topCommenters = {};
        let totalLikes = 0;
        
        post.comments.forEach(c => {
          topCommenters[c.author] = (topCommenters[c.author] || 0) + 1;
          totalLikes += c.likes;
        });
        
        report += `  📊 **Comment Summary:**\n`;
        report += `  - Total comments: ${post.comments.length}\n`;
        report += `  - Total comment likes: ${totalLikes}\n`;
        report += `  - Most active commenters: ${Object.entries(topCommenters)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 3)
          .map(([name, count]) => `${name} (${count})`)
          .join(', ')}\n\n`;
      }
    } else if (template.includeComments && (!post.comments || post.comments.length === 0)) {
      report += `\n**💬 Comments:** No comments available\n`;
    }
    
    report += `\n---\n\n`;
  });
  
  if (template.authorAnalysis) {
    report += generateAuthorAnalysis(posts);
  }
  
  if (template.topicClustering) {
    report += generateTopicClusters(posts);
  }
  
  return report;
}

// Generate CSV report
function generateCsvReport(posts, template) {
  const headers = ['Index', 'Author', 'Handle'];
  
  if (template.includeTimestamps) headers.push('Timestamp');
  headers.push('Text');
  if (template.includeLinks) headers.push('URL');
  if (template.includeEngagement) {
    headers.push('Likes', 'Retweets');
    if (template.includeMetrics) headers.push('Impressions');
    headers.push('Replies');
  }
  if (template.includeHashtags) headers.push('Hashtags');
  if (template.includeMentions) headers.push('Mentions');
  if (template.includeComments) headers.push('Comments Count', 'Top Comment');
  
  const rows = posts.map((post, index) => {
    const row = [index + 1, `"${post.author}"`, post.handle];
    
    if (template.includeTimestamps) row.push(post.timestamp);
    row.push(`"${post.text.replace(/"/g, '""')}"`);
    if (template.includeLinks) row.push(post.url);
    if (template.includeEngagement) {
      row.push(post.likes || 0, post.retweets || 0);
      if (template.includeMetrics) row.push(post.impressions || 0);
      row.push(post.replies || 0);
    }
    if (template.includeHashtags) {
      const hashtags = post.text.match(/#\w+/g) || [];
      row.push(`"${hashtags.join(', ')}"`);
    }
    if (template.includeMentions) {
      const mentions = post.text.match(/@\w+/g) || [];
      row.push(`"${mentions.join(', ')}"`);
    }
    if (template.includeComments && post.comments?.length > 0) {
      row.push(`"${post.comments[0]?.text?.substring(0, 100) || ''}"`);
    }
    
    return row.join(',');
  });
  
  return headers.join(',') + '\n' + rows.join('\n');
}

// Calculate summary statistics
function calculateStats(posts) {
  const totalLikes = posts.reduce((sum, p) => sum + (p.likes || 0), 0);
  const totalRetweets = posts.reduce((sum, p) => sum + (p.retweets || 0), 0);
  const totalImpressions = posts.reduce((sum, p) => sum + (p.impressions || 0), 0);
  
  const avgEngagement = totalImpressions > 0 
    ? ((totalLikes + totalRetweets) / totalImpressions) * 100 
    : 0;
  
  const authorCounts = {};
  posts.forEach(p => {
    authorCounts[p.author] = (authorCounts[p.author] || 0) + 1;
  });
  
  const topAuthor = Object.entries(authorCounts)
    .sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A';
  
  const mostLiked = posts.reduce((max, p) => 
    (p.likes || 0) > (max.likes || 0) ? p : max, posts[0]);
  
  return {
    totalLikes,
    totalRetweets,
    totalImpressions,
    avgEngagement,
    topAuthor,
    mostLiked
  };
}

// Generate simple ASCII engagement chart
function generateEngagementChart(posts) {
  const maxLikes = Math.max(...posts.map(p => p.likes || 0));
  const scale = maxLikes > 50 ? maxLikes / 20 : 1;
  
  let chart = '```\n';
  chart += 'Likes Distribution (each ■ = ' + Math.ceil(scale) + ' likes)\n\n';
  
  posts.slice(0, 10).forEach((post, i) => {
    const bars = Math.ceil((post.likes || 0) / scale);
    chart += `Post ${i + 1}: ${'■'.repeat(bars)} (${post.likes || 0})\n`;
  });
  
  chart += '```';
  return chart;
}

// Generate author analysis
function generateAuthorAnalysis(posts) {
  const authors = {};
  posts.forEach(post => {
    if (!authors[post.author]) {
      authors[post.author] = {
        count: 0,
        totalLikes: 0,
        totalRetweets: 0,
        posts: []
      };
    }
    authors[post.author].count++;
    authors[post.author].totalLikes += post.likes || 0;
    authors[post.author].totalRetweets += post.retweets || 0;
    authors[post.author].posts.push(post.text.substring(0, 50));
  });
  
  let analysis = '## Author Analysis\n\n';
  analysis += '| Author | Posts | Total Likes | Total Retweets | Avg Engagement |\n';
  analysis += '|--------|-------|-------------|----------------|----------------|\n';
  
  Object.entries(authors)
    .sort(([,a], [,b]) => b.totalLikes - a.totalLikes)
    .slice(0, 10)
    .forEach(([name, data]) => {
      const avgEngagement = ((data.totalLikes + data.totalRetweets) / data.count).toFixed(1);
      analysis += `| ${name} | ${data.count} | ${data.totalLikes} | ${data.totalRetweets} | ${avgEngagement} |\n`;
    });
  
  analysis += '\n';
  return analysis;
}

// Generate topic clusters
function generateTopicClusters(posts) {
  const topics = {
    'AI/Technology': ['AI', 'machine learning', 'technology', 'software', 'algorithm', 'data'],
    'Business': ['startup', 'founder', 'business', 'entrepreneur', 'revenue', 'growth'],
    'Development': ['code', 'programming', 'developer', 'API', 'framework', 'deploy'],
    'Marketing': ['marketing', 'brand', 'audience', 'content', 'social', 'engagement'],
    'Product': ['product', 'feature', 'user', 'design', 'UX', 'launch']
  };
  
  const topicCounts = {};
  
  posts.forEach(post => {
    const text = post.text.toLowerCase();
    Object.entries(topics).forEach(([topic, keywords]) => {
      const matches = keywords.filter(keyword => text.includes(keyword.toLowerCase()));
      if (matches.length > 0) {
        topicCounts[topic] = (topicCounts[topic] || 0) + 1;
      }
    });
  });
  
  let clusters = '## Topic Clusters\n\n';
  clusters += '| Topic | Post Count | Percentage |\n';
  clusters += '|-------|------------|------------|\n';
  
  Object.entries(topicCounts)
    .sort(([,a], [,b]) => b - a)
    .forEach(([topic, count]) => {
      const percentage = ((count / posts.length) * 100).toFixed(1);
      clusters += `| ${topic} | ${count} | ${percentage}% |\n`;
    });
  
  clusters += '\n';
  return clusters;
}

// Main execution
async function main() {
  console.log('\n🐦 Unified Twitter Data Fetcher v2.0');
  console.log('=====================================\n');
  
  console.log(`📋 Configuration:`);
  console.log(`  • Keyword: "${values.keyword}"`);
  console.log(`  • Posts to fetch: ${maxPosts}`);
  console.log(`  • Include comments: ${values.comments ? 'Yes' : 'No'}`);
  console.log(`  • Sort by: ${values.sortBy}`);
  console.log(`  • Report format: ${values.format}`);
  console.log(`  • Template: ${values.template}`);
  console.log(`  • Language filter: ${values.englishOnly ? 'English only (default)' : 'All languages'}`);
  console.log(`  • Output directory: ${values.outputDir}/\n`);
  
  try {
    // Fetch data
    const posts = !values.noMcp 
      ? await fetchWithMcp(values.keyword, maxPosts, values.comments)
      : await fetchWithPlaywright(values.keyword, maxPosts, values.comments);
    
    console.log(`✅ Successfully fetched ${posts.length} posts\n`);
    
    // Generate reports
    console.log('📊 Generating reports...');
    const template = reportTemplates[values.template] || reportTemplates.standard;
    const files = await generateReports(posts, values.keyword, template, values.format);
    
    console.log(`✅ Reports generated successfully!\n`);
    console.log('📁 Generated files:');
    files.forEach(file => console.log(`  • ${file}`));
    
    // Display summary
    const stats = calculateStats(posts);
    console.log('\n📈 Summary Statistics:');
    console.log(`  • Total posts: ${posts.length}`);
    console.log(`  • Total likes: ${stats.totalLikes.toLocaleString()}`);
    console.log(`  • Total retweets: ${stats.totalRetweets.toLocaleString()}`);
    console.log(`  • Average engagement: ${stats.avgEngagement.toFixed(2)}%`);
    console.log(`  • Top author: ${stats.topAuthor}`);
    
    if (values.comments) {
      const totalComments = posts.reduce((sum, p) => sum + (p.comments?.length || 0), 0);
      console.log(`  • Total comments fetched: ${totalComments}`);
    }
    
    console.log('\n✨ Done!');
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Run the script
main().catch(console.error);