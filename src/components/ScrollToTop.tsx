
import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Component that forces scroll to top when route changes
 * Helps prevent automatic scrolling to form elements
 */
const ScrollToTop = () => {
  const { pathname } = useLocation();
  
  useEffect(() => {
    // Disable browser's automatic scroll restoration
    if (window.history && 'scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
    
    // Force scroll to top on route changes
    window.scrollTo(0, 0);
    
    // Remove focus from any element
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    
    // Add a small delay to ensure scroll position is reset after any potential focus events
    const timer = setTimeout(() => {
      window.scrollTo(0, 0);
    }, 50);
    
    return () => {
      clearTimeout(timer);
    };
  }, [pathname]);
  
  return null;
};

export default ScrollToTop;
