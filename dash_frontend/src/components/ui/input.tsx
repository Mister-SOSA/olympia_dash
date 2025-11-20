import * as React from "react"

import { cn } from "@/lib/utils"

export interface InputProps
    extends React.InputHTMLAttributes<HTMLInputElement> { }

const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, type, ...props }, ref) => {
        return (
            <input
                type={type}
                className={cn(
                    "flex h-10 w-full rounded-md border border-ui-border-primary bg-ui-bg-tertiary px-3 py-2 text-sm text-ui-text-primary placeholder:text-ui-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-accent-primary focus-visible:ring-offset-2 focus-visible:ring-offset-ui-bg-secondary disabled:cursor-not-allowed disabled:opacity-50",
                    className
                )}
                ref={ref}
                {...props}
            />
        )
    }
)
Input.displayName = "Input"

export { Input }
