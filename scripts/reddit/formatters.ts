import { Post, RedditSearchResult, Comment } from './types';
import * as fs from 'fs/promises';
import * as path from 'path';

export class OutputFormatter {
  async formatJSON(data: Post[] | RedditSearchResult): Promise<string> {
    return JSON.stringify(data, null, 2);
  }

  async formatMarkdown(data: Post[] | RedditSearchResult, keyword?: string): Promise<string> {
    const posts = Array.isArray(data) ? data : data.posts;
    const title = keyword ? `Reddit Search Results: ${keyword}` : 'Reddit Posts';
    
    let markdown = `# ${title}\n\n`;
    markdown += `**Generated**: ${new Date().toISOString()}\n`;
    markdown += `**Total Posts**: ${posts.length}\n\n`;
    markdown += '---\n\n';

    for (const post of posts) {
      markdown += this.formatPostMarkdown(post);
    }

    return markdown;
  }

  private formatPostMarkdown(post: Post): string {
    let md = `## [${post.title}](${post.url})\n\n`;
    md += `- **Author**: u/${post.author}\n`;
    md += `- **Subreddit**: r/${post.subreddit}\n`;
    md += `- **Score**: ${post.score.toLocaleString()}`;
    
    if (post.upvote_ratio > 0) {
      md += ` (${Math.round(post.upvote_ratio * 100)}% upvoted)`;
    }
    
    md += `\n- **Comments**: ${post.num_comments.toLocaleString()}\n`;
    md += `- **Posted**: ${new Date(post.created_utc).toLocaleString()}\n`;
    
    if (post.trending_score) {
      md += `- **Trending Score**: ${post.trending_score}\n`;
    }

    if (post.content) {
      md += `\n### Content\n\n${post.content}\n`;
    }

    if (post.link_url) {
      md += `\n**External Link**: [${post.link_url}](${post.link_url})\n`;
    }

    if (post.comments && post.comments.length > 0) {
      md += `\n### Top Comments (${Math.min(post.comments.length, 3)})\n\n`;
      const topComments = post.comments.slice(0, 3);
      
      for (let i = 0; i < topComments.length; i++) {
        md += this.formatCommentMarkdown(topComments[i], i + 1);
      }
    }

    md += '\n---\n\n';
    return md;
  }

  private formatCommentMarkdown(comment: Comment, index: number): string {
    let md = `${index}. **${comment.author}** (${comment.score} points):\n`;
    md += `   > ${comment.body.replace(/\n/g, '\n   > ')}\n\n`;
    
    if (comment.replies && comment.replies.length > 0) {
      for (const reply of comment.replies.slice(0, 2)) {
        md += `   - **${reply.author}** (${reply.score} points): ${reply.body.substring(0, 200)}...\n`;
      }
      md += '\n';
    }
    
    return md;
  }

  async saveToFile(content: string, filepath: string): Promise<void> {
    const fullPath = path.resolve(filepath);
    const dir = path.dirname(fullPath);
    
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(fullPath, content, 'utf-8');
    console.log(`✅ Results saved to: ${fullPath}`);
  }

  generateSummary(posts: Post[]): string {
    if (posts.length === 0) return 'No posts found.';

    const totalScore = posts.reduce((sum, post) => sum + post.score, 0);
    const totalComments = posts.reduce((sum, post) => sum + post.num_comments, 0);
    const avgScore = Math.round(totalScore / posts.length);
    const avgComments = Math.round(totalComments / posts.length);
    
    const subreddits = [...new Set(posts.map(p => p.subreddit))];
    const topPost = posts.reduce((max, post) => post.score > max.score ? post : max, posts[0]);

    return `
📊 **Summary Statistics**
- Total Posts: ${posts.length}
- Subreddits: ${subreddits.join(', ')}
- Average Score: ${avgScore.toLocaleString()}
- Average Comments: ${avgComments.toLocaleString()}
- Top Post: "${topPost.title}" (${topPost.score.toLocaleString()} upvotes)
`;
  }
}