
import React, { useEffect, useRef } from 'react';

const ScrollPrevention: React.FC = () => {
  const scrollPreventionRef = useRef<boolean>(true);

  useEffect(() => {
    // Set scroll restoration to manual immediately
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }
    
    // Force scroll to top with multiple attempts
    const forceScrollToTop = () => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };
    
    // Immediate scroll reset
    forceScrollToTop();
    
    // Multiple attempts to ensure scroll stays at top
    const timeouts = [
      setTimeout(forceScrollToTop, 0),
      setTimeout(forceScrollToTop, 10),
      setTimeout(forceScrollToTop, 50),
      setTimeout(forceScrollToTop, 100),
      setTimeout(forceScrollToTop, 200),
      setTimeout(forceScrollToTop, 500)
    ];
    
    // Disable auto-focus on all form elements
    const disableAutoFocus = () => {
      const formElements = document.querySelectorAll('input, textarea, select, button');
      formElements.forEach((element) => {
        if (element instanceof HTMLElement) {
          element.tabIndex = -1;
          element.style.scrollMargin = '0';
          element.style.scrollMarginTop = '0';
          element.style.scrollMarginBottom = '0';
          
          // Disable scrollIntoView
          element.scrollIntoView = () => {};
        }
      });
    };
    
    disableAutoFocus();
    
    // Add comprehensive scroll prevention
    const preventScroll = (e: Event) => {
      if (scrollPreventionRef.current) {
        e.preventDefault();
        e.stopPropagation();
        forceScrollToTop();
        return false;
      }
    };
    
    const preventFocusScroll = (e: FocusEvent) => {
      if (scrollPreventionRef.current && e.target instanceof HTMLElement) {
        e.preventDefault();
        e.target.scrollIntoView = () => {};
        forceScrollToTop();
      }
    };
    
    // Add event listeners for scroll prevention
    document.addEventListener('scroll', preventScroll, { passive: false, capture: true });
    window.addEventListener('scroll', preventScroll, { passive: false, capture: true });
    document.addEventListener('focus', preventFocusScroll, { passive: false, capture: true });
    document.addEventListener('focusin', preventFocusScroll, { passive: false, capture: true });
    
    // Override scrollTo methods temporarily
    const originalScrollTo = window.scrollTo;
    const originalScrollBy = window.scrollBy;
    const originalScrollIntoView = Element.prototype.scrollIntoView;
    
    window.scrollTo = () => {};
    window.scrollBy = () => {};
    Element.prototype.scrollIntoView = () => {};
    
    // Re-enable scroll prevention after a delay
    const enableScrollTimeout = setTimeout(() => {
      scrollPreventionRef.current = false;
      
      // Restore original scroll methods
      window.scrollTo = originalScrollTo;
      window.scrollBy = originalScrollBy;
      Element.prototype.scrollIntoView = originalScrollIntoView;
      
      // Remove event listeners
      document.removeEventListener('scroll', preventScroll, { capture: true });
      window.removeEventListener('scroll', preventScroll, { capture: true });
      document.removeEventListener('focus', preventFocusScroll, { capture: true });
      document.removeEventListener('focusin', preventFocusScroll, { capture: true });
    }, 1000);
    
    // Apply CSS overrides
    document.body.style.scrollBehavior = 'auto';
    document.documentElement.style.scrollBehavior = 'auto';
    document.body.style.overscrollBehavior = 'contain';
    
    return () => {
      // Cleanup
      timeouts.forEach(clearTimeout);
      clearTimeout(enableScrollTimeout);
      
      // Remove event listeners
      document.removeEventListener('scroll', preventScroll, { capture: true });
      window.removeEventListener('scroll', preventScroll, { capture: true });
      document.removeEventListener('focus', preventFocusScroll, { capture: true });
      document.removeEventListener('focusin', preventFocusScroll, { capture: true });
      
      // Restore original methods
      window.scrollTo = originalScrollTo;
      window.scrollBy = originalScrollBy;
      Element.prototype.scrollIntoView = originalScrollIntoView;
      
      // Reset styles
      document.body.style.scrollBehavior = '';
      document.documentElement.style.scrollBehavior = '';
      document.body.style.overscrollBehavior = '';
      
      if ('scrollRestoration' in history) {
        history.scrollRestoration = 'auto';
      }
    };
  }, []);

  return (
    <style dangerouslySetInnerHTML={{
      __html: `
        .no-scroll-page * {
          scroll-behavior: auto !important;
          scroll-margin: 0 !important;
          scroll-margin-top: 0 !important;
          scroll-margin-bottom: 0 !important;
          overscroll-behavior: contain !important;
        }
        
        .no-scroll-page input:focus,
        .no-scroll-page textarea:focus,
        .no-scroll-page select:focus,
        .no-scroll-page button:focus {
          scroll-behavior: auto !important;
          scroll-margin: 0 !important;
        }
        
        .no-scroll-page input,
        .no-scroll-page textarea,
        .no-scroll-page select,
        .no-scroll-page button {
          scroll-margin: 0 !important;
          scroll-margin-top: 0 !important;
          scroll-margin-bottom: 0 !important;
        }
      `
    }} />
  );
};

export default ScrollPrevention;
