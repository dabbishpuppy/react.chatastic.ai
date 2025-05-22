
import * as React from "react"

import { cn } from "@/lib/utils"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    // Create a ref to handle focus behaviors
    const internalRef = React.useRef<HTMLTextAreaElement | null>(null);
    
    // Combine refs
    React.useEffect(() => {
      if (ref) {
        if (typeof ref === 'function') {
          ref(internalRef.current);
        } else {
          ref.current = internalRef.current;
        }
      }
    }, [ref]);

    // Handle focus event to prevent auto-scroll
    const handleFocus = (e: React.FocusEvent<HTMLTextAreaElement>) => {
      // Prevent default browser scroll behavior
      e.preventDefault();
      
      // Execute original onFocus if it exists
      if (props.onFocus) {
        props.onFocus(e);
      }
    };

    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none scroll-mt-0",
          className
        )}
        ref={internalRef}
        onFocus={handleFocus}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
