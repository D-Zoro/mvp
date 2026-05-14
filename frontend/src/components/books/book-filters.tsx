"use client";

import { SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { BookCondition, BookFilters as Filters } from "@/types/book";

export function BookFilters({ value, categories = [], onChange }: { value: Filters; categories?: string[]; onChange: (filters: Filters) => void }) {
  const [open, setOpen] = useState(false);
  const form = (
    <div className="space-y-4">
      <Input placeholder="Search title, author, ISBN" value={value.query ?? ""} onChange={(e) => onChange({ ...value, query: e.target.value, page: 1 })} />
      <Select value={value.category ?? ""} onChange={(e) => onChange({ ...value, category: e.target.value || undefined, page: 1 })}>
        <option value="">All categories</option>
        {categories.map((category) => <option key={category} value={category}>{category}</option>)}
      </Select>
      <Select value={value.condition ?? ""} onChange={(e) => onChange({ ...value, condition: (e.target.value || undefined) as BookCondition | undefined, page: 1 })}>
        <option value="">Any condition</option>
        <option value="new">New</option>
        <option value="like_new">Like New</option>
        <option value="good">Good</option>
        <option value="acceptable">Acceptable</option>
      </Select>
      <div className="grid grid-cols-2 gap-3">
        <Input type="number" min="0" placeholder="Min" value={value.min_price ?? ""} onChange={(e) => onChange({ ...value, min_price: e.target.value ? Number(e.target.value) : undefined, page: 1 })} />
        <Input type="number" min="0" placeholder="Max" value={value.max_price ?? ""} onChange={(e) => onChange({ ...value, max_price: e.target.value ? Number(e.target.value) : undefined, page: 1 })} />
      </div>
      <Select value={`${value.sort_by ?? "created_at"}:${value.sort_order ?? "desc"}`} onChange={(e) => {
        const [sort_by, sort_order] = e.target.value.split(":");
        onChange({ ...value, sort_by: sort_by as Filters["sort_by"], sort_order: sort_order as Filters["sort_order"] });
      }}>
        <option value="created_at:desc">Newest first</option>
        <option value="price:asc">Price low to high</option>
        <option value="price:desc">Price high to low</option>
        <option value="title:asc">Title A-Z</option>
      </Select>
    </div>
  );
  return (
    <>
      <div className="lg:hidden">
        <Button variant="secondary" className="w-full" onClick={() => setOpen((next) => !next)}>
          <SlidersHorizontal className="h-4 w-4" /> Filters
        </Button>
        {open ? <div className="mt-4 rounded-sm border border-border bg-surface p-4 shadow-sm">{form}</div> : null}
      </div>
      <div className="hidden rounded-sm border border-border bg-surface p-4 shadow-sm lg:block">{form}</div>
    </>
  );
}
