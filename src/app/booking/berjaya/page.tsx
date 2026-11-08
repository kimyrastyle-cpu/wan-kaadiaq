import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { SEATS, formatDay, formatSlotTime } from "@/lib/booking";
import { db } from "@/lib/db";
import { formatRM } from "@/lib/product";

export default function BookingBerjayaPage({ searchParams }: PageProps<"/booking/berjaya">) {
  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <Suspense fallback={<p className="text-muted">Memuatkan…</p>}>
        <Confirmation searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Confirmation({
  searchParams,
}: {
  searchParams: PageProps<"/booking/berjaya">["searchParams"];
}) {
  const { id } = await searchParams;
  const booking =
    typeof id === "string" ? await db.booking.findUnique({ where: { id } }) : null;
  if (!booking || booking.status !== "CONFIRMED") notFound();

  return (
    <>
      <h1 className="text-2xl font-bold">BOOKING BERJAYA !</h1>
      <div className="mx-auto mt-6 max-w-xs rounded-2xl border border-line bg-card p-6">
        <p className="text-sm text-muted">{formatDay(booking.startsAt)}</p>
        <p className="mt-1 text-3xl font-bold">{formatSlotTime(booking.startsAt)}</p>
        <p className="mt-1 text-xs text-muted">hingga {formatSlotTime(booking.endsAt)}</p>
        <p className="mt-4 text-sm font-semibold">{booking.services}</p>
        <p className="mt-1 text-sm text-muted">
          {SEATS.find((s) => s.id === booking.seat)?.name} · {booking.customerName}
        </p>
        <p className="mt-3 text-lg font-semibold">{formatRM(booking.priceCents)}</p>
        <p className="text-xs text-muted">bayar di kedai</p>
      </div>
      <p className="mt-6 text-sm text-muted">
        Sila datang 5 minit awal. No. rujukan: {booking.id.slice(-8).toUpperCase()}
      </p>
      <Link
        href="/"
        className="mt-8 inline-block rounded-full bg-foreground px-6 py-3 text-sm font-semibold text-background"
      >
        Kembali ke laman utama
      </Link>
    </>
  );
}
