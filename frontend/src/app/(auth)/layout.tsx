import Link from "next/link";
import { BookOpen } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen bg-background">
      <section className="hidden flex-1 border-r border-border bg-surface-muted p-8 lg:flex lg:flex-col lg:justify-between">
        <Link href="/" className="flex items-center gap-2 font-serif text-xl font-semibold text-foreground">
          <BookOpen className="h-5 w-5 text-primary" />
          Books4All
        </Link>
        <div className="max-w-md">
          <h1 className="font-serif text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl">Trade books with readers who value them.</h1>
        </div>
      </section>
      <section className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6 md:px-8">{children}</section>
    </main>
  );
}
