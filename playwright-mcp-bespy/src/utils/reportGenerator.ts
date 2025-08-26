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

import fs from 'fs/promises';
import path from 'path';
import { TwitterReport, TwitterPost } from '../models/twitter.js';

export class ReportGenerator {
  private reportDir: string;

  constructor(reportDir: string = './report') {
    this.reportDir = reportDir;
  }

  async ensureReportDir(): Promise<void> {
    try {
      await fs.access(this.reportDir);
    } catch {
      await fs.mkdir(this.reportDir, { recursive: true });
    }
  }

  generateMarkdown(report: TwitterReport): string {
    const lines: string[] = [];
    
    lines.push(`# Twitter Report: ${report.keyword}`);
    lines.push('');
    lines.push(`**Generated at:** ${new Date(report.fetchedAt).toLocaleString()}`);
    lines.push(`**Total Posts:** ${report.totalPosts}`);
    lines.push('');
    
    lines.push('## Summary Statistics');
    lines.push('');
    lines.push(`- **Total Likes:** ${report.summary.totalLikes.toLocaleString()}`);
    lines.push(`- **Total Retweets:** ${report.summary.totalRetweets.toLocaleString()}`);
    lines.push(`- **Total Impressions:** ${report.summary.totalImpressions.toLocaleString()}`);
    lines.push(`- **Average Engagement:** ${report.summary.averageEngagement.toFixed(2)}%`);
    lines.push(`- **Top Author:** ${report.summary.topAuthor}`);
    lines.push('');
    
    lines.push('---');
    lines.push('');
    lines.push('## Posts');
    lines.push('');
    
    report.posts.forEach((post, index) => {
      lines.push(`### ${index + 1}. ${post.author} (@${post.authorHandle})`);
      lines.push('');
      lines.push(`**Posted:** ${post.timestamp}`);
      lines.push(`**Link:** [View on Twitter](${post.url})`);
      lines.push('');
      lines.push('**Content:**');
      lines.push('```');
      lines.push(post.text);
      lines.push('```');
      lines.push('');
      lines.push('**Engagement Metrics:**');
      lines.push(`- 👁️ Impressions: ${post.impressions.toLocaleString()}`);
      lines.push(`- ❤️ Likes: ${post.likes.toLocaleString()}`);
      lines.push(`- 🔁 Retweets: ${post.retweets.toLocaleString()}`);
      lines.push(`- 💬 Replies: ${post.replies.toLocaleString()}`);
      
      if (post.hashtags.length > 0) {
        lines.push('');
        lines.push(`**Hashtags:** ${post.hashtags.map(tag => `#${tag}`).join(', ')}`);
      }
      
      if (post.mentions.length > 0) {
        lines.push(`**Mentions:** ${post.mentions.map(m => `@${m}`).join(', ')}`);
      }
      
      lines.push('');
      lines.push('---');
      lines.push('');
    });
    
    return lines.join('\n');
  }

  generateCSV(report: TwitterReport): string {
    const lines: string[] = [];
    
    // CSV Header
    lines.push('Index,Author,Handle,Timestamp,Text,URL,Likes,Retweets,Impressions,Replies,Hashtags,Mentions');
    
    // CSV Data
    report.posts.forEach((post, index) => {
      const row = [
        index + 1,
        `"${post.author.replace(/"/g, '""')}"`,
        post.authorHandle,
        post.timestamp,
        `"${post.text.replace(/"/g, '""').replace(/\n/g, ' ')}"`,
        post.url,
        post.likes,
        post.retweets,
        post.impressions,
        post.replies,
        `"${post.hashtags.join(', ')}"`,
        `"${post.mentions.join(', ')}"`
      ];
      lines.push(row.join(','));
    });
    
    return lines.join('\n');
  }

  async saveReport(report: TwitterReport, format: 'markdown' | 'csv' | 'both' = 'both'): Promise<{ markdown?: string; csv?: string }> {
    await this.ensureReportDir();
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const keyword = report.keyword.replace(/[^a-zA-Z0-9]/g, '_');
    const baseFilename = `twitter_${keyword}_${timestamp}`;
    
    const savedFiles: { markdown?: string; csv?: string } = {};
    
    if (format === 'markdown' || format === 'both') {
      const mdContent = this.generateMarkdown(report);
      const mdPath = path.join(this.reportDir, `${baseFilename}.md`);
      await fs.writeFile(mdPath, mdContent, 'utf-8');
      savedFiles.markdown = mdPath;
    }
    
    if (format === 'csv' || format === 'both') {
      const csvContent = this.generateCSV(report);
      const csvPath = path.join(this.reportDir, `${baseFilename}.csv`);
      await fs.writeFile(csvPath, csvContent, 'utf-8');
      savedFiles.csv = csvPath;
    }
    
    return savedFiles;
  }
}