
export function extractTextContent(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
    .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function extractTitle(html: string): string {
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return titleMatch ? titleMatch[1].trim() : '';
}

export function createSemanticChunks(content: string, maxTokens: number = 150): string[] {
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 15);
  const chunks: string[] = [];
  let currentChunk = '';
  let tokenCount = 0;

  for (const sentence of sentences) {
    const sentenceTokens = Math.ceil(sentence.trim().length / 3.5);
    
    if (tokenCount + sentenceTokens > maxTokens && currentChunk) {
      if (currentChunk.trim().length > 30) {
        chunks.push(currentChunk.trim());
      }
      currentChunk = sentence;
      tokenCount = sentenceTokens;
    } else {
      currentChunk += (currentChunk ? '. ' : '') + sentence;
      tokenCount += sentenceTokens;
    }
  }
  
  if (currentChunk.trim().length > 30) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks.filter(chunk => chunk.length > 20);
}

export async function generateContentHash(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
