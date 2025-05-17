
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
      // Set loading state
      setIsLoading(true);
      setPrevPathname(location.pathname);
      
      // Store the new children to show once loading finishes
      // Use a shorter timeout for better UX
      const timeoutId = setTimeout(() => {
        setDisplayContent(children);
        setIsLoading(false);
      }, 200);
      
      return () => clearTimeout(timeoutId);
    } else {
      // For same route updates or search param changes, just update the content immediately
      setDisplayContent(children);
    }
  }, [location.pathname, children, prevPathname]);

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
