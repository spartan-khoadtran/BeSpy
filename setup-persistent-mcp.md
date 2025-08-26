# Setting Up Playwright MCP with Persistent Profile

## Overview
This guide helps you configure Playwright MCP to use a persistent browser profile instead of isolated mode, ensuring that login sessions and browser state are preserved between runs.

## Key Differences

### Isolated Mode (NOT RECOMMENDED for persistent sessions)
- Each session starts with a fresh profile
- All storage state is lost when browser closes
- Requires `--isolated` flag
- Needs `--storage-state` for initial state

### Persistent Profile Mode (RECOMMENDED)
- Saves all browser data to disk
- Preserves login sessions between runs
- Uses `--user-data-dir` to specify profile location
- Automatically maintains cookies, localStorage, etc.

## Configuration Steps

### 1. Update Claude Desktop Configuration

The configuration file is typically located at:
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/claude/claude_desktop_config.json`

### 2. Recommended Configuration

```json
{
  "mcpServers": {
    "playwright-persistent": {
      "command": "node",
      "args": [
        "/Users/khoadtran/Documents/Code/Personal/bespy-playwright/playwright-mcp-bespy/cli.js",
        "--user-data-dir=/Users/khoadtran/Documents/Code/Personal/bespy-playwright/playwright-mcp-bespy/browser-data",
        "--browser=chrome"
      ]
    }
  }
}
```

### Alternative: Using npx with persistent profile
```json
{
  "mcpServers": {
    "playwright-persistent": {
      "command": "npx",
      "args": [
        "playwright-mcp-bespy",
        "--user-data-dir=/Users/khoadtran/Documents/Code/Personal/bespy-playwright/playwright-mcp-bespy/browser-data",
        "--browser=chrome"
      ]
    }
  }
}
```

## Important Flags Explained

### Required for Persistent Profile:
- `--user-data-dir=<path>`: Specifies where to store the browser profile
  - Example: `--user-data-dir=/path/to/your/browser-data`
  - This directory will contain all cookies, localStorage, and session data

### Optional but Useful:
- `--browser=chrome`: Specify which browser to use (chrome, firefox, webkit, msedge)
- `--headless`: Run in headless mode (omit for headed/visible browser)
- `--viewport-size="1280,720"`: Set browser viewport size
- `--save-trace`: Save Playwright trace for debugging
- `--save-session`: Save session information

### DO NOT USE for Persistent Sessions:
- `--isolated`: This flag forces isolated mode (opposite of what we want)
- `--storage-state`: Only needed for isolated mode with initial state
- `--no-sandbox`: Disables browser sandboxing (security risk - avoid unless absolutely necessary)

## Default Profile Locations (if no --user-data-dir specified)

The default locations for persistent profiles are:
- **Windows**: `%USERPROFILE%\AppData\Local\ms-playwright\mcp-{channel}-profile`
- **macOS**: `~/Library/Caches/ms-playwright/mcp-{channel}-profile`
- **Linux**: `~/.cache/ms-playwright/mcp-{channel}-profile`

Where `{channel}` is the browser type (chrome, firefox, etc.)

## Verification

To verify your configuration is working:

1. Start Claude Desktop with the new configuration
2. Use the browser tools to navigate to a site requiring login
3. Log in to the site
4. Close the browser
5. Restart Claude Desktop
6. Navigate back to the same site - you should still be logged in

## Troubleshooting

### Issue: Browser still starts with fresh profile
- Ensure you're NOT using the `--isolated` flag
- Verify the `--user-data-dir` path exists and is writable
- Check that Claude Desktop is using the correct configuration file

### Issue: Permission errors
- Ensure the user-data-dir path has proper write permissions
- Try creating the directory manually first: `mkdir -p /path/to/browser-data`

### Issue: Want to clear stored data
- Simply delete the contents of your user-data-dir
- Or specify a new directory path

## Example Usage in Code

When using the MCP tools in your code, the persistent profile will automatically be used:

```javascript
// The browser will use the persistent profile specified in the config
await browser_navigate({ url: "https://twitter.com" });
// User will remain logged in from previous sessions
```

## Security Notes

- The persistent profile stores sensitive data (cookies, passwords, etc.)
- Keep the profile directory secure
- Don't share or commit the browser-data directory to version control
- Add `browser-data/` to your `.gitignore` file
- **NEVER use `--no-sandbox`** unless absolutely necessary - it disables critical browser security features
  - The sandbox isolates the browser from your system
  - Disabling it exposes your system to potential security risks from web content
  - Only use in controlled environments like Docker containers where needed

## Current Setup for This Project

For this project, we're using:
- Profile location: `/Users/khoadtran/Documents/Code/Personal/bespy-playwright/playwright-mcp-bespy/browser-data`
- Browser: Chrome
- Mode: Persistent (NOT isolated)
- This preserves Twitter/X login sessions between runs