
import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Component that forces scroll to top when route changes
 * Helps prevent automatic scrolling to form elements
 */
const ScrollToTop = () => {
  const { pathname } = useLocation();
  
  useEffect(() => {
    // Force scroll to top on route changes
    window.scrollTo(0, 0);
    
    // Remove focus from any element
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }, [pathname]);
  
  return null;
};

export default ScrollToTop;
