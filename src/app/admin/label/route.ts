import { isAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { fetchJntLabel, jntConfigured } from "@/lib/jnt";

// Muat turun label penghantaran J&T (PDF) untuk satu order. Admin sahaja.
export async function GET(request: Request) {
  if (!(await isAdmin())) return new Response("Tidak dibenarkan", { status: 401 });

  const orderId = new URL(request.url).searchParams.get("order") ?? "";
  const order = orderId ? await db.order.findUnique({ where: { id: orderId } }) : null;
  if (!order?.trackingNumber || !order.jntOrderId || !jntConfigured()) {
    return new Response("Label tak dijumpai", { status: 404 });
  }

  try {
    const pdf = await fetchJntLabel(order.trackingNumber);
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="jnt-${order.trackingNumber}.pdf"`,
      },
    });
  } catch (err) {
    console.error(err);
    return new Response("Tak dapat ambil label dari J&T. Cuba lagi sebentar.", { status: 502 });
  }
}
