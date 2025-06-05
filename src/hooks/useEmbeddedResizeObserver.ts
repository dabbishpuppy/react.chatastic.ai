
import { useEffect, RefObject } from "react";

export const useEmbeddedResizeObserver = (
  containerRef: RefObject<HTMLDivElement>,
  agentId?: string
) => {
  useEffect(() => {
    // Only run this in an iframe context and ensure we have the necessary objects
    if (window.self === window.top || !window.parent || !containerRef.current) {
      return;
    }
    
    const sendHeightToParent = () => {
      try {
        if (containerRef.current && window.parent && window.parent !== window) {
          const height = containerRef.current.scrollHeight;
          // Send message to parent with new height
          window.parent.postMessage({ 
            type: 'resize-iframe', 
            height: height,
            agentId: agentId 
          }, '*');
        }
      } catch (error) {
        // Silently handle cross-origin errors
        console.debug('Could not send message to parent:', error);
      }
    };
    
    // Send initial height after render with a small delay
    const timeoutId = setTimeout(sendHeightToParent, 100);
    
    // Listen for chat events that might change height
    const handleMessage = (event: MessageEvent) => {
      try {
        if (event.data?.type === 'message-sent') {
          setTimeout(sendHeightToParent, 100);
        }
      } catch (error) {
        // Silently handle any message handling errors
        console.debug('Error handling message:', error);
      }
    };
    
    window.addEventListener('message', handleMessage);
    
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('message', handleMessage);
    };
  }, [agentId, containerRef]);
};
