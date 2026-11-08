// Maklumat baju. Tukar di sini kalau harga / size berubah.
export const BRAND = "Wan Kaadiaq";

export const PRODUCT = {
  name: "Five Times • One Purpose",
  tagline: "Five Times • One Purpose",
  description:
    "Edisi pertama Wan Kaadiaq. Baju hitam potongan oversized, logo kecil di dada dan cetakan lima garisan di belakang.",
  priceCents: 8900, // RM89.00
  postagePerItemCents: 800, // RM8.00 sehelai
  sizes: ["S", "M", "L", "XL", "XXL"] as const,
  maxQuantity: 10,
  images: [
    { src: "/baju-depan.jpg", alt: "Baju Wan Kaadiaq — depan" },
    { src: "/baju-belakang.jpg", alt: "Baju Wan Kaadiaq — belakang" },
  ],
  video: { src: "/baju-promo.mp4", poster: "/baju-promo-poster.jpg" },
};

export type Size = (typeof PRODUCT.sizes)[number];

export function isSize(value: string): value is Size {
  return (PRODUCT.sizes as readonly string[]).includes(value);
}

export function orderTotalCents(quantity: number) {
  const subtotal = PRODUCT.priceCents * quantity;
  const postage = PRODUCT.postagePerItemCents * quantity;
  return { subtotal, postage, total: subtotal + postage };
}

export function formatRM(cents: number) {
  return `RM${(cents / 100).toFixed(2)}`;
}
