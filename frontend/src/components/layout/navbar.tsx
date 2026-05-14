"use client";

import Link from "next/link";
import { BookOpen, Menu, Search, ShoppingBag, User, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/auth.store";
import { cn } from "@/lib/utils/cn";

const nav = [
  { href: "/books", label: "Browse" },
  { href: "/sell", label: "Sell" },
  { href: "/orders", label: "Orders" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuthStore();
  return (
    <header className="sticky top-0 z-50 h-16 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-full w-full max-w-7xl items-center justify-between px-4 sm:px-6 md:px-8">
        <Link href="/" className="flex items-center gap-2 font-serif text-xl font-semibold leading-snug text-foreground">
          <BookOpen className="h-5 w-5 text-primary" aria-hidden="true" />
          Books4All
        </Link>
        <nav className="hidden items-center gap-1 sm:flex">
          {nav.map((item) => (
            <Link key={item.href} href={item.href} className="rounded-sm px-3 py-2 font-sans text-sm font-medium text-foreground transition-colors duration-150 ease-out hover:bg-foreground/5">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-2 sm:flex">
          <Button asChild href="/books" variant="ghost" size="sm">
            <Search className="h-4 w-4" /> Search
          </Button>
          {isAuthenticated ? (
            <>
              <Button asChild href="/profile" variant="secondary" size="sm">
                <User className="h-4 w-4" /> {user?.first_name ?? "Profile"}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => void logout()}>Logout</Button>
            </>
          ) : (
            <>
              <Button asChild href="/login" variant="secondary" size="sm">Login</Button>
              <Button asChild href="/register" size="sm">Register</Button>
            </>
          )}
        </div>
        <Button variant="ghost" size="sm" className="sm:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </Button>
      </div>
      <div className={cn("fixed bottom-0 right-0 top-0 z-50 w-64 border-l border-border bg-surface p-4 shadow-lg transition-transform duration-150 ease-out sm:hidden", open ? "translate-x-0" : "translate-x-full")}>
        <div className="mb-6 flex items-center justify-between">
          <span className="font-serif text-lg font-semibold text-foreground">Menu</span>
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)} aria-label="Close menu">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex flex-col gap-2">
          {[...nav, { href: "/profile", label: "Profile" }].map((item) => (
            <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className="rounded-sm px-3 py-2 font-sans text-sm font-medium text-foreground hover:bg-foreground/5">
              {item.label}
            </Link>
          ))}
          <Button asChild href="/books" className="mt-2">
            <ShoppingBag className="h-4 w-4" /> Browse books
          </Button>
        </div>
      </div>
    </header>
  );
}
