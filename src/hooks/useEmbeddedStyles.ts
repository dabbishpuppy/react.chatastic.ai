
import { useEffect } from "react";

export const useEmbeddedStyles = () => {
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      html, body {
        overflow: auto !important;
        position: relative !important;
        width: 100%;
        height: 100%;
        margin: 0;
        padding: 0;
      }
      
      /* Enhanced embedded chat container that fills available space */
      .embedded-chat-container {
        height: 100%;
        min-height: 100vh;
        width: 100%;
        overflow: auto;
        -webkit-overflow-scrolling: touch;
        display: flex;
        flex-direction: column;
      }

      /* Fix ScrollArea overflow issues with enhanced visibility */
      [data-radix-scroll-area-viewport] {
        overflow-y: auto !important;
        overflow-x: hidden !important;
        scroll-behavior: smooth !important;
      }
      
      /* Enhanced scrollbars for better visibility */
      ::-webkit-scrollbar {
        width: 8px;
        height: 8px;
      }
      
      ::-webkit-scrollbar-track {
        background: #f1f1f1;
        border-radius: 10px;
      }
      
      ::-webkit-scrollbar-thumb {
        background: #888;
        border-radius: 10px;
      }
      
      ::-webkit-scrollbar-thumb:hover {
        background: #555;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);
};
