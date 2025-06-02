export interface SemanticChunk {
  content: string;
  tokenCount: number;
  chunkIndex: number;
  metadata: {
    startPosition: number;
    endPosition: number;
    sentences: number;
    semanticBoundary: boolean;
    topicKeywords?: string[];
    contentType?: 'paragraph' | 'list' | 'heading' | 'table' | 'code';
    qualityScore?: number;
    complexity?: 'simple' | 'medium' | 'complex';
  };
}

export interface ChunkingOptions {
  targetChunkSize?: number;
  maxChunkSize?: number;
  minChunkSize?: number;
  overlapSize?: number;
  contentType?: string;
  enableDynamicSizing?: boolean;
  preserveStructure?: boolean;
}

export class SemanticChunkingService {
  private static readonly DEFAULT_TARGET_SIZE = 500; // tokens
  private static readonly DEFAULT_MAX_SIZE = 750; // tokens
  private static readonly DEFAULT_MIN_SIZE = 100; // tokens
  private static readonly DEFAULT_OVERLAP_SIZE = 50; // tokens

  // Rough token estimation (1 token ≈ 4 characters for English)
  private static estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  // Enhanced semantic chunking with dynamic sizing
  static createSemanticChunks(
    content: string, 
    options: ChunkingOptions = {}
  ): SemanticChunk[] {
    if (!content || content.length === 0) {
      return [];
    }

    const {
      targetChunkSize = this.DEFAULT_TARGET_SIZE,
      maxChunkSize = this.DEFAULT_MAX_SIZE,
      minChunkSize = this.DEFAULT_MIN_SIZE,
      overlapSize = this.DEFAULT_OVERLAP_SIZE,
      contentType = 'text',
      enableDynamicSizing = true,
      preserveStructure = true
    } = options;

    console.log(`🧩 Creating semantic chunks with dynamic sizing: ${content.length} chars`);

    // Detect content structure and adjust chunking strategy
    const contentAnalysis = this.analyzeContentStructure(content);
    const adjustedOptions = enableDynamicSizing 
      ? this.adjustChunkingParameters(contentAnalysis, options)
      : options;

    // Choose chunking strategy based on content type
    switch (contentAnalysis.primaryType) {
      case 'code':
        return this.chunkCodeContent(content, adjustedOptions);
      case 'list':
        return this.chunkListContent(content, adjustedOptions);
      case 'table':
        return this.chunkTableContent(content, adjustedOptions);
      default:
        return this.chunkTextContent(content, adjustedOptions);
    }
  }

