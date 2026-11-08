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
            {BRAND} · Edisi pertama
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
    </>
  );
}
