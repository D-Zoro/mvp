"use client";

import { ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ImageWithFallback } from "@/components/common/image-with-fallback";
import { useUpload } from "@/lib/hooks/use-upload";

export function ImageUploader({ value, onChange, maxFiles = 10 }: { value: string[]; onChange: (urls: string[]) => void; maxFiles?: number }) {
  const { upload, isUploading, progress } = useUpload();
  async function handleFiles(files: FileList | null) {
    if (!files) return;
    const remaining = maxFiles - value.length;
    const selected = Array.from(files).slice(0, remaining);
    const uploaded = await Promise.all(selected.map(upload));
    onChange([...value, ...uploaded]);
  }
  return (
    <div className="space-y-3">
      <label className="flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-sm border border-border bg-surface-muted p-4 text-center font-sans text-sm text-muted">
        <ImagePlus className="h-6 w-6 text-primary" />
        <span>{isUploading ? `Uploading ${progress}%` : "Upload book images"}</span>
        <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => void handleFiles(e.target.files)} disabled={isUploading || value.length >= maxFiles} />
      </label>
      {value.length ? (
        <div className="grid grid-cols-3 gap-2">
          {value.map((url) => (
            <div key={url} className="relative aspect-[2/3] rounded-sm border border-border bg-surface-muted">
              <ImageWithFallback src={url} alt="Book preview" sizes="120px" className="rounded-sm object-cover" />
              <Button variant="secondary" size="sm" className="absolute right-1 top-1 h-8 w-8 px-0" onClick={() => onChange(value.filter((item) => item !== url))} aria-label="Remove image">
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
