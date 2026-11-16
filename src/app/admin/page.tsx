import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import type { Order } from "@prisma/client";
import { isAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { PRODUCT, formatAddress, formatRM } from "@/lib/product";
import { whatsappLink } from "@/lib/notify";
import { markShipped, resendShippedEmail, undoShipped } from "./actions";
import { AdminNav } from "./admin-nav";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

const TABS = [
  { key: "PAID", label: "Perlu dipos" },
  { key: "SHIPPED", label: "Dah dipos" },
  { key: "PENDING", label: "Belum bayar" },
  { key: "FAILED", label: "Gagal" },
  { key: "ALL", label: "Semua" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

const dateFmt = new Intl.DateTimeFormat("ms-MY", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Kuala_Lumpur",
});

export default function AdminPage({ searchParams }: PageProps<"/admin">) {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <Suspense fallback={<p className="text-muted">Memuatkan…</p>}>
        <AdminGate searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function AdminGate({
  searchParams,
}: {
  searchParams: PageProps<"/admin">["searchParams"];
}) {
  if (!(await isAdmin())) return <LoginForm />;

  const { status } = await searchParams;
  const tab: TabKey = TABS.some((t) => t.key === status) ? (status as TabKey) : "PAID";
  return <Dashboard tab={tab} />;
}

async function Dashboard({ tab }: { tab: TabKey }) {
  const [orders, counts, sold, toShipBySize] = await Promise.all([
    db.order.findMany({
      where: tab === "ALL" ? {} : { status: tab },
      orderBy: { createdAt: tab === "PAID" ? "asc" : "desc" },
      take: 200,
    }),
    db.order.groupBy({ by: ["status"], _count: true }),
    db.order.aggregate({
      where: { status: { in: ["PAID", "SHIPPED"] } },
      _sum: { amountCents: true, quantity: true },
    }),
    db.order.groupBy({
      by: ["size"],
      where: { status: "PAID" },
      _sum: { quantity: true },
    }),
  ]);

  const countOf = (key: TabKey) =>
    key === "ALL"
      ? counts.reduce((n, c) => n + c._count, 0)
      : (counts.find((c) => c.status === key)?._count ?? 0);

  const sizeQty = (size: string) =>
    toShipBySize.find((s) => s.size === size)?._sum.quantity ?? 0;

  return (
    <>
      <AdminNav current="order" />
      <h1 className="mt-6 text-2xl font-bold">Order baju</h1>

      <section className="mt-6 grid gap-3 sm:grid-cols-3">
        <Stat label="Jumlah jualan (dah bayar)" value={formatRM(sold._sum.amountCents ?? 0)} />
        <Stat label="Baju terjual" value={String(sold._sum.quantity ?? 0)} />
        <div className="rounded-xl border border-line bg-card p-4">
          <p className="text-xs text-muted">Perlu dipos ikut size</p>
          <div className="mt-2 flex justify-between text-sm">
            {PRODUCT.sizes.map((s) => (
              <div key={s} className="text-center">
                <div className="text-xs text-muted">{s}</div>
                <div className="text-lg font-semibold">{sizeQty(s)}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <nav className="mt-8 flex gap-2 overflow-x-auto border-b border-line pb-px text-sm">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/admin?status=${t.key}`}
            className={`whitespace-nowrap border-b-2 px-3 py-2 ${
              tab === t.key ? "border-foreground font-semibold" : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            {t.label} <span className="text-muted">({countOf(t.key)})</span>
          </Link>
        ))}
      </nav>

      {orders.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted">Tiada order.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {orders.map((o) => (
            <OrderCard key={o.id} order={o} />
          ))}
        </ul>
      )}
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-card p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

const STATUS_LABEL: Record<string, { text: string; className: string }> = {
  PENDING: { text: "Belum bayar", className: "text-muted border-line" },
  PAID: { text: "Dah bayar", className: "text-success border-success/40" },
  SHIPPED: { text: "Dah dipos", className: "text-foreground border-foreground/40" },
  FAILED: { text: "Gagal", className: "text-danger border-danger/40" },
};

function OrderCard({ order: o }: { order: Order }) {
  const status = STATUS_LABEL[o.status] ?? STATUS_LABEL.PENDING;
  const showWhatsApp = o.status === "PAID" || o.status === "SHIPPED";

  return (
    <li className="rounded-xl border border-line bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold">
            {o.firstName} {o.lastName}{" "}
            <span className="ml-1 font-mono text-xs text-muted">#{o.id.slice(-8).toUpperCase()}</span>
          </p>
          <p className="text-xs text-muted">{dateFmt.format(o.createdAt)}</p>
        </div>
        <span className={`rounded-full border px-2.5 py-0.5 text-xs ${status.className}`}>
          {status.text}
        </span>
      </div>

      <div className="mt-3 grid gap-3 text-sm sm:grid-cols-[auto_1fr_auto] sm:gap-6">
        <div>
          <p className="text-2xl font-bold">
            {o.size} <span className="text-base font-normal text-muted">× {o.quantity}</span>
          </p>
          <p className="text-muted">{formatRM(o.amountCents)}</p>
        </div>
        <div className="space-y-1">
          <p className="whitespace-pre-line">{formatAddress(o)}</p>
          <p className="text-muted">
            {o.customerPhone} · {o.customerEmail}
          </p>
          {(o.courier || o.trackingNumber) && (
            <p>
              {o.courier && <>{o.courier} · </>}
              {o.trackingNumber && (
                <>
                  Tracking:{" "}
                  {o.trackingUrl ? (
                    <a href={o.trackingUrl} target="_blank" rel="noreferrer" className="font-mono underline">
                      {o.trackingNumber}
                    </a>
                  ) : (
                    <span className="font-mono">{o.trackingNumber}</span>
                  )}
                </>
              )}
            </p>
          )}
          {o.epOrderNo && o.status === "PAID" && (
            <p className="text-xs text-danger">
              Order EasyParcel {o.epOrderNo} belum dibayar — buka &quot;Pos guna EasyParcel&quot; untuk sambung.
            </p>
          )}
          {o.status === "SHIPPED" && (
            <p className="text-xs text-muted">
              {o.emailedAt ? `✓ Email dihantar ${dateFmt.format(o.emailedAt)}` : "Email belum dihantar"}
            </p>
          )}

          <div className="flex flex-wrap gap-2 pt-2">
            {showWhatsApp && (
              <a
                href={whatsappLink(o)}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-success/50 px-3 py-1.5 text-xs font-semibold text-success hover:bg-success/10"
              >
                WhatsApp customer
              </a>
            )}
            {o.labelUrl && (
              <a
                href={o.labelUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold hover:border-foreground"
              >
                Cetak label (PDF)
              </a>
            )}
            {o.status === "SHIPPED" && !o.emailedAt && (
              <form action={resendShippedEmail}>
                <input type="hidden" name="orderId" value={o.id} />
                <button className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold hover:border-foreground">
                  Hantar email
                </button>
              </form>
            )}
          </div>
        </div>

        {o.status === "PAID" && (
          <div className="flex flex-col gap-2 sm:w-56">
            <Link
              href={`/admin/pos/${o.id}`}
              className="whitespace-nowrap rounded-full bg-foreground px-4 py-2 text-center text-sm font-semibold text-background"
            >
              Pos guna EasyParcel
            </Link>
            <details className="text-sm">
              <summary className="cursor-pointer text-xs text-muted hover:text-foreground">
                Atau dah pos sendiri?
              </summary>
              <form action={markShipped} className="mt-2 flex flex-col gap-2">
                <input type="hidden" name="orderId" value={o.id} />
                <input
                  name="courier"
                  placeholder="Kurier (cth J&T)"
                  className="rounded-lg border border-line bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
                />
                <input
                  name="trackingNumber"
                  placeholder="No. tracking"
                  className="rounded-lg border border-line bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
                />
                <button className="rounded-full border border-foreground px-4 py-2 text-sm font-semibold">
                  Tanda dah pos
                </button>
              </form>
            </details>
          </div>
        )}
        {o.status === "SHIPPED" && !o.labelUrl && (
          <form action={undoShipped}>
            <input type="hidden" name="orderId" value={o.id} />
            <button className="text-xs text-muted underline hover:text-foreground">Batal tanda pos</button>
          </form>
        )}
      </div>
    </li>
  );
}
