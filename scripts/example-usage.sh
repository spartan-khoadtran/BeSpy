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

# Example 1: Basic usage with new defaults
echo "Example 1: Basic fetch with defaults (JSON + comments + English)"
echo "----------------------------------------------------------------"
node scripts/twitter-unified-fetcher.mjs --keyword="AI" --posts=10

echo ""
echo "Example 2: Markdown report without comments"
echo "--------------------------------------------"
# Uncomment to run:
# node scripts/twitter-unified-fetcher.mjs --keyword="startup" --posts=30 --format=markdown --noComments

echo ""
echo "Example 3: All languages with detailed report"
echo "----------------------------------------------"
# Uncomment to run:
# node scripts/twitter-unified-fetcher.mjs --keyword="AI" --posts=50 --allLanguages --template=detailed

echo ""
echo "Example 4: CSV export without comments for quick analysis"
echo "---------------------------------------------------------"
# Uncomment to run:
# node scripts/twitter-unified-fetcher.mjs --keyword="blockchain" --posts=100 --format=csv --noComments

echo ""
echo "Example 5: Full featured fetch (all formats + all languages)"
echo "-------------------------------------------------------------"
# Uncomment to run:
# node scripts/twitter-unified-fetcher.mjs -k "solo founder" -p 20 -f all --allLanguages

echo ""
echo "✨ Check the 'report/' folder for generated reports!"
echo ""
echo "For more options, run: node scripts/twitter-unified-fetcher.mjs --help"