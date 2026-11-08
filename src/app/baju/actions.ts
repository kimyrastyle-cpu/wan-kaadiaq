"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { PRODUCT, isSize, orderTotalCents } from "@/lib/product";
import {
  createBill,
  testPaymentAllowed,
  toyyibpayConfigured,
} from "@/lib/toyyibpay";

export type OrderFormState = { error: string | null };

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function createOrder(
  _prev: OrderFormState,
  formData: FormData,
): Promise<OrderFormState> {
  const size = text(formData, "size");
  const quantity = Number(text(formData, "quantity"));
  const customerName = text(formData, "name");
  const customerEmail = text(formData, "email");
  const customerPhone = text(formData, "phone").replace(/[^\d]/g, "");
  const address = text(formData, "address");

  if (!isSize(size)) return { error: "Sila pilih size." };
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > PRODUCT.maxQuantity) {
    return { error: `Kuantiti mesti antara 1 dan ${PRODUCT.maxQuantity}.` };
  }
  if (customerName.length < 2) return { error: "Sila isi nama penuh." };
  if (!/^\S+@\S+\.\S+$/.test(customerEmail)) return { error: "Emel tak sah." };
  if (customerPhone.length < 10 || customerPhone.length > 12) {
    return { error: "Nombor telefon tak sah (contoh 0123456789)." };
  }
  if (address.length < 10) return { error: "Sila isi alamat penghantaran penuh." };

  // Harga dikira di server, bukan dari browser.
  const { total } = orderTotalCents(quantity);

  const order = await db.order.create({
    data: {
      customerName,
      customerEmail,
      customerPhone,
      address,
      size,
      quantity,
      amountCents: total,
    },
  });

  if (toyyibpayConfigured()) {
    let paymentUrl: string;
    try {
      const bill = await createBill(order);
      await db.order.update({
        where: { id: order.id },
        data: { billCode: bill.billCode },
      });
      paymentUrl = bill.paymentUrl;
    } catch (err) {
      console.error(err);
      return { error: "Tak dapat sambung ke sistem bayaran. Cuba lagi sebentar." };
    }
    redirect(paymentUrl);
  }

  if (testPaymentAllowed()) {
    redirect(`/baju/bayar-test?order=${order.id}`);
  }

  return { error: "Sistem bayaran belum disediakan." };
}

// Hanya untuk mod test (tiada key ToyyibPay, bukan production).
export async function completeTestPayment(formData: FormData) {
  if (!testPaymentAllowed()) throw new Error("Mod test tidak dibenarkan.");

  const orderId = text(formData, "orderId");
  const outcome = text(formData, "outcome");

  await db.order.updateMany({
    where: { id: orderId, status: "PENDING" },
    data: { status: outcome === "paid" ? "PAID" : "FAILED" },
  });
  redirect(`/baju/terima-kasih?order_id=${orderId}`);
}
