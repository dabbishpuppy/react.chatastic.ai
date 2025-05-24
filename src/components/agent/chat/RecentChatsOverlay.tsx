
import React, { useState, useEffect } from "react";
import { X, MessageSquare, Clock, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { conversationService, Conversation } from "@/services/conversationService";
import { formatDistanceToNow } from "date-fns";

interface RecentChatsOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  agentId: string;
  onSelectConversation: (conversationId: string) => void;
  isEmbedded?: boolean;
}

const RecentChatsOverlay: React.FC<RecentChatsOverlayProps> = ({
  isOpen,
  onClose,
  agentId,
  onSelectConversation,
  isEmbedded = false
}) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && agentId) {
      loadRecentConversations();
    }
  }, [isOpen, agentId]);

  const loadRecentConversations = async () => {
    setLoading(true);
    try {
      const recentChats = await conversationService.getRecentConversations(agentId, 20);
      setConversations(recentChats);
    } catch (error) {
      console.error('Error loading recent conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConversationClick = (conversationId: string) => {
    onSelectConversation(conversationId);
    onClose();
  };

  const getConversationPreview = (conversation: Conversation) => {
    return conversation.title || `Chat from ${formatDistanceToNow(new Date(conversation.created_at), { addSuffix: true })}`;
  };

  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 bg-white z-50 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
        <div className="flex items-center gap-2">
          <History size={20} />
          <h3 className="font-semibold">Recent Chats</h3>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X size={18} />
        </Button>
      </div>

      {/* Content with proper scrolling */}
      <div 
        className="flex-1 overflow-y-auto overflow-x-hidden" 
        style={{ 
          scrollbarWidth: 'thin',
          WebkitOverflowScrolling: 'touch'
        }}
        onWheel={(e) => {
          // Allow mouse wheel scrolling
          e.stopPropagation();
        }}
      >
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900"></div>
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <MessageSquare size={48} className="text-gray-300 mb-4" />
            <h4 className="text-lg font-medium mb-2">No recent chats</h4>
            <p className="text-gray-500">
              Your chat history will appear here once you start chatting.
            </p>
          </div>
        ) : (
          <div className="p-4 space-y-2">
            {conversations.map((conversation) => (
              <div
                key={conversation.id}
                onClick={() => handleConversationClick(conversation.id)}
                className="p-3 rounded-lg border cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium text-sm truncate pr-2">
                    {getConversationPreview(conversation)}
                  </h4>
                  <span className={`text-xs px-2 py-1 rounded flex-shrink-0 ${
                    conversation.status === 'active' 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {conversation.status}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Clock size={12} />
                  <span>{formatDistanceToNow(new Date(conversation.updated_at), { addSuffix: true })}</span>
                  <span>•</span>
                  <span className="capitalize">{conversation.source}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RecentChatsOverlay;
