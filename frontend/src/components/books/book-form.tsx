"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ImageUploader } from "./image-uploader";
import { useCreateBook, useUpdateBook } from "@/lib/hooks/use-books";
import type { Book, BookCreateInput } from "@/types/book";

export function BookForm({ mode, id, defaultValues, onSuccess }: { mode: "create" | "edit"; id?: string; defaultValues?: Partial<BookCreateInput>; onSuccess?: (book: Book) => void }) {
  const router = useRouter();
  const createBook = useCreateBook();
  const updateBook = useUpdateBook(id ?? "");
  const [form, setForm] = useState<BookCreateInput>({
    title: defaultValues?.title ?? "",
    author: defaultValues?.author ?? "",
    condition: defaultValues?.condition ?? "good",
    price: defaultValues?.price ?? 1,
    isbn: defaultValues?.isbn ?? "",
    description: defaultValues?.description ?? "",
    quantity: defaultValues?.quantity ?? 1,
    category: defaultValues?.category ?? "",
    publisher: defaultValues?.publisher ?? "",
    publication_year: defaultValues?.publication_year,
    language: defaultValues?.language ?? "English",
    page_count: defaultValues?.page_count,
    images: defaultValues?.images ?? [],
    status: defaultValues?.status ?? "active",
  });
  const pending = createBook.isPending || updateBook.isPending;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const payload = { ...form, isbn: form.isbn || undefined, category: form.category || undefined, publisher: form.publisher || undefined };
    const book = mode === "edit" && id ? await updateBook.mutateAsync(payload) : await createBook.mutateAsync(payload);
    onSuccess?.(book);
    router.push(mode === "edit" ? "/sell" : `/books/${book.id}`);
  }

  return (
    <form onSubmit={submit} className="grid gap-4 rounded-sm border border-border bg-surface p-4 shadow-sm md:grid-cols-2">
      <label className="space-y-1">
        <span className="font-sans text-sm leading-normal text-muted">Title</span>
        <Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
      </label>
      <label className="space-y-1">
        <span className="font-sans text-sm leading-normal text-muted">Author</span>
        <Input required value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} />
      </label>
      <label className="space-y-1">
        <span className="font-sans text-sm leading-normal text-muted">Condition</span>
        <Select value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value as BookCreateInput["condition"] })}>
          <option value="new">New</option>
          <option value="like_new">Like New</option>
          <option value="good">Good</option>
          <option value="acceptable">Acceptable</option>
        </Select>
      </label>
      <label className="space-y-1">
        <span className="font-sans text-sm leading-normal text-muted">Price</span>
        <Input required type="number" min="0.01" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
      </label>
      <label className="space-y-1">
        <span className="font-sans text-sm leading-normal text-muted">ISBN</span>
        <Input value={form.isbn ?? ""} onChange={(e) => setForm({ ...form, isbn: e.target.value })} />
      </label>
      <label className="space-y-1">
        <span className="font-sans text-sm leading-normal text-muted">Quantity</span>
        <Input type="number" min="1" value={form.quantity ?? 1} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} />
      </label>
      <label className="space-y-1">
        <span className="font-sans text-sm leading-normal text-muted">Category</span>
        <Input value={form.category ?? ""} onChange={(e) => setForm({ ...form, category: e.target.value })} />
      </label>
      <label className="space-y-1">
        <span className="font-sans text-sm leading-normal text-muted">Publisher</span>
        <Input value={form.publisher ?? ""} onChange={(e) => setForm({ ...form, publisher: e.target.value })} />
      </label>
      <label className="space-y-1">
        <span className="font-sans text-sm leading-normal text-muted">Publication year</span>
        <Input type="number" value={form.publication_year ?? ""} onChange={(e) => setForm({ ...form, publication_year: e.target.value ? Number(e.target.value) : undefined })} />
      </label>
      <label className="space-y-1">
        <span className="font-sans text-sm leading-normal text-muted">Page count</span>
        <Input type="number" value={form.page_count ?? ""} onChange={(e) => setForm({ ...form, page_count: e.target.value ? Number(e.target.value) : undefined })} />
      </label>
      <label className="space-y-1 md:col-span-2">
        <span className="font-sans text-sm leading-normal text-muted">Description</span>
        <Textarea value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      </label>
      <div className="md:col-span-2">
        <ImageUploader value={form.images ?? []} onChange={(images) => setForm({ ...form, images })} />
      </div>
      <div className="flex justify-end md:col-span-2">
        <Button type="submit" disabled={pending}>{pending ? "Saving..." : mode === "edit" ? "Update listing" : "Create listing"}</Button>
      </div>
    </form>
  );
}
