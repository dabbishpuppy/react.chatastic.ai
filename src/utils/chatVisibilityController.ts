
// Pages where the chat bubble should be hidden
const HIDDEN_PAGES = [
  '/integrations',
  '/agent/:agentId/integrations'
];

// Check if current path matches any hidden pages
export const shouldHideChatBubble = (pathname: string): boolean => {
  return HIDDEN_PAGES.some(hiddenPath => {
    // Convert route patterns to regex
    const regexPattern = hiddenPath
      .replace(/:[^/]+/g, '[^/]+') // Replace :param with regex
      .replace(/\//g, '\\/'); // Escape forward slashes
    
    const regex = new RegExp(`^${regexPattern}(?:\\?.*)?$`);
    return regex.test(pathname);
  });
};

// Initialize chat bubble visibility based on current page
export const initializeChatVisibility = () => {
  const currentPath = window.location.pathname;
  const shouldHide = shouldHideChatBubble(currentPath);
  
  if (shouldHide) {
    hideChatBubble();
  } else {
    showChatBubble();
  }
};

// Hide the chat bubble
export const hideChatBubble = () => {
  const bubble = document.getElementById('wonderwave-bubble');
  if (bubble) {
    bubble.style.display = 'none';
  }
};

// Show the chat bubble
export const showChatBubble = () => {
  const bubble = document.getElementById('wonderwave-bubble');
  if (bubble) {
    bubble.style.display = 'flex';
  }
};
