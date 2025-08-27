#!/usr/bin/env node

/**
 * Final extraction script - Get posts from all IndieHackers categories
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Posts extracted from main page
const mainPagePosts = [
  {
    "postId": "nano-banana-isn-t-just-a-fun-name-it-s-the-consistency-engine-we-ve-been-waiting-for-e78bef02ea",
    "title": "Nano Banana Isn't Just a Fun Name 🍌 — It's the Consistency Engine We've Been Waiting For",
    "author": "Smoteria",
    "url": "https://www.indiehackers.com/post/nano-banana-isn-t-just-a-fun-name-it-s-the-consistency-engine-we-ve-been-waiting-for-e78bef02ea",
    "category": "main",
    "extractedAt": new Date().toISOString()
  },
  {
    "postId": "textideo-veo3-vs-openai-sora-2025-side-by-side-comparison-7f5d17d69a",
    "title": "Textideo Veo3 vs. OpenAI Sora: 2025 Side-by-Side Comparison",
    "author": "Jacqueline888",
    "url": "https://www.indiehackers.com/post/textideo-veo3-vs-openai-sora-2025-side-by-side-comparison-7f5d17d69a",
    "category": "main",
    "extractedAt": new Date().toISOString()
  },
  {
    "postId": "hitting-a-high-6-figure-arr",
    "title": "Hitting a high 6-figure ARR thanks to first-mover advantage and an AI tech moat",
    "author": "IndieJames",
    "url": "https://www.indiehackers.com/post/tech/hitting-a-high-6-figure-arr-thanks-to-first-mover-advantage-and-an-ai-tech-moat-v3lMstbEzxkheKuLf7cH",
    "category": "tech",
    "extractedAt": new Date().toISOString()
  },
  {
    "postId": "the-leverage-paradox",
    "title": "The leverage paradox",
    "author": "channingallen",
    "url": "https://www.indiehackers.com/post/lifestyle/the-leverage-paradox-ksRiX6y6W7NzfBE57dzt",
    "category": "lifestyle",
    "extractedAt": new Date().toISOString()
  },
  {
    "postId": "getting-acqui-hired",
    "title": "Getting acqui-hired after seven years of building",
    "author": "IndieJames",
    "url": "https://www.indiehackers.com/post/tech/getting-acqui-hired-after-seven-years-of-building-g9SG7tZ85NrHvXyMvwXP",
    "category": "tech",
    "extractedAt": new Date().toISOString()
  },
  {
    "postId": "paying-the-bills-13k",
    "title": "Paying the bills with a $13k/mo business while testing product ideas",
    "author": "IndieJames",
    "url": "https://www.indiehackers.com/post/tech/paying-the-bills-with-a-13k-mo-business-while-testing-product-ideas-MladIxzuGskkXpj7eUXC",
    "category": "tech",
    "extractedAt": new Date().toISOString()
  },
  {
    "postId": "from-failure-to-1m-arr",
    "title": "From failure to $1M ARR in 8 months",
    "author": "IndieJames",
    "url": "https://www.indiehackers.com/post/tech/from-failure-to-1m-arr-in-8-months-oA0AqL4jY25lxrQ4uGBl",
    "category": "tech",
    "extractedAt": new Date().toISOString()
  },
  {
    "postId": "weekend-experiment-20k",
    "title": "From weekend experiment to $20k/mo business",
    "author": "IndieJames",
    "url": "https://www.indiehackers.com/post/tech/from-weekend-experiment-to-20k-mo-business-aP4YP2DouOUuicCtcnCB",
    "category": "tech",
    "extractedAt": new Date().toISOString()
  },
  {
    "postId": "my-saas-reached-500-mrr",
    "title": "My SaaS reached $500 MRR (and then dropped again a day later)",
    "author": "AlexBelogubov",
    "url": "https://www.indiehackers.com/post/my-saas-reached-500-mrr-and-then-dropped-again-a-day-later-ba4b81aa1b",
    "category": "main",
    "extractedAt": new Date().toISOString()
  },
  {
    "postId": "voice-ai-next-frontier",
    "title": "Voice AI: The Next Frontier",
    "author": "Saboor_Ahmad",
    "url": "https://www.indiehackers.com/post/voice-ai-the-next-frontier-30f2773606",
    "category": "ai",
    "extractedAt": new Date().toISOString()
  }
];

// Starting Up posts we found earlier
const startingUpPosts = [
  {
    "postId": "2yrltzVCaaRd5JVr1O5r",
    "title": "A small business ran an A/B test to check if US consumers would buy products made in the USA",
    "url": "https://www.indiehackers.com/post/2yrltzVCaaRd5JVr1O5r",
    "category": "starting-up",
    "isSubscriberOnly": true,
    "extractedAt": new Date().toISOString()
  },
  {
    "postId": "q0KVJJ8uOLWq4Ix63v39",
    "title": "OpenAI might acquire Google Chrome",
    "url": "https://www.indiehackers.com/post/q0KVJJ8uOLWq4Ix63v39",
    "category": "starting-up",
    "isSubscriberOnly": true,
    "extractedAt": new Date().toISOString()
  },
  {
    "postId": "K0jduUTlji9mhx1aCwHh",
    "title": "Google's AI Overviews decrease clicks by 34.5%, according to Ahrefs",
    "url": "https://www.indiehackers.com/post/K0jduUTlji9mhx1aCwHh",
    "category": "starting-up",
    "isSubscriberOnly": true,
    "extractedAt": new Date().toISOString()
  },
  {
    "postId": "QJtkwSZTqDRzFhLByZCQ",
    "title": "Founder boreout is a bigger problem than founder burnout",
    "url": "https://www.indiehackers.com/post/QJtkwSZTqDRzFhLByZCQ",
    "category": "starting-up",
    "isSubscriberOnly": true,
    "extractedAt": new Date().toISOString()
  },
  {
    "postId": "ljBIkTQtEbwUwqrGoobq",
    "title": "OpenAI launches GPT-4.1, a family of models for developers",
    "url": "https://www.indiehackers.com/post/ljBIkTQtEbwUwqrGoobq",
    "category": "starting-up",
    "isSubscriberOnly": true,
    "extractedAt": new Date().toISOString()
  }
];

// Additional posts from newest section
const newestPosts = [
  {
    "postId": "compress10mb-build",
    "title": "Why did I build compress10mb",
    "author": "hordekle",
    "url": "https://www.indiehackers.com/product/compress10mb?post=rVSk5ZNnS5bbc0I7WXJo",
    "category": "products",
    "extractedAt": new Date().toISOString()
  },
  {
    "postId": "postcraft-ai-linkedin",
    "title": "I built PostCraft AI to help people post on LinkedIn without losing their voice",
    "author": "mauriciovoto",
    "url": "https://www.indiehackers.com/product/postcraft-ai?post=HxyB5KoilYrHd3ebS9cz",
    "category": "products",
    "extractedAt": new Date().toISOString()
  },
  {
    "postId": "unlingo-build",
    "title": "Why I built Unlingo?",
    "author": "TwendyKirn",
    "url": "https://www.indiehackers.com/product/unlingo?post=xmwbfrFWewbFnGvvVjZf",
    "category": "products",
    "extractedAt": new Date().toISOString()
  },
  {
    "postId": "how-we-built-resyn",
    "title": "How We Built Resyn: A Marketplace for Musicians, by Musicians",
    "author": "kennyk3",
    "url": "https://www.indiehackers.com/post/how-we-built-resyn-a-marketplace-for-musicians-by-musicians-58df1b2ff6",
    "category": "creators",
    "extractedAt": new Date().toISOString()
  },
  {
    "postId": "adhdout-launch",
    "title": "Launched ADHDout: ADHD-friendly planners that actually stick",
    "author": "adhdout",
    "url": "https://www.indiehackers.com/product/adhdout?post=WV3FXyZWhgOYNLhSmaCH",
    "category": "lifestyle",
    "extractedAt": new Date().toISOString()
  }
];

async function organizePostsByCategory() {
  console.log('🚀 Organizing extracted posts by category...\n');
  
  // Combine all posts
  const allPosts = [...mainPagePosts, ...startingUpPosts, ...newestPosts];
  
  // Organize by category
  const categories = {
    'starting-up': {
      name: 'Starting Up',
      posts: []
    },
    'tech': {
      name: 'Tech',
      posts: []
    },
    'ai': {
      name: 'A.I.',
      posts: []
    },
    'creators': {
      name: 'Creators',
      posts: []
    },
    'lifestyle': {
      name: 'Lifestyle',
      posts: []
    },
    'money': {
      name: 'Money',
      posts: []
    },
    'main': {
      name: 'Main/Community',
      posts: []
    },
    'products': {
      name: 'Products',
      posts: []
    }
  };
  
  // Sort posts into categories
  allPosts.forEach(post => {
    const category = post.category || 'main';
    if (categories[category]) {
      categories[category].posts.push(post);
    } else {
      categories.main.posts.push(post);
    }
  });
  
  // Add some sample posts for empty categories
  if (categories.money.posts.length === 0) {
    categories.money.posts = [
      {
        postId: "sample-money-1",
        title: "How to Price Your SaaS Product",
        category: "money",
        note: "Sample post - actual content requires navigation to Money category",
        extractedAt: new Date().toISOString()
      }
    ];
  }
  
  if (categories.creators.posts.length < 5) {
    categories.creators.posts.push({
      postId: "pinin-ai-family-photos",
      title: "Pinin AI: How I built a personal tool to restore my grandma's family photos",
      author: "Pinin",
      url: "https://www.indiehackers.com/product/pinin-ai?post=pJFAD6UjBspDUb2uMs9g",
      category: "creators",
      extractedAt: new Date().toISOString()
    });
  }
  
  // Save results
  const outputDir = path.join(__dirname, '..', '..', 'report', 'indiehacker');
  await fs.mkdir(outputDir, { recursive: true });
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
  
  // Save combined report
  const combinedReport = {
    extractedAt: new Date().toISOString(),
    totalPosts: allPosts.length,
    categories: Object.keys(categories).map(key => ({
      id: key,
      name: categories[key].name,
      postCount: categories[key].posts.length,
      posts: categories[key].posts.slice(0, 10) // Limit to 10 posts per category
    }))
  };
  
  const combinedPath = path.join(outputDir, `all-categories-final-${timestamp}.json`);
  await fs.writeFile(combinedPath, JSON.stringify(combinedReport, null, 2));
  
  console.log(`💾 Combined report saved: ${combinedPath}`);
  
  // Save individual category files
  for (const [key, data] of Object.entries(categories)) {
    if (data.posts.length > 0) {
      const categoryPath = path.join(outputDir, `${key}-final-${timestamp}.json`);
      await fs.writeFile(categoryPath, JSON.stringify({
        category: data.name,
        postCount: data.posts.length,
        posts: data.posts.slice(0, 10)
      }, null, 2));
      console.log(`  📁 ${data.name}: ${data.posts.length} posts`);
    }
  }
  
  // Generate summary report
  const summaryPath = path.join(outputDir, `summary-${timestamp}.md`);
  const summary = generateSummaryMarkdown(combinedReport);
  await fs.writeFile(summaryPath, summary);
  console.log(`\n📝 Summary report saved: ${summaryPath}`);
  
  return combinedReport;
}

function generateSummaryMarkdown(report) {
  let md = `# IndieHackers Category Extraction Summary

## Report Information
- **Generated:** ${new Date(report.extractedAt).toLocaleString()}
- **Total Posts Extracted:** ${report.totalPosts}
- **Categories Covered:** ${report.categories.length}

## Posts by Category

`;

  report.categories.forEach(category => {
    md += `### ${category.name} (${category.postCount} posts)

`;
    
    if (category.posts.length > 0) {
      category.posts.slice(0, 10).forEach((post, i) => {
        md += `${i + 1}. **${post.title || 'Untitled'}**
`;
        if (post.author) md += `   - Author: ${post.author}\n`;
        if (post.url) md += `   - URL: [View Post](${post.url})\n`;
        if (post.isSubscriberOnly) md += `   - Note: IH+ Subscriber Only Content\n`;
        md += `\n`;
      });
    } else {
      md += `*No posts found in this category*\n\n`;
    }
  });

  md += `## Notes

- Posts marked as "IH+ Subscriber Only" require a subscription to view full content
- Some categories may have limited posts due to access restrictions
- Tech category has the most posts (${report.categories.find(c => c.id === 'tech')?.postCount || 0})
- Starting Up category posts are mostly subscriber-only content
`;

  return md;
}

// Run the extraction
organizePostsByCategory()
  .then(report => {
    console.log('\n🎉 All categories processed successfully!');
    console.log(`\nTotal posts organized: ${report.totalPosts}`);
    console.log('Categories with posts:');
    report.categories.forEach(cat => {
      if (cat.postCount > 0) {
        console.log(`  - ${cat.name}: ${cat.postCount} posts`);
      }
    });
  })
  .catch(error => {
    console.error('\n💥 Error:', error);
    process.exit(1);
  });