"use client";

import { StarRating } from "./star-rating";
import { useReviewStats } from "@/lib/hooks/use-reviews";

export function ReviewStats({ bookId }: { bookId: string }) {
  const { data } = useReviewStats(bookId);
  const avg = data?.average_rating ?? 0;
  return (
    <div className="rounded-sm border border-border bg-surface p-4 shadow-sm">
      <h2 className="mb-3 font-serif text-2xl font-semibold leading-snug text-foreground sm:text-3xl">Reader reviews</h2>
      <div className="flex items-center gap-3">
        <StarRating value={Math.round(avg)} />
        <span className="font-mono text-lg font-bold tracking-tight text-primary">{avg.toFixed(1)}</span>
        <span className="font-sans text-sm text-muted">{data?.total_reviews ?? 0} reviews</span>
      </div>
    </div>
  );
}
