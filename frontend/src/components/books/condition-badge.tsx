import { Badge } from "@/components/ui/badge";
import { formatCondition, getConditionColor } from "@/lib/utils/format";
import type { BookCondition } from "@/types/book";

export function ConditionBadge({ condition, className = "" }: { condition: BookCondition; className?: string }) {
  return <Badge className={`${getConditionColor(condition)} ${className}`}>{formatCondition(condition)}</Badge>;
}
