# IndieHackers Scraper

A powerful web scraper for IndieHackers.com with automated report generation using Playwright.

## 🚀 Features

- **Multi-Category Scraping**: Support for all 6 IndieHackers categories
- **Intelligent Data Processing**: Duplicate detection, content summarization, and engagement scoring
- **Comprehensive Reports**: Generate markdown and JSON reports with insights
- **Robust Architecture**: Error handling, retry logic, and browser management
- **CLI Interface**: Easy-to-use command-line interface
- **TypeScript**: Full type safety and modern JavaScript features

## 📦 Installation

```bash
npm install indie-hackers-scraper
```

Or for development:

```bash
git clone <repository>
cd indie-hackers-scraper
npm install
npm run build
```

## 🎯 Quick Start

### Command Line Usage

```bash
# Scrape all categories
indie-hackers-scraper scrape --categories all

# Scrape specific categories
indie-hackers-scraper scrape --categories trending,new,ask-ih

# Scrape with custom settings
indie-hackers-scraper scrape \
  --categories trending \
  --max-posts 20 \
  --output ./my-reports \
  --format both

# Test a single category
indie-hackers-scraper test-category trending
```

### Programmatic Usage

```javascript
const { IndieHackersScraper, ReportGenerator } = require('indie-hackers-scraper');

async function scrapeData() {
  const scraper = new IndieHackersScraper();
  
  try {
    await scraper.initialize(true); // headless mode
    
    const config = {
      categories: ['trending', 'new'],
      outputDir: './output',
      maxPostsPerCategory: 20,
      includeContent: true
    };
    
    const result = await scraper.scrape(config);
    
    // Generate report
    const reportGenerator = new ReportGenerator();
    const reportData = reportGenerator.prepareReportData(result.posts, result.metadata);
    const markdown = reportGenerator.generateMarkdownReport(reportData);
    
    console.log(\`Found \${result.posts.length} posts\`);
    
  } finally {
    await scraper.cleanup();
  }
}
```

## 📊 Supported Categories

| Category | Description |
|----------|-------------|
| `trending` | Most popular posts across all categories |
| `new` | Recently posted content |
| `ask-ih` | Questions and advice requests |
| `feedback` | Product feedback and reviews |
| `milestones` | Achievement and milestone posts |
| `product-hunt` | Product Hunt related discussions |

## ⚙️ Configuration Options

### CLI Options

- `--categories, -c`: Categories to scrape (comma-separated or "all")
- `--date, -d`: Date in YYYY-MM-DD format (default: today)
- `--output, -o`: Output directory (default: ./output)
- `--max-posts, -m`: Maximum posts per category (default: 50)
- `--format, -f`: Output format - json, markdown, or both (default: both)
- `--no-content`: Exclude full post content to reduce file size
- `--headless`: Run browser in headless mode (default: true)
- `--verbose`: Enable verbose logging

### Programmatic Options

```typescript
interface ScrapingConfig {
  categories: Category[];
  date?: Date;
  outputDir: string;
  maxPostsPerCategory?: number;
  includeContent?: boolean;
}
```

## 📋 Output Format

### Post Data Structure

```typescript
interface Post {
  id: string;
  title: string;
  content: string;
  author: string;
  url: string;
  category: Category;
  timestamp: Date;
  engagement: {
    comments: number;
    upvotes: number;
    score: number; // Calculated engagement score
  };
  tags: string[];
  summary?: string;
}
```

### Report Data

- **Executive Summary**: Key metrics and insights
- **Top Posts**: Highest engagement posts
- **Category Breakdown**: Performance by category
- **Trending Themes**: Popular topics and tags
- **Methodology**: Data collection and processing details

## 🔧 Architecture

```
src/
├── core/               # Core scraping engine
│   ├── browser-manager.ts
│   └── indie-hackers-scraper.ts
├── scrapers/           # Category-specific scrapers
│   └── category-scraper.ts
├── processors/         # Data processing pipeline
│   └── data-processor.ts
├── reports/            # Report generation
│   └── report-generator.ts
├── cli/                # Command-line interface
│   └── cli.ts
├── utils/              # Utilities and helpers
│   ├── logger.ts
│   └── helpers.ts
└── types/              # TypeScript type definitions
    └── index.ts
```

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Test specific category
npm run test-category trending
```

## 🚀 Development

```bash
# Install dependencies
npm install

# Build project
npm run build

# Development mode
npm run dev scrape --categories trending --verbose

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix
```

## 🔍 Features Deep Dive

### Engagement Scoring
- Comments weighted 3x more than upvotes
- Recent posts get time-based boost
- Normalized scoring across categories

### Duplicate Detection
- Content-based deduplication
- Title and author similarity matching
- Cross-category duplicate removal

### Content Summarization
- Extractive summarization from post content
- Key sentence identification
- Configurable summary length

### Error Handling
- Retry logic with exponential backoff
- Graceful degradation on failures
- Comprehensive error logging

### Browser Management
- Automatic browser lifecycle management
- Memory-efficient page handling
- Headless and headed modes

## 📈 Performance

- **Speed**: ~2-3 posts per second per category
- **Memory**: ~100MB peak usage for full scrape
- **Reliability**: Built-in retry logic and error recovery
- **Scalability**: Concurrent category processing

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

## 🔧 Troubleshooting

### Common Issues

**Browser fails to start**
- Install Playwright browsers: `npx playwright install`
- Check system requirements

**No posts found**
- Verify IndieHackers.com is accessible
- Check network connectivity
- Try with --verbose flag for debugging

**TypeScript errors**
- Ensure Node.js >= 16
- Run `npm run build` to check compilation
- Check TypeScript configuration

### Getting Help

- Check the [issues page](https://github.com/your-repo/issues)
- Review the troubleshooting guide
- Enable verbose logging for debugging

## 🎯 Roadmap

- [ ] Real-time scraping with webhooks
- [ ] Advanced analytics and insights
- [ ] Export to multiple formats (CSV, PDF)
- [ ] Integration with databases
- [ ] Scheduled scraping
- [ ] Web dashboard
- [ ] API endpoints

---

Made with ❤️ by the IndieHackers community