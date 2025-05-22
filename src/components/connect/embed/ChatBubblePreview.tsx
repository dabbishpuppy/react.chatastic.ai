
import React from "react";

interface ChatBubblePreviewProps {
  settings: any;
}

export const ChatBubblePreview: React.FC<ChatBubblePreviewProps> = ({ settings }) => {
  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div 
        className="h-16 w-16 rounded-full shadow-lg flex items-center justify-center cursor-pointer hover:shadow-xl transition-shadow"
        style={{ 
          backgroundColor: settings.bubble_color || "#3B82F6",
          backgroundImage: `url(${settings.chat_icon})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      />
    </div>
  );
};
