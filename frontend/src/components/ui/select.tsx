import { forwardRef } from "react";
import { cn } from "@/lib/utils/cn";

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(({ className, children, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      "h-10 w-full rounded-sm border border-border bg-surface px-3 py-2 font-sans text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary",
      className,
    )}
    {...props}
  >
    {children}
  </select>
));
Select.displayName = "Select";
