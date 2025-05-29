
import { supabase } from "@/integrations/supabase/client";

interface ExtractionResult {
  title: string;
  content: string;
  byline?: string;
  excerpt?: string;
  siteName?: string;
  length: number;
}

interface CompressionResult {
  compressed: Uint8Array;
  originalSize: number;
  compressedSize: number;
  ratio: number;
}

export class ContentExtractionService {
  // Extract main content using Readability-like algorithm
  static async extractContent(html: string, url: string): Promise<ExtractionResult> {
    try {
      // Create a DOM parser from the HTML
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      // Remove script and style elements
      const scriptsAndStyles = doc.querySelectorAll('script, style, noscript');
      scriptsAndStyles.forEach(el => el.remove());

      // Remove navigation, header, footer, sidebar elements
      const boilerplate = doc.querySelectorAll(
        'nav, header, footer, aside, .nav, .navigation, .menu, .sidebar, .header, .footer, .ad, .ads, .advertisement'
      );
      boilerplate.forEach(el => el.remove());

      // Find the main content area
      let contentEl = doc.querySelector('main, article, .content, .post, .entry, #content, #main');
      
      if (!contentEl) {
        // Fallback: find the element with the most text content
        const candidates = doc.querySelectorAll('div, section, article');
        let bestCandidate = null;
        let maxTextLength = 0;

        candidates.forEach(el => {
          const textLength = el.textContent?.length || 0;
          if (textLength > maxTextLength) {
            maxTextLength = textLength;
            bestCandidate = el;
          }
        });

        contentEl = bestCandidate || doc.body;
      }

      // Extract text content while preserving structure
      const extractedText = this.extractTextContent(contentEl);
      
      // Get title
      const titleEl = doc.querySelector('h1, title');
      const title = titleEl?.textContent?.trim() || new URL(url).hostname;

      // Get meta description as excerpt
      const metaDesc = doc.querySelector('meta[name="description"]');
      const excerpt = metaDesc?.getAttribute('content') || '';

      return {
        title,
        content: extractedText,
        excerpt,
        siteName: new URL(url).hostname,
        length: extractedText.length
      };
    } catch (error) {
      console.error('Content extraction failed:', error);
      // Fallback to basic text extraction
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      return {
        title: new URL(url).hostname,
        content: doc.body?.textContent || '',
        length: doc.body?.textContent?.length || 0
      };
    }
  }

  // Extract text while preserving meaningful structure
  private static extractTextContent(element: Element | null): string {
    if (!element) return '';

    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
      {
        acceptNode: (node) => {
          if (node.nodeType === Node.TEXT_NODE) {
            return NodeFilter.FILTER_ACCEPT;
          }
          
          if (node.nodeType === Node.ELEMENT_NODE) {
            const el = node as Element;
            // Skip elements that are likely not content
            if (el.matches('script, style, nav, header, footer, aside, .ad, .ads')) {
              return NodeFilter.FILTER_REJECT;
            }
            return NodeFilter.FILTER_SKIP;
          }
          
          return NodeFilter.FILTER_SKIP;
        }
      }
    );

    const textParts: string[] = [];
    let node;

    while (node = walker.nextNode()) {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent?.trim();
        if (text && text.length > 0) {
          textParts.push(text);
        }
      }
    }

    return textParts.join(' ').replace(/\s+/g, ' ').trim();
  }

  // Compress text using browser's built-in compression
  static async compressText(text: string): Promise<CompressionResult> {
    const encoder = new TextEncoder();
    const originalBytes = encoder.encode(text);
    const originalSize = originalBytes.length;

    try {
      // Use CompressionStream if available (modern browsers)
      if ('CompressionStream' in window) {
        const cs = new CompressionStream('gzip');
        const writer = cs.writable.getWriter();
        const reader = cs.readable.getReader();
        
        writer.write(originalBytes);
        writer.close();
        
        const chunks: Uint8Array[] = [];
        let done = false;
        
        while (!done) {
          const { value, done: readerDone } = await reader.read();
          done = readerDone;
          if (value) {
            chunks.push(value);
          }
        }
        
        // Combine chunks
        const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
        const compressed = new Uint8Array(totalLength);
        let offset = 0;
        
        for (const chunk of chunks) {
          compressed.set(chunk, offset);
          offset += chunk.length;
        }
        
        return {
          compressed,
          originalSize,
          compressedSize: compressed.length,
          ratio: compressed.length / originalSize
        };
      } else {
        // Fallback: just return original bytes (server will handle compression)
        return {
          compressed: originalBytes,
          originalSize,
          compressedSize: originalBytes.length,
          ratio: 1.0
        };
      }
    } catch (error) {
      console.error('Compression failed:', error);
      return {
        compressed: originalBytes,
        originalSize,
        compressedSize: originalBytes.length,
        ratio: 1.0
      };
    }
  }

  // Clean extracted content for chunking (remove ads/navigation markers)
  static cleanContentForChunking(content: string): string {
    // Remove common boilerplate patterns
    const boilerplatePatterns = [
      /^(Home|Navigation|Menu|Skip to|Jump to)/i,
      /^(Copyright|©|\(c\))/i,
      /^(Privacy Policy|Terms of Service|Contact Us)/i,
      /^(Follow us|Subscribe|Newsletter)/i,
      /\b(Advertisement|Sponsored|Ad)\b/gi,
      /\b(Click here|Read more|Learn more)\b/gi,
    ];

    let cleaned = content;

    // Remove boilerplate patterns
    boilerplatePatterns.forEach(pattern => {
      cleaned = cleaned.replace(pattern, '');
    });

    // Remove excessive whitespace
    cleaned = cleaned.replace(/\s+/g, ' ').trim();

    // Remove very short sentences (likely navigation items)
    const sentences = cleaned.split(/[.!?]+/);
    const meaningfulSentences = sentences.filter(sentence => 
      sentence.trim().length > 10 && 
      sentence.trim().split(' ').length > 3
    );

    return meaningfulSentences.join('. ').trim();
  }

  // Generate LLM summary and keywords
  static async generateContentSummary(content: string): Promise<{
    summary: string;
    keywords: string[];
  }> {
    // For now, create a simple extractive summary
    // In production, this would call an LLM API
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20);
    const summary = sentences.slice(0, 3).join('. ').substring(0, 200) + '...';

    // Extract potential keywords (simple word frequency approach)
    const words = content.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3);

    const wordFreq: Record<string, number> = {};
    words.forEach(word => {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    });

    const keywords = Object.entries(wordFreq)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([word]) => word);

    return { summary, keywords };
  }
}
