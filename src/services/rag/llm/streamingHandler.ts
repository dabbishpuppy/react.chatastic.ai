
export interface StreamingOptions {
  onChunk?: (chunk: string) => void;
  onComplete?: (response: string) => void;
  onError?: (error: Error) => void;
  temperature?: number;
  maxTokens?: number;
}

export interface StreamingChunk {
  id: string;
  delta: string;
  isComplete: boolean;
  timestamp: number;
}

export interface StreamData {
  id: string;
  content: string;
  isComplete: boolean;
  timestamp: number;
}

export class StreamingHandler {
  private static activeStreams = new Map<string, AbortController>();
  private static streamData = new Map<string, StreamData>();

  /**
   * Handle streaming response from LLM
   */
  static async handleStreamingResponse(
    streamId: string,
    llmRequest: any,
    options: StreamingOptions = {}
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const abortController = new AbortController();
      this.activeStreams.set(streamId, abortController);

      let fullResponse = '';
      
      // Initialize stream data
      this.streamData.set(streamId, {
        id: streamId,
        content: '',
        isComplete: false,
        timestamp: Date.now()
      });

      this.processStream(streamId, llmRequest, {
        ...options,
        onChunk: (chunk: string) => {
          fullResponse += chunk;
          
          // Update stream data
          const streamData = this.streamData.get(streamId);
          if (streamData) {
            streamData.content = fullResponse;
            streamData.timestamp = Date.now();
          }

          // Call user callback
          options.onChunk?.(chunk);
        },
        onComplete: (response: string) => {
          // Mark as complete
          const streamData = this.streamData.get(streamId);
          if (streamData) {
            streamData.isComplete = true;
            streamData.content = response;
          }

          // Cleanup
          this.activeStreams.delete(streamId);
          
          options.onComplete?.(response);
          resolve(response);
        },
        onError: (error: Error) => {
          // Cleanup on error
          this.activeStreams.delete(streamId);
          this.streamData.delete(streamId);
          
          options.onError?.(error);
          reject(error);
        }
      });
    });
  }

  /**
   * Process the actual streaming
   */
  private static async processStream(
    streamId: string,
    llmRequest: any,
    options: StreamingOptions
  ): Promise<void> {
    try {
      // Determine which LLM provider to use
      const provider = this.getProviderFromModel(llmRequest.model || 'gpt-4o-mini');
      
      const response = await fetch(`${window.location.origin}/api/llm-${provider}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...llmRequest,
          stream: true,
          temperature: options.temperature || 0.7,
          max_tokens: options.maxTokens || 1000
        }),
        signal: this.activeStreams.get(streamId)?.signal
      });

      if (!response.ok) {
        throw new Error(`LLM API error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body reader available');
      }

      const decoder = new TextDecoder();
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          options.onComplete?.(fullContent);
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            
            if (data === '[DONE]') {
              options.onComplete?.(fullContent);
              return;
            }

            try {
              const parsed = JSON.parse(data);
              const content = this.extractContentFromChunk(parsed, provider);
              
              if (content) {
                fullContent += content;
                options.onChunk?.(content);
              }
            } catch (e) {
              // Skip invalid JSON chunks
              continue;
            }
          }
        }
      }
    } catch (error) {
      console.error('Streaming error:', error);
      options.onError?.(error as Error);
    }
  }

  /**
   * Extract content from streaming chunk based on provider
   */
  private static extractContentFromChunk(chunk: any, provider: string): string {
    switch (provider) {
      case 'openai':
        return chunk.choices?.[0]?.delta?.content || '';
      case 'anthropic':
        return chunk.delta?.text || '';
      case 'google':
        return chunk.candidates?.[0]?.content?.parts?.[0]?.text || '';
      default:
        return '';
    }
  }

  /**
   * Get provider from model name
   */
  private static getProviderFromModel(model: string): string {
    if (model.startsWith('gpt-')) return 'openai';
    if (model.startsWith('claude-')) return 'anthropic';
    if (model.startsWith('gemini-')) return 'google';
    return 'openai'; // Default
  }

  /**
   * Get stream data for monitoring
   */
  static getStreamData(streamId: string): StreamData | null {
    return this.streamData.get(streamId) || null;
  }

  /**
   * Cancel a stream
   */
  static cancelStream(streamId: string): boolean {
    const controller = this.activeStreams.get(streamId);
    if (controller) {
      controller.abort();
      this.activeStreams.delete(streamId);
      this.streamData.delete(streamId);
      return true;
    }
    return false;
  }

  /**
   * Get active streams count
   */
  static getActiveStreamsCount(): number {
    return this.activeStreams.size;
  }

  /**
   * Cleanup old stream data
   */
  static cleanupOldStreams(maxAge: number = 300000): number { // 5 minutes
    const now = Date.now();
    let cleaned = 0;

    for (const [streamId, data] of this.streamData.entries()) {
      if (now - data.timestamp > maxAge) {
        this.streamData.delete(streamId);
        this.activeStreams.delete(streamId);
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * Abort all active streams
   */
  static abortAllStreams(): number {
    const count = this.activeStreams.size;
    
    for (const [streamId, controller] of this.activeStreams.entries()) {
      controller.abort();
    }
    
    this.activeStreams.clear();
    this.streamData.clear();
    
    return count;
  }
}