  // Analyze content structure to optimize chunking
  private static analyzeContentStructure(content: string): {
    primaryType: 'paragraph' | 'list' | 'heading' | 'table' | 'code';
    hasHeadings: boolean;
    hasList: boolean;
    hasCodeBlocks: boolean;
    hasTable: boolean;
    averageSentenceLength: number;
    paragraphCount: number;
    complexity: 'simple' | 'medium' | 'complex';
  } {
    const hasHeadings = /#{1,6}\s|<h[1-6]>/i.test(content);
    const hasList = /^\s*[-*+]\s|<[uo]l>|^\s*\d+\./im.test(content);
    const hasCodeBlocks = /```|<pre>|<code>/i.test(content);
    const hasTable = /\|.*\||\<table\>/i.test(content);

    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 5);
    const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    
    const averageSentenceLength = sentences.length > 0 
      ? sentences.reduce((sum, s) => sum + s.length, 0) / sentences.length 
      : 0;

    // Determine primary content type
    let primaryType: 'paragraph' | 'list' | 'heading' | 'table' | 'code' = 'paragraph';
    if (hasCodeBlocks) primaryType = 'code';
    else if (hasTable) primaryType = 'table';
    else if (hasList) primaryType = 'list';
    else if (hasHeadings) primaryType = 'heading';

    // Determine complexity
    let complexity: 'simple' | 'medium' | 'complex' = 'simple';
    if (averageSentenceLength > 100 || paragraphs.length > 10) complexity = 'medium';
    if (averageSentenceLength > 150 || paragraphs.length > 20 || hasCodeBlocks || hasTable) complexity = 'complex';

    return {
      primaryType,
      hasHeadings,
      hasList,
      hasCodeBlocks,
      hasTable,
      averageSentenceLength,
      paragraphCount: paragraphs.length,
      complexity
    };
  }

  // Adjust chunking parameters based on content analysis
  private static adjustChunkingParameters(
    analysis: ReturnType<typeof this.analyzeContentStructure>,
    baseOptions: ChunkingOptions
  ): ChunkingOptions {
    let targetSize = baseOptions.targetChunkSize || this.DEFAULT_TARGET_SIZE;
    let maxSize = baseOptions.maxChunkSize || this.DEFAULT_MAX_SIZE;

    // Adjust for complexity
    switch (analysis.complexity) {
      case 'simple':
        targetSize = Math.round(targetSize * 1.2); // Larger chunks for simple content
        break;
      case 'complex':
        targetSize = Math.round(targetSize * 0.8); // Smaller chunks for complex content
        break;
    }

    // Adjust for content type
    switch (analysis.primaryType) {
      case 'code':
        targetSize = Math.round(targetSize * 0.7); // Smaller chunks for code
        maxSize = Math.round(maxSize * 0.8);
        break;
      case 'table':
        targetSize = Math.round(targetSize * 1.5); // Larger chunks for tables
        break;
      case 'list':
        targetSize = Math.round(targetSize * 0.9); // Slightly smaller for lists
        break;
    }

    return {
      ...baseOptions,
      targetChunkSize: targetSize,
      maxChunkSize: maxSize
    };
  }

  // Standard text content chunking
  private static chunkTextContent(
    content: string,
    options: ChunkingOptions
  ): SemanticChunk[] {
    const {
      targetChunkSize = this.DEFAULT_TARGET_SIZE,
      maxChunkSize = this.DEFAULT_MAX_SIZE,
      overlapSize = this.DEFAULT_OVERLAP_SIZE
    } = options;

    const chunks: SemanticChunk[] = [];
    
    // First, split by paragraphs to preserve semantic boundaries
    const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    
    if (paragraphs.length === 0) {
      return this.chunkBySentences(content, options);
    }

    let currentChunk = '';
    let currentTokens = 0;
    let chunkIndex = 0;
    let position = 0;

    for (let i = 0; i < paragraphs.length; i++) {
      const paragraph = paragraphs[i].trim();
      const paragraphTokens = this.estimateTokens(paragraph);

      // If this paragraph alone exceeds max chunk size, split it
      if (paragraphTokens > maxChunkSize) {
        // Save current chunk if it has content
        if (currentChunk.trim().length > 0) {
          chunks.push(this.createEnhancedChunk(
            currentChunk, 
            chunkIndex++, 
            position - currentChunk.length, 
            position,
            options
          ));
          currentChunk = '';
          currentTokens = 0;
        }

        // Split the large paragraph
        const paragraphChunks = this.chunkBySentences(paragraph, options);
        paragraphChunks.forEach(chunk => {
          chunks.push({
            ...chunk,
            chunkIndex: chunkIndex++,
            metadata: {
              ...chunk.metadata,
              startPosition: position + chunk.metadata.startPosition,
              endPosition: position + chunk.metadata.endPosition
            }
          });
        });

        position += paragraph.length;
        continue;
      }

      // Check if adding this paragraph would exceed target size
      if (currentTokens + paragraphTokens > targetChunkSize && currentChunk.trim().length > 0) {
        // Create chunk from current content
        chunks.push(this.createEnhancedChunk(
          currentChunk, 
          chunkIndex++, 
          position - currentChunk.length, 
          position,
          options
        ));
        
        // Start new chunk with overlap if current chunk is substantial
        if (currentTokens > overlapSize) {
          const overlap = this.getOverlapText(currentChunk, overlapSize);
          currentChunk = overlap + '\n\n' + paragraph;
          currentTokens = this.estimateTokens(overlap) + paragraphTokens;
        } else {
          currentChunk = paragraph;
          currentTokens = paragraphTokens;
        }
      } else {
        // Add paragraph to current chunk
        if (currentChunk.length > 0) {
          currentChunk += '\n\n' + paragraph;
        } else {
          currentChunk = paragraph;
        }
        currentTokens += paragraphTokens;
      }

      position += paragraph.length;
    }

    // Add final chunk if it has content
    if (currentChunk.trim().length > 0) {
      chunks.push(this.createEnhancedChunk(
        currentChunk, 
        chunkIndex, 
        position - currentChunk.length, 
        position,
        options
      ));
    }

    return this.validateChunks(chunks);
  }

  // Specialized chunking for code content
  private static chunkCodeContent(
    content: string,
    options: ChunkingOptions
  ): SemanticChunk[] {
    console.log('🔧 Chunking code content with function/class boundaries');
    
    const chunks: SemanticChunk[] = [];
    const targetSize = options.targetChunkSize || this.DEFAULT_TARGET_SIZE;
    
    // Split by functions, classes, or major code blocks
    const codeBlocks = content.split(/(?=\n(?:function|class|def|public|private|protected)\s)/);
    
    let currentChunk = '';
    let chunkIndex = 0;
    let position = 0;

    for (const block of codeBlocks) {
      const blockTokens = this.estimateTokens(block);
      
      if (this.estimateTokens(currentChunk + block) > targetSize && currentChunk) {
        chunks.push(this.createEnhancedChunk(
          currentChunk.trim(),
          chunkIndex++,
          position - currentChunk.length,
          position,
          options
        ));
        currentChunk = block;
      } else {
        currentChunk += block;
      }
      
      position += block.length;
    }

    if (currentChunk.trim()) {
      chunks.push(this.createEnhancedChunk(
        currentChunk.trim(),
        chunkIndex,
        position - currentChunk.length,
        position,
        options
      ));
    }

    return chunks;
  }

  // Specialized chunking for list content
  private static chunkListContent(
    content: string,
    options: ChunkingOptions
  ): SemanticChunk[] {
    console.log('📝 Chunking list content with item boundaries');
    
    const chunks: SemanticChunk[] = [];
    const targetSize = options.targetChunkSize || this.DEFAULT_TARGET_SIZE;
    
    // Split by list items
    const listItems = content.split(/\n(?=\s*[-*+]|\s*\d+\.)/);
    
    let currentChunk = '';
    let chunkIndex = 0;
    let position = 0;

    for (const item of listItems) {
      if (this.estimateTokens(currentChunk + item) > targetSize && currentChunk) {
        chunks.push(this.createEnhancedChunk(
          currentChunk.trim(),
          chunkIndex++,
          position - currentChunk.length,
          position,
          options
        ));
        currentChunk = item;
      } else {
        currentChunk += item;
      }
      
      position += item.length;
    }

    if (currentChunk.trim()) {
      chunks.push(this.createEnhancedChunk(
        currentChunk.trim(),
        chunkIndex,
        position - currentChunk.length,
        position,
        options
      ));
    }

    return chunks;
  }

  // Specialized chunking for table content
  private static chunkTableContent(
    content: string,
    options: ChunkingOptions
  ): SemanticChunk[] {
    console.log('📊 Chunking table content with row boundaries');
    
    // For tables, we typically want to keep headers with data
    // and split by logical row groups
    const chunks: SemanticChunk[] = [];
    const targetSize = options.targetChunkSize || this.DEFAULT_TARGET_SIZE;
    
    // Simple table chunking - split by table boundaries or large row groups
    const tableSections = content.split(/\n\s*\n|\|.*\|\n\s*\|[-:]+\|/);
    
    let currentChunk = '';
    let chunkIndex = 0;
    let position = 0;

    for (const section of tableSections) {
      if (this.estimateTokens(currentChunk + section) > targetSize && currentChunk) {
        chunks.push(this.createEnhancedChunk(
          currentChunk.trim(),
          chunkIndex++,
          position - currentChunk.length,
          position,
          options
        ));
        currentChunk = section;
      } else {
        currentChunk += section;
      }
      
      position += section.length;
    }

    if (currentChunk.trim()) {
      chunks.push(this.createEnhancedChunk(
        currentChunk.trim(),
        chunkIndex,
        position - currentChunk.length,
        position,
        options
      ));
    }

    return chunks;
  }

  // Split text by sentences when paragraph splitting isn't effective
  private static chunkBySentences(
    content: string,
    options: ChunkingOptions
  ): SemanticChunk[] {
    const {
      targetChunkSize = this.DEFAULT_TARGET_SIZE,
      overlapSize = this.DEFAULT_OVERLAP_SIZE
    } = options;

    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const chunks: SemanticChunk[] = [];
    
    let currentChunk = '';
    let currentTokens = 0;
    let chunkIndex = 0;
    let position = 0;

    for (const sentence of sentences) {
      const sentenceText = sentence.trim() + '.';
      const sentenceTokens = this.estimateTokens(sentenceText);

      if (currentTokens + sentenceTokens > targetChunkSize && currentChunk.length > 0) {
        chunks.push(this.createEnhancedChunk(
          currentChunk,
          chunkIndex++,
          position - currentChunk.length,
          position,
          options
        ));
        
        // Add overlap
        const overlap = this.getOverlapText(currentChunk, overlapSize);
        currentChunk = overlap + ' ' + sentenceText;
        currentTokens = this.estimateTokens(overlap) + sentenceTokens;
      } else {
        if (currentChunk.length > 0) {
          currentChunk += ' ' + sentenceText;
        } else {
          currentChunk = sentenceText;
        }
        currentTokens += sentenceTokens;
      }

      position += sentenceText.length;
    }

    if (currentChunk.trim().length > 0) {
      chunks.push(this.createEnhancedChunk(
        currentChunk,
        chunkIndex,
        position - currentChunk.length,
        position,
        options
      ));
    }

    return chunks;
  }

  // Create an enhanced chunk with metadata
  private static createEnhancedChunk(
    content: string, 
    index: number, 
    start: number, 
    end: number,
    options: ChunkingOptions
  ): SemanticChunk {
    const trimmedContent = content.trim();
    const sentences = trimmedContent.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
    
    // Extract topic keywords
    const topicKeywords = this.extractTopicKeywords(trimmedContent);
    
    // Determine content type
    const contentType = this.determineContentType(trimmedContent);
    
    // Calculate quality score
    const qualityScore = this.calculateQualityScore(trimmedContent);
    
    // Determine complexity
    const complexity = this.determineComplexity(trimmedContent);
    
    return {
      content: trimmedContent,
      tokenCount: this.estimateTokens(trimmedContent),
      chunkIndex: index,
      metadata: {
        startPosition: start,
        endPosition: end,
        sentences,
        semanticBoundary: true,
        topicKeywords,
        contentType,
        qualityScore,
        complexity
      }
    };
  }

  // Extract topic keywords from content
  private static extractTopicKeywords(content: string): string[] {
    const words = content.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3)
      .filter(word => !this.isStopWord(word));

    const wordFreq: Record<string, number> = {};
    words.forEach(word => {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    });

    return Object.entries(wordFreq)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([word]) => word);
  }

  // Determine content type of chunk
  private static determineContentType(content: string): 'paragraph' | 'list' | 'heading' | 'table' | 'code' {
    if (/```|<pre>|<code>|function\s|class\s|def\s/.test(content)) return 'code';
    if (/\|.*\|.*\|/.test(content)) return 'table';
    if (/^\s*[-*+]\s|^\s*\d+\./m.test(content)) return 'list';
    if (/^#{1,6}\s|<h[1-6]>/.test(content)) return 'heading';
    return 'paragraph';
  }

