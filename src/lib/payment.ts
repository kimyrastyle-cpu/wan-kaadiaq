import "server-only";

import type { Order } from "@prisma/client";
import { chipConfigured, chipPaymentStatus, createChipPurchase } from "@/lib/chip";
import { db } from "@/lib/db";
import { PAYMENT_PROVIDERS, type PaymentProvider } from "@/lib/product";
import { createBill, toyyibpayConfigured, toyyibpayPaymentStatus } from "@/lib/toyyibpay";

export function appUrl() {
  return (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

// Gateway yang dah ada key dalam .env, ikut susunan dalam PAYMENT_PROVIDERS.
export function availableProviders(): PaymentProvider[] {
  const configured: Record<PaymentProvider, boolean> = {
    CHIP: chipConfigured(),
    TOYYIBPAY: toyyibpayConfigured(),
  };
  return PAYMENT_PROVIDERS.map((p) => p.key).filter((key) => configured[key]);
}

// Mod test (tanpa gateway) hanya dibenarkan semasa development.
export function testPaymentAllowed() {
  return availableProviders().length === 0 && process.env.NODE_ENV !== "production";
}

// Cipta bil di gateway, simpan rujukannya pada order, pulangkan URL page bayaran.
export async function startPayment(order: Order, provider: PaymentProvider) {
  if (provider === "CHIP") {
    const { purchaseId, paymentUrl } = await createChipPurchase(order, appUrl());
    await db.order.update({
      where: { id: order.id },
      data: { paymentProvider: provider, chipPurchaseId: purchaseId },
    });
    return paymentUrl;
  }

  const { billCode, paymentUrl } = await createBill(order, appUrl());
  await db.order.update({
    where: { id: order.id },
    data: { paymentProvider: provider, billCode },
  });
  return paymentUrl;
}

// Semak status bayaran terus dengan gateway dan kemas kini order.
export async function syncOrderPayment(order: Order) {
  // Pelanggan boleh cuba bayar semula pada page CHIP yang sama, jadi order
  // CHIP yang FAILED masih disemak.
  const retryable = order.status === "FAILED" && order.paymentProvider === "CHIP";
  if (order.status !== "PENDING" && !retryable) return order;

  let result: "PAID" | "FAILED" | "PENDING";
  if (order.paymentProvider === "CHIP" && chipConfigured()) {
    result = await chipPaymentStatus(order);
  } else if (order.billCode && toyyibpayConfigured()) {
    result = await toyyibpayPaymentStatus(order);
  } else {
    return order;
  }

  if (result === "PENDING" || result === order.status) return order;

  // updateMany supaya callback & page terima kasih tak bertembung.
  await db.order.updateMany({
    where: { id: order.id, status: order.status },
    data: { status: result },
  });
  return db.order.findUniqueOrThrow({ where: { id: order.id } });
}
