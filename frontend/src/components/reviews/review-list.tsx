"use client";

import { useReviews } from "@/lib/hooks/use-reviews";
import { EmptyState } from "@/components/common/empty-state";
import { ReviewCard } from "./review-card";

export function ReviewList({ bookId }: { bookId: string }) {
  const { data, isLoading } = useReviews(bookId);
  if (isLoading) return <p className="font-sans text-sm text-muted">Loading reviews...</p>;
  if (!data?.items.length) return <EmptyState title="No reviews yet" description="Reviews from verified readers will appear here." />;
  return <div className="space-y-3">{data.items.map((review) => <ReviewCard key={review.id} review={review} />)}</div>;
}
