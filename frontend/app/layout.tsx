import type { Metadata } from "next";
import { Manrope, Inter } from "next/font/google";
import { Header } from "@/components/layout/Header";
import { QueryProvider } from "@/providers/QueryProvider";
import { Toaster } from "sonner";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Books4All",
  description: "The Digital Curator - Second-hand book marketplace",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${manrope.variable} ${inter.variable}`}>
      <body className="font-body bg-surface text-on-surface antialiased">
        <QueryProvider>
          <Header />
          <main className="pt-20 min-h-screen">
            {children}
          </main>
          <Toaster richColors position="top-right" />
        </QueryProvider>
      </body>
    </html>
  );
}
