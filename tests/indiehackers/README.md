# IndieHackers Scraper Test Suite

This comprehensive test suite validates the IndieHackers scraper functionality, ensuring reliable data extraction, processing, and report generation according to the Product Requirements Document (PRD).

## Test Structure

```
tests/indiehackers/
├── unit/                    # Unit tests for individual functions
│   ├── scraper-functions.test.js      # Core scraping logic
│   ├── engagement-scoring.test.js     # Prioritization algorithm
│   └── duplicate-detection.test.js    # Content processing
├── integration/             # End-to-end workflow tests
│   ├── end-to-end-workflow.test.js    # Complete pipeline
│   ├── cli-integration.test.js        # Command-line interface
│   ├── data-validation.test.js        # Report structure validation
│   ├── performance-reliability.test.js # Performance & reliability
│   └── error-handling.test.js         # Error scenarios
├── fixtures/               # Test data and samples
│   └── sample-posts.json   # Mock IndieHackers posts
├── mocks/                  # Mock implementations
│   └── mock-scraper.js     # Mock scraper for consistent testing
└── utils/                  # Test utilities
    └── indiehackers-test-utils.js    # Specialized test helpers
```

## Test Categories

### 1. Unit Tests

**Purpose**: Test individual functions and components in isolation.

#### `scraper-functions.test.js`
- **Category Scraping**: Tests scraping of each IndieHackers category
- **Data Extraction**: Validates extraction of post titles, authors, engagement metrics
- **URL Validation**: Ensures proper IndieHackers URL format validation
- **Data Validation**: Tests post structure validation logic
- **Error Handling**: Tests graceful handling of malformed data
- **Performance**: Basic performance validation for single operations

**Key Test Cases**:
- ✅ Should scrape starting-up category successfully
- ✅ Should extract author information correctly
- ✅ Should validate IndieHackers URLs
- ✅ Should detect missing required fields
- ✅ Should handle malformed data gracefully

#### `engagement-scoring.test.js`
- **Score Calculation**: Tests the engagement scoring algorithm
- **Post Prioritization**: Validates sorting by engagement score
- **Edge Cases**: Tests with zero, negative, and extreme values
- **Consistency**: Ensures consistent scoring across multiple runs
- **Performance**: Tests scoring performance with large datasets

**Scoring Algorithm** (per PRD):
```javascript
engagementScore = (comments × 3) + (upvotes × 2) + (views × 0.1)
```

**Key Test Cases**:
- ✅ Should prioritize comments over upvotes
- ✅ Should calculate scores correctly for known inputs
- ✅ Should handle missing engagement data gracefully
- ✅ Should sort posts by engagement score accurately
- ✅ Should maintain consistent scores for identical input

#### `duplicate-detection.test.js`
- **Exact Duplicates**: Tests removal of posts with same title and author
- **Cross-Category**: Validates deduplication across different categories
- **Edge Cases**: Tests with special characters, long titles
- **Performance**: Tests deduplication performance with large datasets
- **Data Integrity**: Ensures original data is preserved during deduplication

**Key Test Cases**:
- ✅ Should remove exact duplicates based on title and author
- ✅ Should keep posts with same title but different authors
- ✅ Should handle cross-category duplicates
- ✅ Should preserve post order when removing duplicates
- ✅ Should handle large datasets efficiently

### 2. Integration Tests

**Purpose**: Test complete workflows and system interactions.

#### `end-to-end-workflow.test.js`
- **Complete Pipeline**: Tests full scraping → processing → report generation
- **Mixed Scenarios**: Tests handling of partial failures
- **Data Flow**: Validates data integrity throughout the pipeline
- **Category Processing**: Tests individual category workflows
- **Report Generation**: Validates complete report creation

**Workflow Steps**:
1. Scrape all categories
2. Process and score posts
3. Remove duplicates
4. Analyze trends
5. Generate final report

#### `cli-integration.test.js`
- **Parameter Validation**: Tests command-line parameter parsing
- **Execution Flow**: Tests CLI execution with various parameters
- **Error Handling**: Tests CLI error scenarios
- **Output Validation**: Validates generated file structure

**CLI Parameters**:
- `--date`: Date in YYYY-MM-DD format (default: today)
- `--categories`: Comma-separated categories or "all"
- `--output`: Custom output directory

#### `data-validation.test.js`
- **Report Structure**: Validates report matches PRD template
- **Markdown Format**: Tests generated markdown compliance
- **Data Types**: Validates all data types and formats
- **Completeness**: Ensures all required data points are captured
- **Quality**: Tests engagement prioritization and trend analysis accuracy

**Required Report Sections**:
- Executive Summary
- Top Posts (Ranked by Engagement)
- Category Breakdown  
- Trending Themes

#### `performance-reliability.test.js`
- **Performance Benchmarks**: Tests completion time limits
- **Rate Limiting**: Tests respectful scraping with delays
- **Concurrent Processing**: Tests parallel category processing
- **Memory Efficiency**: Validates memory usage during processing
- **Scalability**: Tests performance with increasing data loads
- **Data Backup**: Tests backup and recovery mechanisms

**Performance Targets**:
- Single category: < 2 seconds
- All categories: < 30 seconds  
- Large datasets (1000 posts): < 5 seconds processing
- Memory usage: < 100MB increase per operation

#### `error-handling.test.js`
- **Network Errors**: Tests timeout, connection failures, HTTP errors
- **Data Parsing**: Tests malformed HTML, JSON parsing errors
- **Rate Limiting**: Tests 429 responses and retry logic
- **Resource Management**: Tests memory limits, resource cleanup
- **Data Recovery**: Tests recovery from corrupted data
- **Transaction Safety**: Tests rollback on failures

