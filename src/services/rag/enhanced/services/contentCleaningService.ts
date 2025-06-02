import { ContentAnalysis } from '../types/compressionTypes';

export class ContentCleaningService {
  // Enhanced content cleaning with template removal
  static enhancedContentCleaning(content: string, analysis: ContentAnalysis): string {
    let cleanedContent = content;
    
    // Remove HTML tags and decode entities
    cleanedContent = cleanedContent
      .replace(/<[^>]*>/g, ' ')
      .replace(/&[#\w]+;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    // Remove repeated phrases if high boilerplate ratio
    if (analysis.boilerplateRatio > 0.3) {
      analysis.repeatedPhrases.forEach(phrase => {
        if (phrase.length > 30) {
          const regex = new RegExp(this.escapeRegex(phrase), 'gi');
          const matches = cleanedContent.match(regex);
          if (matches && matches.length > 1) {
            // Keep only the first occurrence
            cleanedContent = cleanedContent.replace(regex, (match, offset) => {
              return cleanedContent.indexOf(match) === offset ? match : '';
            });
          }
        }
      });
    }
    
    // Remove common boilerplate patterns
    const boilerplatePatterns = [
      /cookie.*?policy/gi,
      /privacy.*?policy/gi,
      /terms.*?service/gi,
      /copyright.*?\d{4}/gi,
      /all rights reserved/gi,
      /loading\.{3}/gi,
      /please wait\.{3}/gi
    ];
    
    boilerplatePatterns.forEach(pattern => {
      cleanedContent = cleanedContent.replace(pattern, '');
    });
    
    // Clean up extra whitespace
    cleanedContent = cleanedContent
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n')
      .trim();
    
    return cleanedContent;
  }

  private static escapeRegex(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
