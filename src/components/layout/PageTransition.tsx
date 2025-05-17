
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
  const [prevPathname, setPrevPathname] = useState(location.pathname);
  
  useEffect(() => {
    // Only start loading for actual route path changes
    if (location.pathname !== prevPathname) {
      setIsLoading(true);
      setPrevPathname(location.pathname);
      
      // Update content immediately but maintain loading state briefly
      setDisplayContent(children);
      
      // Very short timeout to ensure proper rendering
      const timeoutId = setTimeout(() => {
        setIsLoading(false);
      }, 10); // Extremely short timeout - just enough to let React process the state updates
      
      return () => clearTimeout(timeoutId);
    } else {
      // For same route updates or search param changes, update content immediately
      setDisplayContent(children);
      setIsLoading(false);
    }
  }, [location, children, prevPathname]);

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
