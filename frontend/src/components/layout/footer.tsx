import Link from "next/link";
import { PageContainer } from "./page-container";

export function Footer() {
  return (
    <footer className="mt-16 border-t border-border bg-background py-8">
      <PageContainer className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-sans text-sm leading-normal text-muted">Books4All marketplace</p>
        <div className="flex gap-4 font-sans text-sm text-foreground">
          <Link href="/books">Browse</Link>
          <Link href="/sell">Sell</Link>
          <Link href="/orders">Orders</Link>
        </div>
      </PageContainer>
    </footer>
  );
}
