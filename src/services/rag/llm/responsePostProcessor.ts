
import { LLMResponse } from './llmRouter';

export interface PostProcessingOptions {
  addSourceCitations?: boolean;
  enforceContentSafety?: boolean;
  formatMarkdown?: boolean;
  addTimestamp?: boolean;
  customFormatting?: {
    wrapCodeBlocks?: boolean;
    highlightKeywords?: string[];
    addCallToAction?: string;
  };
}

export interface ProcessedResponse {
  content: string;
  citations: Array<{
    index: number;
    sourceId: string;
    sourceName: string;
    chunkIndex: number;
  }>;
  safetyFlags: Array<{
    type: 'content' | 'bias' | 'harmful';
    severity: 'low' | 'medium' | 'high';
    description: string;
  }>;
  metadata: {
    originalLength: number;
    processedLength: number;
    processingTime: number;
    citationsAdded: number;
  };
}

export class ResponsePostProcessor {
  private static readonly SAFETY_PATTERNS = [
    {
      pattern: /(?:hate|violence|harmful|dangerous)/gi,
      type: 'harmful' as const,
      severity: 'medium' as const
    },
    {
      pattern: /(?:bias|stereotype|discriminat)/gi,
      type: 'bias' as const,
      severity: 'low' as const
    }
  ];

  static async processResponse(
    response: LLMResponse,
    options: PostProcessingOptions = {}
  ): Promise<ProcessedResponse> {
    const startTime = Date.now();
    
    console.log('🔧 Post-processing LLM response:', {
      originalLength: response.content.length,
      addCitations: options.addSourceCitations,
      contentSafety: options.enforceContentSafety
    });

    try {
      let processedContent = response.content;
      const citations: ProcessedResponse['citations'] = [];
      const safetyFlags: ProcessedResponse['safetyFlags'] = [];

      // Step 1: Add source citations
      if (options.addSourceCitations && response.sources && response.sources.length > 0) {
        const citationResult = this.addSourceCitations(processedContent, response.sources);
        processedContent = citationResult.content;
        citations.push(...citationResult.citations);
      }

      // Step 2: Content safety check
      if (options.enforceContentSafety) {
        const safetyResult = this.checkContentSafety(processedContent);
        safetyFlags.push(...safetyResult);
      }

      // Step 3: Format markdown
      if (options.formatMarkdown) {
        processedContent = this.formatMarkdown(processedContent);
      }

      // Step 4: Add timestamp
      if (options.addTimestamp) {
        processedContent = this.addTimestamp(processedContent);
      }

      // Step 5: Custom formatting
      if (options.customFormatting) {
        processedContent = this.applyCustomFormatting(processedContent, options.customFormatting);
      }

      const processingTime = Date.now() - startTime;

      const result: ProcessedResponse = {
        content: processedContent,
        citations,
        safetyFlags,
        metadata: {
          originalLength: response.content.length,
          processedLength: processedContent.length,
          processingTime,
          citationsAdded: citations.length
        }
      };

      console.log('✅ Post-processing complete:', {
        processingTime,
        citationsAdded: citations.length,
        safetyFlags: safetyFlags.length,
        lengthChange: processedContent.length - response.content.length
      });

      return result;
    } catch (error) {
      console.error('❌ Post-processing failed:', error);
      throw error;
    }
  }

  private static addSourceCitations(
    content: string,
    sources: LLMResponse['sources']
  ): { content: string; citations: ProcessedResponse['citations'] } {
    if (!sources || sources.length === 0) {
      return { content, citations: [] };
    }

    const citations: ProcessedResponse['citations'] = [];
    let processedContent = content;

    // Add citation markers and collect citation info
    sources.forEach((source, index) => {
      const citationIndex = index + 1;
      citations.push({
        index: citationIndex,
        sourceId: source.sourceId,
        sourceName: source.sourceName,
        chunkIndex: source.chunkIndex
      });
    });

    // Add citations section at the end
    if (citations.length > 0) {
      processedContent += '\n\n**Sources:**\n';
      citations.forEach(citation => {
        processedContent += `${citation.index}. ${citation.sourceName}\n`;
      });
    }

    return { content: processedContent, citations };
  }

  private static checkContentSafety(content: string): ProcessedResponse['safetyFlags'] {
    const flags: ProcessedResponse['safetyFlags'] = [];

    for (const pattern of this.SAFETY_PATTERNS) {
      const matches = content.match(pattern.pattern);
      if (matches && matches.length > 0) {
        flags.push({
          type: pattern.type,
          severity: pattern.severity,
          description: `Detected ${matches.length} potential ${pattern.type} indicators`
        });
      }
    }

    return flags;
  }

  private static formatMarkdown(content: string): string {
    // Basic markdown formatting improvements
    let formatted = content;

    // Ensure proper spacing around headers
    formatted = formatted.replace(/^(#{1,6})\s*(.+)$/gm, '$1 $2\n');

    // Ensure proper spacing around lists
    formatted = formatted.replace(/^([*\-+])\s*(.+)$/gm, '$1 $2');

    // Ensure proper spacing around code blocks
    formatted = formatted.replace(/```(\w+)?\n/g, '```$1\n');

    return formatted;
  }

  private static addTimestamp(content: string): string {
    const timestamp = new Date().toLocaleString();
    return `${content}\n\n*Response generated at ${timestamp}*`;
  }

  private static applyCustomFormatting(
    content: string,
    formatting: NonNullable<PostProcessingOptions['customFormatting']>
  ): string {
    let formatted = content;

    // Wrap code blocks
    if (formatting.wrapCodeBlocks) {
      formatted = formatted.replace(/`([^`]+)`/g, '**`$1`**');
    }

    // Highlight keywords
    if (formatting.highlightKeywords && formatting.highlightKeywords.length > 0) {
      for (const keyword of formatting.highlightKeywords) {
        const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
        formatted = formatted.replace(regex, `**$&**`);
      }
    }

    // Add call to action
    if (formatting.addCallToAction) {
      formatted += `\n\n${formatting.addCallToAction}`;
    }

    return formatted;
  }

  static extractKeyMetrics(response: ProcessedResponse): {
    readability: number;
    citationDensity: number;
    safetyScore: number;
  } {
    const wordCount = response.content.split(/\s+/).length;
    const sentenceCount = response.content.split(/[.!?]+/).length;
    
    // Simple readability score (words per sentence)
    const readability = wordCount / Math.max(sentenceCount, 1);
    
    // Citation density (citations per 100 words)
    const citationDensity = (response.citations.length / wordCount) * 100;
    
    // Safety score (lower is better, 0-10 scale)
    const highSeverityFlags = response.safetyFlags.filter(f => f.severity === 'high').length;
    const mediumSeverityFlags = response.safetyFlags.filter(f => f.severity === 'medium').length;
    const lowSeverityFlags = response.safetyFlags.filter(f => f.severity === 'low').length;
    
    const safetyScore = Math.min(10, highSeverityFlags * 5 + mediumSeverityFlags * 2 + lowSeverityFlags);

    return {
      readability: Math.round(readability * 10) / 10,
      citationDensity: Math.round(citationDensity * 10) / 10,
      safetyScore
    };
  }
}
