async function findTrendingPosts(scraper, days = 2) {
  // Get front page posts
  const frontPagePosts = await scraper.getFrontPage();
  
  // Calculate trending score based on multiple factors
  const now = new Date();
  const cutoffTime = new Date(now - days * 24 * 60 * 60 * 1000);
  
  const scoredPosts = frontPagePosts.map(post => {
    // Parse post time
    let postAge = 24; // Default to 24 hours if we can't parse
    
    if (post.time) {
      if (post.time.includes('hour')) {
        postAge = parseInt(post.time.match(/\d+/)[0]);
      } else if (post.time.includes('minute')) {
        postAge = parseInt(post.time.match(/\d+/)[0]) / 60;
      } else if (post.time.includes('day')) {
        postAge = parseInt(post.time.match(/\d+/)[0]) * 24;
      }
    }
    
    // Only include posts from the specified time range
    if (postAge > days * 24) {
      return null;
    }
    
    // Calculate trending score
    // Formula: (points + comments * 2) / (age_in_hours + 2) ^ 1.5
    const ageInHours = Math.max(postAge, 1);
    const engagementScore = post.points + (post.comments * 2);
    const trendingScore = engagementScore / Math.pow(ageInHours + 2, 1.5);
    
    return {
      ...post,
      ageInHours,
      trendingScore,
      engagementScore
    };
  }).filter(post => post !== null);
  
  // Sort by trending score
  scoredPosts.sort((a, b) => b.trendingScore - a.trendingScore);
  
  // Get top trending posts
  const topPosts = scoredPosts.slice(0, 10);
  
  // Fetch content for trending posts
  for (let post of topPosts) {
    if (post.hnUrl) {
      try {
        post.content = await scraper.fetchPostContent(post.hnUrl);
      } catch (err) {
        console.error(`Failed to fetch content for: ${post.title}`);
        post.content = null;
      }
    }
  }
  
  return topPosts;
}

module.exports = {
  findTrendingPosts
};