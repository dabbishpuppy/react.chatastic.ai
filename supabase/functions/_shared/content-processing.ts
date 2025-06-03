
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

  // Enhanced content extraction for privacy/legal pages
  const contentSelectors = [
    // Privacy policy specific selectors
    /<div[^>]*class="[^"]*privacy[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
    /<div[^>]*id="[^"]*privacy[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
    /<section[^>]*class="[^"]*privacy[^"]*"[^>]*>([\s\S]*?)<\/section>/gi,
    /<div[^>]*class="[^"]*policy[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
    /<div[^>]*id="[^"]*policy[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
    
    // Legal content selectors
    /<div[^>]*class="[^"]*legal[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
    /<div[^>]*class="[^"]*terms[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
    
    // Generic content containers
    /<main[^>]*>([\s\S]*?)<\/main>/gi,
    /<article[^>]*>([\s\S]*?)<\/article>/gi,
    /<section[^>]*>([\s\S]*?)<\/section>/gi,
    /<div[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
    /<div[^>]*class="[^"]*main[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
    /<div[^>]*id="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
    /<div[^>]*id="[^"]*main[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
    
    // Fallback: look for divs with substantial text content
    /<div[^>]*class="[^"]*text[^"]*"[^>]*>([\s\S]*?)<\/div>/gi
  ];

  let extractedContent = '';
  let bestMatch = '';
  let bestMatchLength = 0;

  for (const selector of contentSelectors) {
    const matches = cleanedHtml.match(selector);
    if (matches) {
      for (const match of matches) {
        const content = match.replace(selector, '$1');
        const textLength = content.replace(/<[^>]+>/g, '').trim().length;
        
        if (textLength > bestMatchLength) {
          bestMatch = content;
          bestMatchLength = textLength;
        }
      }
    }
  }

  // Use the best match if found, otherwise use entire cleaned HTML
  extractedContent = bestMatch || cleanedHtml;

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

  // Enhanced fallback for legal/policy pages
  if (textContent.length < 100) {
    console.log('📄 Content too short, trying enhanced extraction...');
    
    // Look for policy-specific content patterns
    const policyPatterns = [
      /privacy\s+policy[\s\S]{0,2000}/gi,
      /terms\s+of\s+service[\s\S]{0,2000}/gi,
      /data\s+protection[\s\S]{0,2000}/gi,
      /cookie\s+policy[\s\S]{0,2000}/gi
    ];
    
    for (const pattern of policyPatterns) {
      const match = cleanedHtml.match(pattern);
      if (match && match[0].length > textContent.length) {
        const enhancedContent = match[0]
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        
        if (enhancedContent.length > 50) {
          console.log('✅ Found enhanced policy content');
          return enhancedContent;
        }
      }
    }

    // Final fallback with title and meta description
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

export function createSemanticChunks(content: string, maxTokens: number = 200): string[] {
  // If content is very short, create a single chunk
  if (content.length < 100) {
    return content.trim() ? [content.trim()] : [];
  }

  // For legal/policy content, use smaller chunks to preserve context
  const isLegalContent = /privacy|policy|terms|legal|cookie|gdpr|data protection/i.test(content);
  const chunkSize = isLegalContent ? 150 : maxTokens;

  // Split by sentences but be more flexible
  const sentences = content
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 5); // Reduced minimum sentence length for legal text

  if (sentences.length === 0) {
    return content.trim() ? [content.trim()] : [];
  }

  const chunks: string[] = [];
  let currentChunk = '';
  let tokenCount = 0;

  for (const sentence of sentences) {
    const sentenceTokens = Math.ceil(sentence.trim().length / 3.5);
    
    if (tokenCount + sentenceTokens > chunkSize && currentChunk) {
      if (currentChunk.trim().length > 10) { // Reduced minimum chunk length for legal text
        chunks.push(currentChunk.trim());
      }
      currentChunk = sentence;
      tokenCount = sentenceTokens;
    } else {
      currentChunk += (currentChunk ? '. ' : '') + sentence;
      tokenCount += sentenceTokens;
    }
  }
  
  if (currentChunk.trim().length > 10) {
    chunks.push(currentChunk.trim());
  }
  
  // If no chunks were created but we have content, create one chunk
  if (chunks.length === 0 && content.trim().length > 0) {
    chunks.push(content.trim());
  }
  
  return chunks.filter(chunk => chunk.length > 10); // Further reduced minimum for legal content
}

export async function generateContentHash(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
