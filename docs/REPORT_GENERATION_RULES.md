# Report Generation Rules and Guidelines

## 📋 Table of Contents
1. [General Rules](#general-rules)
2. [IndieHacker Reports](#indiehacker-reports)
3. [Twitter Reports](#twitter-reports)
4. [Common Mistakes to Avoid](#common-mistakes-to-avoid)
5. [Checklist](#checklist)

---

## 🎯 General Rules

### Folder Structure Requirements
**CRITICAL: All reports MUST be saved in date-based folders**

```
report/
├── indiehacker/
│   └── DD-MMM-YYYY/     # Example: 27-Aug-2025
│       ├── starting-up-data.json
│       ├── starting-up-report.md
│       ├── tech-data.json
│       ├── tech-report.md
│       ├── main-data.json
│       ├── main-report.md
│       ├── all-categories.json
│       └── summary.md
└── twitter/
    └── DD-MMM-YYYY/      # Example: 27-Aug-2025
        ├── [keyword]-data-[timestamp].json
        ├── [keyword]-report-[timestamp].md
        ├── [keyword]-data-[timestamp].csv
        └── extraction-summary.md
```

### Date Format Standard
- **Folder Name Format:** `DD-MMM-YYYY` (e.g., `27-Aug-2025`)
- **Month Names:** Jan, Feb, Mar, Apr, May, Jun, Jul, Aug, Sep, Oct, Nov, Dec
- **Implementation:**
```javascript
function getDateFolder() {
  const date = new Date();
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                     'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dateStr = `${date.getDate()}-${monthNames[date.getMonth()]}-${date.getFullYear()}`;
  return path.join(outputBaseDir, dateStr);
}
```

---

## 📰 IndieHacker Reports

### Required Categories (as per PRD)
1. **Starting Up (AI)**: `https://www.indiehackers.com/tags/artificial-intelligence`
2. **Tech**: `https://www.indiehackers.com/tech`
3. **Main Page**: `https://www.indiehackers.com/`

### Data Extraction Requirements

#### For Each Article, Extract:
- ✅ **Title** (required)
- ✅ **Content** (full article text)
- ✅ **Author** (name and URL)
- ✅ **Published Date** (datetime and display text)
- ✅ **Comments** (full comment threads with author, text, upvotes)
- ✅ **Engagement Metrics** (upvotes, comment count)
- ✅ **Tags** (all associated tags)
- ✅ **URL** (full article URL)
- ✅ **Post ID** (extracted from URL)

#### Default Settings:
- **Articles per category:** 10 (configurable via CLI)
- **Comment extraction:** Up to 20 comments per article
- **Content limit:** 5000 characters per article

### Report File Naming Convention

```
report/indiehacker/DD-MMM-YYYY/
├── starting-up-data.json      # AI category raw data
├── starting-up-report.md       # AI category markdown report
├── tech-data.json             # Tech category raw data
├── tech-report.md             # Tech category markdown report
├── main-data.json             # Main page raw data
├── main-report.md             # Main page markdown report
├── all-categories.json        # Combined data from all categories
└── summary.md                 # Executive summary of extraction
```

### Markdown Report Structure

```markdown
# [Category Name] - IndieHackers Report

**Generated:** [Date and Time]
**Source:** [Category URL]
**Articles Extracted:** [Count]

---

## [Article Number]. [Article Title]

**Author:** [Author Name]
**Published:** [Date]
**URL:** [View Article](article_url)
**Upvotes:** [Count] | **Comments:** [Count]
**Tags:** [tag1, tag2, tag3]

### Content Summary
[First 500 characters of content]...

### Top Comments ([count])
**[Comment Author]** ([date])
> [Comment text up to 200 chars]...
👍 [upvotes] upvotes

---
```

### Script Location
- **Main Script:** `scripts/indiehacker/extract-robust.js`
- **Fallback Script:** `scripts/indiehacker/extract-optimized.js`

### Execution Command
```bash
node scripts/indiehacker/extract-robust.js [articleCount]
# Default: 10 articles per category
```

---

## 🐦 Twitter Reports

### Data Extraction Requirements

#### For Each Tweet, Extract:
- ✅ **ID** (tweet ID)
- ✅ **Text** (full tweet content)
- ✅ **Author** (display name)
- ✅ **Author Handle** (@username)
- ✅ **Timestamp** (ISO format)
- ✅ **Likes** (count)
- ✅ **Retweets** (count)
- ✅ **Impressions** (views)
- ✅ **Replies** (count)
- ✅ **URL** (direct link to tweet)
- ✅ **Hashtags** (array of tags)
- ✅ **Mentions** (array of @mentions)

### Report File Naming Convention

```
report/twitter/DD-MMM-YYYY/
├── [keyword]-data-[timestamp].json       # Raw JSON data
├── [keyword]-report-[timestamp].md       # Markdown report
├── [keyword]-data-[timestamp].csv        # CSV export
├── buildpad-complete-report.md           # Enhanced report (if applicable)
└── extraction-summary.md                 # Summary with metadata
```

**Keyword Sanitization for Filenames:**
```javascript
function sanitizeFilename(keyword) {
  return keyword
    .replace(/[^a-zA-Z0-9\s]/g, '_')
    .replace(/\s+/g, '_')
    .substring(0, 50)
    .toLowerCase();
}
```

### CSV Format Requirements

```csv
Index,Author,Handle,Timestamp,Text,URL,Likes,Retweets,Impressions,Replies,Hashtags,Mentions
1,"Author Name",handle,2025-08-27T08:00:00Z,"Tweet text",url,0,0,0,0,"tag1,tag2","@user1,@user2"
```

### Markdown Report Structure

```markdown
# Twitter Report: [Keyword]

**Generated:** [Date Time]
**Total Posts:** [Count]
**Search Type:** [latest/top/people]

## Summary Statistics
- **Total Likes:** [count]
- **Total Retweets:** [count]
- **Total Impressions:** [count]
- **Average Engagement:** [percentage]%

## Posts

### [Number]. [Author] (@handle)
**Posted:** [timestamp]
**Link:** [View on Twitter](url)

**Content:**
```
[tweet text]
```

**Engagement Metrics:**
- 👁️ Impressions: [count]
- ❤️ Likes: [count]
- 🔁 Retweets: [count]
- 💬 Replies: [count]

**Hashtags:** #tag1, #tag2
**Mentions:** @user1, @user2

---
```

### MCP Tool Usage
```javascript
// Use MCP Playwright Twitter tools
mcp__playwright__twitter_search(keyword, sortBy)
mcp__playwright__twitter_fetch_posts(maxPosts)
mcp__playwright__twitter_generate_report(keyword, format)
mcp__playwright__twitter_fetch_and_report(keyword, maxPosts, sortBy, format)
```

### Script Locations
- **Main Script:** `scripts/twitter/fetch-twitter-data.js`
- **Utilities:** `scripts/twitter/extract-tweets.js`

---

## ❌ Common Mistakes to Avoid

### DO NOT:
1. ❌ Save reports to the root `/report` folder
2. ❌ Use incorrect date format (e.g., `2025-08-27` instead of `27-Aug-2025`)
3. ❌ Forget to create date folders before saving
4. ❌ Mix reports from different dates in the same folder
5. ❌ Use spaces or special characters in folder names
6. ❌ Overwrite existing reports without timestamps
7. ❌ Extract less than the required default (10 articles/20 tweets)
8. ❌ Skip comment extraction for IndieHacker posts
9. ❌ Forget to generate both JSON and Markdown formats
10. ❌ Miss the summary file generation

### ALWAYS DO:
1. ✅ Create date-based folders first
2. ✅ Use consistent date format: `DD-MMM-YYYY`
3. ✅ Generate all required file formats (JSON, MD, CSV)
4. ✅ Include timestamps in filenames for uniqueness
5. ✅ Extract full content including comments
6. ✅ Create summary reports
7. ✅ Validate folder structure before saving
8. ✅ Handle errors gracefully with fallback options
9. ✅ Log the output directory clearly
10. ✅ Test with small batches first (2-3 items)

---

## ✅ Pre-Extraction Checklist

### Before IndieHacker Extraction:
- [ ] Verify all 3 category URLs are accessible
- [ ] Set article count (default: 10)
- [ ] Create date folder: `report/indiehacker/DD-MMM-YYYY/`
- [ ] Prepare to extract: title, content, comments, metrics
- [ ] Plan for ~30 seconds per article extraction

### Before Twitter Extraction:
- [ ] Sanitize keyword for filename
- [ ] Set maxPosts (default: 20)
- [ ] Set sortBy (latest/top/people)
- [ ] Create date folder: `report/twitter/DD-MMM-YYYY/`
- [ ] Check if MCP Playwright tools are available

### After Extraction:
- [ ] Verify all files were created
- [ ] Check JSON files are valid
- [ ] Confirm markdown formatting is correct
- [ ] Validate CSV structure (for Twitter)
- [ ] Review summary report
- [ ] Log final output directory

---

## 📝 Quick Reference Commands

### IndieHacker Full Extraction
```bash
# Default 10 articles per category
node scripts/indiehacker/extract-robust.js

# Custom article count
node scripts/indiehacker/extract-robust.js 5

# Test with 2 articles
node scripts/indiehacker/extract-robust.js 2
```

### Twitter Data Extraction
```bash
# Single keyword
node scripts/twitter/fetch-twitter-data.js "buildpad" 20 latest

# Multiple keywords with OR
node scripts/twitter/fetch-twitter-data.js "buildpad.io OR buildpad" 20 latest

# Hashtag search
node scripts/twitter/fetch-twitter-data.js "#AI #Innovation" 50 top

# User timeline
node scripts/twitter/fetch-twitter-data.js "@username" 30 latest
```

### Verify Output Structure
```bash
# Check IndieHacker reports
ls -la report/indiehacker/27-Aug-2025/

# Check Twitter reports  
ls -la report/twitter/27-Aug-2025/

# Count files in folder
ls report/indiehacker/27-Aug-2025/ | wc -l
```

---

## 🔄 Error Recovery

### If Reports Save to Wrong Location:
```bash
# Move IndieHacker reports
mv report/*.json report/indiehacker/27-Aug-2025/
mv report/*.md report/indiehacker/27-Aug-2025/

# Move Twitter reports
mv report/twitter_*.* report/twitter/27-Aug-2025/
```

### If Extraction Fails:
1. Check network connectivity
2. Verify URLs are accessible
3. Reduce article/post count
4. Try alternative script (extract-optimized.js)
5. Check for rate limiting
6. Clear browser cache/cookies
7. Restart with smaller batch

---

## 📊 Success Metrics

### IndieHacker Extraction Success:
- ✅ 3 categories extracted
- ✅ 10+ articles per category (30+ total)
- ✅ Comments included for each article
- ✅ 7 files generated minimum
- ✅ Summary report created

### Twitter Extraction Success:
- ✅ Requested number of posts fetched
- ✅ All engagement metrics captured
- ✅ 3 file formats generated (JSON, MD, CSV)
- ✅ Summary report created
- ✅ Proper date folder used

---

*Last Updated: August 27, 2025*
*Version: 1.0*