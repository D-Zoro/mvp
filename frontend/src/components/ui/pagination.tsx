"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./button";

export function Pagination({ page, pages, onPageChange }: { page: number; pages: number; onPageChange: (page: number) => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <Button variant="secondary" size="sm" onClick={() => onPageChange(page - 1)} disabled={page <= 1}>
        <ChevronLeft className="h-4 w-4" /> Previous
      </Button>
      <span className="font-mono text-sm text-muted">
        {page} / {Math.max(1, pages)}
      </span>
      <Button variant="secondary" size="sm" onClick={() => onPageChange(page + 1)} disabled={page >= pages}>
        Next <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
