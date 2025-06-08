
export interface StreamingChunk {
  content: string;
  delta: string;
  finished: boolean;
}

export interface StreamingOptions {
  onChunk?: (chunk: StreamingChunk) => void;
  onComplete?: (fullResponse: string) => void;
  onError?: (error: Error) => void;
  temperature?: number;
  maxTokens?: number;
}

export class StreamingHandler {
  private static activeStreams = new Map<string, AbortController>();

  static async handleStreamingResponse(
    streamId: string,
    request: any,
    options: StreamingOptions
  ): Promise<string> {
    // Create abort controller for this stream
    const controller = new AbortController();
    this.activeStreams.set(streamId, controller);

    try {
      // Placeholder streaming implementation
      const response = "This is a placeholder streaming response.";
      
      // Simulate streaming chunks
      const chunks = response.split(' ');
      let fullContent = '';
      
      for (let i = 0; i < chunks.length; i++) {
        if (controller.signal.aborted) {
          break;
        }
        
        const chunk: StreamingChunk = {
          content: fullContent + chunks[i] + ' ',
          delta: chunks[i] + ' ',
          finished: i === chunks.length - 1
        };
        
        fullContent += chunks[i] + ' ';
        
        if (options.onChunk) {
          options.onChunk(chunk);
        }
        
        // Small delay to simulate streaming
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      if (options.onComplete) {
        options.onComplete(response);
      }
      
      return response;
    } catch (error) {
      if (options.onError) {
        options.onError(error as Error);
      }
      throw error;
    } finally {
      this.activeStreams.delete(streamId);
    }
  }

  static getActiveStreamsCount(): number {
    return this.activeStreams.size;
  }

  static abortAllStreams(): void {
    for (const [streamId, controller] of this.activeStreams) {
      controller.abort();
    }
    this.activeStreams.clear();
  }

  static abortStream(streamId: string): void {
    const controller = this.activeStreams.get(streamId);
    if (controller) {
      controller.abort();
      this.activeStreams.delete(streamId);
    }
  }
}
