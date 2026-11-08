"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { MY_STATES, PRODUCT, isSize, orderTotalCents } from "@/lib/product";
import {
  createBill,
  testPaymentAllowed,
  toyyibpayConfigured,
} from "@/lib/toyyibpay";

// Medan alamat yang dihantar balik bila ada error, supaya borang tak kosong semula.
const ADDRESS_FIELDS = [
  "email",
  "firstName",
  "lastName",
  "company",
  "address1",
  "address2",
  "postcode",
  "city",
  "state",
  "phone",
] as const;

export type OrderFormState = {
  error: string | null;
  values?: Partial<Record<(typeof ADDRESS_FIELDS)[number], string>>;
};

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function createOrder(
  _prev: OrderFormState,
  formData: FormData,
): Promise<OrderFormState> {
  const values = Object.fromEntries(ADDRESS_FIELDS.map((k) => [k, text(formData, k)]));
  const fail = (error: string): OrderFormState => ({ error, values });

  const size = text(formData, "size");
  const quantity = Number(text(formData, "quantity"));
  const firstName = text(formData, "firstName");
  const lastName = text(formData, "lastName");
  const customerEmail = text(formData, "email");
  const customerPhone = text(formData, "phone").replace(/[^\d]/g, "");
  const company = text(formData, "company") || null;
  const address1 = text(formData, "address1");
  const address2 = text(formData, "address2") || null;
  const postcode = text(formData, "postcode");
  const city = text(formData, "city");
  const state = text(formData, "state");

  if (!isSize(size)) return fail("Sila pilih size.");
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > PRODUCT.maxQuantity) {
    return fail(`Kuantiti mesti antara 1 dan ${PRODUCT.maxQuantity}.`);
  }
  if (!/^\S+@\S+\.\S+$/.test(customerEmail)) return fail("Emel tak sah.");
  if (!firstName || !lastName) return fail("Sila isi nama pertama dan nama akhir.");
  if (address1.length < 5) return fail("Sila isi alamat.");
  if (!/^\d{5}$/.test(postcode)) return fail("Poskod mesti 5 digit.");
  if (!city) return fail("Sila isi bandar.");
  if (!(MY_STATES as readonly string[]).includes(state)) return fail("Sila pilih negeri.");
  if (customerPhone.length < 10 || customerPhone.length > 12) {
    return fail("Nombor telefon tak sah (contoh 0123456789).");
  }

  // Harga dikira di server, bukan dari browser.
  const { total } = orderTotalCents(quantity);

  const order = await db.order.create({
    data: {
      firstName,
      lastName,
      customerEmail,
      customerPhone,
      company,
      address1,
      address2,
      postcode,
      city,
      state,
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
      return fail("Tak dapat sambung ke sistem bayaran. Cuba lagi sebentar.");
    }
    redirect(paymentUrl);
  }

  if (testPaymentAllowed()) {
    redirect(`/baju/bayar-test?order=${order.id}`);
  }

  return fail("Sistem bayaran belum disediakan.");
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
