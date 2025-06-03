
import React, { useState, useEffect } from "react";

interface TypingMessageProps {
  content: string;
  onComplete?: () => void;
  typingSpeed?: number;
}

const TypingMessage: React.FC<TypingMessageProps> = ({
  content,
  onComplete,
  typingSpeed = 30
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

  return <span>{displayedText}</span>;
};

export default TypingMessage;
