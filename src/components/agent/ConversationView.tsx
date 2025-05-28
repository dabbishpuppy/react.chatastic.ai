
import React from "react";
import ConversationHeader from "./conversation/ConversationHeader";
import ConversationMessages from "./conversation/ConversationMessages";
import ConversationDeleteDialog from "./conversation/ConversationDeleteDialog";
import { useConversationView } from "./conversation/useConversationView";
import { ConversationMessage } from "@/services/conversationLoader";

interface ConversationViewProps {
  conversation: {
    id: string;
    title: string;
    daysAgo: string;
    source: string;
    messages?: ConversationMessage[];
  };
  onClose: () => void;
  onDelete: () => void;
  theme?: 'light' | 'dark';
  profilePicture?: string;
  displayName?: string;
  userMessageColor?: string;
  showDeleteButton?: boolean;
  conversationStatus?: string;
  conversationSource?: string;
  agentId?: string;
}

const ConversationView: React.FC<ConversationViewProps> = ({
  conversation,
  onClose,
  onDelete,
  theme = 'light',
  profilePicture,
  displayName = 'AI Assistant',
  userMessageColor = '#000000',
  showDeleteButton = false,
  conversationStatus,
  conversationSource,
  agentId
}) => {
  const {
    showDeleteDialog,
    setShowDeleteDialog,
    messages,
    isLoading,
    handleFeedback,
    handleCopy,
    userMessageStyle,
    handleDeleteConfirm
  } = useConversationView({
    conversation,
    agentId,
    userMessageColor
  });

  return (
    <div className={`flex flex-col h-full ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-white text-black'} rounded-lg border`}>
      <ConversationHeader
        conversation={conversation}
        displayName={displayName}
        profilePicture={profilePicture}
        conversationStatus={conversationStatus}
        showDeleteButton={showDeleteButton}
        theme={theme}
        onDeleteClick={() => setShowDeleteDialog(true)}
      />

      <div className="flex-1 overflow-y-auto p-4">
        <ConversationMessages
          messages={messages}
          isLoading={isLoading}
          displayName={displayName}
          profilePicture={profilePicture}
          userMessageColor={userMessageColor}
          theme={theme}
          onFeedback={handleFeedback}
          onCopy={handleCopy}
        />
      </div>

      <ConversationDeleteDialog
        isOpen={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={() => handleDeleteConfirm(onDelete)}
      />
    </div>
  );
};

export default ConversationView;
