"use client";

import { Edit, Plus, Send, Trash2 } from "lucide-react";
import { useState } from "react";
import { BookGrid } from "@/components/books/book-grid";
import { PageContainer } from "@/components/layout/page-container";
import { Sidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { useDeleteBook, useMyListings, usePublishBook } from "@/lib/hooks/use-books";
import type { BookStatus } from "@/types/book";

export default function SellPage() {
  const [status, setStatus] = useState<BookStatus | undefined>();
  const { data, isLoading } = useMyListings({ status });
  const publish = usePublishBook();
  const remove = useDeleteBook();
  return (
    <PageContainer className="py-8">
      <div className="mb-8 flex items-center justify-between gap-4">
        <h1 className="font-serif text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl">Seller dashboard</h1>
        <Button asChild href="/sell/new"><Plus className="h-4 w-4" /> New listing</Button>
      </div>
      <div className="grid gap-8 lg:grid-cols-12">
        <Sidebar className="lg:col-span-3" />
        <section className="space-y-6 lg:col-span-9">
          <div className="flex flex-wrap gap-2">
            {(["", "draft", "active", "sold"] as const).map((item) => (
              <Button key={item || "all"} variant={status === item || (!status && !item) ? "primary" : "secondary"} size="sm" onClick={() => setStatus((item || undefined) as BookStatus | undefined)}>
                {item || "all"}
              </Button>
            ))}
          </div>
          {isLoading ? <p className="font-sans text-sm text-muted">Loading listings...</p> : <BookGrid books={data?.items ?? []} actions={(book) => (
            <>
              <Button asChild href={`/sell/${book.id}/edit`} variant="secondary" size="sm"><Edit className="h-4 w-4" /> Edit</Button>
              <Button variant="secondary" size="sm" onClick={() => publish.mutate(book.id)}><Send className="h-4 w-4" /> Publish</Button>
              <Button variant="secondary" size="sm" onClick={() => remove.mutate(book.id)}><Trash2 className="h-4 w-4" /> Delete</Button>
            </>
          )} />}
        </section>
      </div>
    </PageContainer>
  );
}
