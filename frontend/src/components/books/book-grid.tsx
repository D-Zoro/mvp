import { BookCard } from "./book-card";
import { EmptyState } from "@/components/common/empty-state";
import type { Book } from "@/types/book";

export function BookGrid({ books, actions }: { books: Book[]; actions?: (book: Book) => React.ReactNode }) {
  if (!books.length) return <EmptyState title="No books found" description="Try changing your filters or listing a book of your own." actionLabel="Create listing" href="/sell/new" />;
  return <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">{books.map((book) => <BookCard key={book.id} book={book} actions={actions?.(book)} />)}</div>;
}
