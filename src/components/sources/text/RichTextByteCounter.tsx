
import React from 'react';

interface RichTextByteCounterProps {
  html: string;
  question?: string; // Optional question for Q&A sources
}

const RichTextByteCounter: React.FC<RichTextByteCounterProps> = ({ html, question }) => {
  // Strip HTML tags to get plain text for byte counting
  const stripHtml = (htmlString: string) => {
    const tmp = document.createElement('div');
    tmp.innerHTML = htmlString;
    return tmp.textContent || tmp.innerText || '';
  };

  // For Q&A sources, only measure the answer content (not the full stored structure)
  const plainText = stripHtml(html);
  const byteCount = new TextEncoder().encode(plainText).length;
  
  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${Math.round(bytes / (1024 * 1024))} MB`;
  };

  return (
    <span className="text-sm text-gray-500">
      {formatBytes(byteCount)}
    </span>
  );
};

export default RichTextByteCounter;
