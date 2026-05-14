"use client";

import Image from "next/image";
import { BookOpen } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils/cn";

export function ImageWithFallback({ src, alt, className, sizes = "100vw", priority }: { src?: string | null; alt: string; className?: string; sizes?: string; priority?: boolean }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className={cn("flex h-full w-full items-center justify-center bg-surface-muted text-muted", className)}>
        <BookOpen className="h-10 w-10" aria-hidden="true" />
      </div>
    );
  }
  return <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className={className} onError={() => setFailed(true)} />;
}
