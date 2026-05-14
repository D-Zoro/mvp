"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { BookFilters } from "@/components/books/book-filters";
import { BookGrid } from "@/components/books/book-grid";
import { Pagination } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { useBooks, useCategories } from "@/lib/hooks/use-books";
import type { BookFilters as Filters } from "@/types/book";

function parseFilters(params: URLSearchParams): Filters {
  return {
    query: params.get("query") ?? undefined,
    category: params.get("category") ?? undefined,
    condition: (params.get("condition") as Filters["condition"]) ?? undefined,
    min_price: params.get("min_price") ? Number(params.get("min_price")) : undefined,
    max_price: params.get("max_price") ? Number(params.get("max_price")) : undefined,
    sort_by: (params.get("sort_by") as Filters["sort_by"]) ?? "created_at",
    sort_order: (params.get("sort_order") as Filters["sort_order"]) ?? "desc",
    page: params.get("page") ? Number(params.get("page")) : 1,
    per_page: 12,
  };
}

export function BrowseBooks() {
  const router = useRouter();
  const params = useSearchParams();
  const filters = useMemo(() => parseFilters(params), [params]);
  const { data, isLoading } = useBooks(filters);
  const { data: categories = [] } = useCategories();
  function update(next: Filters) {
    const search = new URLSearchParams();
    Object.entries(next).forEach(([key, value]) => {
      if (value !== undefined && value !== "" && value !== null) search.set(key, String(value));
    });
    router.push(`/books?${search.toString()}`);
  }
  return (
    <div className="grid grid-cols-12 gap-8">
      <aside className="col-span-12 lg:col-span-3 lg:sticky lg:top-24 lg:h-[calc(100vh-6rem)] lg:overflow-auto">
        <BookFilters value={filters} categories={categories} onChange={update} />
      </aside>
      <section className="col-span-12 space-y-6 lg:col-span-9">
        {isLoading ? <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3"><Skeleton className="h-80" /><Skeleton className="h-80" /><Skeleton className="h-80" /></div> : <BookGrid books={data?.items ?? []} />}
        {data ? <Pagination page={data.page} pages={data.pages} onPageChange={(page) => update({ ...filters, page })} /> : null}
      </section>
    </div>
  );
}
