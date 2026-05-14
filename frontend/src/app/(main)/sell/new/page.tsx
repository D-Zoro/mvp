import { BookForm } from "@/components/books/book-form";
import { PageContainer } from "@/components/layout/page-container";

export default function NewListingPage() {
  return (
    <PageContainer className="py-8">
      <h1 className="mb-8 font-serif text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl">Create listing</h1>
      <BookForm mode="create" />
    </PageContainer>
  );
}