  // Calculate quality score for content
  private static calculateQualityScore(content: string): number {
    let score = 0.5; // Base score

    // Length factor
    if (content.length > 100) score += 0.1;
    if (content.length > 300) score += 0.1;

    // Structure factor
    if (/[.!?]/.test(content)) score += 0.1; // Has proper sentences
    if (/\n/.test(content)) score += 0.1; // Has line breaks
    
    // Readability factor
    const words = content.split(/\s+/).length;
    const sentences = content.split(/[.!?]+/).length;
    const avgWordsPerSentence = words / sentences;
    
    if (avgWordsPerSentence >= 8 && avgWordsPerSentence <= 20) score += 0.2;

    return Math.min(Math.max(score, 0), 1);
  }

  // Determine content complexity
  private static determineComplexity(content: string): 'simple' | 'medium' | 'complex' {
    const words = content.split(/\s+/).length;
    const sentences = content.split(/[.!?]+/).length;
    const avgWordsPerSentence = words / sentences;
    
    const hasComplexStructures = /[{}()\[\]]/.test(content) || 
                                 /\b(however|therefore|furthermore|consequently|nevertheless)\b/i.test(content);

    if (avgWordsPerSentence > 20 || hasComplexStructures || words > 200) return 'complex';
    if (avgWordsPerSentence > 12 || words > 100) return 'medium';
    return 'simple';
  }

