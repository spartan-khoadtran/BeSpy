/**
 * Starting Up Category Scraper
 * Specialized scraper for startup-related posts
 */

import { BaseCategoryScraper } from './base-scraper.js';

export class StartingUpScraper extends BaseCategoryScraper {
  constructor(browserManager) {
    super(browserManager, 'starting-up');
  }

  /**
   * Enhance posts with startup-specific metadata
   */
  async enhancePosts(posts) {
    return posts.map(post => {
      const startupTopics = this.detectStartupTopics(post.title + ' ' + post.content);
      const stage = this.detectStartupStage(post.title + ' ' + post.content);
      const challenges = this.detectChallenges(post.title + ' ' + post.content);
      
      return {
        ...post,
        startupMetadata: {
          topics: startupTopics,
          stage,
          challenges,
          isFounderPost: this.isFounderPost(post),
          hasMetrics: this.hasBusinessMetrics(post.content),
          fundingMentioned: this.detectFunding(post.content)
        },
        categoryMetadata: {
          name: this.categoryInfo.name,
          key: this.categoryKey,
          description: this.categoryInfo.description
        }
      };
    });
  }

  /**
   * Detect startup topics in content
   */
  detectStartupTopics(text) {
    const topics = [
      'mvp', 'product-market fit', 'funding', 'bootstrapping', 'growth hacking',
      'customer acquisition', 'pricing strategy', 'competition', 'pivot',
      'co-founder', 'equity', 'launch', 'beta testing', 'user feedback',
      'validation', 'revenue', 'churn', 'retention', 'runway'
    ];
    
    const lowerText = text.toLowerCase();
    return topics.filter(topic => lowerText.includes(topic.replace('-', ' ')));
  }

  /**
   * Detect startup stage
   */
  detectStartupStage(text) {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('idea') || lowerText.includes('validat')) {
      return 'idea-validation';
    } else if (lowerText.includes('mvp') || lowerText.includes('prototype')) {
      return 'mvp';
    } else if (lowerText.includes('launch') || lowerText.includes('beta')) {
      return 'launch';
    } else if (lowerText.includes('growth') || lowerText.includes('scale')) {
      return 'growth';
    } else if (lowerText.includes('fund') || lowerText.includes('raise')) {
      return 'fundraising';
    } else if (lowerText.includes('exit') || lowerText.includes('acquisition')) {
      return 'exit';
    }
    
    return 'general';
  }

  /**
   * Detect challenges mentioned
   */
  detectChallenges(text) {
    const challenges = [
      'finding customers', 'product development', 'time management',
      'funding', 'hiring', 'marketing', 'sales', 'technical debt',
      'competition', 'burnout', 'legal issues', 'cash flow',
      'user retention', 'scaling', 'team building'
    ];
    
    const lowerText = text.toLowerCase();
    return challenges.filter(challenge => 
      challenge.split(' ').every(word => lowerText.includes(word))
    );
  }

  /**
   * Check if post is from a founder
   */
  isFounderPost(post) {
    const founderKeywords = ['founder', 'co-founder', 'ceo', 'started', 'launched', 'building', 'my startup'];
    const text = (post.title + ' ' + post.content + ' ' + post.author).toLowerCase();
    return founderKeywords.some(keyword => text.includes(keyword));
  }

  /**
   * Check if post contains business metrics
   */
  hasBusinessMetrics(content) {
    const metricsPattern = /\$[\d,]+|\d+%|\d+k\s*(users|customers|revenue|mrr|arr)|mrr|arr|cac|ltv|churn/i;
    return metricsPattern.test(content);
  }

  /**
   * Detect funding mentions
   */
  detectFunding(content) {
    const fundingPattern = /seed|series\s+[a-e]|angel|vc|venture\s+capital|\$\d+[mk]|funding|investment|raise/i;
    return fundingPattern.test(content);
  }
}

export default StartingUpScraper;