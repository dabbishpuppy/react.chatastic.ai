
import { ContentAnalysis } from '../types/compressionTypes';

export class ContentAnalysisService {
  // Enhanced content analysis for smart processing mode selection
  static analyzeContent(text: string): ContentAnalysis {
    const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const uniqueWords = new Set(words).size;
    const wordDensity = uniqueWords / words.length;
    
    // Detect repeated phrases (boilerplate indicators)
    const phrases: Record<string, number> = {};
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
    
    sentences.forEach(sentence => {
      const normalized = sentence.trim().toLowerCase();
      if (normalized.length > 20) {
        phrases[normalized] = (phrases[normalized] || 0) + 1;
      }
    });
    
    const repeatedPhrases = Object.entries(phrases)
      .filter(([, count]) => count > 1)
      .map(([phrase]) => phrase);
    
    const boilerplateRatio = repeatedPhrases.length / sentences.length;
    
    // Classify content type
    let contentType: ContentAnalysis['contentType'] = 'mixed';
    if (boilerplateRatio > 0.4) contentType = 'template';
    else if (wordDensity > 0.6 && uniqueWords > 100) contentType = 'content-rich';
    else if (words.length < 200 || wordDensity < 0.3) contentType = 'informational';
    
    return {
      contentType,
      density: wordDensity,
      uniqueWords,
      repeatedPhrases,
      boilerplateRatio
    };
  }

  // Smart processing mode selection based on content analysis
  static selectProcessingMode(analysis: ContentAnalysis, pageSize: number): 'summary' | 'chunking' | 'template-removal' {
    // Use summary mode for small informational pages
    if (analysis.contentType === 'informational' || pageSize < 1000) {
      return 'summary';
    }
    
    // Use template removal for highly repetitive content
    if (analysis.contentType === 'template' || analysis.boilerplateRatio > 0.5) {
      return 'template-removal';
    }
    
    // Use full chunking for content-rich pages
    return 'chunking';
  }
}
