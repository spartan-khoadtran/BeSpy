const { chromium } = require('playwright');

class HackerNewsScraper {
  constructor() {
    this.browser = null;
    this.page = null;
    this.baseUrl = 'https://news.ycombinator.com';
  }

  async init() {
    this.browser = await chromium.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    this.page = await this.browser.newPage();
    await this.page.setViewportSize({ width: 1280, height: 800 });
  }

  async search(keyword) {
    if (!this.page) throw new Error('Scraper not initialized');
    
    const searchUrl = `https://hn.algolia.com/?query=${encodeURIComponent(keyword)}&type=all&sort=byPopularity&prefix&page=0&dateRange=all`;
    
    await this.page.goto(searchUrl, { waitUntil: 'networkidle' });
    
    // Wait for search results to load
    await this.page.waitForSelector('.Story, .Comment', { timeout: 10000 }).catch(() => {});
    
    // Extract search results
    const results = await this.page.evaluate(() => {
      const items = [];
      const stories = document.querySelectorAll('.Story');
      
      stories.forEach(story => {
        const titleEl = story.querySelector('.Story_title a');
        const metaEl = story.querySelector('.Story_meta');
        const linkEl = story.querySelector('.Story_link a');
        
        if (titleEl) {
          const item = {
            title: titleEl.textContent.trim(),
            url: titleEl.href,
            points: 0,
            author: '',
            time: '',
            comments: 0,
            hnUrl: '',
            content: ''
          };
          
          // Extract metadata
          if (metaEl) {
            const pointsMatch = metaEl.textContent.match(/(\d+)\s+point/);
            const authorMatch = metaEl.textContent.match(/by\s+(\S+)/);
            const commentsMatch = metaEl.textContent.match(/(\d+)\s+comment/);
            const timeEl = metaEl.querySelector('[title]');
            
            if (pointsMatch) item.points = parseInt(pointsMatch[1]);
            if (authorMatch) item.author = authorMatch[1];
            if (commentsMatch) item.comments = parseInt(commentsMatch[1]);
            if (timeEl) item.time = timeEl.getAttribute('title');
          }
          
          // Get HN discussion link
          if (linkEl && linkEl.href.includes('item?id=')) {
            item.hnUrl = linkEl.href;
          }
          
          items.push(item);
        }
      });
      
      return items;
    });
    
    // Fetch content for each result
    for (let i = 0; i < Math.min(results.length, 10); i++) {
      if (results[i].hnUrl) {
        try {
          results[i].content = await this.fetchPostContent(results[i].hnUrl);
        } catch (err) {
          console.error(`Failed to fetch content for: ${results[i].title}`);
          results[i].content = 'Content unavailable';
        }
      }
    }
    
    return results;
  }

  async fetchPostContent(url) {
    const newPage = await this.browser.newPage();
    
    try {
      await newPage.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
      
      const content = await newPage.evaluate(() => {
        const data = {
          title: '',
          url: '',
          text: '',
          points: 0,
          author: '',
          time: '',
          comments: []
        };
        
        // Get post title
        const titleEl = document.querySelector('.title a.storylink, .titleline > a');
        if (titleEl) {
          data.title = titleEl.textContent.trim();
          data.url = titleEl.href;
        }
        
        // Get post metadata
        const subtext = document.querySelector('.subtext');
        if (subtext) {
          const pointsEl = subtext.querySelector('.score');
          const userEl = subtext.querySelector('.hnuser');
          const ageEl = subtext.querySelector('.age');
          
          if (pointsEl) data.points = parseInt(pointsEl.textContent.match(/\d+/)[0]);
          if (userEl) data.author = userEl.textContent;
          if (ageEl) data.time = ageEl.getAttribute('title') || ageEl.textContent;
        }
        
        // Get post text if it exists (for text posts)
        const textEl = document.querySelector('.comment-tree > tbody > tr:first-child .comment');
        if (textEl) {
          data.text = textEl.textContent.trim();
        }
        
        // Get top-level comments
        const commentRows = document.querySelectorAll('.comment-tree .comtr');
        commentRows.forEach((row, index) => {
          if (index < 10) { // Limit to first 10 comments
            const commentEl = row.querySelector('.comment');
            const userEl = row.querySelector('.hnuser');
            const ageEl = row.querySelector('.age');
            
            if (commentEl) {
              const comment = {
                author: userEl ? userEl.textContent : 'unknown',
                time: ageEl ? (ageEl.getAttribute('title') || ageEl.textContent) : '',
                text: commentEl.textContent.trim()
              };
              data.comments.push(comment);
            }
          }
        });
        
        return data;
      });
      
      return content;
      
    } catch (error) {
      console.error('Error fetching content:', error.message);
      throw error;
    } finally {
      await newPage.close();
    }
  }

  async getFrontPage() {
    if (!this.page) throw new Error('Scraper not initialized');
    
    await this.page.goto(this.baseUrl, { waitUntil: 'networkidle' });
    
    const posts = await this.page.evaluate(() => {
      const items = [];
      const rows = document.querySelectorAll('.athing');
      
      rows.forEach((row, index) => {
        if (index < 30) { // Get top 30 posts
          const titleEl = row.querySelector('.titleline > a');
          const nextRow = row.nextElementSibling;
          
          if (titleEl && nextRow) {
            const item = {
              id: row.id,
              rank: index + 1,
              title: titleEl.textContent,
              url: titleEl.href,
              points: 0,
              author: '',
              time: '',
              comments: 0,
              hnUrl: ''
            };
            
            // Get metadata from next row
            const scoreEl = nextRow.querySelector('.score');
            const userEl = nextRow.querySelector('.hnuser');
            const ageEl = nextRow.querySelector('.age');
            const commentsEl = nextRow.querySelector('a[href*="item?id="]');
            
            if (scoreEl) item.points = parseInt(scoreEl.textContent.match(/\d+/)[0]);
            if (userEl) item.author = userEl.textContent;
            if (ageEl) item.time = ageEl.getAttribute('title') || ageEl.textContent;
            if (commentsEl) {
              const commentsText = commentsEl.textContent;
              const commentsMatch = commentsText.match(/(\d+)/);
              if (commentsMatch) item.comments = parseInt(commentsMatch[1]);
              item.hnUrl = commentsEl.href;
            }
            
            items.push(item);
          }
        }
      });
      
      return items;
    });
    
    return posts;
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

module.exports = HackerNewsScraper;