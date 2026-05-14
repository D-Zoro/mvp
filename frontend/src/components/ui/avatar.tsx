import Image from "next/image";
import { User } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function Avatar({ src, alt, className }: { src?: string | null; alt: string; className?: string }) {
  return (
    <div className={cn("relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-surface-muted text-muted", className)}>
      {src ? <Image src={src} alt={alt} fill sizes="40px" className="object-cover" /> : <User className="h-5 w-5" aria-hidden="true" />}
    </div>
  );
}
