export interface StreamingChunk {
  delta: string;
  isComplete: boolean;
  metadata?: {
    tokensUsed?: number;
    provider?: string;
    model?: string;
  };
}

export interface StreamingOptions {
  onChunk?: (chunk: StreamingChunk) => void;
  onComplete?: (fullResponse: string) => void;
  onError?: (error: Error) => void;
  onThinkingStart?: () => void;
  onThinkingEnd?: () => void;
  onTypingStart?: (messageId: string) => void;
  onTypingComplete?: (messageId: string) => void;
  abortSignal?: AbortSignal;
}

export class StreamingHandler {
  private static activeStreams = new Map<string, AbortController>();

  static async handleStreamingResponse(
    streamId: string,
    request: any,
    options: StreamingOptions
  ): Promise<string> {
    console.log('🌊 Starting streaming response:', { streamId });

    // Create abort controller for this stream
    const abortController = new AbortController();
    this.activeStreams.set(streamId, abortController);

    // Handle external abort signal
    if (options.abortSignal) {
      options.abortSignal.addEventListener('abort', () => {
        abortController.abort();
      });
    }

    try {
      let fullResponse = '';
      let chunkCount = 0;

      // Start thinking phase
      console.log('🤔 Starting thinking phase');
      options.onThinkingStart?.();

      // Faster thinking delay (reduced from 1500ms to 800ms)
      await new Promise(resolve => setTimeout(resolve, 800));

      if (abortController.signal.aborted) {
        throw new Error('Stream aborted during thinking phase');
      }

      // End thinking, start typing
      console.log('⌨️ Starting typing phase');
      options.onThinkingEnd?.();
      
      // Generate a message ID for typing
      const messageId = `stream-${streamId}`;
      options.onTypingStart?.(messageId);

      // Simulate streaming chunks
      const simulateStreaming = () => {
        return new Promise<string>((resolve, reject) => {
          const chunks = [
            'Based on the provided context, ',
            'I can help you with your question. ',
            'Here\'s what I found: ',
            'The information shows that ',
            'this is a comprehensive answer ',
            'that addresses your specific needs. ',
            'Let me know if you need clarification!'
          ];

          const sendChunk = (index: number) => {
            if (abortController.signal.aborted) {
              reject(new Error('Stream aborted'));
              return;
            }

            if (index >= chunks.length) {
              const finalChunk: StreamingChunk = {
                delta: '',
                isComplete: true,
                metadata: {
                  tokensUsed: fullResponse.split(' ').length,
                  provider: 'openai',
                  model: 'gpt-4o-mini'
                }
              };

              options.onChunk?.(finalChunk);
              options.onComplete?.(fullResponse);
              options.onTypingComplete?.(messageId);
              resolve(fullResponse);
              return;
            }

            const delta = chunks[index];
            fullResponse += delta;
            chunkCount++;

            const chunk: StreamingChunk = {
              delta,
              isComplete: false
            };

            console.log(`📦 Streaming chunk ${chunkCount}:`, delta.substring(0, 30) + '...');
            options.onChunk?.(chunk);

            // Faster streaming speed (reduced from 800-1200ms to 300-500ms)
            setTimeout(() => sendChunk(index + 1), 300 + Math.random() * 200);
          };

          sendChunk(0);
        });
      };

      const result = await simulateStreaming();

      console.log('✅ Streaming completed:', {
        streamId,
        totalChunks: chunkCount,
        totalLength: fullResponse.length
      });

      return result;

    } catch (error) {
      console.error('❌ Streaming failed:', error);
      options.onError?.(error as Error);
      throw error;
    } finally {
      this.activeStreams.delete(streamId);
    }
  }

  static abortStream(streamId: string): boolean {
    const controller = this.activeStreams.get(streamId);
    if (controller) {
      console.log('🛑 Aborting stream:', streamId);
      controller.abort();
      this.activeStreams.delete(streamId);
      return true;
    }
    return false;
  }

  static getActiveStreamsCount(): number {
    return this.activeStreams.size;
  }

  static abortAllStreams(): void {
    console.log('🛑 Aborting all active streams:', this.activeStreams.size);
    
    for (const [streamId, controller] of this.activeStreams) {
      controller.abort();
    }
    
    this.activeStreams.clear();
  }

  // Server-Sent Events implementation for real streaming
  static createSSEStream(
    request: any,
    onMessage: (data: any) => void
  ): EventSource | null {
    try {
      // In real implementation, this would connect to an edge function
      // that provides Server-Sent Events
      console.log('🔗 Creating SSE connection for streaming');
      
      // For now, return null as we're using simulated streaming
      return null;
    } catch (error) {
      console.error('❌ Failed to create SSE stream:', error);
      return null;
    }
  }

  // WebSocket implementation for bidirectional streaming
  static createWebSocketStream(
    endpoint: string,
    onMessage: (data: any) => void,
    onError: (error: Event) => void
  ): WebSocket | null {
    try {
      console.log('🔗 Creating WebSocket connection for streaming');
      
      const ws = new WebSocket(endpoint);
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onMessage(data);
        } catch (error) {
          console.error('❌ Failed to parse WebSocket message:', error);
        }
      };

      ws.onerror = onError;
      
      return ws;
    } catch (error) {
      console.error('❌ Failed to create WebSocket stream:', error);
      return null;
    }
  }
}
