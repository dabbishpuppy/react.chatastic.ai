
export class RAGUtilities {
  // Utility method for quick RAG responses
  static async quickRAGResponse(
    message: string,
    agentId: string,
    maxSources: number = 3
  ): Promise<string> {
    const { RAGChatProcessor } = await import('./ragChatProcessor');
    
    try {
      const result = await RAGChatProcessor.processMessageWithRAG(message, agentId, undefined, {
        enableRAG: true,
        maxSources,
        enableStreaming: false,
        enableAdvancedFiltering: true
      });
      
      return result.response;
    } catch (error) {
      console.error('❌ Quick RAG response failed:', error);
      return 'I apologize, but I encountered an issue processing your request.';
    }
  }

  // Method to check if RAG should be enabled for a query
  static shouldEnableRAG(message: string, agentId: string): boolean {
    // Simple heuristics to determine if RAG would be beneficial
    const messageLength = message.length;
    const hasQuestionWords = /\b(what|how|when|where|why|who|which|explain|describe|tell me|show me)\b/i.test(message);
    const isGreeting = /\b(hello|hi|hey|good morning|good afternoon|good evening)\b/i.test(message);
    
    // Enable RAG for substantive questions, disable for simple greetings
    return messageLength > 10 && hasQuestionWords && !isGreeting;
  }
}
