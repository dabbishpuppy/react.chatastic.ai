
export class CompressionDictionaryService {
  private static compressionDictionary: Uint8Array | null = null;
  
  // Generate compression dictionary from common patterns
  static async generateCompressionDictionary(): Promise<Uint8Array> {
    if (this.compressionDictionary) {
      return this.compressionDictionary;
    }
    
    // Enhanced common patterns for maximum compression
    const commonPatterns = [
      // Ultra-common words for aggressive replacement
      'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'man', 'end', 'why', 'let', 'put', 'say', 'she', 'too', 'use',
      
      // Medium frequency words
      'about', 'after', 'again', 'before', 'being', 'below', 'between', 'both', 'during', 'each', 'few', 'from', 'further', 'here', 'into', 'more', 'most', 'other', 'over', 'same', 'some', 'such', 'than', 'that', 'their', 'them', 'these', 'they', 'this', 'those', 'through', 'time', 'very', 'when', 'where', 'which', 'while', 'with', 'would', 'your',
      
      // Website-specific boilerplate (aggressive targeting)
      'contact', 'privacy', 'terms', 'policy', 'service', 'services', 'product', 'products', 'company', 'business', 'website', 'page', 'home', 'information', 'content', 'copyright', 'reserved', 'rights', 'click', 'more', 'read', 'learn', 'view', 'see', 'find', 'search', 'menu', 'navigation', 'subscribe', 'newsletter', 'follow', 'share', 'social', 'media'
    ];
    
    const dictionaryText = commonPatterns.join(' ');
    this.compressionDictionary = new TextEncoder().encode(dictionaryText);
    return this.compressionDictionary;
  }

  // Get ultra-aggressive compression dictionary
  static getUltraCompressionDict(): Record<string, string> {
    return {
      // Ultra-common words to single characters
      'the': '∅',
      'and': '∧',
      'for': '∀',
      'are': '∈',
      'that': '∴',
      'this': '∆',
      'with': '∇',
      'have': '∃',
      'will': '∞',
      'from': '∂',
      'they': '∑',
      'been': '∫',
      'more': '±',
      'would': '≠',
      'there': '≤',
      'their': '≥',
      'which': '∪',
      'about': '∩',
      'other': '⊂',
      'after': '⊃',
      'where': '⊆',
      'before': '⊇',
      'through': '⊕',
      'between': '⊗',
      
      // Website-specific ultra-compression (no duplicates)
      'click': '©',
      'here': '®',
      'read': '™',
      'learn': '§',
      'contact': 'Ç',
      'home': 'Ñ',
      'page': 'ß',
      'menu': 'Ø',
      'search': 'Þ',
      'privacy': 'Ð',
      'terms': 'Æ',
      'service': 'Œ',
      'company': 'Š',
      'information': 'Ž'
    };
  }
}
