import { Suspense } from "react";
import { BrowseBooks } from "@/components/books/browse-books";
import { PageContainer } from "@/components/layout/page-container";

export default function BooksPage() {
  return (
    <PageContainer className="py-8">
      <h1 className="mb-8 font-serif text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl">Browse books</h1>
      <Suspense>
        <BrowseBooks />
      </Suspense>
    </PageContainer>
  );
}
