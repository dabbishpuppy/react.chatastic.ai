
import React from "react";

interface ChatBubblePreviewProps {
  settings: any;
}

export const ChatBubblePreview: React.FC<ChatBubblePreviewProps> = ({ settings }) => {
  // Determine the background style based on whether a chat icon is available
  const backgroundStyle = settings.chat_icon 
    ? {
        backgroundColor: settings.bubble_color || "#3B82F6",
        backgroundImage: `url(${settings.chat_icon})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }
    : {
        backgroundColor: settings.bubble_color || "#3B82F6"
      };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div 
        className="h-16 w-16 rounded-full shadow-lg flex items-center justify-center cursor-pointer hover:shadow-xl transition-shadow"
        style={backgroundStyle}
      >
        {/* If no chat icon is available, show a chat icon */}
        {!settings.chat_icon && (
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
        )}
      </div>
    </div>
  );
};
