
import { useState, useRef } from "react";

export const useSubmissionState = () => {
  // Enhanced submission tracking with longer deduplication window
  const [isSubmitting, setIsSubmitting] = useState(false);
  const lastSubmissionRef = useRef<string>("");
  const lastSubmissionTimeRef = useRef<number>(0);

  const isSubmissionBlocked = (text: string): boolean => {
    const trimmedText = text.trim();
    const now = Date.now();
    
    // Enhanced duplicate prevention with 2-second window
    if (isSubmitting || 
        !trimmedText || 
        lastSubmissionRef.current === trimmedText ||
        (now - lastSubmissionTimeRef.current < 2000)) {
      console.log('🚫 Submission blocked:', {
        isSubmitting,
        emptyText: !trimmedText,
        duplicateText: lastSubmissionRef.current === trimmedText,
        tooSoon: now - lastSubmissionTimeRef.current < 2000,
        timeSinceLastSubmission: now - lastSubmissionTimeRef.current
      });
      return true;
    }
    
    return false;
  };

  const recordSubmission = (text: string) => {
    const now = Date.now();
    lastSubmissionRef.current = text.trim();
    lastSubmissionTimeRef.current = now;
    setIsSubmitting(true);
  };

  const resetSubmission = () => {
    // Extended reset delay to prevent rapid resubmission
    setTimeout(() => {
      setIsSubmitting(false);
      // Clear the last submission after 2 seconds to allow legitimate resubmissions
      setTimeout(() => {
        lastSubmissionRef.current = "";
        lastSubmissionTimeRef.current = 0;
      }, 2000);
    }, 1000);
  };

  return {
    isSubmitting,
    isSubmissionBlocked,
    recordSubmission,
    resetSubmission
  };
};
