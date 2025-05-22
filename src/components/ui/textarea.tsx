
import * as React from "react"
import { cn } from "@/lib/utils"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, onFocus, onChange, ...props }, ref) => {
    // Custom handlers to prevent scroll on focus and input
    const handleFocus = (e: React.FocusEvent<HTMLTextAreaElement>) => {
      // Prevent scroll into view behavior
      e.preventDefault();
      
      if (onFocus) {
        onFocus(e);
      }
    };

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      // Prevent scroll on input change
      if (onChange) {
        onChange(e);
        // Ensure the page doesn't scroll when typing
        window.scrollTo({ top: window.scrollY });
      }
    };

    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none scroll-m-0",
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
Textarea.displayName = "Textarea"

export { Textarea }
