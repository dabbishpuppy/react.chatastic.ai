
import * as React from "react"

import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    // Prevent scroll into view on focus
    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      e.preventDefault();
      // Prevent browser from scrolling to the focused element
      if (props.onFocus) {
        props.onFocus(e);
      }
    };

    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 scroll-m-0",
          className
        )}
        ref={ref}
        onFocus={handleFocus}
        {...props}
        style={{
          scrollMargin: 0,
          scrollPadding: 0,
          overscrollBehavior: 'none',
          ...(props.style || {})
        }}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
