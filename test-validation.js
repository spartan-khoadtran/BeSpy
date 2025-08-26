import { DataProcessor } from './scripts/indiehacker/utils/data-processor.js';

const processor = new DataProcessor();

// Test post that should pass validation
const testPost = {
  title: "Test Post Title That Should Pass",
  author: "testuser",
  url: "/post/test-123",
  upvotes: "5",
  comments: "3",
  timestamp: "2h ago",
  content: "This is test content that should be long enough to pass validation checks.",
  category: "main"
};

console.log('Testing post validation...');
console.log('Raw post:', testPost);

// Process the post
const processed = processor.processScrapedData([testPost], 'main');
console.log('Processed posts:', processed.length);

if (processed.length > 0) {
  console.log('✅ Post passed validation!');
  console.log('Processed post:', JSON.stringify(processed[0], null, 2));
} else {
  console.log('❌ Post failed validation');
  
  // Check what's failing
  const normalized = processor.normalizePost(testPost, 'main');
  console.log('Normalized post:', JSON.stringify(normalized, null, 2));
  
  // Check validation
  const isValid = processor.isValidPost(normalized);
  console.log('Is valid?', isValid);
  console.log('Title length:', normalized.title?.length);
  console.log('Min engagement:', normalized.engagement?.comments + normalized.engagement?.upvotes);
}
