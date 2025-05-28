
export const getConversationTheme = (theme: 'light' | 'dark' | 'system'): 'light' | 'dark' => {
  if (theme === 'system') {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return theme;
};

export const EmptyState = () => (
  <div className="flex flex-col items-center justify-center p-8 text-center h-64">
    <div className="bg-gray-100 p-4 rounded-full mb-4">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M8 9H16M8 13H14M9 17H15M20 6.5V17.5C20 18.3284 19.3284 19 18.5 19H5.5C4.67157 19 4 18.3284 4 17.5V6.5C4 5.67157 4.67157 5 5.5 5H18.5C19.3284 5 20 5.67157 20 6.5Z" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
    <h3 className="text-lg font-medium mb-1">No conversations yet</h3>
    <p className="text-gray-500 max-w-md">
      Start chatting with your agent to see conversations appear here.
    </p>
  </div>
);
