PRD: Twitter Data Fetch & Report Generation with Claude CLI + Playwright MCP

1. Title

Twitter Data Collector & Report Generator

⸻

2. Objective (Why we need this)

We want to enable Claude CLI to take a keyword or sentence as input, then use Playwright MCP to:
	•	Open Twitter (already logged in).
	•	Fetch the 10 latest posts related to that keyword.
	•	Extract detailed post information (post text, owner, impressions, likes, retweets, timestamp, etc.).
	•	Generate a report file in the report/ folder summarizing the data.

This system allows automated data collection and analysis from Twitter without manual browsing, saving time and enabling AI-driven insights.

⸻

3. Success Criteria
	•	User can run:
    claude 
    then tell claude that fetch 10 latest post


	•	Playwright MCP opens Twitter successfully (using existing login session).
	•	System collects 10 latest posts related to the keyword.
	•	Extracts post details: text, author, timestamp, engagement metrics (likes, retweets, impressions).
	•	Generates a report.md (or CSV) in report/ folder.
	•	Output report includes summary + post details.
4. Scope

✅ Included:
	•	Integrate Claude CLI with Playwright MCP.
	•	Twitter search automation.
	•	Data extraction for 10 posts.
	•	Report generation in Markdown or CSV.

❌ Not included:
	•	Advanced analytics (e.g., sentiment analysis).
	•	Real-time streaming.
	•	Multi-keyword batch processing.

⸻

5. Task Breakdown

Status: In Progress
- [ ] Connect Claude CLI to Playwright MCP server
- [ ] Implement Twitter search automation with Playwright
- [ ] You can use Playwrite to open chromium but let user login for the first time then you can manage that account
- [ ] Extract 10 latest posts with details:
      - Post text
      - Author
      - Timestamp
      - Likes, Retweets, Impressions
- [ ] Create report structure (Markdown & CSV)
- [ ] Save report in `report/` folder with timestamped filename
- [ ] Test with 3 sample keywords

7. Notes
	•	Use Playwright MCP accessibility tree for scraping (avoid pixel-based automation).
	•	Ensure Twitter rate limits are respected.
	•	Reports should be easy to parse for future analytics.