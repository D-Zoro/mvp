import { cn } from "@/lib/utils/cn";

export function PageContainer({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mx-auto w-full max-w-7xl px-4 sm:px-6 md:px-8", className)} {...props} />;
}
