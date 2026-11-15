import { db } from "@/lib/db";
import { syncOrderPayment } from "@/lib/payment";

// CHIP POST purchase (JSON) ke sini lepas bayaran. Kita tak percaya isi request —
// cuma guna id untuk cari order, kemudian semak status terus dengan CHIP.
export async function POST(request: Request) {
  let purchaseId = "";
  try {
    const body = (await request.json()) as { id?: unknown };
    if (typeof body.id === "string") purchaseId = body.id;
  } catch {
    return new Response("Bad request", { status: 400 });
  }

  const order = purchaseId
    ? await db.order.findUnique({ where: { chipPurchaseId: purchaseId } })
    : null;
  if (!order) return new Response("Order not found", { status: 404 });

  await syncOrderPayment(order);
  return new Response("OK");
}
