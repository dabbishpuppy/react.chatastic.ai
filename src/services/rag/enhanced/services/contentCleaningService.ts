
export class ContentCleaningService {
  // Advanced content cleaning with aggressive boilerplate removal
  static enhancedContentCleaning(htmlContent: string): string {
    let cleaned = htmlContent;
    
    // Remove scripts, styles, and navigation (existing)
    cleaned = cleaned
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
      .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
      .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, '');
    
    // Enhanced boilerplate removal
    cleaned = cleaned
      // Remove cookie notices and GDPR banners
      .replace(/<div[^>]*class="[^"]*cookie[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '')
      .replace(/<div[^>]*class="[^"]*gdpr[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '')
      .replace(/<div[^>]*class="[^"]*consent[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '')
      
      // Remove social media widgets
      .replace(/<div[^>]*class="[^"]*social[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '')
      .replace(/<div[^>]*class="[^"]*share[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '')
      .replace(/<iframe[^>]*src="[^"]*facebook[^"]*"[^>]*>[\s\S]*?<\/iframe>/gi, '')
      .replace(/<iframe[^>]*src="[^"]*twitter[^"]*"[^>]*>[\s\S]*?<\/iframe>/gi, '')
      
      // Remove advertisements and promotional content
      .replace(/<div[^>]*class="[^"]*ad[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '')
      .replace(/<div[^>]*id="[^"]*ad[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '')
      .replace(/<div[^>]*class="[^"]*promo[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '')
      .replace(/<div[^>]*class="[^"]*banner[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '')
      
      // Remove breadcrumbs and pagination
      .replace(/<nav[^>]*class="[^"]*breadcrumb[^"]*"[^>]*>[\s\S]*?<\/nav>/gi, '')
      .replace(/<div[^>]*class="[^"]*pagination[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '')
      .replace(/<ul[^>]*class="[^"]*pagination[^"]*"[^>]*>[\s\S]*?<\/ul>/gi, '')
      
      // Remove search forms and filters
      .replace(/<form[^>]*class="[^"]*search[^"]*"[^>]*>[\s\S]*?<\/form>/gi, '')
      .replace(/<div[^>]*class="[^"]*filter[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '')
      
      // Remove comments
      .replace(/<!--[\s\S]*?-->/g, '');
    
    // Convert to plain text
    const textContent = cleaned
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    // Advanced text cleaning
    return this.advancedTextCleaning(textContent);
  }

  // Advanced text cleaning with semantic noise filtering
  private static advancedTextCleaning(text: string): string {
    let cleaned = text;
    
    // Remove common CTAs and promotional phrases
    const ctaPatterns = [
      /\b(click here|read more|learn more|find out more|discover more|get started|sign up|subscribe|register|join now|buy now|order now|shop now|download now)\b/gi,
      /\b(follow us|like us|share this|tweet this|pin this|bookmark|save this|print this)\b/gi,
      /\b(terms and conditions|privacy policy|cookie policy|disclaimer|legal notice)\b/gi,
      /\b(back to top|scroll to top|return to top|go to top)\b/gi,
      /\b(next page|previous page|page \d+ of \d+|showing \d+ of \d+)\b/gi,
      /\b(menu|navigation|breadcrumb|home|contact|about|search|login|logout|account)\b/gi
    ];
    
    ctaPatterns.forEach(pattern => {
      cleaned = cleaned.replace(pattern, '');
    });
    
    // Remove excessive punctuation and normalize whitespace
    cleaned = cleaned
      .replace(/[.]{3,}/g, '...')
      .replace(/[!]{2,}/g, '!')
      .replace(/[?]{2,}/g, '?')
      .replace(/[-]{3,}/g, ' ')
      .replace(/[_]{3,}/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    // Remove stop words from content (aggressive approach for better compression)
    const stopWords = new Set([
      'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have',
      'i', 'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you',
      'do', 'at', 'this', 'but', 'his', 'by', 'from', 'they',
      'we', 'say', 'her', 'she', 'or', 'an', 'will', 'my',
      'one', 'all', 'would', 'there', 'their', 'what', 'so',
      'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me'
    ]);
    
    // Only remove stop words if content is long enough to maintain readability
    if (cleaned.length > 500) {
      const words = cleaned.split(/\s+/);
      const filteredWords = words.filter(word => {
        const cleanWord = word.toLowerCase().replace(/[^\w]/g, '');
        return cleanWord.length > 2 && !stopWords.has(cleanWord);
      });
      
      // Only apply if we don't lose too much content
      if (filteredWords.length > words.length * 0.6) {
        cleaned = filteredWords.join(' ');
      }
    }
    
    return cleaned;
  }
}