### 3. Test Data and Utilities

#### `fixtures/sample-posts.json`
Contains realistic sample data matching IndieHackers post structure:
- 5 sample posts across different categories
- Category metadata and URL mappings
- Mock error scenarios for testing

#### `mocks/mock-scraper.js`
Provides controlled mock implementation:
- **Consistent Data**: Returns predictable test data
- **Configurable Failures**: Simulates various error scenarios
- **Performance Testing**: Supports timing and latency simulation
- **Rate Limiting**: Simulates throttling and backoff

#### `utils/indiehackers-test-utils.js`
Specialized utilities for IndieHackers testing:
- **Validation Functions**: Post structure, engagement metrics, report format
- **CLI Testing**: Parameter parsing and validation
- **HTML Generation**: Mock HTML for scraper testing
- **Performance Testing**: Test data generation and metrics
- **Format Validation**: URL, timestamp, markdown validation

## Running Tests

### Prerequisites
```bash
npm install
```

### Full Test Suite
```bash
npm test
```

### Specific Test Categories
```bash
# Unit tests only
npm test -- --testPathPattern=unit

# Integration tests only
npm test -- --testPathPattern=integration

# Specific test file
npm test -- --testPathPattern=engagement-scoring

# With coverage
npm test -- --coverage
```

### Watch Mode (for development)
```bash
npm test -- --watch
```

## Test Configuration

### Jest Configuration (`jest.config.js`)
- **Environment**: Node.js
- **Timeout**: 300 seconds for integration tests
- **Coverage**: 75% minimum across all metrics
- **Reporters**: HTML, console, JUnit XML
- **Setup**: Global test utilities and cleanup

### Coverage Requirements
- **Statements**: >75%
- **Branches**: >70% 
- **Functions**: >75%
- **Lines**: >75%

## Mock Data Structure

### Sample Post Format
```json
{
  "id": "post-1",
  "title": "How I Built a $50k MRR SaaS in 12 Months",
  "url": "https://www.indiehackers.com/post/example",
  "author": {
    "username": "saasfounder",
    "display_name": "Sarah Johnson",
    "profile_url": "https://www.indiehackers.com/@saasfounder"
  },
  "category": "starting-up",
  "engagement": {
    "upvotes": 145,
    "comments": 32,
    "views": 2500
  },
  "timestamp": "2025-08-26T10:30:00Z",
  "content_preview": "After years of corporate life...",
  "tags": ["saas", "entrepreneurship", "growth"],
  "engagement_score": 177
}
```

### Report Structure Validation
```json
{
  "metadata": {
    "generated_at": "2025-08-26T12:00:00Z",
    "total_posts": 25,
    "categories_scraped": 5,
    "scraper_version": "1.0.0"
  },
  "summary": {
    "total_posts_analyzed": 25,
    "top_engagement_category": "starting-up", 
    "trending_topics": ["AI", "SaaS", "Growth"]
  },
  "top_posts": [...],
  "category_breakdown": {...},
  "trending_themes": {...}
}
```

## Test Best Practices

### 1. Test Isolation
- Each test is independent and can run in any order
- Mock data is reset between tests
- No shared state between test cases

### 2. Realistic Scenarios
- Tests use realistic IndieHackers data
- Error scenarios mirror actual failure modes
- Performance tests use representative data sizes

### 3. Clear Assertions
- Tests have descriptive names explaining what they validate
- Assertions include meaningful error messages
- Edge cases are explicitly tested

### 4. Performance Awareness
- Tests include performance benchmarks
- Memory usage is monitored and validated
- Scalability is tested with varying data sizes

## Continuous Integration

### GitHub Actions Integration
```yaml
- name: Run Tests
  run: |
    npm test
    npm run test:integration
    npm run test:performance
```

### Pre-commit Hooks
- Run unit tests on changed files
- Validate test coverage requirements
- Check test naming conventions

## Troubleshooting

### Common Issues

1. **Test Timeouts**
   - Increase timeout in Jest configuration
   - Check for infinite loops or hanging promises
   - Verify mock data is not too large

2. **Memory Issues**
   - Reduce test data size
   - Ensure proper cleanup in afterEach hooks
   - Check for memory leaks in test code

3. **Flaky Tests**
   - Add proper waits for asynchronous operations
   - Use deterministic mock data
   - Avoid race conditions in concurrent tests

### Debug Mode
```bash
# Run with debug output
DEBUG=* npm test

# Run specific test with verbose output
npm test -- --verbose --testNamePattern="should calculate engagement score"
```

## Contributing

### Adding New Tests
1. Follow the existing file naming conventions
2. Add comprehensive test cases for new functionality
3. Update this README with new test descriptions
4. Ensure coverage requirements are met

### Test Data Updates
- Keep sample data realistic and representative
- Update fixtures when scraper logic changes
- Maintain backward compatibility where possible

### Performance Benchmarks
- Add performance tests for new major features
- Update performance targets as system improves
- Monitor for performance regressions

## Metrics and Reporting

### Test Execution Metrics
- Total test count and execution time
- Coverage percentages by category
- Performance benchmark results
- Error rate and failure analysis

### Quality Gates
- All tests must pass before deployment
- Coverage must meet minimum thresholds
- Performance tests must complete within targets
- No critical security vulnerabilities in test dependencies

This comprehensive test suite ensures the IndieHackers scraper meets all PRD requirements while maintaining high reliability, performance, and data quality standards.