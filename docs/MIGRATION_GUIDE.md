# Migration Guide: From Multiple Scripts to Unified Fetcher

## Overview

This guide helps you migrate from using multiple Twitter fetching scripts to the new unified solution.

## Old Scripts Being Replaced

The following scripts are now replaced by `twitter-unified-fetcher.mjs`:

- `fetch-30-posts.mjs`
- `fetch-50-solo-founder-posts.mjs`
- `fetch-solo-founder-50.mjs`
- `fetch-solo-founder-posts.mjs`
- `fetch-twitter-data.mjs`
- `quick-fetch-30.mjs`
- `test-mcp-twitter.mjs`

## Migration Table

| Old Script | Purpose | New Command |
|------------|---------|-------------|
| `fetch-30-posts.mjs` | Fetch 30 posts | `twitter-unified-fetcher.mjs --posts=30` |
| `fetch-solo-founder-50.mjs` | Fetch 50 solo founder posts | `twitter-unified-fetcher.mjs -k "solo founder" -p 50` |
| `quick-fetch-30.mjs` | Quick 30 post fetch | `twitter-unified-fetcher.mjs -p 30 -t minimal` |
| `fetch-twitter-data.mjs` | General Twitter fetch | `twitter-unified-fetcher.mjs` |
| `test-mcp-twitter.mjs` | Test MCP integration | `twitter-unified-fetcher.mjs --posts=5` |

## Key Improvements

### 1. Single Script, Multiple Options
Instead of maintaining 7+ scripts, use one script with parameters:
```bash
# Old way - multiple scripts
node scripts/fetch-30-posts.mjs
node scripts/fetch-solo-founder-50.mjs

# New way - one script with parameters
node scripts/twitter-unified-fetcher.mjs --posts=30
node scripts/twitter-unified-fetcher.mjs -k "solo founder" -p 50
```

### 2. Flexible Report Formats
Choose your output format dynamically:
```bash
# Generate all formats
node scripts/twitter-unified-fetcher.mjs --format=all

# Only CSV
node scripts/twitter-unified-fetcher.mjs --format=csv

# Only Markdown
node scripts/twitter-unified-fetcher.mjs --format=markdown
```

### 3. Comment Support
New feature - fetch comments for deeper analysis:
```bash
node scripts/twitter-unified-fetcher.mjs --comments
```

### 4. Template System
Choose from multiple report templates:
```bash
# Detailed analysis
node scripts/twitter-unified-fetcher.mjs --template=detailed

# Minimal output
node scripts/twitter-unified-fetcher.mjs --template=minimal

# Custom template
node scripts/twitter-unified-fetcher.mjs --template=custom
```

## Cleaning Up Old Scripts

Once you've verified the new unified script works for your needs, you can remove the old scripts:

```bash
# Backup old scripts first (optional)
mkdir scripts/legacy
mv scripts/fetch-*.mjs scripts/legacy/
mv scripts/quick-*.mjs scripts/legacy/
mv scripts/test-mcp-*.mjs scripts/legacy/

# Or remove them entirely
rm scripts/fetch-*.mjs
rm scripts/quick-*.mjs
rm scripts/test-mcp-*.mjs
```

## Common Use Cases

### Daily Reports
```bash
# Old way
node scripts/fetch-30-posts.mjs

# New way - with more options
node scripts/twitter-unified-fetcher.mjs \
  --keyword="your topic" \
  --posts=30 \
  --template=standard \
  --format=all
```

### Research Analysis
```bash
# Old way - limited to predefined keywords
node scripts/fetch-solo-founder-50.mjs

# New way - any keyword with detailed analysis
node scripts/twitter-unified-fetcher.mjs \
  --keyword="any research topic" \
  --posts=100 \
  --comments \
  --template=detailed
```

### Quick Checks
```bash
# Old way
node scripts/quick-fetch-30.mjs

# New way - faster with minimal output
node scripts/twitter-unified-fetcher.mjs \
  --posts=10 \
  --template=minimal \
  --format=markdown
```

## Advantages of the Unified Approach

1. **Maintainability**: One script to update instead of many
2. **Flexibility**: Mix and match options as needed
3. **Consistency**: Same interface for all Twitter fetching
4. **Features**: New capabilities like comment fetching
5. **Templates**: Customizable report formats
6. **Performance**: Optimized fetching and processing

## Troubleshooting Migration

### Issue: Different output format
The new script may have slightly different formatting. Adjust using templates:
- Use `--template=minimal` for simpler output
- Use `--template=custom` and edit `config/report-template.json` for exact format

### Issue: Missing dependencies
Install required packages:
```bash
npm install @modelcontextprotocol/sdk playwright
```

### Issue: Scripts fail to run
Ensure executable permissions:
```bash
chmod +x scripts/twitter-unified-fetcher.mjs
```

## Support

For help with migration:
1. Run `node scripts/twitter-unified-fetcher.mjs --help`
2. Check `docs/TWITTER_FETCHER_GUIDE.md`
3. Review example usage in `scripts/example-usage.sh`