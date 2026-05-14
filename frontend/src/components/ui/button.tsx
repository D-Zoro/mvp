import Link from "next/link";
import { forwardRef } from "react";
import { cn } from "@/lib/utils/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "default" | "lg";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  asChild?: boolean;
  href?: string;
};

const variants: Record<Variant, string> = {
  primary: "bg-primary text-primary-foreground hover:bg-primary-hover",
  secondary: "bg-transparent border border-foreground text-foreground hover:bg-foreground/5",
  ghost: "bg-transparent text-foreground hover:bg-foreground/5",
  danger: "bg-transparent border border-foreground text-foreground hover:bg-foreground/5",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-sm",
  default: "h-10 px-4 text-sm",
  lg: "h-12 px-5 text-base",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant = "primary", size = "default", asChild, href, children, ...props }, ref) => {
  const classes = cn(
    "inline-flex items-center justify-center gap-2 rounded-sm font-sans font-medium transition-colors duration-150 ease-out disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
    variants[variant],
    sizes[size],
    className,
  );
  if (asChild && href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }
  return (
    <button ref={ref} className={classes} {...props}>
      {children}
    </button>
  );
});
Button.displayName = "Button";
