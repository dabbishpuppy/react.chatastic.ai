
import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Loader } from 'lucide-react';

interface PageTransitionProps {
  children: React.ReactNode;
}

const PageTransition: React.FC<PageTransitionProps> = ({ children }) => {
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [displayContent, setDisplayContent] = useState(children);

  // Check if we're navigating from agent creation
  const fromAgentAction = location.state?.fromAgentCreation || location.state?.fromAgentsList;

  useEffect(() => {
    // Skip loading state if coming directly from agent creation or agent list click
    if (fromAgentAction) {
      setDisplayContent(children);
      return;
    }

    // Only start loading when the key changes (genuine navigation)
    if (location.key) {
      setIsLoading(true);
      
      // Use a very short timeout to make transitions feel snappy
      const timeoutId = setTimeout(() => {
        setDisplayContent(children);
        setIsLoading(false);
      }, 100);
      
      return () => clearTimeout(timeoutId);
    } else {
      // If it's the initial render, just show content immediately
      setDisplayContent(children);
    }
  }, [location.key, children, fromAgentAction]);

  // Show loading state when transitioning between pages
  if (isLoading) {
    return (
      <div className="flex h-full w-full min-h-[200px] items-center justify-center">
        <Loader className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Render the children with fade-in animation
  return (
    <div className="animate-fade-in">
      {displayContent}
    </div>
  );
};

export default PageTransition;
