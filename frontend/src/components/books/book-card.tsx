import Link from "next/link";
import { BookStatusBadge } from "./book-status-badge";
import { ConditionBadge } from "./condition-badge";
import { PriceDisplay } from "./price-display";
import { ImageWithFallback } from "@/components/common/image-with-fallback";
import type { Book } from "@/types/book";

export function BookCard({ book, actions }: { book: Book; actions?: React.ReactNode }) {
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-sm border border-border bg-surface shadow-sm transition-all duration-200 ease-out hover:-translate-y-1 hover:shadow-md">
      <Link href={`/books/${book.id}`} className="relative aspect-[2/3] w-full overflow-hidden bg-surface-muted">
        <ImageWithFallback src={book.images_urls?.[0]} alt={book.title} sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw" className="object-cover transition-transform duration-300 group-hover:scale-105" />
        <ConditionBadge condition={book.condition} className="absolute right-2 top-2 px-2 py-1" />
      </Link>
      <div className="flex flex-grow flex-col p-4">
        <div className="space-y-1">
          <Link href={`/books/${book.id}`} className="line-clamp-2 font-serif text-lg font-semibold leading-snug text-foreground sm:text-xl">{book.title}</Link>
          <p className="font-sans text-sm leading-normal text-muted">{book.author}</p>
          <div className="flex items-center justify-between gap-2">
            <PriceDisplay value={book.price} />
            <BookStatusBadge status={book.status} />
          </div>
        </div>
        {actions ? <div className="mt-4 flex flex-wrap gap-2">{actions}</div> : null}
      </div>
    </article>
  );
}
