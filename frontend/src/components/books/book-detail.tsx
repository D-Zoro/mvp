"use client";

import { ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar } from "@/components/ui/avatar";
import { ConditionBadge } from "./condition-badge";
import { PriceDisplay } from "./price-display";
import { ImageWithFallback } from "@/components/common/image-with-fallback";
import type { Book } from "@/types/book";

export function BookDetail({ book }: { book: Book }) {
  return (
    <>
      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-12">
        <div className="lg:col-span-5">
          <div className="sticky top-24 rounded-sm border border-border bg-surface-muted p-4">
            <div className="relative aspect-[2/3] overflow-hidden rounded-sm bg-surface">
              <ImageWithFallback src={book.images_urls?.[0]} alt={book.title} priority className="object-cover" />
            </div>
          </div>
        </div>
        <div className="flex flex-col space-y-6 lg:col-span-7">
          <div className="space-y-3">
            <ConditionBadge condition={book.condition} />
            <h1 className="font-serif text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl">{book.title}</h1>
            <p className="font-sans text-base leading-relaxed text-muted">by {book.author}</p>
            <PriceDisplay value={book.price} className="text-2xl" />
          </div>
          <Separator />
          <dl className="grid grid-cols-2 gap-4 font-sans text-sm">
            <div><dt className="text-muted">Category</dt><dd className="text-foreground">{book.category ?? "Uncategorized"}</dd></div>
            <div><dt className="text-muted">Language</dt><dd className="text-foreground">{book.language}</dd></div>
            <div><dt className="text-muted">ISBN</dt><dd className="font-mono text-foreground">{book.isbn ?? "Not listed"}</dd></div>
            <div><dt className="text-muted">Available</dt><dd className="text-foreground">{book.quantity}</dd></div>
          </dl>
          <Separator />
          <p className="font-sans text-base leading-relaxed text-foreground">{book.description ?? "No description provided."}</p>
          <div className="flex items-center gap-3 rounded-sm border border-border bg-surface p-4 shadow-sm">
            <Avatar src={book.seller?.avatar_url} alt={book.seller?.email ?? "Seller"} />
            <div>
              <p className="font-sans text-sm font-medium text-foreground">{book.seller?.first_name ?? "Books4All seller"}</p>
              <p className="font-sans text-sm leading-normal text-muted">{book.seller?.email ?? "Verified marketplace seller"}</p>
            </div>
          </div>
          <Button size="lg" className="hidden sm:inline-flex">
            <ShoppingBag className="h-4 w-4" /> Add to order
          </Button>
        </div>
      </div>
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-surface p-4 sm:hidden">
        <Button size="lg" className="w-full">
          <ShoppingBag className="h-4 w-4" /> Add to order
        </Button>
      </div>
    </>
  );
}
