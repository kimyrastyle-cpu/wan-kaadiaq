import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import { BRAND } from "@/lib/product";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: BRAND,
  description: `${BRAND} — baju dan barbershop.`,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ms"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="border-b border-line">
          <nav className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
            <Link href="/" className="text-lg font-bold tracking-tight">
              {BRAND}
            </Link>
            <div className="flex items-center gap-4 text-sm sm:gap-6">
              <Link href="/baju" className="hover:underline">
                Baju
              </Link>
              <Link href="/booking" className="hover:underline">
                <span className="sm:hidden">Booking</span>
                <span className="hidden sm:inline">Barbershop Booking Slot</span>
              </Link>
              <Link href="/" aria-label={`${BRAND} — laman utama`} className="shrink-0">
                <Image src="/logo.png" alt="" width={116} height={160} priority className="h-9 w-auto" />
              </Link>
            </div>
          </nav>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-line py-6 text-center text-xs text-muted">
          © {BRAND}
        </footer>
      </body>
    </html>
  );
}
