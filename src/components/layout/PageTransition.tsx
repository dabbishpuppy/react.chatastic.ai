
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
  
  useEffect(() => {
    // Only start loading for actual route changes, not search param changes
    if (location.pathname !== window.location.pathname) {
      setIsLoading(true);
      
      // Store the new children to show once loading finishes
      const timeoutId = setTimeout(() => {
        setDisplayContent(children);
        setIsLoading(false);
      }, 300); // Adjust timing as needed
      
      return () => clearTimeout(timeoutId);
    } else {
      // For same route updates, just update the content
      setDisplayContent(children);
    }
  }, [location.pathname, children]);

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
