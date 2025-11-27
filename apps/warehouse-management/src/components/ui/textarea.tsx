import * as React from "react"

import { cn } from "~/lib/utils"

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[80px] w-full rounded-md border-2 border-input bg-background/50 px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "hover:border-primary/30 hover:shadow-md",
        "focus-visible:outline-none focus-visible:border-primary focus-visible:bg-background focus-visible:shadow-lg focus-visible:ring-2 focus-visible:ring-primary/20",
        "dark:bg-background/20 dark:hover:bg-background/30 dark:focus-visible:bg-background/40",
        "aria-[invalid=true]:border-destructive aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-destructive/20",
        "transition-all",
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Textarea.displayName = "Textarea"

export { Textarea }
