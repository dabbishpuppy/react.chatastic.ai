
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
      window.removeEventListener('message', handleMessage);
    };
  }, [agentId, containerRef]);
};
