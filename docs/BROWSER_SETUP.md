# Browser Profile Setup Guide

## 🔐 One-Time Login Setup

This guide helps you set up a persistent browser profile so you can login to Twitter once and reuse the session for all future data fetching.

## Why Persistent Profile?

- **Login once**: No need to login every time you fetch data
- **Saves time**: Skip authentication steps in automated runs
- **Secure**: Your session is stored locally in the `browser-data` directory
- **Reliable**: Avoids rate limiting from repeated logins

## Setup Steps

### 1. Initial Login Setup

Run the browser login setup script:

```bash
node scripts/setup-browser-login.mjs
```

This will:
1. Open a Chrome browser window
2. Navigate to Twitter login page
3. Wait for you to complete login
4. Save your session in `browser-data` directory

### 2. Login Process

When the browser opens:
1. Enter your Twitter username/email
2. Enter your password
3. Complete any 2FA if required
4. Once logged in and you see your Twitter feed, close the browser
5. The script will confirm your session is saved

### 3. Verify Setup

Check if the profile was created successfully:

```bash
ls -la browser-data/
```

You should see a `Default` directory containing your browser profile.

## Using the Persistent Profile

Once setup is complete, the unified fetcher will automatically use your saved session:

```bash
# Now works without manual login!
node scripts/twitter-unified-fetcher.mjs --keyword="AI" --posts=20
```

## Profile Priority

The fetcher checks for profiles in this order:
1. **Local `browser-data`** - Your persistent profile (prioritized)
2. **MCP profile** - Falls back if no local profile exists
3. **Temporary profile** - Created if both above are unavailable

## Security Notes

⚠️ **Important Security Considerations:**

1. **Keep `browser-data` directory secure** - it contains your Twitter session
2. **Add to .gitignore** - Never commit this directory to version control
3. **Local use only** - Don't share the browser-data directory
4. **Session expiry** - Twitter sessions expire after ~30 days of inactivity

## Troubleshooting

### Profile Locked Error

If you get "profile already in use" error:
- Close any open Chrome instances using the profile
- Check for zombie Chrome processes: `pkill -f chrome`

### Session Expired

If fetching stops working after some time:
- Run `node scripts/setup-browser-login.mjs` again
- Complete fresh login to refresh session

### Reset Profile

To start fresh:
```bash
rm -rf browser-data
node scripts/setup-browser-login.mjs
```

## Directory Structure

After setup, your project will have:
```
bespy-playwright/
├── browser-data/          # Persistent Chrome profile
│   ├── Default/           # Profile data
│   ├── First Run          # Chrome first run marker
│   └── ...                # Other Chrome files
├── scripts/
│   ├── setup-browser-login.mjs    # Login setup script
│   └── twitter-unified-fetcher.mjs # Main fetcher (uses profile)
```

## Benefits

✅ **No repeated logins** - Login once, use forever (until session expires)
✅ **Faster execution** - Skip authentication steps
✅ **Better reliability** - Avoid login-related failures
✅ **Development friendly** - Test and iterate quickly

## Next Steps

After setup:
1. Run example scripts: `bash scripts/example-usage.sh`
2. Fetch data with various parameters
3. Check reports in `report/` directory

---

Remember: The browser-data directory is already in .gitignore for security!