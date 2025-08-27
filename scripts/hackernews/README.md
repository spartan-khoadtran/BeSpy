# HackerNews Scraper

A powerful HackerNews scraper built with Playwright that supports keyword search and trending post detection.

## Features

- **Search Functionality**: Search HackerNews posts by keyword
- **Trending Detection**: Find trending posts from the last N days
- **Content Extraction**: Fetches full post content and comments
- **Multiple Output Formats**: JSON and Markdown support
- **Comprehensive Testing**: Built-in test suite

## Installation

```bash
cd scripts/hackernews
npm install
npx playwright install chromium
```

## Usage

### Search by Keyword

```bash
# Search with default JSON output
node index.js search "buildpad"

# Search with Markdown output
node index.js search "buildpad" markdown

# Search for any keyword
node index.js search "artificial intelligence" json
```

### Get Trending Posts

```bash
# Get trending posts from last 2 days (default)
node index.js trending

# Get trending posts from last 7 days
node index.js trending 7

# Get trending posts with Markdown output
node index.js trending 2 markdown
```

### Run Tests

```bash
node test.js
```

## Output Formats

### JSON Format
Returns structured data with:
- Title, URL, HN URL
- Points, Author, Time, Comments count
- Full post content and top comments

### Markdown Format
Returns formatted markdown with:
- Hierarchical structure
- Metadata display
- Content preview
- Top comments section

## File Structure

```
scripts/hackernews/
├── index.js          # Main CLI entry point
├── scraper.js        # Core scraper class
├── formatters.js     # JSON/Markdown formatters
├── trending.js       # Trending algorithm
├── test.js          # Test suite
├── package.json     # Dependencies
└── README.md        # Documentation
```

## Trending Algorithm

The trending score is calculated using:
```
Score = (points + comments * 2) / (age_in_hours + 2)^1.5
```

This formula:
- Weights comments higher than points (2x)
- Decays score over time
- Prioritizes recent engagement

## Test Results

The test suite verifies:
- Search functionality with "buildpad" keyword
- Trending post detection
- JSON/Markdown formatting
- Content extraction

Results are saved to `report/hackernews/`:
- `search-buildpad.json`
- `search-buildpad.md`
- `trending.json`
- `trending.md`

## Examples

### Search Example
```bash
$ node index.js search "buildpad"
Searching HackerNews for: buildpad
✅ Found 14 results
```

### Trending Example
```bash
$ node index.js trending 2
Finding trending posts from last 2 days...
✅ Found 10 trending posts
```

## Error Handling

- Timeout protection for slow pages
- Graceful fallback for missing content
- Network error recovery
- Result validation

## Performance

- Concurrent page loading
- Limited to top 10 results for search
- Limited to top 30 posts for trending analysis
- Headless browser for efficiency

## Requirements

- Node.js >= 14.0.0
- Playwright >= 1.40.0
- Chromium browser (installed automatically)

## Troubleshooting

If no results are found:
1. Check internet connection
2. Verify Playwright installation
3. Run `npx playwright install chromium`
4. Check HackerNews is accessible

## License

MIT