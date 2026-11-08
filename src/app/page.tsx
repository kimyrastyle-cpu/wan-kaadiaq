import Link from "next/link";
import { BRAND, PRODUCT, formatRM } from "@/lib/product";

export default function Home() {
  return (
    <>
      <section className="relative isolate flex min-h-[80vh] items-end overflow-hidden">
        <video
          className="absolute inset-0 -z-10 h-full w-full object-cover"
          src={PRODUCT.video.src}
          poster={PRODUCT.video.poster}
          autoPlay
          muted
          loop
          playsInline
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-background via-background/40 to-transparent" />
        <div className="mx-auto w-full max-w-5xl px-4 pb-12 sm:pb-20">
          <p className="text-xs uppercase tracking-[0.3em] text-muted">
            {BRAND} · Official Exclusive Release
          </p>
          <h1 className="mt-3 text-4xl font-bold uppercase tracking-[0.15em] sm:text-6xl">
            {PRODUCT.tagline}
          </h1>
          <div className="mt-8 flex flex-wrap items-center gap-6">
            <Link
              href="/baju"
              className="rounded-full bg-foreground px-7 py-3 text-sm font-semibold text-background hover:opacity-90"
            >
              Beli sekarang — {formatRM(PRODUCT.priceCents)}
            </Link>
            <span className="text-sm text-muted">
              Size {PRODUCT.sizes.join(" · ")}
            </span>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-16 sm:py-24">
        <div className="flex flex-col items-start justify-between gap-6 rounded-2xl border border-line bg-card p-8 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted">{BRAND} Barbershop</p>
            <h2 className="mt-2 text-2xl font-bold uppercase tracking-[0.1em]">Book slot potong rambut</h2>
            <p className="mt-2 text-sm text-muted">Setiap hari, 12 tengah hari – 12 malam.</p>
          </div>
          <Link
            href="/booking"
            className="shrink-0 rounded-full border border-foreground px-7 py-3 text-sm font-semibold hover:bg-foreground hover:text-background"
          >
            Book sekarang
          </Link>
        </div>
      </section>
    </>
  );
}
