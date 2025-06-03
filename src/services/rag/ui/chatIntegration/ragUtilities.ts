
import { ChatRAGOptions } from '../ragChatIntegration';

export const createDefaultRAGOptions = (): ChatRAGOptions => {
  return {
    enableRAG: true,
    maxSources: 5,
    enableStreaming: false,
    customSystemPrompt: undefined
  };
};

export const validateRAGOptions = (options: ChatRAGOptions): boolean => {
  if (options.maxSources && (options.maxSources < 1 || options.maxSources > 20)) {
    return false;
  }
  
  return true;
};

export const mergeRAGOptions = (
  defaultOptions: ChatRAGOptions,
  userOptions: Partial<ChatRAGOptions>
): ChatRAGOptions => {
  return {
    ...defaultOptions,
    ...userOptions
  };
};
