# 🚀 Quick Reference Guide - Report Generation

## 📁 CRITICAL: Folder Structure

```
✅ CORRECT:
report/indiehacker/27-Aug-2025/[files]
report/twitter/27-Aug-2025/[files]

❌ WRONG:
report/[files]                    # NO! Missing date folder
report/indiehacker/2025-08-27/    # NO! Wrong date format
report/twitter_data.json          # NO! Not in date folder
```

## 🔥 One-Line Commands

### IndieHacker
```bash
# Full extraction (10 articles per category)
node scripts/indiehacker/extract-robust.js

# Quick test (2 articles per category)
node scripts/indiehacker/extract-robust.js 2
```

### Twitter
```bash
# Standard extraction
node scripts/twitter/fetch-twitter-data.js "keyword" 20 latest

# Then use MCP tool:
mcp__playwright__twitter_fetch_and_report
```

## 📋 Must-Have Files

### IndieHacker (Minimum 7 files)
```
✅ starting-up-data.json
✅ starting-up-report.md
✅ tech-data.json
✅ tech-report.md
✅ main-data.json
✅ main-report.md
✅ all-categories.json
✅ summary.md
```

### Twitter (Minimum 4 files)
```
✅ [keyword]-data-[timestamp].json
✅ [keyword]-report-[timestamp].md
✅ [keyword]-data-[timestamp].csv
✅ extraction-summary.md
```

## 🎯 Default Settings

| Platform | Articles/Posts | Categories/Sort | Timeout |
|----------|---------------|-----------------|---------|
| IndieHacker | 10 per category | 3 categories | 30s/article |
| Twitter | 20 posts | latest | N/A |

## ⚡ Date Format Helper

```javascript
// ALWAYS use this format
const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                   'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const dateStr = `${date.getDate()}-${monthNames[date.getMonth()]}-${date.getFullYear()}`;
// Result: "27-Aug-2025"
```

## 🔴 Red Flags - Stop If You See:

1. Files saving to `/report/` root
2. Date format like `2025-08-27`
3. Missing comments in IndieHacker data
4. No CSV file for Twitter
5. Less than 7 files for IndieHacker
6. Less than 4 files for Twitter

## ✅ Success Checklist

### Before Starting:
- [ ] Create date folder first
- [ ] Verify URLs are working
- [ ] Set extraction count

### After Completion:
- [ ] All files in `DD-MMM-YYYY` folder
- [ ] JSON files are valid
- [ ] Markdown files readable
- [ ] Summary file exists
- [ ] Path logged clearly

## 🆘 Emergency Fixes

```bash
# Wrong folder? Move files:
mv report/*.* report/indiehacker/27-Aug-2025/
mv report/twitter_*.* report/twitter/27-Aug-2025/

# Check what was created:
ls -la report/*/27-Aug-2025/

# Verify JSON is valid:
cat report/indiehacker/27-Aug-2025/all-categories.json | jq . > /dev/null && echo "Valid JSON"
```

## 📊 Extraction Counts

| What | Default | Test | Maximum |
|------|---------|------|---------|
| IndieHacker/category | 10 | 2-3 | 50 |
| Twitter search | 20 | 5-10 | 100 |
| Comments/article | 20 | 5 | All |

## 🎨 File Naming Rules

### IndieHacker
- Category files: `[category-name]-data.json`, `[category-name]-report.md`
- Combined: `all-categories.json`
- Summary: `summary.md`

### Twitter  
- Sanitize keyword: `buildpad.io OR buildpad` → `buildpad_io_or_buildpad`
- Add timestamp: `[keyword]-data-2025-08-27T15-30-00.json`
- Always lowercase

---

**Golden Rule:** When in doubt, check the date folder structure FIRST!