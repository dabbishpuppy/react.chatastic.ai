
import * as React from "react"

import { cn } from "@/lib/utils"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, autoFocus, onFocus, ...props }, ref) => {
    // Always override autoFocus to be false
    const handleFocus = React.useCallback((e: React.FocusEvent<HTMLTextAreaElement>) => {
      // Prevent scrolling into view on focus
      e.preventDefault();
      
      // Call the original onFocus handler if provided
      if (onFocus) {
        onFocus(e);
      }
    }, [onFocus]);
    
    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 no-auto-focus resize-none",
          className
        )}
        ref={ref}
        autoFocus={false} // Always override autoFocus
        onFocus={handleFocus}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
