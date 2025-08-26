# Twitter Data Fetcher - System Architecture

## Overview
A Playwright MCP-based Twitter data collection system that fetches posts based on keywords and generates reports.

## Architecture Components

### 1. MCP Tool Layer (`src/tools/twitter.ts`)
- **Purpose**: Define Twitter-specific browser automation tools
- **Components**:
  - `twitter_search`: Navigate and search Twitter
  - `twitter_fetch_posts`: Extract post data
  - `twitter_generate_report`: Generate reports

### 2. Data Models (`src/models/twitter.ts`)
```typescript
interface TwitterPost {
  id: string;
  text: string;
  author: string;
  authorHandle: string;
  timestamp: string;
  likes: number;
  retweets: number;
  impressions: number;
  replies: number;
  url: string;
}

interface TwitterReport {
  keyword: string;
  fetchedAt: string;
  totalPosts: number;
  posts: TwitterPost[];
}
```

### 3. Report Generator (`src/utils/reportGenerator.ts`)
- Markdown format generation
- CSV export capability
- Timestamped filenames
- Summary statistics

### 4. MCP Server Configuration
```json
{
  "mcpServers": {
    "playwright-bespy": {
      "command": "node",
      "args": ["./playwright-mcp-bespy/cli.js"],
      "type": "stdio"
    }
  }
}
```

## Data Flow

1. **User Input** → CLI command with keyword
2. **MCP Tool Invocation** → Browser automation
3. **Twitter Navigation** → Search page
4. **Data Extraction** → Parse DOM elements
5. **Report Generation** → MD/CSV files
6. **Output** → Save to `report/` folder

## Implementation Plan

### Phase 1: Core Infrastructure
- [ ] Update MCP configuration
- [ ] Create Twitter tool module
- [ ] Define data models

### Phase 2: Browser Automation
- [ ] Implement Twitter navigation
- [ ] Add search functionality
- [ ] Extract post elements

### Phase 3: Data Extraction
- [ ] Parse post text and metadata
- [ ] Handle engagement metrics
- [ ] Capture timestamps

### Phase 4: Report Generation
- [ ] Create Markdown formatter
- [ ] Add CSV export
- [ ] Implement file saving

### Phase 5: Testing & Validation
- [ ] Unit tests for extractors
- [ ] Integration tests with sample data
- [ ] Rate limiting implementation

## Error Handling Strategy

1. **Network Errors**: Retry with exponential backoff
2. **Rate Limiting**: Pause and resume
3. **DOM Changes**: Fallback selectors
4. **Authentication**: Check session validity

## Security Considerations

- No credentials stored in code
- Use existing browser session
- Respect Twitter ToS
- Rate limit compliance