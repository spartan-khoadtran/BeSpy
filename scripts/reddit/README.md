# Reddit Scraper Scripts

## 📁 Output Directory Rules

**IMPORTANT:** All reports and output files should be saved to:
```
report/reddit/
```

Not in:
- ❌ `scripts/reddit/reports/`
- ❌ `scripts/reddit/output/`
- ❌ Root directory

## Usage Examples

### Search Posts
```bash
npx ts-node reddit-api-search.ts search "keyword" -l 10 -f json -o report/reddit/keyword-results.json
npx ts-node reddit-api-search.ts search "keyword" -l 10 -f markdown -o report/reddit/keyword-results.md
```

### Get Trending Posts
```bash
npx ts-node reddit-api-search.ts trending -t day -l 10 -f json -o report/reddit/trending-day.json
npx ts-node reddit-api-search.ts trending -t week -l 10 -f markdown -o report/reddit/trending-week.md
```

## Available Scripts

- `reddit-api-search.ts` - Main working scraper using Reddit JSON API
- `reddit-scraper-final.ts` - Alternative scraper using old.reddit.com
- `reddit-scraper-v2.ts` - Enhanced version with multiple selectors

## Output Formats

- **JSON** (`-f json`) - Structured data format
- **Markdown** (`-f markdown`) - Human-readable format

## Directory Structure
```
bespy-playwright/
├── scripts/
│   └── reddit/           # Scraper scripts
│       ├── reddit-api-search.ts
│       ├── package.json
│       └── README.md (this file)
└── report/
    └── reddit/           # All output files go here
        ├── buildpad-results.json
        ├── buildpad-results.md
        └── [other reports...]
```

## Notes

- Always use absolute or relative path from project root: `report/reddit/`
- Create the directory if it doesn't exist: `mkdir -p report/reddit`
- Use descriptive filenames: `keyword-YYYY-MM-DD.json`