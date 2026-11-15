import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { isAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import {
  creditBalance,
  easyparcelIsDemo,
  easyparcelMissing,
  getRates,
  type Rate,
} from "@/lib/easyparcel";
import { orderRef } from "@/lib/notify";
import { formatAddress } from "@/lib/product";
import { LoginForm } from "../../login-form";
import { ShipForm } from "./ship-form";

export const metadata: Metadata = {
  title: "Pos guna EasyParcel",
  robots: { index: false, follow: false },
};

export default function PosPage({ params }: PageProps<"/admin/pos/[id]">) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link href="/admin" className="text-sm text-muted underline hover:text-foreground">
        ← Balik ke order
      </Link>
      <Suspense fallback={<p className="mt-6 text-muted">Memuatkan harga kurier…</p>}>
        <PosGate params={params} />
      </Suspense>
    </div>
  );
}

async function PosGate({ params }: { params: PageProps<"/admin/pos/[id]">["params"] }) {
  if (!(await isAdmin())) return <LoginForm />;

  const { id } = await params;
  const order = await db.order.findUnique({ where: { id } });
  if (!order) notFound();

  const missing = easyparcelMissing();

  let rates: Rate[] = [];
  let balance: string | null = null;
  let loadError: string | null = null;
  if (missing.length === 0 && order.status === "PAID" && !order.epOrderNo) {
    try {
      [rates, balance] = await Promise.all([getRates(order), creditBalance()]);
    } catch (err) {
      loadError = err instanceof Error ? err.message : "Gagal hubungi EasyParcel.";
    }
  } else if (missing.length === 0 && order.epOrderNo) {
    balance = await creditBalance().catch(() => null);
  }

  return (
    <>
      <h1 className="mt-4 text-2xl font-bold">Pos guna EasyParcel</h1>
      {easyparcelIsDemo() && missing.length === 0 && (
        <p className="mt-2 rounded-lg border border-line px-3 py-2 text-xs text-muted">
          Mod DEMO — tiada kurier sebenar datang, tiada kredit sebenar ditolak.
        </p>
      )}

      <section className="mt-6 rounded-xl border border-line bg-card p-4 text-sm">
        <p className="font-semibold">
          {order.firstName} {order.lastName}{" "}
          <span className="font-mono text-xs text-muted">#{orderRef(order)}</span>
        </p>
        <p className="mt-1">
          Size {order.size} × {order.quantity}
        </p>
        <p className="mt-2 whitespace-pre-line text-muted">{formatAddress(order)}</p>
        <p className="text-muted">{order.customerPhone}</p>
      </section>

      {order.status !== "PAID" ? (
        <p className="mt-6 text-sm text-muted">Order ni bukan status &quot;Dah bayar&quot;, jadi tak boleh tempah kurier.</p>
      ) : missing.length > 0 ? (
        <section className="mt-6 rounded-xl border border-danger/40 p-4 text-sm">
          <p className="font-semibold">EasyParcel belum disediakan.</p>
          <p className="mt-1 text-muted">Maklumat ni belum diisi dalam Vercel (Environment Variables):</p>
          <ul className="mt-2 list-disc pl-5 font-mono text-xs">
            {missing.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </section>
      ) : loadError ? (
        <p className="mt-6 rounded-xl border border-danger/40 p-4 text-sm text-danger">{loadError}</p>
      ) : (
        <ShipForm orderId={order.id} rates={rates} balance={balance} pendingEpOrder={order.epOrderNo} />
      )}
    </>
  );
}
