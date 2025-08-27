#!/usr/bin/env node

/**
 * Robust IndieHackers extraction with better error handling
 * Optimized for the PRD requirements with failsafe mechanisms
 */

import { chromium } from 'playwright';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Categories as specified in PRD
const CATEGORIES = [
  { 
    name: 'starting-up',
    displayName: 'Starting Up (AI)', 
    url: 'https://www.indiehackers.com/tags/artificial-intelligence'
  },
  { 
    name: 'tech', 
    displayName: 'Tech',
    url: 'https://www.indiehackers.com/tech'
  },
  { 
    name: 'main',
    displayName: 'Indie Hackers Main',
    url: 'https://www.indiehackers.com/'
  }
];

const DEFAULT_ARTICLE_COUNT = 10;

/**
 * Get date-based folder path
 */
function getDateFolder() {
  const date = new Date();
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                     'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dateStr = `${date.getDate()}-${monthNames[date.getMonth()]}-${date.getFullYear()}`;
  return path.join(__dirname, '..', '..', 'report', 'indiehacker', dateStr);
}

/**
 * Safe page navigation with retry
 */
async function safeGoto(page, url, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });
      return true;
    } catch (error) {
      console.log(`   Retry ${i + 1}/${maxRetries} for ${url}`);
      if (i === maxRetries - 1) throw error;
      await page.waitForTimeout(2000);
    }
  }
}

/**
 * Extract article links with fallback strategies
 */
async function extractArticleLinks(page, categoryUrl, maxCount = DEFAULT_ARTICLE_COUNT) {
  try {
    await safeGoto(page, categoryUrl);
    await page.waitForTimeout(2000);
    
    // Try to wait for content with shorter timeout
    try {
      await page.waitForSelector('a[href*="/post/"]', { timeout: 5000 });
    } catch {
      console.log('   Post links not found with selector, trying alternative extraction...');
    }
    
    const articles = await page.evaluate((max) => {
      const links = [];
      const uniqueUrls = new Set();
      
      // Multiple strategies to find posts
      const strategies = [
        // Strategy 1: Direct post links
        () => {
          document.querySelectorAll('a[href*="/post/"]').forEach(link => {
            const href = link.href;
            if (href && !uniqueUrls.has(href)) {
              uniqueUrls.add(href);
              links.push({
                url: href,
                title: link.textContent?.trim() || '',
                strategy: 'direct'
              });
            }
          });
        },
        // Strategy 2: Find article containers
        () => {
          document.querySelectorAll('article, [class*="post"], [class*="item"]').forEach(article => {
            const link = article.querySelector('a[href*="/post/"]');
            if (link && !uniqueUrls.has(link.href)) {
              uniqueUrls.add(link.href);
              const titleEl = article.querySelector('h1, h2, h3, [class*="title"]');
              links.push({
                url: link.href,
                title: titleEl?.textContent?.trim() || link.textContent?.trim() || '',
                strategy: 'container'
              });
            }
          });
        },
        // Strategy 3: All links containing post pattern
        () => {
          document.querySelectorAll('a').forEach(link => {
            const href = link.href;
            if (href && (href.includes('/post/') || href.includes('/product/')) && !uniqueUrls.has(href)) {
              uniqueUrls.add(href);
              links.push({
                url: href,
                title: link.textContent?.trim() || '',
                strategy: 'fallback'
              });
            }
          });
        }
      ];
      
      // Try each strategy
      for (const strategy of strategies) {
        strategy();
        if (links.length >= max) break;
      }
      
      return links.slice(0, max);
    }, maxCount);
    
    return articles;
  } catch (error) {
    console.error(`   Failed to extract links: ${error.message}`);
    return [];
  }
}

/**
 * Extract article details with robust error handling
 */
