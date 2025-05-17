
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

  // Get state from location
  const fromAgentAction = location.state?.fromAgentCreation || 
                          location.state?.fromAgentsList || 
                          location.pathname.includes('/playground/');
  
  // Debug
  console.log("PageTransition - location:", location.pathname);
  console.log("PageTransition - state:", location.state);

  useEffect(() => {
    // Skip loading state if coming from agent actions or directly to playground
    if (fromAgentAction) {
      console.log("Coming from agent action or playground, skipping loading animation");
      setDisplayContent(children);
      setIsLoading(false);
      return;
    }

    // Only start loading when the location changes (genuine navigation)
    setIsLoading(true);
    
    // Use a very short timeout to make transitions feel snappy
    const timeoutId = setTimeout(() => {
      setDisplayContent(children);
      setIsLoading(false);
    }, 100);
    
    return () => clearTimeout(timeoutId);
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
