
export const debugEmbeddedChat = (context: string, data: any) => {
  console.log(`🔍 [EmbeddedChat Debug] ${context}:`, data);
};

export const logEmbeddedChatError = (context: string, error: any) => {
  console.error(`❌ [EmbeddedChat Error] ${context}:`, error);
};

export const logEmbeddedChatSuccess = (context: string, data?: any) => {
  console.log(`✅ [EmbeddedChat Success] ${context}`, data ? ':' : '', data || '');
};
