
import React from "react";

const EmbeddedChatLoading: React.FC = () => {
  return (
    <div className="flex items-center justify-center w-full h-screen bg-white">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900"></div>
    </div>
  );
};

export default EmbeddedChatLoading;