async function extractArticleDetails(page, articleUrl) {
  try {
    await safeGoto(page, articleUrl);
    await page.waitForTimeout(1500);
    
    const details = await page.evaluate(() => {
      const data = {
        url: window.location.href,
        postId: window.location.pathname.split('/').filter(p => p).pop()
      };
      
      // Title extraction with fallbacks
      const titleSelectors = ['h1', 'article h1', '[class*="title"] h1', 'h2', '[class*="heading"]'];
      for (const sel of titleSelectors) {
        const el = document.querySelector(sel);
        if (el?.textContent?.trim()) {
          data.title = el.textContent.trim();
          break;
        }
      }
      data.title = data.title || document.title || '';
      
      // Author extraction
      const authorSelectors = ['a[href*="/u/"]', 'a[href*="/@"]', '[class*="author"]', '[class*="user"]'];
      for (const sel of authorSelectors) {
        const el = document.querySelector(sel);
        if (el?.textContent?.trim()) {
          data.author = el.textContent.trim();
          data.authorUrl = el.href || '';
          break;
        }
      }
      data.author = data.author || 'Unknown';
      
      // Date extraction
      const timeEl = document.querySelector('time');
      data.publishedAt = timeEl?.getAttribute('datetime') || '';
      data.publishedAtText = timeEl?.textContent?.trim() || '';
      
      // Content extraction - get main text
      let content = '';
      const contentAreas = document.querySelectorAll('article, main, [class*="content"], [class*="body"]');
      for (const area of contentAreas) {
        const text = area.textContent.trim();
        if (text.length > content.length && text.length > 100) {
          content = text;
        }
      }
      data.content = content.substring(0, 5000);
      
      // Metrics
      const voteEls = document.querySelectorAll('[class*="vote"], [class*="upvote"], [class*="like"]');
      for (const el of voteEls) {
        const num = parseInt(el.textContent.match(/\d+/)?.[0] || '0');
        if (num > 0) {
          data.upvotes = num;
          break;
        }
      }
      data.upvotes = data.upvotes || 0;
      
      // Comments extraction
      data.comments = [];
      const commentEls = document.querySelectorAll('[class*="comment"]:not([class*="count"]):not([class*="form"])');
      
      Array.from(commentEls).slice(0, 10).forEach(comment => {
        const text = comment.textContent?.trim();
        if (text && text.length > 20) {
          const authorEl = comment.querySelector('a[href*="/u/"], a[href*="/@"], [class*="author"]');
          data.comments.push({
            author: authorEl?.textContent?.trim() || 'Unknown',
            text: text.substring(0, 500),
            upvotes: 0
          });
        }
      });
      
      // Comment count
      const commentCountEl = document.querySelector('[class*="comment"][class*="count"], [href*="#comments"]');
      const countMatch = commentCountEl?.textContent?.match(/\d+/);
      data.commentCount = countMatch ? parseInt(countMatch[0]) : data.comments.length;
      
      // Tags
      const tagEls = document.querySelectorAll('a[href*="/tag"], a[href*="/tags"]');
      data.tags = Array.from(tagEls).map(t => t.textContent.trim()).filter(t => t);
      
      return data;
    });
    
    return details;
  } catch (error) {
    console.log(`   ⚠️ Partial extraction for ${articleUrl}: ${error.message}`);
    return {
      url: articleUrl,
      title: '',
      content: '',
      comments: [],
      error: error.message
    };
  }
}

/**
 * Generate markdown report
 */
function generateMarkdownReport(categoryData) {
  let markdown = `# ${categoryData.displayName} - IndieHackers Report

**Generated:** ${new Date().toLocaleString()}  
**Source:** ${categoryData.url}  
**Articles Extracted:** ${categoryData.articles.length}  

---

`;

  if (categoryData.articles.length === 0) {
    markdown += `*No articles could be extracted from this category.*\n\n`;
    return markdown;
  }

  categoryData.articles.forEach((article, index) => {
    markdown += `## ${index + 1}. ${article.title || 'Untitled Article'}

**Author:** ${article.author || 'Unknown'}  
**Published:** ${article.publishedAtText || article.date || 'N/A'}  
**URL:** [View Article](${article.url})  
`;

    if (article.upvotes || article.commentCount) {
      markdown += `**Engagement:** ${article.upvotes || 0} upvotes | ${article.commentCount || 0} comments  \n`;
    }

    if (article.tags && article.tags.length > 0) {
      markdown += `**Tags:** ${article.tags.join(', ')}  \n`;
    }

    if (article.content) {
      markdown += `\n### Content Preview\n`;
      markdown += `${article.content.substring(0, 500)}${article.content.length > 500 ? '...' : ''}\n\n`;
    }

    if (article.comments && article.comments.length > 0) {
      markdown += `### Sample Comments (${article.comments.length})\n\n`;
      article.comments.slice(0, 3).forEach((comment, i) => {
        markdown += `**${comment.author}:**  \n`;
        markdown += `> ${comment.text.substring(0, 200)}${comment.text.length > 200 ? '...' : ''}  \n\n`;
      });
    }

    markdown += `---\n\n`;
  });

  return markdown;
}

/**
 * Extract category with robust error handling
 */
async function extractCategory(browser, category, articleCount = DEFAULT_ARTICLE_COUNT) {
  console.log(`\n📂 Extracting ${category.displayName}...`);
  console.log(`   URL: ${category.url}`);
  
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 720 }
  });
  
  const page = await context.newPage();
  
  // Set additional page settings
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'en-US,en;q=0.9'
  });
  
  try {
    // Extract article links
    console.log(`   Fetching article links...`);
    const articleLinks = await extractArticleLinks(page, category.url, articleCount);
    console.log(`   Found ${articleLinks.length} articles`);
    
    if (articleLinks.length === 0) {
      console.log(`   ⚠️ No articles found, attempting alternative extraction...`);
    }
    
    // Extract details for each article
    const articles = [];
    for (let i = 0; i < articleLinks.length; i++) {
      const link = articleLinks[i];
      console.log(`   [${i + 1}/${articleLinks.length}] Extracting: ${link.title || link.url.substring(0, 50)}...`);
      
      const details = await extractArticleDetails(page, link.url);
      articles.push({
        ...link,
        ...details,
        extractedAt: new Date().toISOString()
      });
      
      // Brief delay
      await page.waitForTimeout(500);
    }
    
    await context.close();
    
    return {
      ...category,
      articles,
      extractedAt: new Date().toISOString()
    };
    
  } catch (error) {
    console.error(`   ❌ Error in ${category.displayName}: ${error.message}`);
    await context.close();
    return {
      ...category,
      articles: [],
      error: error.message,
      extractedAt: new Date().toISOString()
    };
  }
}

