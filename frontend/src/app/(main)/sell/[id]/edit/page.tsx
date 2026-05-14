"use client";

import { useParams } from "next/navigation";
import { BookForm } from "@/components/books/book-form";
import { PageContainer } from "@/components/layout/page-container";
import { useBook } from "@/lib/hooks/use-books";

export default function EditListingPage() {
  const id = String(useParams().id);
  const { data: book, isLoading } = useBook(id);
  return (
    <PageContainer className="py-8">
      <h1 className="mb-8 font-serif text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl">Edit listing</h1>
      {isLoading || !book ? (
        <p className="font-sans text-sm text-muted">Loading listing...</p>
      ) : (
        <BookForm
          mode="edit"
          id={id}
          defaultValues={{
            title: book.title,
            author: book.author,
            condition: book.condition,
            price: Number(book.price),
            isbn: book.isbn ?? undefined,
            description: book.description ?? undefined,
            quantity: book.quantity,
            images: book.images ?? [],
            category: book.category ?? undefined,
            publisher: book.publisher ?? undefined,
            publication_year: book.publication_year ?? undefined,
            language: book.language,
            page_count: book.page_count ?? undefined,
            status: book.status,
          }}
        />
      )}
    </PageContainer>
  );
}
