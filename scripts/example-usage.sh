#!/bin/bash

# Example usage of the Unified Twitter Data Fetcher

echo "🐦 Twitter Data Fetcher - Example Usage"
echo "======================================="
echo ""

# Check if browser-data directory exists with session
if [ -d "browser-data/Default" ]; then
    echo "✅ Browser profile found - ready to fetch data!"
else
    echo "⚠️  First time setup required!"
    echo "   Please run: node scripts/setup-browser-login.mjs"
    echo "   to login to Twitter first."
    echo ""
    echo "   After logging in, run this script again."
    exit 1
fi

echo ""

# Example 1: Basic usage - fetch 10 posts about AI
echo "Example 1: Basic fetch (10 posts about AI)"
echo "-------------------------------------------"
node scripts/twitter-unified-fetcher.mjs --keyword="AI" --posts=10 --format=markdown

echo ""
echo "Example 2: Include all languages (not just English)"
echo "----------------------------------------------------"
# Uncomment to run:
# node scripts/twitter-unified-fetcher.mjs --keyword="startup" --posts=30 --comments --allLanguages

echo ""
echo "Example 3: Detailed report with comments (English by default)"
echo "--------------------------------------------------------------"
# Uncomment to run:
# node scripts/twitter-unified-fetcher.mjs --keyword="AI" --posts=50 --comments --template=detailed

echo ""
echo "Example 4: CSV export for data analysis (English only)"
echo "-------------------------------------------------------"
# Uncomment to run:
# node scripts/twitter-unified-fetcher.mjs --keyword="blockchain" --posts=100 --format=csv

echo ""
echo "Example 5: Fetch posts in all languages with minimal output"
echo "------------------------------------------------------------"
# Uncomment to run:
# node scripts/twitter-unified-fetcher.mjs -k "solo founder" -p 20 -t minimal -f json --allLanguages

echo ""
echo "✨ Check the 'report/' folder for generated reports!"
echo ""
echo "For more options, run: node scripts/twitter-unified-fetcher.mjs --help"