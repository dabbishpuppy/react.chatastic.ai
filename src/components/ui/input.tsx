
import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, onFocus, onChange, ...props }, ref) => {
    // Custom handlers to prevent scroll on focus and input
    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      // Prevent scroll into view behavior
      e.preventDefault();
      
      if (onFocus) {
        onFocus(e);
      }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (onChange) {
        onChange(e);
        // Ensure the page doesn't scroll when typing
        window.scrollTo({ top: window.scrollY });
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
        onChange={handleChange}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
