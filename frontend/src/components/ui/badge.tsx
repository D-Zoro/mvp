import { cn } from "@/lib/utils/cn";

export function Badge({ className, children }: { className?: string; children: React.ReactNode }) {
  return <span className={cn("inline-flex items-center rounded-sm px-2 py-1 font-sans text-[10px] font-semibold uppercase tracking-wider", className)}>{children}</span>;
}
