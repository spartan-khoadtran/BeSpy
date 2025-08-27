#!/usr/bin/env node

/**
 * Optimized IndieHackers extraction script
 * Extracts articles with full content, comments from specified categories
 * Saves to date-based folders with JSON and Markdown reports
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

// Default number of articles to fetch per category
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
 * Extract article links from category page
 */
async function extractArticleLinks(page, categoryUrl, maxCount = DEFAULT_ARTICLE_COUNT) {
  await page.goto(categoryUrl, {
    waitUntil: 'networkidle',
    timeout: 60000
  });
  
  await page.waitForTimeout(3000);
  
  const articles = await page.evaluate((max) => {
    const links = [];
    const selectors = [
      'a[href*="/post/"]',
      'article a[href*="/post/"]',
      '[class*="post"] a[href*="/post/"]'
    ];
    
    const uniqueUrls = new Set();
    
    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      elements.forEach(link => {
        const href = link.href;
        if (href && href.includes('/post/') && !href.includes('#') && !uniqueUrls.has(href)) {
          uniqueUrls.add(href);
          
          // Try to get basic info from the listing
          const container = link.closest('article') || link.parentElement;
          const titleEl = container?.querySelector('h1, h2, h3, [class*="title"]');
          const authorEl = container?.querySelector('a[href*="/u/"], a[href*="/@"]');
          const timeEl = container?.querySelector('time, [class*="date"]');
          
          links.push({
            url: href,
            title: titleEl?.textContent?.trim() || link.textContent?.trim() || '',
            author: authorEl?.textContent?.trim() || '',
            date: timeEl?.textContent?.trim() || ''
          });
        }
      });
    }
    
    return links.slice(0, max);
  }, maxCount);
  
  return articles;
}

/**
 * Extract detailed article data including comments
 */
