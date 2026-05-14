import { BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

export function EmptyState({ title, description, actionLabel, href }: { title: string; description: string; actionLabel?: string; href?: string }) {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center gap-3 rounded-sm border border-border bg-surface p-8 text-center shadow-sm">
      <BookOpen className="h-8 w-8 text-primary" aria-hidden="true" />
      <h2 className="font-serif text-2xl font-semibold leading-snug text-foreground sm:text-3xl">{title}</h2>
      <p className="max-w-md font-sans text-sm leading-normal text-muted">{description}</p>
      {actionLabel && href ? <Button asChild href={href}>{actionLabel}</Button> : null}
    </div>
  );
}
