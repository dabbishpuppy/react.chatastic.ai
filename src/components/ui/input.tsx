
import * as React from "react"

import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  preventFocusScroll?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, preventFocusScroll = false, ...props }, ref) => {
    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
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
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
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
Input.displayName = "Input"

export { Input }
