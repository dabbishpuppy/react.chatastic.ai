
import { useEffect, RefObject } from "react";

export const useEmbeddedResizeObserver = (
  containerRef: RefObject<HTMLDivElement>,
  agentId?: string
) => {
  useEffect(() => {
    // Only run this in an iframe context
    if (window.self === window.top) return;
    
    const sendHeightToParent = () => {
      if (containerRef.current) {
        const height = containerRef.current.scrollHeight;
        // Send message to parent with new height
        window.parent.postMessage({ 
          type: 'resize-iframe', 
          height: height,
          agentId: agentId 
        }, '*');
      }
    };
    
    // Create a ResizeObserver to detect content changes
    if (window.ResizeObserver) {
      const resizeObserver = new ResizeObserver(() => {
        sendHeightToParent();
      });
      
      if (containerRef.current) {
        resizeObserver.observe(containerRef.current);
      }
      
      // Also observe the body element for any changes
      resizeObserver.observe(document.body);
      
      return () => {
        if (containerRef.current) {
          resizeObserver.unobserve(containerRef.current);
        }
        resizeObserver.unobserve(document.body);
        resizeObserver.disconnect();
      };
    }
    
    // Fallback for browsers without ResizeObserver
    const interval = setInterval(sendHeightToParent, 500);
    
    // Send initial height after render
    setTimeout(sendHeightToParent, 100);
    
    // Listen for chat events that might change height
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'message-sent') {
        setTimeout(sendHeightToParent, 100);
      }
    };
    
    window.addEventListener('message', handleMessage);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('message', handleMessage);
    };
  }, [agentId, containerRef]);
};
