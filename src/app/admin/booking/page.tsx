import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import type { Booking } from "@prisma/client";
import { isAdmin } from "@/lib/admin-auth";
import {
  SEATS,
  bookableDates,
  formatDay,
  formatSlotTime,
  isDateKey,
  myDateKey,
  myTime,
} from "@/lib/booking";
import { db } from "@/lib/db";
import { formatRM } from "@/lib/product";
import { cancelBooking } from "../actions";
import { AdminNav } from "../admin-nav";
import { LoginForm } from "../login-form";

export const metadata: Metadata = {
  title: "Admin — Booking",
  robots: { index: false, follow: false },
};

const chipDay = new Intl.DateTimeFormat("ms-MY", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

export default function AdminBookingPage({ searchParams }: PageProps<"/admin/booking">) {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <Suspense fallback={<p className="text-muted">Memuatkan…</p>}>
        <Gate searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Gate({ searchParams }: { searchParams: PageProps<"/admin/booking">["searchParams"] }) {
  if (!(await isAdmin())) return <LoginForm />;

  const { date: requested } = await searchParams;
  const today = myDateKey(new Date());
  const date = typeof requested === "string" && isDateKey(requested) ? requested : today;
  return <Schedule date={date} dates={bookableDates(new Date())} />;
}

async function Schedule({ date, dates }: { date: string; dates: string[] }) {
  const bookings = await db.booking.findMany({
    where: {
      status: "CONFIRMED",
      startsAt: { gte: myTime(date, 0), lt: myTime(date, 24 * 60) },
    },
    orderBy: { startsAt: "asc" },
  });
  const totalCents = bookings.reduce((n, b) => n + b.priceCents, 0);

  return (
    <>
      <AdminNav current="booking" />
      <h1 className="mt-6 text-2xl font-bold">Booking</h1>
      <p className="mt-1 text-sm text-muted">
        {formatDay(myTime(date, 12 * 60))} · {bookings.length} booking · anggaran {formatRM(totalCents)}
      </p>

      <nav className="-mx-4 mt-6 flex gap-2 overflow-x-auto px-4 pb-1">
        {dates.map((d) => (
          <Link
            key={d}
            href={`/admin/booking?date=${d}`}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-sm ${
              d === date ? "border-foreground bg-foreground font-semibold text-background" : "border-line text-muted hover:text-foreground"
            }`}
          >
            {chipDay.format(new Date(`${d}T00:00:00Z`))}
          </Link>
        ))}
      </nav>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {SEATS.map((seat) => {
          const list = bookings.filter((b) => b.seat === seat.id);
          return (
            <section key={seat.id} className="rounded-xl border border-line bg-card p-4">
              <h2 className="flex items-baseline justify-between font-semibold">
                {seat.name}
                <span className="text-xs font-normal text-muted">{list.length} booking</span>
              </h2>
              {list.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted">Tiada booking.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {list.map((b) => (
                    <BookingRow key={b.id} booking={b} />
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}

function BookingRow({ booking: b }: { booking: Booking }) {
  const wa = b.customerPhone.startsWith("0") ? `6${b.customerPhone}` : b.customerPhone;
  return (
    <li className="grid grid-cols-[88px_1fr_auto] gap-3 rounded-lg border border-line px-3 py-2.5">
      <div>
        <p className="font-bold">{formatSlotTime(b.startsAt)}</p>
        <p className="text-xs text-muted">– {formatSlotTime(b.endsAt)}</p>
      </div>
      <div className="min-w-0">
        <p className="font-semibold">{b.customerName}</p>
        <p className="text-sm">{b.services}</p>
        <p className="text-sm text-muted">
          {formatRM(b.priceCents)} ·{" "}
          <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" className="underline hover:text-foreground">
            {b.customerPhone}
          </a>
        </p>
      </div>
      <form action={cancelBooking}>
        <input type="hidden" name="bookingId" value={b.id} />
        <button className="text-xs text-danger underline">Batal</button>
      </form>
    </li>
  );
}
