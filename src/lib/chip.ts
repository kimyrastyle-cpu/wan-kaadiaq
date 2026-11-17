import "server-only";

import type { Order } from "@prisma/client";
import { PRODUCT } from "@/lib/product";

// CHIP Collect — https://docs.chip-in.asia/chip-collect/api-reference/purchases/create
// Key test dan key live guna alamat API yang sama; jenis key yang tentukan mod.
const BASE_URL = (process.env.CHIP_BASE_URL || "https://gate.chip-in.asia/api/v1").replace(/\/$/, "");

export function chipConfigured() {
  return Boolean(process.env.CHIP_SECRET_KEY && process.env.CHIP_BRAND_ID);
}

type ChipPurchase = {
  id?: string;
  status?: string;
  checkout_url?: string;
  purchase?: { total?: number; currency?: string };
};

async function request(path: string, init?: RequestInit) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${process.env.CHIP_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`CHIP ${path} gagal (${res.status}): ${text.slice(0, 300)}`);
  }
  try {
    return JSON.parse(text) as ChipPurchase;
  } catch {
    throw new Error(`CHIP ${path} balas bukan JSON: ${text.slice(0, 200)}`);
  }
}

// CHIP tolak success_callback yang ada port (contoh localhost:3000),
// jadi semasa development kita bergantung pada page terima kasih sahaja.
function callbackUrl(appUrl: string) {
  try {
    const url = new URL(appUrl);
    if (url.port || url.hostname === "localhost") return undefined;
    return `${appUrl}/api/chip/callback`;
  } catch {
    return undefined;
  }
}

export async function createChipPurchase(order: Order, appUrl: string) {
  const returnUrl = `${appUrl}/baju/terima-kasih?order_id=${order.id}`;
  const perItemCents = Math.round(order.amountCents / order.quantity);

  const data = await request("/purchases/", {
    method: "POST",
    body: JSON.stringify({
      brand_id: process.env.CHIP_BRAND_ID,
      reference: order.id,
      client: {
        email: order.customerEmail,
        full_name: `${order.firstName} ${order.lastName}`,
      },
      purchase: {
        currency: "MYR",
        products: [
          {
            name: `${PRODUCT.name} (saiz ${order.size}) + postage`,
            price: perItemCents,
            quantity: order.quantity,
          },
        ],
      },
      // Medan ni mesti di peringkat atas, bukan dalam `purchase`.
      success_redirect: returnUrl,
      failure_redirect: returnUrl,
      cancel_redirect: returnUrl,
      success_callback: callbackUrl(appUrl),
    }),
  });

  if (!data.id || !data.checkout_url) {
    throw new Error(`CHIP createPurchase tiada checkout_url: ${JSON.stringify(data).slice(0, 300)}`);
  }
  return { purchaseId: data.id, paymentUrl: data.checkout_url };
}

const FAILED_STATUSES = ["error", "blocked", "cancelled", "expired"];

// Jangan percaya isi callback / URL — tanya CHIP sendiri status purchase.
export async function chipPaymentStatus(order: Order): Promise<"PAID" | "FAILED" | "PENDING"> {
  if (!order.chipPurchaseId) return "PENDING";
  const data = await request(`/purchases/${order.chipPurchaseId}/`);

  if (data.status === "paid" && data.purchase?.total === order.amountCents) return "PAID";
  if (data.status && FAILED_STATUSES.includes(data.status)) return "FAILED";
  return "PENDING";
}
