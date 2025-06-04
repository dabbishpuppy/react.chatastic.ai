
import React from "react";
import ReactMarkdown from "react-markdown";

interface ChatMessageBubbleProps {
  content: string;
  isAgent: boolean;
  agentBubbleClass: string;
  userBubbleClass: string;
  userMessageStyle?: React.CSSProperties;
}

const ChatMessageBubble: React.FC<ChatMessageBubbleProps> = ({
  content,
  isAgent,
  agentBubbleClass,
  userBubbleClass,
  userMessageStyle = {}
}) => {
  console.log('ChatMessageBubble - content:', content);
  console.log('ChatMessageBubble - isAgent:', isAgent);
  
  return (
    <div 
      className={`rounded-lg p-3 text-[0.875rem] ${
        isAgent ? agentBubbleClass : userBubbleClass
      }`}
      style={isAgent ? {} : userMessageStyle}
    >
      {isAgent ? (
        <ReactMarkdown
          components={{
            p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
            ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
            ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
            li: ({ children }) => <li className="leading-relaxed">{children}</li>,
            strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
            em: ({ children }) => <em className="italic">{children}</em>,
            code: ({ children }) => <code className="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono">{children}</code>,
            pre: ({ children }) => <pre className="bg-gray-100 p-2 rounded mt-2 mb-2 overflow-x-auto text-sm">{children}</pre>,
            h1: ({ children }) => <h1 className="text-lg font-bold mb-2">{children}</h1>,
            h2: ({ children }) => <h2 className="text-base font-bold mb-2">{children}</h2>,
            h3: ({ children }) => <h3 className="text-sm font-bold mb-2">{children}</h3>,
            blockquote: ({ children }) => <blockquote className="border-l-4 border-gray-300 pl-3 italic my-2">{children}</blockquote>,
          }}
        >
          {content}
        </ReactMarkdown>
      ) : (
        <div className="leading-relaxed">{content}</div>
      )}
    </div>
  );
};

export default ChatMessageBubble;
