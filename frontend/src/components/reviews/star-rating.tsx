"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function StarRating({ value, onChange, size = "md" }: { value: number; onChange?: (value: number) => void; size?: "sm" | "md" | "lg" }) {
  const dim = size === "sm" ? "h-4 w-4" : size === "lg" ? "h-6 w-6" : "h-5 w-5";
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => {
        const active = star <= value;
        const icon = <Star className={cn(dim, active ? "fill-primary text-primary" : "text-muted")} aria-hidden="true" />;
        return onChange ? (
          <button key={star} type="button" onClick={() => onChange(star)} className="rounded-sm focus:outline-none focus:ring-1 focus:ring-primary" aria-label={`${star} stars`}>
            {icon}
          </button>
        ) : (
          <span key={star}>{icon}</span>
        );
      })}
    </div>
  );
}
