import { notFound } from "next/navigation";
import { Suspense } from "react";
import { db } from "@/lib/db";
import { formatRM } from "@/lib/product";
import { testPaymentAllowed } from "@/lib/toyyibpay";
import { completeTestPayment } from "../actions";

// Page bayaran palsu untuk test semasa development (sebelum ada key ToyyibPay).
export default function BayarTestPage({
  searchParams,
}: PageProps<"/baju/bayar-test">) {
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <Suspense fallback={<p className="text-muted">Memuatkan…</p>}>
        <TestPayment searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function TestPayment({
  searchParams,
}: {
  searchParams: PageProps<"/baju/bayar-test">["searchParams"];
}) {
  if (!testPaymentAllowed()) notFound();

  const { order: orderId } = await searchParams;
  const order =
    typeof orderId === "string"
      ? await db.order.findUnique({ where: { id: orderId } })
      : null;
  if (!order) notFound();

  return (
    <div className="rounded-2xl border border-dashed border-muted p-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-danger">
        Mod test — bukan bayaran sebenar
      </p>
      <h1 className="mt-3 text-xl font-bold">Simulasi bayaran</h1>
      <p className="mt-2 text-sm text-muted">
        {order.customerName} · saiz {order.size} × {order.quantity} ·{" "}
        <span className="font-semibold text-foreground">{formatRM(order.amountCents)}</span>
      </p>
      <form action={completeTestPayment} className="mt-6 grid grid-cols-2 gap-3">
        <input type="hidden" name="orderId" value={order.id} />
        <button
          name="outcome"
          value="paid"
          className="rounded-full bg-success py-3 text-sm font-semibold text-background"
        >
          Bayaran berjaya
        </button>
        <button
          name="outcome"
          value="failed"
          className="rounded-full border border-line py-3 text-sm font-semibold"
        >
          Bayaran gagal
        </button>
      </form>
    </div>
  );
}
