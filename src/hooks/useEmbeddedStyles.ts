
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
      
      /* Embedded chat container */
      .embedded-chat-container {
        height: 100vh;
        width: 100%;
        overflow: hidden;
        display: flex;
        flex-direction: column;
      }

      /* Fix ScrollArea overflow issues */
      [data-radix-scroll-area-viewport] {
        overflow-y: auto !important;
        overflow-x: hidden !important;
        scroll-behavior: smooth !important;
      }
      
      /* Custom scrollbars */
      ::-webkit-scrollbar {
        width: 6px;
        height: 6px;
      }
      
      ::-webkit-scrollbar-track {
        background: #f1f1f1;
        border-radius: 3px;
      }
      
      ::-webkit-scrollbar-thumb {
        background: #888;
        border-radius: 3px;
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
