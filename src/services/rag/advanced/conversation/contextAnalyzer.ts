
import { ConversationMemory, ContextualQuery } from './types';

export class ConversationContextAnalyzer {
  static findContextReferences(
    query: string,
    memory: ConversationMemory
  ): string[] {
    const references: string[] = [];
    const lowerQuery = query.toLowerCase();

    // Look for pronouns and references
    const referenceWords = ['it', 'this', 'that', 'they', 'them', 'these', 'those'];
    referenceWords.forEach(ref => {
      if (lowerQuery.includes(ref)) {
        references.push(ref);
      }
    });

    // Look for topic references
    memory.topics.forEach(topic => {
      if (lowerQuery.includes(topic.toLowerCase())) {
        references.push(topic);
      }
    });

    return references;
  }

  static findRelevantHistory(
    query: string,
    memory: ConversationMemory
  ): string[] {
    const relevantHistory: string[] = [];
    const queryWords = query.toLowerCase().split(/\s+/);

    // Find messages with word overlap
    memory.messageHistory.slice(-5).forEach(message => {
      const messageWords = message.content.toLowerCase().split(/\s+/);
      const overlap = queryWords.filter(word => 
        messageWords.includes(word) && word.length > 3
      );

      if (overlap.length >= 2) {
        relevantHistory.push(message.content.substring(0, 200));
      }
    });

    return relevantHistory;
  }

  static detectImplicitIntents(
    query: string,
    memory: ConversationMemory
  ): string[] {
    const intents: string[] = [];
    const lowerQuery = query.toLowerCase();

    // Detect follow-up questions
    if (lowerQuery.includes('more') || lowerQuery.includes('tell me') || lowerQuery.includes('explain')) {
      intents.push('seeking_elaboration');
    }

    // Detect comparison requests
    if (lowerQuery.includes('compare') || lowerQuery.includes('difference') || lowerQuery.includes('versus')) {
      intents.push('comparison_request');
    }

    // Detect clarification requests
    if (lowerQuery.includes('what do you mean') || lowerQuery.includes('clarify') || lowerQuery.includes('confused')) {
      intents.push('clarification_needed');
    }

    return intents;
  }

  static calculateContextConfidence(
    contextRefs: number,
    historyItems: number,
    intents: number
  ): number {
    const baseConfidence = 0.5;
    const contextBoost = Math.min(contextRefs * 0.1, 0.3);
    const historyBoost = Math.min(historyItems * 0.1, 0.3);
    const intentBoost = Math.min(intents * 0.05, 0.2);

    return Math.min(baseConfidence + contextBoost + historyBoost + intentBoost, 1.0);
  }
}
