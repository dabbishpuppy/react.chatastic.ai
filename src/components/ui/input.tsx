
import * as React from "react"

import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    // Create a ref to handle focus behaviors
    const internalRef = React.useRef<HTMLInputElement | null>(null);
    
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
    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      // Prevent default browser scroll behavior
      e.preventDefault();
      
      // Execute original onFocus if it exists
      if (props.onFocus) {
        props.onFocus(e);
      }
    };

    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 scroll-mt-0",
          className
        )}
        ref={internalRef}
        onFocus={handleFocus}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
