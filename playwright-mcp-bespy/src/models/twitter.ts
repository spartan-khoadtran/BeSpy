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

export interface TwitterPost {
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
  hashtags: string[];
  mentions: string[];
}

export interface TwitterReport {
  keyword: string;
  fetchedAt: string;
  totalPosts: number;
  posts: TwitterPost[];
  summary: {
    totalLikes: number;
    totalRetweets: number;
    totalImpressions: number;
    averageEngagement: number;
    topAuthor: string;
  };
}

export interface TwitterSearchOptions {
  keyword: string;
  maxPosts?: number;
  sortBy?: 'latest' | 'top' | 'people';
}