
import React from 'react';

interface TextByteCounterProps {
  text: string;
  className?: string;
}

const TextByteCounter: React.FC<TextByteCounterProps> = ({ text, className = "" }) => {
  const byteCount = new TextEncoder().encode(text).length;
  
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${Math.round(bytes / (1024 * 1024))} MB`;
  };

  return (
    <div className={`text-sm text-gray-500 ${className}`}>
      {formatBytes(byteCount)}
    </div>
  );
};

export default TextByteCounter;
