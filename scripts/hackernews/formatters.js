function formatAsJson(data) {
  return JSON.stringify(data, null, 2);
}

function formatAsMarkdown(data, title = 'HackerNews Results') {
  let markdown = `# ${title}\n\n`;
  markdown += `*Generated: ${new Date().toISOString()}*\n\n`;
  
  if (!data || data.length === 0) {
    markdown += '## No results found\n';
    return markdown;
  }
  
  data.forEach((item, index) => {
    markdown += `## ${index + 1}. ${item.title}\n\n`;
    
    if (item.url) {
      markdown += `**URL:** ${item.url}\n\n`;
    }
    
    if (item.hnUrl) {
      markdown += `**HN Discussion:** ${item.hnUrl}\n\n`;
    }
    
    markdown += `**Metadata:**\n`;
    markdown += `- Points: ${item.points || 0}\n`;
    markdown += `- Author: ${item.author || 'unknown'}\n`;
    markdown += `- Time: ${item.time || 'unknown'}\n`;
    markdown += `- Comments: ${item.comments || 0}\n\n`;
    
    if (item.content) {
      if (typeof item.content === 'string') {
        markdown += `**Content Preview:**\n${item.content.substring(0, 500)}...\n\n`;
      } else if (item.content.text) {
        markdown += `**Post Text:**\n${item.content.text}\n\n`;
        
        if (item.content.comments && item.content.comments.length > 0) {
          markdown += `### Top Comments:\n\n`;
          item.content.comments.slice(0, 3).forEach((comment, ci) => {
            markdown += `#### Comment ${ci + 1} by ${comment.author}:\n`;
            markdown += `${comment.text.substring(0, 300)}...\n\n`;
          });
        }
      }
    }
    
    markdown += '---\n\n';
  });
  
  return markdown;
}

module.exports = {
  formatAsJson,
  formatAsMarkdown
};