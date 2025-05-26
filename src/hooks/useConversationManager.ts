
import { useState, useEffect, useRef } from "react";
import { conversationService, Conversation, Message } from "@/services/conversationService";
import { ChatMessage } from "@/types/chatInterface";
import { useParams } from "react-router-dom";

export const useConversationManager = (source: 'iframe' | 'bubble' = 'iframe') => {
  const { agentId } = useParams<{ agentId: string }>();
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [conversationEnded, setConversationEnded] = useState(false);
  const sessionIdRef = useRef<string>(generateSessionId());
  const [conversationCreated, setConversationCreated] = useState(false);

  function generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  const createConversationOnFirstMessage = async () => {
    if (!agentId || conversationCreated) return null;

    console.log('Creating conversation on first message for agentId:', agentId);
    const newSessionId = generateSessionId();
    sessionIdRef.current = newSessionId;

    try {
      const conversation = await conversationService.createConversation(
        agentId,
        newSessionId,
        source
      );
      
      if (conversation) {
        console.log('Conversation created successfully:', conversation.id);
        setCurrentConversation(conversation);
        setConversationEnded(false);
        setConversationCreated(true);
        return conversation;
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
    }
    return null;
  };

  const startNewConversation = async () => {
    if (!agentId) {
      console.warn('Cannot start conversation: agentId is missing');
      return;
    }

    console.log('Starting new conversation for agentId:', agentId);
    const newSessionId = generateSessionId();
    sessionIdRef.current = newSessionId;

    try {
      const conversation = await conversationService.createConversation(
        agentId,
        newSessionId,
        source
      );
      
      if (conversation) {
        console.log('New conversation started:', conversation.id);
        setCurrentConversation(conversation);
        setConversationEnded(false);
        setConversationCreated(true);
      }
    } catch (error) {
      console.error('Error starting new conversation:', error);
    }
  };

  const endCurrentConversation = async () => {
    if (!currentConversation) return;

    try {
      const success = await conversationService.endConversation(currentConversation.id);
      if (success) {
        setConversationEnded(true);
        setCurrentConversation(prev => prev ? { ...prev, status: 'ended' } : null);
      }
    } catch (error) {
      console.error('Error ending conversation:', error);
    }
  };

  const loadConversation = async (conversationId: string) => {
    try {
      const conversation = await conversationService.getConversationById(conversationId);
      if (conversation) {
        setCurrentConversation(conversation);
        setConversationEnded(conversation.status === 'ended');
        setConversationCreated(true);
        sessionIdRef.current = conversation.session_id;
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
    }
  };

  const saveMessage = async (content: string, isAgent: boolean) => {
    // Create conversation on first user message if it doesn't exist
    let conversation = currentConversation;
    if (!conversation && !isAgent) {
      console.log('No conversation exists, creating one for first user message');
      conversation = await createConversationOnFirstMessage();
      if (!conversation) {
        console.error('Failed to create conversation for message');
        return;
      }
    }

    if (!conversation) {
      console.warn('No conversation available to save message to');
      return;
    }

    try {
      console.log('Saving message to conversation:', conversation.id, 'isAgent:', isAgent);
      await conversationService.addMessage(conversation.id, content, isAgent);
      
      // Update conversation title with first user message
      if (!isAgent && !conversation.title) {
        const title = conversationService.generateConversationTitle(content);
        await conversationService.updateConversationTitle(conversation.id, title);
        setCurrentConversation(prev => prev ? { ...prev, title } : null);
      }
    } catch (error) {
      console.error('Error saving message:', error);
    }
  };

  const getConversationMessages = async (conversationId: string): Promise<ChatMessage[]> => {
    try {
      const messages = await conversationService.getMessages(conversationId);
      return messages.map(msg => ({
        isAgent: msg.is_agent,
        content: msg.content,
        timestamp: msg.timestamp
      }));
    } catch (error) {
      console.error('Error fetching conversation messages:', error);
      return [];
    }
  };

  return {
    currentConversation,
    conversationEnded,
    agentId: agentId || '',
    startNewConversation,
    endCurrentConversation,
    loadConversation,
    saveMessage,
    getConversationMessages
  };
};
