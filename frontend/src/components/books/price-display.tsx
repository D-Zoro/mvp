import { formatPrice } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

export function PriceDisplay({ value, className }: { value: string | number; className?: string }) {
  return <span className={cn("font-mono text-lg font-bold tracking-tight text-primary", className)}>{formatPrice(value)}</span>;
}
