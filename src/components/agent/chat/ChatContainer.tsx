
import React from "react";

interface ChatContainerProps {
  isEmbedded: boolean;
  themeClasses: {
    background: string;
  };
  children: React.ReactNode;
  chatContainerRef: React.RefObject<HTMLDivElement>;
}

const ChatContainer: React.FC<ChatContainerProps> = ({
  isEmbedded,
  themeClasses,
  children,
  chatContainerRef
}) => {
  const containerClasses = isEmbedded 
    ? `flex flex-col h-screen w-full max-w-[800px] mx-auto ${themeClasses.background} overflow-hidden`
    : `flex flex-col h-full max-w-[800px] mx-auto ${themeClasses.background} overflow-hidden`;

  return (
    <div className={containerClasses} ref={chatContainerRef}>
      {children}
    </div>
  );
};

export default ChatContainer;
