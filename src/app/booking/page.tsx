import type { Metadata } from "next";
import { BOOKING, SEATS } from "@/lib/booking";
import { BRAND } from "@/lib/product";
import { BookingForm } from "./booking-form";

export const metadata: Metadata = {
  title: `Booking Barbershop — ${BRAND}`,
  description: `Book slot potong rambut di ${BRAND}.`,
};

export default function BookingPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 md:py-16">
      <p className="text-xs uppercase tracking-[0.3em] text-muted">{BRAND} Barbershop</p>
      <h1 className="mt-2 text-3xl font-bold uppercase tracking-[0.12em]">Booking</h1>
      <p className="mt-3 text-sm text-muted">
        Buka setiap hari, {BOOKING.openHour} tengah hari – 12 malam. {SEATS.length} seat.
      </p>
      <div className="mt-10">
        <BookingForm />
      </div>
    </div>
  );
}
