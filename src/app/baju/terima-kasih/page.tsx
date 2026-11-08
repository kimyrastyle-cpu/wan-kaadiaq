import Link from "next/link";
import { Suspense } from "react";
import { db } from "@/lib/db";
import { formatRM } from "@/lib/product";
import { syncOrderPayment } from "@/lib/toyyibpay";

// ToyyibPay hantar balik ke sini dengan ?status_id=..&billcode=..&order_id=..
export default function TerimaKasihPage({
  searchParams,
}: PageProps<"/baju/terima-kasih">) {
  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <Suspense fallback={<p className="text-muted">Menyemak bayaran…</p>}>
        <OrderStatus searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function OrderStatus({
  searchParams,
}: {
  searchParams: PageProps<"/baju/terima-kasih">["searchParams"];
}) {
  const params = await searchParams;
  const orderId = typeof params.order_id === "string" ? params.order_id : "";

  const found = orderId
    ? await db.order.findUnique({ where: { id: orderId } })
    : null;
  if (!found) {
    return <Message title="Order tak dijumpai" body="Pautan ni tak sah." />;
  }

  const order = await syncOrderPayment(found);
  const ref = order.id.slice(-8).toUpperCase();

  if (order.status === "PAID" || order.status === "SHIPPED") {
    return (
      <Message
        title="Terima kasih! 🖤"
        body={`Bayaran ${formatRM(order.amountCents)} diterima. Baju saiz ${order.size} × ${order.quantity} akan dipos ke alamat anda. No. rujukan: ${ref}`}
      />
    );
  }

  if (order.status === "FAILED") {
    return (
      <Message
        title="Bayaran tidak berjaya"
        body="Tiada caj dibuat. Anda boleh cuba sekali lagi."
        retry
      />
    );
  }

  return (
    <Message
      title="Bayaran sedang diproses"
      body={`Kami belum terima pengesahan bayaran. Muat semula page ni sebentar lagi. No. rujukan: ${ref}`}
    />
  );
}

function Message({ title, body, retry }: { title: string; body: string; retry?: boolean }) {
  return (
    <>
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted">{body}</p>
      <Link
        href={retry ? "/baju" : "/"}
        className="mt-8 inline-block rounded-full bg-foreground px-6 py-3 text-sm font-semibold text-background"
      >
        {retry ? "Cuba lagi" : "Kembali ke laman utama"}
      </Link>
    </>
  );
}
