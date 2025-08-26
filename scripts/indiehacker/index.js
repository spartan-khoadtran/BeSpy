/**
 * IndieHackers Scraper Entry Point
 * Main export and runner for the scraper
 */

import { IndieHackersScraper } from './scraper.js';
import { config } from './config.js';

// Export the scraper class
export { IndieHackersScraper };
export { config };

// CLI runner
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('🚀 IndieHackers Scraper CLI');
  
  const scraper = new IndieHackersScraper();
  
  const args = process.argv.slice(2);
  const options = {
    categories: args.includes('--all') ? 'all' : ['main', 'starting-up', 'tech'],
    postsPerCategory: parseInt(args.find(a => a.startsWith('--posts='))?.split('=')[1] || '50'),
    generateReport: !args.includes('--no-report')
  };
  
  console.log('📋 Options:', options);
  
  scraper.scrapeAndReport(options.categories, options)
    .then(results => {
      console.log('✅ Scraping completed successfully');
      console.log(`📊 Total posts: ${results.totalPosts || 0}`);
      if (results.reportPath) {
        console.log(`📄 Report saved to: ${results.reportPath}`);
      }
      if (results.dataPath) {
        console.log(`💾 Data saved to: ${results.dataPath}`);
      }
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Scraping failed:', error);
      process.exit(1);
    });
}