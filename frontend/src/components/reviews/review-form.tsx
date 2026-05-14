"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useCreateReview } from "@/lib/hooks/use-reviews";
import { StarRating } from "./star-rating";

export function ReviewForm({ bookId }: { bookId: string }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const create = useCreateReview(bookId);
  return (
    <form
      className="space-y-3 rounded-sm border border-border bg-surface p-4 shadow-sm"
      onSubmit={async (event) => {
        event.preventDefault();
        await create.mutateAsync({ rating, comment: comment || undefined });
        setComment("");
      }}
    >
      <StarRating value={rating} onChange={setRating} />
      <Textarea placeholder="Share what future readers should know" value={comment} onChange={(e) => setComment(e.target.value)} />
      <Button type="submit" disabled={create.isPending}>{create.isPending ? "Posting..." : "Post review"}</Button>
    </form>
  );
}
