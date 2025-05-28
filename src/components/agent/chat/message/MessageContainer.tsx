
import React from "react";

interface MessageContainerProps {
  isAgent: boolean;
  children: React.ReactNode;
}

const MessageContainer: React.FC<MessageContainerProps> = ({
  isAgent,
  children
}) => {
  return (
    <div className={`flex mb-4 ${isAgent ? '' : 'justify-end'}`}>
      {children}
    </div>
  );
};

export default MessageContainer;
