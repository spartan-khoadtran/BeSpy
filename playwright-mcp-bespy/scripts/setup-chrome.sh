#!/bin/bash

echo "Setting up Chrome for Twitter data fetching..."
echo "============================================"
echo ""
echo "Choose an option:"
echo "1) Use existing Chrome profile (recommended if you're already logged into Twitter)"
echo "2) Start Chrome with remote debugging (for connecting from Playwright)"
echo ""
read -p "Enter choice (1 or 2): " choice

if [ "$choice" = "1" ]; then
    echo ""
    echo "To use your existing Chrome profile:"
    echo "1. Make sure Chrome is completely closed"
    echo "2. Run the fetcher script - it will use persistent storage"
    echo ""
    echo "Run: node fetch-twitter-session.mjs 'your-keyword'"
    
elif [ "$choice" = "2" ]; then
    echo ""
    echo "Starting Chrome with remote debugging..."
    echo ""
    
    # Detect OS
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        CHROME_PATH="google-chrome"
    elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
        # Windows
        CHROME_PATH="chrome.exe"
    fi
    
    echo "Launching Chrome with debugging port..."
    "$CHROME_PATH" --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug &
    
    echo ""
    echo "Chrome launched! Please:"
    echo "1. Log into Twitter in the browser window that opened"
    echo "2. Keep the browser open"
    echo "3. In another terminal, run: node fetch-twitter-session.mjs 'your-keyword'"
    echo ""
    echo "Press Ctrl+C to stop Chrome when done"
    wait
else
    echo "Invalid choice"
fi