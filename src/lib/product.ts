// Maklumat baju. Tukar di sini kalau harga / size berubah.
export const BRAND = "Wan Kaadiaq";

export const PRODUCT = {
  name: "Five Times • One Purpose",
  tagline: "Five Times • One Purpose",
  description:
    "Official Exclusive Release Wan Kaadiaq. Baju hitam potongan oversized, logo kecil di dada dan cetakan lima garisan di belakang.",
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

export const MY_STATES = [
  "Johor",
  "Kedah",
  "Kelantan",
  "Melaka",
  "Negeri Sembilan",
  "Pahang",
  "Perak",
  "Perlis",
  "Pulau Pinang",
  "Sabah",
  "Sarawak",
  "Selangor",
  "Terengganu",
  "W.P. Kuala Lumpur",
  "W.P. Labuan",
  "W.P. Putrajaya",
] as const;

type Address = {
  company: string | null;
  address1: string;
  address2: string | null;
  postcode: string;
  city: string;
  state: string;
  country: string;
};

// Alamat dalam format label pos, satu baris setiap elemen.
export function formatAddress(a: Address) {
  return [a.company, a.address1, a.address2, `${a.postcode} ${a.city}`, `${a.state}, ${a.country}`]
    .filter(Boolean)
    .join("\n");
}

export function formatRM(cents: number) {
  return `RM${(cents / 100).toFixed(2)}`;
}
