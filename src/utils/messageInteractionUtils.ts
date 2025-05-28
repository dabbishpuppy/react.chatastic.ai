
export const copyMessageToClipboard = (content: string) => {
  navigator.clipboard.writeText(content).then(() => {
    console.log('Message copied to clipboard');
  }).catch(err => {
    console.error('Failed to copy message: ', err);
  });
};

export const insertEmoji = (
  emoji: string,
  isTyping: boolean,
  rateLimitError: string | null,
  setMessage: (update: (prev: string) => string) => void,
  inputRef: React.RefObject<HTMLInputElement>
) => {
  if (isTyping || rateLimitError) return;
  
  setMessage(prev => prev + emoji);
  
  // Focus input field after emoji insertion
  setTimeout(() => {
    inputRef.current?.focus();
  }, 10);
};
