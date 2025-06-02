
import { QueryContext } from '../queryPreprocessor';
import { AdvancedQueryAnalysis } from '../advancedQueryPreprocessor';

export interface ContextAnalyzerOptions {
  maxContextTokens?: number;
  diversityThreshold?: number;
  recencyWeight?: number;
  relevanceThreshold?: number;
}

export class ContextAnalyzer {
  static getRelevanceThreshold(analysis: AdvancedQueryAnalysis): number {
    // Adjust threshold based on query complexity and intent confidence
    let threshold = 0.3; // Base threshold

    if (analysis.complexityScore < 0.4) threshold = 0.4;
    else if (analysis.complexityScore > 0.7) threshold = 0.25;

    if (analysis.intentConfidence > 0.8) threshold += 0.1;
    else if (analysis.intentConfidence < 0.5) threshold -= 0.05;

    return Math.max(0.1, Math.min(0.7, threshold));
  }

  static getMaxTokensForComplexity(complexityScore: number): number {
    if (complexityScore < 0.4) return 1000;
    else if (complexityScore < 0.7) return 2000;
    else return 4000;
  }

  static calculateContentSimilarity(content1: string, content2: string): number {
    // Simple Jaccard similarity for content diversity checking
    const words1 = new Set(content1.toLowerCase().split(/\s+/));
    const words2 = new Set(content2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(word => words2.has(word)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  static estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }
}
