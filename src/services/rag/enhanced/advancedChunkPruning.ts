
import { ChunkPruningService, PrunedChunk } from "./chunkPruning";

export interface TFIDFScore {
  term: string;
  frequency: number;
  documentFrequency: number;
  tfidf: number;
}

export interface AdvancedPrunedChunk extends PrunedChunk {
  tfidfScore: number;
  topTerms: string[];
  semanticSimilarity?: number;
  summaryText?: string;
}

export class AdvancedChunkPruningService extends ChunkPruningService {
  // Enhanced pruning with TF-IDF similarity analysis
  static async pruneChunksAdvanced(
    chunks: string[], 
    maxChunks: number = 3,
    enableSummaryMode: boolean = false
  ): Promise<AdvancedPrunedChunk[]> {
    console.log(`🧠 Advanced chunk pruning: ${chunks.length} → ${maxChunks} chunks (summary mode: ${enableSummaryMode})`);
    
    // Step 1: Calculate TF-IDF scores for all chunks
    const chunksWithTFIDF = await this.calculateTFIDFScores(chunks);
    
    // Step 2: Calculate semantic similarity between chunks
    const chunksWithSimilarity = await this.calculateSemanticSimilarity(chunksWithTFIDF);
    
    // Step 3: Remove highly similar chunks (deduplication)
    const dedupedChunks = this.removeSimilarChunks(chunksWithSimilarity, 0.85);
    
    // Step 4: Select top chunks based on TF-IDF and diversity
    const selectedChunks = this.selectDiverseTopChunks(dedupedChunks, maxChunks);
    
    // Step 5: Generate summaries if summary mode is enabled
    if (enableSummaryMode) {
      for (const chunk of selectedChunks) {
        chunk.summaryText = this.generateChunkSummary(chunk.content, 200);
      }
    }
    
    console.log(`✨ Advanced pruning complete: ${selectedChunks.length} diverse, high-quality chunks`);
    return selectedChunks;
  }

  // Calculate TF-IDF scores for document ranking
  private static async calculateTFIDFScores(chunks: string[]): Promise<AdvancedPrunedChunk[]> {
    const documents = chunks.map(chunk => this.tokenizeText(chunk));
    const vocabulary = this.buildVocabulary(documents);
    
    return chunks.map((chunk, index) => {
      const tokens = documents[index];
      const tfidfScore = this.calculateDocumentTFIDF(tokens, documents, vocabulary);
      const topTerms = this.getTopTFIDFTerms(tokens, documents, vocabulary, 5);
      
      const baseChunk = this.scoreChunk(chunk);
      
      return {
        ...baseChunk,
        tfidfScore,
        topTerms,
        score: baseChunk.score + (tfidfScore * 10) // Boost score with TF-IDF
      };
    });
  }

  // Simple tokenization (can be enhanced with stemming/lemmatization)
  private static tokenizeText(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(token => token.length > 2 && !this.isStopWord(token));
  }

  // Build vocabulary across all documents
  private static buildVocabulary(documents: string[][]): Set<string> {
    const vocab = new Set<string>();
    documents.forEach(doc => {
      doc.forEach(token => vocab.add(token));
    });
    return vocab;
  }

  // Calculate TF-IDF score for a document
  private static calculateDocumentTFIDF(
    tokens: string[], 
    allDocuments: string[][], 
    vocabulary: Set<string>
  ): number {
    const termFrequencies = this.calculateTermFrequencies(tokens);
    let documentScore = 0;
    
    for (const [term, tf] of termFrequencies.entries()) {
      const df = this.calculateDocumentFrequency(term, allDocuments);
      const idf = Math.log(allDocuments.length / (df + 1));
      const tfidf = tf * idf;
      documentScore += tfidf;
    }
    
    return documentScore / tokens.length; // Normalize by document length
  }

  // Get top TF-IDF terms for a document
  private static getTopTFIDFTerms(
    tokens: string[], 
    allDocuments: string[][], 
    vocabulary: Set<string>, 
    topN: number = 5
  ): string[] {
    const termFrequencies = this.calculateTermFrequencies(tokens);
    const tfidfScores: TFIDFScore[] = [];
    
    for (const [term, tf] of termFrequencies.entries()) {
      const df = this.calculateDocumentFrequency(term, allDocuments);
      const idf = Math.log(allDocuments.length / (df + 1));
      const tfidf = tf * idf;
      
      tfidfScores.push({ term, frequency: tf, documentFrequency: df, tfidf });
    }
    
    return tfidfScores
      .sort((a, b) => b.tfidf - a.tfidf)
      .slice(0, topN)
      .map(score => score.term);
  }

  // Calculate term frequencies
  private static calculateTermFrequencies(tokens: string[]): Map<string, number> {
    const frequencies = new Map<string, number>();
    tokens.forEach(token => {
      frequencies.set(token, (frequencies.get(token) || 0) + 1);
    });
    
    // Normalize by document length
    const totalTokens = tokens.length;
    frequencies.forEach((count, term) => {
      frequencies.set(term, count / totalTokens);
    });
    
    return frequencies;
  }

