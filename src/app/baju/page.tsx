import type { Metadata } from "next";
import Image from "next/image";
import { BRAND, PRODUCT, formatRM } from "@/lib/product";
import { OrderForm } from "./order-form";

export const metadata: Metadata = {
  title: `${PRODUCT.name} — ${BRAND}`,
  description: PRODUCT.description,
};

export default function BajuPage() {
  return (
    <div className="mx-auto grid max-w-5xl gap-10 px-4 py-10 md:grid-cols-[1.1fr_1fr] md:py-16">
      <div className="space-y-4">
        {PRODUCT.images.map((img, i) => (
          <Image
            key={img.src}
            src={img.src}
            alt={img.alt}
            width={800}
            height={767}
            priority={i === 0}
            className="w-full rounded-2xl"
          />
        ))}
      </div>

      <div className="md:sticky md:top-6 md:self-start">
        <p className="text-xs uppercase tracking-[0.3em] text-muted">{BRAND}</p>
        <h1 className="mt-2 text-2xl font-bold uppercase tracking-[0.12em]">
          {PRODUCT.name}
        </h1>
        <p className="mt-3 text-2xl font-semibold">{formatRM(PRODUCT.priceCents)}</p>
        <p className="mt-4 text-sm leading-relaxed text-muted">{PRODUCT.description}</p>
        <div className="mt-8">
          <OrderForm />
        </div>
      </div>
    </div>
  );
}
