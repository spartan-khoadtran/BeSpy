export interface Post {
  id: string;
  title: string;
  url: string;
  author: string;
  subreddit: string;
  created_utc: string;
  score: number;
  upvote_ratio: number;
  num_comments: number;
  content: string;
  link_url: string;
  trending_score?: number;
  comments: Comment[];
}

export interface Comment {
  id: string;
  author: string;
  body: string;
  score: number;
  created_utc: string;
  replies: Comment[];
}

export interface ScraperOptions {
  headless?: boolean;
  delayBetweenRequests?: number;
  maxRetries?: number;
  timeout?: number;
}

export interface RedditSearchResult {
  posts: Post[];
  metadata: {
    searchTime: string;
    keyword?: string;
    subreddits?: string[];
    totalPosts: number;
  };
}

export interface CLIOptions {
  keyword?: string;
  format?: 'json' | 'markdown';
  days?: number;
  subreddits?: string;
  limit?: number;
  output?: string;
}