  // Calculate document frequency for a term
  private static calculateDocumentFrequency(term: string, documents: string[][]): number {
    return documents.filter(doc => doc.includes(term)).length;
  }

  // Simple semantic similarity using Jaccard similarity
  private static async calculateSemanticSimilarity(chunks: AdvancedPrunedChunk[]): Promise<AdvancedPrunedChunk[]> {
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const chunkTokens = new Set(this.tokenizeText(chunk.content));
      
      let maxSimilarity = 0;
      for (let j = 0; j < chunks.length; j++) {
        if (i === j) continue;
        
        const otherTokens = new Set(this.tokenizeText(chunks[j].content));
        const similarity = this.jaccardSimilarity(chunkTokens, otherTokens);
        maxSimilarity = Math.max(maxSimilarity, similarity);
      }
      
      chunk.semanticSimilarity = maxSimilarity;
    }
    
    return chunks;
  }

  // Jaccard similarity coefficient
  private static jaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
    const intersection = new Set([...setA].filter(x => setB.has(x)));
    const union = new Set([...setA, ...setB]);
    return intersection.size / union.size;
  }

  // Remove chunks that are too similar to others
  private static removeSimilarChunks(
    chunks: AdvancedPrunedChunk[], 
    similarityThreshold: number = 0.85
  ): AdvancedPrunedChunk[] {
    const uniqueChunks: AdvancedPrunedChunk[] = [];
    
    for (const chunk of chunks.sort((a, b) => b.score - a.score)) {
      const isSimilar = uniqueChunks.some(existing => {
        const chunkTokens = new Set(this.tokenizeText(chunk.content));
        const existingTokens = new Set(this.tokenizeText(existing.content));
        return this.jaccardSimilarity(chunkTokens, existingTokens) > similarityThreshold;
      });
      
      if (!isSimilar) {
        uniqueChunks.push(chunk);
      }
    }
    
    console.log(`🔍 Deduplication: ${chunks.length} → ${uniqueChunks.length} unique chunks`);
    return uniqueChunks;
  }

  // Select diverse top chunks
  private static selectDiverseTopChunks(
    chunks: AdvancedPrunedChunk[], 
    maxChunks: number
  ): AdvancedPrunedChunk[] {
    // Sort by combined score (original + TF-IDF)
    const sortedChunks = chunks.sort((a, b) => b.score - a.score);
    
    const selectedChunks: AdvancedPrunedChunk[] = [];
    const selectedTerms = new Set<string>();
    
    for (const chunk of sortedChunks) {
      if (selectedChunks.length >= maxChunks) break;
      
      // Check if this chunk adds new topics (based on top terms)
      const newTerms = chunk.topTerms.filter(term => !selectedTerms.has(term));
      const diversityScore = newTerms.length / chunk.topTerms.length;
      
      // Accept chunk if it's diverse enough or we don't have many chunks yet
      if (diversityScore > 0.3 || selectedChunks.length < 2) {
        selectedChunks.push(chunk);
        chunk.topTerms.forEach(term => selectedTerms.add(term));
      }
    }
    
    return selectedChunks;
  }

  // Generate extractive summary from chunk content
  private static generateChunkSummary(content: string, maxLength: number = 200): string {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10);
    
    if (sentences.length <= 1) {
      return content.substring(0, maxLength) + (content.length > maxLength ? '...' : '');
    }
    
    // Score sentences by position and keyword density
    const scoredSentences = sentences.map((sentence, index) => {
      const positionScore = sentences.length - index; // Earlier sentences get higher scores
      const lengthScore = Math.min(sentence.length / 100, 1); // Prefer medium-length sentences
      const keywordScore = this.countImportantWords(sentence);
      
      return {
        sentence: sentence.trim(),
        score: positionScore + lengthScore + keywordScore,
        length: sentence.length
      };
    });
    
    // Select best sentences that fit within maxLength
    scoredSentences.sort((a, b) => b.score - a.score);
    
    let summary = '';
    let currentLength = 0;
    
    for (const { sentence, length } of scoredSentences) {
      if (currentLength + length + 2 <= maxLength) { // +2 for '. '
        summary += (summary ? '. ' : '') + sentence;
        currentLength += length + (summary ? 2 : 0);
      }
    }
    
    return summary || content.substring(0, maxLength) + '...';
  }

  // Count important words in a sentence
  private static countImportantWords(sentence: string): number {
    const importantPatterns = [
      /\b(important|key|main|primary|essential|critical|significant)\b/i,
      /\b(solution|benefit|feature|advantage|result|outcome)\b/i,
      /\b(process|method|approach|strategy|technique)\b/i,
      /\b(company|business|service|product|technology)\b/i
    ];
    
    return importantPatterns.reduce((count, pattern) => {
      return count + (pattern.test(sentence) ? 1 : 0);
    }, 0);
  }

  // Simple stop words list
  private static isStopWord(word: string): boolean {
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did',
      'this', 'that', 'these', 'those', 'will', 'would', 'can', 'could', 'should', 'may', 'might'
    ]);
    return stopWords.has(word);
  }
}
