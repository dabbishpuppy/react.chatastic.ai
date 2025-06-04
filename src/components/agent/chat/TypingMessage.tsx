
import React, { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";

interface TypingMessageProps {
  content: string;
  onComplete?: () => void;
  typingSpeed?: number;
}

const TypingMessage: React.FC<TypingMessageProps> = ({
  content,
  onComplete,
  typingSpeed = 10
}) => {
  const [displayedText, setDisplayedText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    // Reset when content changes
    setDisplayedText("");
    setCurrentIndex(0);
  }, [content]);

  useEffect(() => {
    if (currentIndex < content.length) {
      const timer = setTimeout(() => {
        setDisplayedText(prev => prev + content[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, typingSpeed);

      return () => clearTimeout(timer);
    } else if (currentIndex === content.length && onComplete) {
      // Small delay before calling onComplete to ensure the last character is visible
      const completeTimer = setTimeout(() => {
        onComplete();
      }, typingSpeed);
      
      return () => clearTimeout(completeTimer);
    }
  }, [currentIndex, content, typingSpeed, onComplete]);

  return (
    <ReactMarkdown
      components={{
        p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
        ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal mb-2">{children}</ol>,
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
      {displayedText}
    </ReactMarkdown>
  );
};

export default TypingMessage;