  // Check if word is a stop word
  private static isStopWord(word: string): boolean {
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did',
      'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those'
    ]);
    return stopWords.has(word);
  }

  // Get overlap text from the end of a chunk
  private static getOverlapText(text: string, targetTokens: number): string {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    let overlap = '';
    let tokens = 0;

    // Take sentences from the end until we reach target tokens
    for (let i = sentences.length - 1; i >= 0; i--) {
      const sentence = sentences[i].trim() + '.';
      const sentenceTokens = this.estimateTokens(sentence);
      
      if (tokens + sentenceTokens > targetTokens) {
        break;
      }
      
      overlap = sentence + ' ' + overlap;
      tokens += sentenceTokens;
    }

    return overlap.trim();
  }

  // Validate and filter chunks
  private static validateChunks(chunks: SemanticChunk[]): SemanticChunk[] {
    return chunks.filter(chunk => {
      // Filter out chunks that are too small or have poor quality
      return chunk.tokenCount >= 10 && 
             chunk.content.trim().length > 20 &&
             (chunk.metadata.qualityScore || 0) > 0.2;
    });
  }

  // Get chunking statistics
  static getChunkingStats(chunks: SemanticChunk[]): {
    totalChunks: number;
    avgTokensPerChunk: number;
    avgQualityScore: number;
    contentTypeDistribution: Record<string, number>;
    complexityDistribution: Record<string, number>;
  } {
    if (chunks.length === 0) {
      return {
        totalChunks: 0,
        avgTokensPerChunk: 0,
        avgQualityScore: 0,
        contentTypeDistribution: {},
        complexityDistribution: {}
      };
    }

    const avgTokens = chunks.reduce((sum, chunk) => sum + chunk.tokenCount, 0) / chunks.length;
    const avgQuality = chunks.reduce((sum, chunk) => sum + (chunk.metadata.qualityScore || 0), 0) / chunks.length;
    
    const contentTypes: Record<string, number> = {};
    const complexities: Record<string, number> = {};
    
    chunks.forEach(chunk => {
      const contentType = chunk.metadata.contentType || 'unknown';
      const complexity = chunk.metadata.complexity || 'unknown';
      
      contentTypes[contentType] = (contentTypes[contentType] || 0) + 1;
      complexities[complexity] = (complexities[complexity] || 0) + 1;
    });

    return {
      totalChunks: chunks.length,
      avgTokensPerChunk: Math.round(avgTokens),
      avgQualityScore: Math.round(avgQuality * 100) / 100,
      contentTypeDistribution: contentTypes,
      complexityDistribution: complexities
    };
  }
}
