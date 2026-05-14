import { Avatar } from "@/components/ui/avatar";
import { formatDate } from "@/lib/utils/format";
import type { Review } from "@/types/review";
import { StarRating } from "./star-rating";

export function ReviewCard({ review }: { review: Review }) {
  return (
    <article className="rounded-sm border border-border bg-surface p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar src={review.user?.avatar_url} alt={review.user?.email ?? "Reviewer"} />
          <div>
            <p className="font-sans text-sm font-medium text-foreground">{review.user?.first_name ?? "Reader"}</p>
            <p className="font-sans text-sm text-muted">{formatDate(review.created_at)}</p>
          </div>
        </div>
        <StarRating value={review.rating} size="sm" />
      </div>
      <p className="font-sans text-sm leading-normal text-foreground">{review.comment ?? "No written comment."}</p>
    </article>
  );
}
