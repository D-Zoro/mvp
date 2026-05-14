import { notFound } from "next/navigation";
import { BookDetail } from "@/components/books/book-detail";
import { PageContainer } from "@/components/layout/page-container";
import { ReviewForm } from "@/components/reviews/review-form";
import { ReviewList } from "@/components/reviews/review-list";
import { ReviewStats } from "@/components/reviews/review-stats";
import { serverFetch } from "@/lib/api/server-client";
import type { Book } from "@/types/book";

export default async function BookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let book: Book;
  try {
    book = await serverFetch<Book>(`/books/${id}`);
  } catch {
    notFound();
  }
  return (
    <PageContainer className="pb-24">
      <BookDetail book={book} />
      <section className="mt-12 space-y-4">
        <ReviewStats bookId={book.id} />
        <ReviewForm bookId={book.id} />
        <ReviewList bookId={book.id} />
      </section>
    </PageContainer>
  );
}
