
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
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [words, setWords] = useState<string[]>([]);

  useEffect(() => {
    // Reset when content changes and split into words while preserving formatting
    const wordArray = content.split(/(\s+)/);
    setWords(wordArray);
    setDisplayedText("");
    setCurrentWordIndex(0);
  }, [content]);

  useEffect(() => {
    if (currentWordIndex < words.length) {
      const timer = setTimeout(() => {
        setDisplayedText(prev => prev + words[currentWordIndex]);
        setCurrentWordIndex(prev => prev + 1);
      }, typingSpeed * 10); // Multiply by 10 since we're doing words instead of characters

      return () => clearTimeout(timer);
    } else if (currentWordIndex === words.length && onComplete) {
      // Small delay before calling onComplete to ensure the last word is visible
      const completeTimer = setTimeout(() => {
        onComplete();
      }, typingSpeed);
      
      return () => clearTimeout(completeTimer);
    }
  }, [currentWordIndex, words, typingSpeed, onComplete]);

  // Custom component to render words with fade-in animation
  const AnimatedContent: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    if (typeof children === 'string') {
      const wordsToDisplay = displayedText.split(/(\s+)/);
      return (
        <span>
          {wordsToDisplay.map((word, index) => (
            <span
              key={index}
              className="animate-fade-in"
              style={{
                animationDelay: `${index * (typingSpeed * 10)}ms`,
                animationDuration: '300ms',
                animationFillMode: 'both'
              }}
            >
              {word}
            </span>
          ))}
        </span>
      );
    }
    return <>{children}</>;
  };

  return (
    <ReactMarkdown
      components={{
        p: ({ children }) => (
          <p className="mb-2 last:mb-0 leading-relaxed">
            <AnimatedContent>{children}</AnimatedContent>
          </p>
        ),
        ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
        li: ({ children }) => (
          <li className="leading-relaxed">
            <AnimatedContent>{children}</AnimatedContent>
          </li>
        ),
        strong: ({ children }) => (
          <strong className="font-semibold">
            <AnimatedContent>{children}</AnimatedContent>
          </strong>
        ),
        em: ({ children }) => (
          <em className="italic">
            <AnimatedContent>{children}</AnimatedContent>
          </em>
        ),
        code: ({ children }) => (
          <code className="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono">
            <AnimatedContent>{children}</AnimatedContent>
          </code>
        ),
        pre: ({ children }) => <pre className="bg-gray-100 p-2 rounded mt-2 mb-2 overflow-x-auto text-sm">{children}</pre>,
        h1: ({ children }) => (
          <h1 className="text-lg font-bold mb-2">
            <AnimatedContent>{children}</AnimatedContent>
          </h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-base font-bold mb-2">
            <AnimatedContent>{children}</AnimatedContent>
          </h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-sm font-bold mb-2">
            <AnimatedContent>{children}</AnimatedContent>
          </h3>
        ),
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-gray-300 pl-3 italic my-2">
            <AnimatedContent>{children}</AnimatedContent>
          </blockquote>
        ),
      }}
    >
      {displayedText}
    </ReactMarkdown>
  );
};

export default TypingMessage;
