import "server-only";

import type { Order } from "@prisma/client";
import { chipConfigured, chipPaymentStatus, createChipPurchase } from "@/lib/chip";
import { db } from "@/lib/db";

export { chipConfigured };

export function appUrl() {
  return (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

// Mod test (tanpa key CHIP) hanya dibenarkan semasa development.
export function testPaymentAllowed() {
  return !chipConfigured() && process.env.NODE_ENV !== "production";
}

// Cipta purchase di CHIP, simpan id-nya pada order, pulangkan URL page bayaran.
export async function startPayment(order: Order) {
  const { purchaseId, paymentUrl } = await createChipPurchase(order, appUrl());
  await db.order.update({
    where: { id: order.id },
    data: { paymentProvider: "CHIP", chipPurchaseId: purchaseId },
  });
  return paymentUrl;
}

// Semak status bayaran terus dengan CHIP dan kemas kini order.
export async function syncOrderPayment(order: Order) {
  // Pelanggan boleh cuba bayar semula pada page CHIP yang sama, jadi order
  // yang FAILED masih disemak.
  const open = order.status === "PENDING" || order.status === "FAILED";
  if (!open || !order.chipPurchaseId || !chipConfigured()) return order;

  const result = await chipPaymentStatus(order);
  if (result === "PENDING" || result === order.status) return order;

  // updateMany supaya callback & page terima kasih tak bertembung.
  await db.order.updateMany({
    where: { id: order.id, status: order.status },
    data: { status: result },
  });
  return db.order.findUniqueOrThrow({ where: { id: order.id } });
}
