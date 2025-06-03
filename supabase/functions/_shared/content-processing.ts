
export function extractTextContent(html: string): string {
  // Remove script, style, and other non-content elements
  let cleanedHtml = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
    .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, '')
    .replace(/<form[^>]*>[\s\S]*?<\/form>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '');

  // Extract text from common content containers first
  const contentSelectors = [
    /<main[^>]*>([\s\S]*?)<\/main>/gi,
    /<article[^>]*>([\s\S]*?)<\/article>/gi,
    /<section[^>]*>([\s\S]*?)<\/section>/gi,
    /<div[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
    /<div[^>]*class="[^"]*main[^"]*"[^>]*>([\s\S]*?)<\/div>/gi
  ];

  let extractedContent = '';
  for (const selector of contentSelectors) {
    const matches = cleanedHtml.match(selector);
    if (matches) {
      extractedContent += matches.map(match => match.replace(selector, '$1')).join(' ');
    }
  }

  // If no content containers found, use the entire cleaned HTML
  if (!extractedContent.trim()) {
    extractedContent = cleanedHtml;
  }

  // Convert to plain text and clean up
  const textContent = extractedContent
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

  // If content is still very short, try to extract from title and meta description
  if (textContent.length < 50) {
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const descriptionMatch = html.match(/<meta[^>]*name="description"[^>]*content="([^"]+)"/i);
    
    let fallbackContent = '';
    if (titleMatch) {
      fallbackContent += titleMatch[1].trim() + '. ';
    }
    if (descriptionMatch) {
      fallbackContent += descriptionMatch[1].trim() + '. ';
    }
    
    if (fallbackContent.length > textContent.length) {
      return fallbackContent;
    }
  }

  return textContent;
}

export function extractTitle(html: string): string {
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch) {
    return titleMatch[1].trim();
  }
  
  // Fallback to h1 if no title
  const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  if (h1Match) {
    return h1Match[1].replace(/<[^>]+>/g, '').trim();
  }
  
  return '';
}

export function createSemanticChunks(content: string, maxTokens: number = 150): string[] {
  // If content is very short, create a single chunk
  if (content.length < 100) {
    return content.trim() ? [content.trim()] : [];
  }

  // Split by sentences but be more flexible
  const sentences = content
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 10); // Reduced minimum sentence length

  if (sentences.length === 0) {
    return content.trim() ? [content.trim()] : [];
  }

  const chunks: string[] = [];
  let currentChunk = '';
  let tokenCount = 0;

  for (const sentence of sentences) {
    const sentenceTokens = Math.ceil(sentence.trim().length / 3.5);
    
    if (tokenCount + sentenceTokens > maxTokens && currentChunk) {
      if (currentChunk.trim().length > 20) { // Reduced minimum chunk length
        chunks.push(currentChunk.trim());
      }
      currentChunk = sentence;
      tokenCount = sentenceTokens;
    } else {
      currentChunk += (currentChunk ? '. ' : '') + sentence;
      tokenCount += sentenceTokens;
    }
  }
  
  if (currentChunk.trim().length > 20) {
    chunks.push(currentChunk.trim());
  }
  
  // If no chunks were created but we have content, create one chunk
  if (chunks.length === 0 && content.trim().length > 0) {
    chunks.push(content.trim());
  }
  
  return chunks.filter(chunk => chunk.length > 15); // Further reduced minimum
}

export async function generateContentHash(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
