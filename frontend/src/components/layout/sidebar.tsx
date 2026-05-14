import Link from "next/link";
import { cn } from "@/lib/utils/cn";

const links = [
  { href: "/sell", label: "Listings" },
  { href: "/sell/new", label: "New listing" },
  { href: "/orders", label: "Orders" },
  { href: "/profile", label: "Profile" },
];

export function Sidebar({ className }: { className?: string }) {
  return (
    <aside className={cn("rounded-sm border border-border bg-surface p-3 shadow-sm", className)}>
      <nav className="flex flex-col gap-1">
        {links.map((link) => (
          <Link key={link.href} href={link.href} className="rounded-sm px-3 py-2 font-sans text-sm font-medium text-foreground hover:bg-foreground/5">
            {link.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
