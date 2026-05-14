import Link from "next/link";
import { ArrowRight, BookOpen, Upload } from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { BookGrid } from "@/components/books/book-grid";
import { serverFetch } from "@/lib/api/server-client";
import type { Book } from "@/types/book";
import type { PaginatedResponse } from "@/types/common";

async function featuredBooks() {
  try {
    return await serverFetch<PaginatedResponse<Book>>("/books?sort_by=created_at&sort_order=desc&per_page=8");
  } catch {
    return { items: [], total: 0, page: 1, page_size: 8, pages: 0, has_next: false, has_prev: false };
  }
}

export default async function HomePage() {
  const books = await featuredBooks();
  return (
    <>
      <Navbar />
      <main className="flex-1">
        <section className="border-b border-border bg-background py-16 sm:py-20">
          <PageContainer className="grid gap-10 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-7">
              <h1 className="max-w-3xl font-serif text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl">Books4All</h1>
              <p className="mt-4 max-w-2xl font-sans text-base leading-relaxed text-foreground">Buy affordable books from nearby readers, or turn your shelves into listings with secure checkout and verified marketplace flows.</p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button asChild href="/books" size="lg">
                  <BookOpen className="h-4 w-4" /> Browse books
                </Button>
                <Button asChild href="/sell/new" variant="secondary" size="lg">
                  <Upload className="h-4 w-4" /> Sell a book
                </Button>
              </div>
            </div>
            <div className="lg:col-span-5">
              <div className="border-l-4 border-primary bg-surface p-6 shadow-sm">
                <p className="font-sans text-[10px] font-semibold uppercase tracking-wider text-muted">Marketplace status</p>
                <div className="mt-4 grid grid-cols-3 gap-4">
                  <div><p className="font-mono text-lg font-bold text-primary">{books.total}</p><p className="font-sans text-sm text-muted">Books</p></div>
                  <div><p className="font-mono text-lg font-bold text-primary">24/7</p><p className="font-sans text-sm text-muted">Checkout</p></div>
                  <div><p className="font-mono text-lg font-bold text-primary">API</p><p className="font-sans text-sm text-muted">Backed</p></div>
                </div>
              </div>
            </div>
          </PageContainer>
        </section>
        <section className="py-12">
          <PageContainer>
            <div className="mb-6 flex items-end justify-between gap-4">
              <h2 className="font-serif text-2xl font-semibold leading-snug text-foreground sm:text-3xl">Fresh listings</h2>
              <Link href="/books" className="inline-flex items-center gap-1 font-sans text-sm font-medium text-primary">View all <ArrowRight className="h-4 w-4" /></Link>
            </div>
            <BookGrid books={books.items} />
          </PageContainer>
        </section>
      </main>
      <Footer />
    </>
  );
}
