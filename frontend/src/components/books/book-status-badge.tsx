import { Badge } from "@/components/ui/badge";
import type { BookStatus } from "@/types/book";

export function BookStatusBadge({ status }: { status: BookStatus }) {
  const classes = status === "active" ? "bg-success-bg text-success" : status === "draft" ? "bg-primary/10 text-primary" : "bg-surface-muted text-foreground border border-border";
  return <Badge className={classes}>{status}</Badge>;
}
