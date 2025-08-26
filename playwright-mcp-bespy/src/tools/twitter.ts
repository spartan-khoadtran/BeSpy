/**
 * Copyright (c) Microsoft Corporation.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { z } from 'zod';
import { defineTool } from './tool.js';
import { TwitterPost, TwitterReport, TwitterSearchOptions } from '../models/twitter.js';
import { ReportGenerator } from '../utils/reportGenerator.js';

const twitterSearch = defineTool({
  capability: 'core',
  
  schema: {
    name: 'twitter_search',
    title: 'Search Twitter',
    description: 'Navigate to Twitter and search for posts using a keyword',
    inputSchema: z.object({
      keyword: z.string().describe('The keyword or phrase to search for'),
      sortBy: z.enum(['latest', 'top', 'people']).optional().default('latest').describe('Sort results by latest, top, or people'),
    }),
    type: 'destructive',
  },

  handle: async (context, params, response) => {
    const tab = await context.ensureTab();
    
    // Navigate to Twitter
    const twitterUrl = 'https://twitter.com';
    await tab.navigate(twitterUrl);
    
    // Wait for page to load
    await tab.page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    
    // Check if logged in by looking for compose tweet button
    const isLoggedIn = await tab.page.locator('[data-testid="SideNav_NewTweet_Button"]').isVisible().catch(() => false);
    
    if (!isLoggedIn) {
      response.addError('Twitter session not logged in. Please log in to Twitter first.');
      return;
    }
    
    // Navigate to search
    const searchUrl = `${twitterUrl}/search?q=${encodeURIComponent(params.keyword)}&src=typed_query&f=${params.sortBy === 'latest' ? 'live' : params.sortBy}`;
    await tab.navigate(searchUrl);
    
    // Wait for search results
    await tab.page.waitForSelector('[data-testid="tweet"]', { timeout: 10000 }).catch(() => {});
    
    response.setIncludeSnapshot();
    response.addResult(`Searched Twitter for: "${params.keyword}" (sorted by ${params.sortBy})`);
  },
});

const twitterFetchPosts = defineTool({
  capability: 'core',
  
  schema: {
    name: 'twitter_fetch_posts', 
    title: 'Fetch Twitter Posts',
    description: 'Extract details from Twitter posts on the current page',
    inputSchema: z.object({
      maxPosts: z.number().optional().default(10).describe('Maximum number of posts to fetch'),
    }),
    type: 'readOnly',
  },

  handle: async (context, params, response) => {
    const tab = context.currentTabOrDie();
    
    // Extract posts data
    const posts: TwitterPost[] = await tab.page.evaluate((maxPosts) => {
      const postElements = document.querySelectorAll('[data-testid="tweet"]');
      const posts: TwitterPost[] = [];
      
      for (let i = 0; i < Math.min(postElements.length, maxPosts); i++) {
        const element = postElements[i];
        
        try {
          // Extract author info
          const authorElement = element.querySelector('[data-testid="User-Name"]');
          const authorText = authorElement?.textContent || '';
          const authorParts = authorText.split('@');
          const author = authorParts[0]?.trim() || 'Unknown';
          const authorHandle = authorParts[1]?.split('·')[0]?.trim() || 'unknown';
          
          // Extract timestamp
          const timeElement = element.querySelector('time');
          const timestamp = timeElement?.getAttribute('datetime') || new Date().toISOString();
          
          // Extract post text
          const textElement = element.querySelector('[data-testid="tweetText"]');
          const text = textElement?.textContent || '';
          
          // Extract engagement metrics
          const getMetricValue = (testId: string): number => {
            const metricElement = element.querySelector(`[data-testid="${testId}"]`);
            const metricText = metricElement?.querySelector('span')?.textContent || '0';
            
            // Convert k, M to numbers
            let value = 0;
            if (metricText.includes('K')) {
              value = parseFloat(metricText.replace('K', '')) * 1000;
            } else if (metricText.includes('M')) {
              value = parseFloat(metricText.replace('M', '')) * 1000000;
            } else {
              value = parseInt(metricText.replace(/,/g, ''), 10) || 0;
            }
            return value;
          };
          
          const likes = getMetricValue('like');
          const retweets = getMetricValue('retweet');
          const replies = getMetricValue('reply');
          
          // Estimate impressions (Twitter doesn't always show this publicly)
          const impressions = (likes + retweets * 2 + replies) * 10;
          
          // Extract hashtags and mentions
          const hashtags: string[] = [];
          const mentions: string[] = [];
          
          const linkElements = element.querySelectorAll('a');
          linkElements.forEach(link => {
            const href = link.getAttribute('href') || '';
            const text = link.textContent || '';
            
            if (text.startsWith('#')) {
              hashtags.push(text.substring(1));
            } else if (text.startsWith('@')) {
              mentions.push(text.substring(1));
            }
          });
          
          // Generate post URL
          const postLink = element.querySelector('a[href*="/status/"]');
          const url = postLink ? `https://twitter.com${postLink.getAttribute('href')}` : '';
          
          // Generate unique ID from URL
          const id = url.split('/status/')[1] || `post_${i}`;
          
          posts.push({
            id,
            text,
            author,
            authorHandle,
            timestamp,
            likes,
            retweets,
            impressions,
            replies,
            url,
            hashtags: [...new Set(hashtags)],
            mentions: [...new Set(mentions)],
          });
        } catch (error) {
          console.error('Error extracting post:', error);
        }
      }
      
      return posts;
    }, params.maxPosts);
    
    response.addResult(`Fetched ${posts.length} posts from Twitter`);
    response.addCode(`// Extracted posts data\nconst posts = ${JSON.stringify(posts, null, 2)};`);
    
    // Store in global for report generation (temporary storage)
    (global as any).__twitter_posts = posts;
  },
});

const twitterGenerateReport = defineTool({
  capability: 'core',
  
  schema: {
    name: 'twitter_generate_report',
    title: 'Generate Twitter Report',
    description: 'Generate a report from fetched Twitter posts',
    inputSchema: z.object({
      keyword: z.string().describe('The search keyword used'),
      format: z.enum(['markdown', 'csv', 'both']).optional().default('both').describe('Report format'),
    }),
    type: 'readOnly',
  },

  handle: async (context, params, response) => {
    const posts = (global as any).__twitter_posts as TwitterPost[] | undefined;
    
    if (!posts || posts.length === 0) {
      response.addError('No posts found. Please fetch posts first using twitter_fetch_posts.');
      return;
    }
    
    // Calculate summary statistics
    const totalLikes = posts.reduce((sum, post) => sum + post.likes, 0);
    const totalRetweets = posts.reduce((sum, post) => sum + post.retweets, 0);
    const totalImpressions = posts.reduce((sum, post) => sum + post.impressions, 0);
    
    const totalEngagement = posts.reduce((sum, post) => sum + post.likes + post.retweets + post.replies, 0);
    const averageEngagement = totalImpressions > 0 ? (totalEngagement / totalImpressions) * 100 : 0;
    
    // Find top author
    const authorCounts = posts.reduce((acc, post) => {
      acc[post.author] = (acc[post.author] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const topAuthor = Object.entries(authorCounts).sort(([, a], [, b]) => b - a)[0]?.[0] || 'N/A';
    
    // Create report
    const report: TwitterReport = {
      keyword: params.keyword,
      fetchedAt: new Date().toISOString(),
      totalPosts: posts.length,
      posts: posts,
      summary: {
        totalLikes,
        totalRetweets,
        totalImpressions,
        averageEngagement,
        topAuthor,
      },
    };
    
    // Generate and save report
    const generator = new ReportGenerator();
    const savedFiles = await generator.saveReport(report, params.format);
    
    let resultMessage = 'Report generated successfully!\n';
    if (savedFiles.markdown) {
      resultMessage += `Markdown report saved to: ${savedFiles.markdown}\n`;
    }
    if (savedFiles.csv) {
      resultMessage += `CSV report saved to: ${savedFiles.csv}\n`;
    }
    
    // Add summary to response
    resultMessage += '\n**Summary:**\n';
    resultMessage += `- Total Posts: ${report.totalPosts}\n`;
    resultMessage += `- Total Likes: ${report.summary.totalLikes.toLocaleString()}\n`;
    resultMessage += `- Total Retweets: ${report.summary.totalRetweets.toLocaleString()}\n`;
    resultMessage += `- Average Engagement: ${report.summary.averageEngagement.toFixed(2)}%\n`;
    resultMessage += `- Top Author: ${report.summary.topAuthor}`;
    
    response.addResult(resultMessage);
  },
});

const twitterFetchAndReport = defineTool({
  capability: 'core',
  
  schema: {
    name: 'twitter_fetch_and_report',
    title: 'Fetch Twitter Data and Generate Report',
    description: 'Complete workflow: search Twitter, fetch posts, and generate report',
    inputSchema: z.object({
      keyword: z.string().describe('The keyword or phrase to search for'),
      maxPosts: z.number().optional().default(10).describe('Maximum number of posts to fetch'),
      sortBy: z.enum(['latest', 'top']).optional().default('latest').describe('Sort results by latest or top'),
      format: z.enum(['markdown', 'csv', 'both']).optional().default('both').describe('Report format'),
    }),
    type: 'destructive',
  },

  handle: async (context, params, response) => {
    try {
      let statusMessage = '';
      
      // Step 1: Search Twitter
      statusMessage += `Step 1: Searching Twitter for "${params.keyword}"...\n`;
      await twitterSearch.handle(context, { keyword: params.keyword, sortBy: params.sortBy }, response);
      
      // Wait for results to load
      const tab = context.currentTabOrDie();
      await tab.page.waitForTimeout(3000);
      
      // Step 2: Fetch posts
      statusMessage += `Step 2: Fetching ${params.maxPosts} posts...\n`;
      await twitterFetchPosts.handle(context, { maxPosts: params.maxPosts }, response);
      
      // Step 3: Generate report
      statusMessage += `Step 3: Generating report...\n`;
      await twitterGenerateReport.handle(context, { keyword: params.keyword, format: params.format }, response);
      
      statusMessage += `\n✅ Twitter data fetch and report generation completed successfully!`;
      response.addResult(statusMessage);
    } catch (error) {
      response.addError(`Error during Twitter data fetch: ${error}`);
    }
  },
});

export const twitterTools = [
  twitterSearch,
  twitterFetchPosts,
  twitterGenerateReport,
  twitterFetchAndReport,
];