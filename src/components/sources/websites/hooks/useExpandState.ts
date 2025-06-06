
import { useState, useCallback } from 'react';

export const useExpandState = (initialExpanded: boolean = false) => {
  const [isExpanded, setIsExpanded] = useState(initialExpanded);
  const [isAnimating, setIsAnimating] = useState(false);

  const toggleExpanded = useCallback(() => {
    if (isAnimating) return; // Prevent multiple toggles during animation
    
    setIsAnimating(true);
    setIsExpanded(prev => !prev);
    
    // Reset animation state after a brief delay
    setTimeout(() => setIsAnimating(false), 100);
  }, [isAnimating]);

  return {
    isExpanded,
    isAnimating,
    toggleExpanded
  };
};