/**
 * Main extraction function
 */
async function extractAllCategories(articleCount = DEFAULT_ARTICLE_COUNT) {
  console.log('🚀 Starting robust IndieHackers extraction');
  console.log(`📊 Configuration: ${articleCount} articles per category`);
  console.log(`📅 Date: ${new Date().toLocaleString()}`);
  
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu'
    ]
  });
  
  try {
    // Create output directory
    const outputDir = getDateFolder();
    await fs.mkdir(outputDir, { recursive: true });
    console.log(`📁 Output directory: ${outputDir}`);
    
    const results = {};
    let successCount = 0;
    let totalArticles = 0;
    
    // Process each category
    for (const category of CATEGORIES) {
      const categoryData = await extractCategory(browser, category, articleCount);
      results[category.name] = categoryData;
      
      if (categoryData.articles.length > 0) {
        successCount++;
        totalArticles += categoryData.articles.length;
      }
      
      // Save JSON report
      const jsonPath = path.join(outputDir, `${category.name}-data.json`);
      await fs.writeFile(jsonPath, JSON.stringify(categoryData, null, 2));
      console.log(`   ✅ JSON: ${jsonPath}`);
      
      // Save Markdown report
      const mdPath = path.join(outputDir, `${category.name}-report.md`);
      const markdown = generateMarkdownReport(categoryData);
      await fs.writeFile(mdPath, markdown);
      console.log(`   ✅ Markdown: ${mdPath}`);
    }
    
    // Combined report
    const combinedData = {
      extractedAt: new Date().toISOString(),
      categoriesProcessed: CATEGORIES.length,
      categoriesSuccessful: successCount,
      totalArticles,
      results
    };
    
    const combinedJsonPath = path.join(outputDir, 'all-categories.json');
    await fs.writeFile(combinedJsonPath, JSON.stringify(combinedData, null, 2));
    console.log(`\n💾 Combined JSON: ${combinedJsonPath}`);
    
    // Summary markdown
    let summaryMd = `# IndieHackers Extraction Summary

**Generated:** ${new Date().toLocaleString()}  
**Categories Processed:** ${combinedData.categoriesProcessed}  
**Successful Extractions:** ${combinedData.categoriesSuccessful}  
**Total Articles:** ${combinedData.totalArticles}  

## Extraction Results

`;
    
    for (const [key, data] of Object.entries(results)) {
      const status = data.articles.length > 0 ? '✅' : '⚠️';
      summaryMd += `### ${status} ${data.displayName}
- **Articles Extracted:** ${data.articles.length}
- **Source URL:** ${data.url}
${data.error ? `- **Note:** ${data.error}\n` : ''}
`;
      
      if (data.articles.length > 0) {
        summaryMd += `\n**Top Articles:**\n`;
        data.articles.slice(0, 3).forEach((a, i) => {
          summaryMd += `${i + 1}. ${a.title || 'Untitled'} by ${a.author || 'Unknown'}\n`;
        });
        summaryMd += '\n';
      }
    }
    
    const summaryPath = path.join(outputDir, 'summary.md');
    await fs.writeFile(summaryPath, summaryMd);
    console.log(`📝 Summary: ${summaryPath}`);
    
    // Final report
    console.log('\n' + '='.repeat(50));
    console.log('🎉 EXTRACTION COMPLETE');
    console.log('='.repeat(50));
    console.log(`📊 Results:`);
    console.log(`   ✓ Categories: ${successCount}/${CATEGORIES.length} successful`);
    console.log(`   ✓ Articles: ${totalArticles} total`);
    
    for (const [key, data] of Object.entries(results)) {
      const icon = data.articles.length > 0 ? '✅' : '⚠️';
      console.log(`   ${icon} ${data.displayName}: ${data.articles.length} articles`);
    }
    
    console.log(`\n📁 All reports saved to: ${outputDir}`);
    
    return combinedData;
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

// Command line execution
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const articleCount = process.argv[2] ? parseInt(process.argv[2]) : DEFAULT_ARTICLE_COUNT;
  
  extractAllCategories(articleCount)
    .then(() => {
      console.log('\n✨ Done!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Failed:', error);
      process.exit(1);
    });
}

export { extractAllCategories, CATEGORIES, DEFAULT_ARTICLE_COUNT };