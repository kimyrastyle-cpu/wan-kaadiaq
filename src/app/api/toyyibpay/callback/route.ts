import { db } from "@/lib/db";
import { syncOrderPayment } from "@/lib/toyyibpay";

// ToyyibPay POST ke sini lepas bayaran. Kita tak percaya isi request —
// cuma guna billcode untuk cari order, kemudian semak status terus dengan ToyyibPay.
export async function POST(request: Request) {
  const form = await request.formData();
  const billCode = String(form.get("billcode") ?? "");

  const order = billCode
    ? await db.order.findUnique({ where: { billCode } })
    : null;
  if (!order) return new Response("Order not found", { status: 404 });

  await syncOrderPayment(order);
  return new Response("OK");
}
