"use client";

import { X } from "lucide-react";
import { Button } from "./button";
import { cn } from "@/lib/utils/cn";

export function Dialog({ open, title, children, onClose }: { open: boolean; title: string; children: React.ReactNode; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 p-4">
      <div className={cn("w-full max-w-lg rounded-sm border border-border bg-surface shadow-lg")}>
        <div className="flex h-14 items-center justify-between border-b border-border px-4">
          <h2 className="font-serif text-2xl font-semibold leading-snug text-foreground">{title}</h2>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close dialog">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}
