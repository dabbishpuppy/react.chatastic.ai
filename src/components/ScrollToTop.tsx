
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Component that resets scroll position and prevents scroll restoration
 * when navigating between routes
 */
const ScrollToTop: React.FC = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    // Prevent browser's default scroll restoration
    if (history.scrollRestoration) {
      history.scrollRestoration = 'manual';
    }
    
    // Reset the scroll position immediately and after a delay
    // to override any competing scroll behavior
    const resetScroll = () => {
      window.scrollTo(0, 0);
      
      // Remove focus from any element that might trigger scroll
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    };
    
    resetScroll();
    
    // Multiple timeouts to ensure it happens after any competing focus events
    const timer1 = setTimeout(resetScroll, 0);
    const timer2 = setTimeout(resetScroll, 100);
    const timer3 = setTimeout(resetScroll, 300);
    
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [pathname]);

  return null;
};

export default ScrollToTop;
