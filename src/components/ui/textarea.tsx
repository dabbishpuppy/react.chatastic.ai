
import * as React from "react"

import { cn } from "@/lib/utils"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  preventFocusScroll?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, preventFocusScroll = false, ...props }, ref) => {
    const handleFocus = (e: React.FocusEvent<HTMLTextAreaElement>) => {
      if (preventFocusScroll) {
        e.preventDefault();
        e.target.scrollIntoView = () => {}; // Disable scrollIntoView
        
        // Override any scroll behavior
        const originalScrollBehavior = document.documentElement.style.scrollBehavior;
        document.documentElement.style.scrollBehavior = 'auto';
        
        setTimeout(() => {
          document.documentElement.style.scrollBehavior = originalScrollBehavior;
        }, 0);
      }
      
      if (props.onFocus) {
        props.onFocus(e);
      }
    };

    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none",
          preventFocusScroll && "scroll-mt-0",
          className
        )}
        ref={ref}
        onFocus={handleFocus}
        tabIndex={preventFocusScroll ? -1 : undefined}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