async function extractArticleDetails(page, articleUrl) {
  try {
    await page.goto(articleUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    
    await page.waitForTimeout(2000);
    
    const details = await page.evaluate(() => {
      const data = {};
      
      // URL and ID
      data.url = window.location.href;
      data.postId = window.location.pathname.split('/').filter(p => p).pop();
      
      // Title
      const titleEl = document.querySelector('h1, article h1, [class*="title"] h1');
      data.title = titleEl?.textContent?.trim() || '';
      
      // Author
      const authorEl = document.querySelector('a[href*="/u/"], a[href*="/@"], [class*="author"] a');
      data.author = authorEl?.textContent?.trim() || '';
      data.authorUrl = authorEl?.href || '';
      
      // Date
      const timeEl = document.querySelector('time');
      data.publishedAt = timeEl?.getAttribute('datetime') || '';
      data.publishedAtText = timeEl?.textContent?.trim() || '';
      
      // Content
      let content = '';
      const contentSelectors = [
        'article .prose',
        'article [class*="content"]',
        '[class*="post-content"]',
        '[class*="post-body"]',
        'article',
        'main article'
      ];
      
      for (const selector of contentSelectors) {
        const element = document.querySelector(selector);
        if (element && element.textContent.length > 200) {
          const clone = element.cloneNode(true);
          
          // Remove unwanted elements
          ['nav', 'header', 'footer', '[class*="comment"]', '[class*="sidebar"]', 
           '[class*="share"]', '[class*="related"]'].forEach(sel => {
            clone.querySelectorAll(sel).forEach(el => el.remove());
          });
          
          content = clone.textContent.trim();
          if (content.length > 200) break;
        }
      }
      
      data.content = content;
      
      // Engagement metrics
      const voteEl = document.querySelector('button[class*="vote"], button[class*="upvote"], [class*="vote-count"]');
      const voteText = voteEl?.textContent || '';
      data.upvotes = parseInt(voteText.match(/\d+/)?.[0] || '0');
      
      // Comment count
      const commentCountEl = document.querySelector('a[href*="#comments"], [class*="comment-count"]');
      const commentText = commentCountEl?.textContent || '';
      data.commentCount = parseInt(commentText.match(/\d+/)?.[0] || '0');
      
      // Extract comments with full details
      data.comments = [];
      const commentSelectors = [
        '[class*="comment"]:not([class*="count"]):not([class*="form"])',
        '[id*="comment-"]',
        '[data-comment-id]'
      ];
      
      const commentElements = [];
      commentSelectors.forEach(sel => {
        document.querySelectorAll(sel).forEach(el => {
          if (el.textContent.trim().length > 10) {
            commentElements.push(el);
          }
        });
      });
      
      // Extract up to 20 comments
      Array.from(commentElements).slice(0, 20).forEach(comment => {
        const authorEl = comment.querySelector('a[href*="/u/"], a[href*="/@"], [class*="author"]');
        const textEl = comment.querySelector('[class*="text"], [class*="content"], p') || comment;
        const timeEl = comment.querySelector('time, [class*="date"], [class*="ago"]');
        const voteEl = comment.querySelector('[class*="vote"], [class*="upvote"]');
        
        const commentText = textEl.textContent.trim();
        if (commentText && commentText.length > 10) {
          data.comments.push({
            author: authorEl?.textContent?.trim() || 'Unknown',
            authorUrl: authorEl?.href || '',
            text: commentText,
            date: timeEl?.textContent?.trim() || '',
            upvotes: parseInt(voteEl?.textContent?.match(/\d+/)?.[0] || '0')
          });
        }
      });
      
      // Tags
      const tagElements = document.querySelectorAll('a[href*="/tag"], a[href*="/tags"]');
      data.tags = Array.from(tagElements).map(tag => tag.textContent.trim()).filter(t => t);
      
      return data;
    });
    
    return details;
  } catch (error) {
    console.error(`Failed to extract details from ${articleUrl}: ${error.message}`);
    return {
      url: articleUrl,
      error: error.message,
      title: '',
      content: '',
      comments: []
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

  categoryData.articles.forEach((article, index) => {
    markdown += `## ${index + 1}. ${article.title || 'Untitled'}

**Author:** ${article.author || 'Unknown'}  
**Published:** ${article.publishedAtText || article.date || 'Unknown'}  
**URL:** [View Article](${article.url})  
**Upvotes:** ${article.upvotes || 0} | **Comments:** ${article.commentCount || 0}  
`;

    if (article.tags && article.tags.length > 0) {
      markdown += `**Tags:** ${article.tags.join(', ')}  \n`;
    }

    markdown += `
### Content Summary
${article.content ? article.content.substring(0, 500) + '...' : 'No content available'}

`;

    if (article.comments && article.comments.length > 0) {
      markdown += `### Top Comments (${article.comments.length})\n\n`;
      article.comments.slice(0, 5).forEach((comment, i) => {
        markdown += `**${i + 1}. ${comment.author}** ${comment.date ? `(${comment.date})` : ''}  \n`;
        markdown += `${comment.text.substring(0, 200)}${comment.text.length > 200 ? '...' : ''}  \n`;
        markdown += `👍 ${comment.upvotes} upvotes  \n\n`;
      });
    }

    markdown += `---\n\n`;
  });

  return markdown;
}

/**
 * Extract data from a single category
 */
async function extractCategory(browser, category, articleCount = DEFAULT_ARTICLE_COUNT) {
  console.log(`\n📂 Extracting ${category.displayName}...`);
  console.log(`   URL: ${category.url}`);
  
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    viewport: { width: 1280, height: 720 }
  });
  
  const page = await context.newPage();
  
  try {
    // Extract article links
    console.log(`   Fetching article links...`);
    const articleLinks = await extractArticleLinks(page, category.url, articleCount);
    console.log(`   Found ${articleLinks.length} articles`);
    
    // Extract detailed data for each article
    const articles = [];
    for (let i = 0; i < articleLinks.length; i++) {
      const link = articleLinks[i];
      console.log(`   [${i + 1}/${articleLinks.length}] Extracting: ${link.title || link.url}`);
      
      const details = await extractArticleDetails(page, link.url);
      articles.push({
        ...link,
        ...details,
        extractedAt: new Date().toISOString()
      });
      
      // Small delay between requests
      await page.waitForTimeout(1000);
    }
    
    await context.close();
    
    return {
      ...category,
      articles,
      extractedAt: new Date().toISOString()
    };
    
  } catch (error) {
    console.error(`   ❌ Error extracting ${category.displayName}: ${error.message}`);
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
  console.log('🚀 Starting optimized IndieHackers extraction');
  console.log(`📊 Settings: ${articleCount} articles per category`);
  
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    // Create date-based output directory
    const outputDir = getDateFolder();
    await fs.mkdir(outputDir, { recursive: true });
    console.log(`📁 Output directory: ${outputDir}`);
    
    const results = {};
    
    // Extract each category
    for (const category of CATEGORIES) {
      const categoryData = await extractCategory(browser, category, articleCount);
      results[category.name] = categoryData;
      
      // Save individual category JSON
      const jsonPath = path.join(outputDir, `${category.name}-data.json`);
      await fs.writeFile(jsonPath, JSON.stringify(categoryData, null, 2));
      console.log(`   ✅ JSON saved: ${jsonPath}`);
      
      // Save individual category Markdown
      const mdPath = path.join(outputDir, `${category.name}-report.md`);
      const markdown = generateMarkdownReport(categoryData);
      await fs.writeFile(mdPath, markdown);
      console.log(`   ✅ Markdown saved: ${mdPath}`);
    }
    
    // Save combined report
    const combinedData = {
      extractedAt: new Date().toISOString(),
      categories: Object.keys(results).length,
      totalArticles: Object.values(results).reduce((sum, cat) => sum + cat.articles.length, 0),
      results
    };
    
    const combinedJsonPath = path.join(outputDir, 'all-categories.json');
    await fs.writeFile(combinedJsonPath, JSON.stringify(combinedData, null, 2));
    console.log(`\n💾 Combined JSON saved: ${combinedJsonPath}`);
    
    // Generate summary markdown
    let summaryMd = `# IndieHackers Extraction Summary

**Date:** ${new Date().toLocaleString()}  
**Total Categories:** ${combinedData.categories}  
**Total Articles:** ${combinedData.totalArticles}  

## Categories Extracted

`;
    
    for (const [key, data] of Object.entries(results)) {
      summaryMd += `### ${data.displayName}
- **Articles:** ${data.articles.length}
- **URL:** ${data.url}
- **Status:** ${data.error ? '⚠️ Partial' : '✅ Complete'}

`;
    }
    
    const summaryPath = path.join(outputDir, 'summary.md');
    await fs.writeFile(summaryPath, summaryMd);
    console.log(`📝 Summary saved: ${summaryPath}`);
    
    // Display final summary
    console.log('\n🎉 Extraction complete!');
    console.log(`📊 Summary:`);
    console.log(`   - Categories: ${combinedData.categories}`);
    console.log(`   - Total articles: ${combinedData.totalArticles}`);
    for (const [key, data] of Object.entries(results)) {
      console.log(`   - ${data.displayName}: ${data.articles.length} articles`);
    }
    
    return combinedData;
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

// CLI execution
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const articleCount = process.argv[2] ? parseInt(process.argv[2]) : DEFAULT_ARTICLE_COUNT;
  
  extractAllCategories(articleCount)
    .then(() => {
      console.log('\n✨ All done!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Extraction failed:', error);
      process.exit(1);
    });
}

export { extractAllCategories, CATEGORIES, DEFAULT_ARTICLE_COUNT };