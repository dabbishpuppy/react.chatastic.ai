
import React, { useState, useEffect } from "react";

interface TypingMessageProps {
  content: string;
  onComplete?: () => void;
  typingSpeed?: number;
}

const TypingMessage: React.FC<TypingMessageProps> = ({
  content,
  onComplete,
  typingSpeed = 50
}) => {
  const [displayedText, setDisplayedText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < content.length) {
      const timer = setTimeout(() => {
        setDisplayedText(prev => prev + content[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, typingSpeed);

      return () => clearTimeout(timer);
    } else if (onComplete) {
      onComplete();
    }
  }, [currentIndex, content, typingSpeed, onComplete]);

  useEffect(() => {
    // Reset when content changes
    setDisplayedText("");
    setCurrentIndex(0);
  }, [content]);

  return <span>{displayedText}</span>;
};

export default TypingMessage;
