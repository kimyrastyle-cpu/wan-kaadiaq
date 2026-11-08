import "server-only";

import type { Order } from "@prisma/client";
import { db } from "@/lib/db";

const BASE_URL = process.env.TOYYIBPAY_BASE_URL || "https://dev.toyyibpay.com";

export function toyyibpayConfigured() {
  return Boolean(
    process.env.TOYYIBPAY_SECRET_KEY && process.env.TOYYIBPAY_CATEGORY_CODE,
  );
}

// Mod test (tanpa ToyyibPay) hanya dibenarkan semasa development.
export function testPaymentAllowed() {
  return !toyyibpayConfigured() && process.env.NODE_ENV !== "production";
}

export function appUrl() {
  return (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

async function post(path: string, fields: Record<string, string>) {
  const res = await fetch(`${BASE_URL}/index.php/api/${path}`, {
    method: "POST",
    body: new URLSearchParams(fields),
    cache: "no-store",
  });
  const text = await res.text();
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error(`ToyyibPay ${path} balas bukan JSON: ${text.slice(0, 200)}`);
  }
}

export async function createBill(order: Order) {
  const data = await post("createBill", {
    userSecretKey: process.env.TOYYIBPAY_SECRET_KEY!,
    categoryCode: process.env.TOYYIBPAY_CATEGORY_CODE!,
    billName: "Baju Wan Kaadiaq", // max 30 aksara
    billDescription: `Baju saiz ${order.size} x${order.quantity}`, // max 100 aksara
    billPriceSetting: "1",
    billPayorInfo: "1",
    billAmount: String(order.amountCents),
    billReturnUrl: `${appUrl()}/baju/terima-kasih`,
    billCallbackUrl: `${appUrl()}/api/toyyibpay/callback`,
    billExternalReferenceNo: order.id,
    billTo: `${order.firstName} ${order.lastName}`,
    billEmail: order.customerEmail,
    billPhone: order.customerPhone,
    billPaymentChannel: "2", // 0 = FPX, 1 = kad, 2 = kedua-dua
  });

  const billCode = Array.isArray(data)
    ? (data[0] as { BillCode?: string })?.BillCode
    : undefined;
  if (!billCode) {
    throw new Error(`ToyyibPay createBill gagal: ${JSON.stringify(data)}`);
  }
  return { billCode, paymentUrl: `${BASE_URL}/${billCode}` };
}

type BillTransaction = {
  billpaymentStatus?: string;
  billpaymentAmount?: string;
};

// Jangan percaya status dalam URL / callback — tanya ToyyibPay sendiri.
export async function syncOrderPayment(order: Order) {
  if (order.status !== "PENDING" || !order.billCode || !toyyibpayConfigured()) {
    return order;
  }

  const data = await post("getBillTransactions", { billCode: order.billCode });
  const transactions = Array.isArray(data) ? (data as BillTransaction[]) : [];

  const paid = transactions.some(
    (t) =>
      t.billpaymentStatus === "1" &&
      Math.round(parseFloat(t.billpaymentAmount ?? "0") * 100) ===
        order.amountCents,
  );
  const failed =
    transactions.length > 0 &&
    transactions.every((t) => t.billpaymentStatus === "3");

  if (!paid && !failed) return order;

  // updateMany supaya callback & page terima kasih tak bertembung.
  await db.order.updateMany({
    where: { id: order.id, status: "PENDING" },
    data: { status: paid ? "PAID" : "FAILED" },
  });
  return db.order.findUniqueOrThrow({ where: { id: order.id } });
}
