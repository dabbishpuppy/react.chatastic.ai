
import * as React from "react"

import { cn } from "@/lib/utils"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    // Prevent scroll into view on focus
    const handleFocus = (e: React.FocusEvent<HTMLTextAreaElement>) => {
      e.preventDefault();
      // Prevent browser from scrolling to the focused element
      if (props.onFocus) {
        props.onFocus(e);
      }
    };

    // Prevent automatic scrolling on input
    const handleInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
      e.preventDefault();
      if (props.onInput) {
        props.onInput(e);
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
        onInput={handleInput}
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
Textarea.displayName = "Textarea"

export { Textarea }
