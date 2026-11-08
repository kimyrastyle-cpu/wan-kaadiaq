"use server";

import { redirect } from "next/navigation";
import { SEATS, isBookableStart, pickServices, seatFree } from "@/lib/booking";
import { db } from "@/lib/db";

export type BookingFormState = {
  error: string | null;
  values?: { name: string; phone: string };
};

export async function createBooking(
  _prev: BookingFormState,
  formData: FormData,
): Promise<BookingFormState> {
  const name = String(formData.get("name") ?? "").trim();
  const phoneRaw = String(formData.get("phone") ?? "").trim();
  const phone = phoneRaw.replace(/[^\d]/g, "");
  const startsAt = new Date(String(formData.get("startsAt") ?? ""));
  const seatChoice = String(formData.get("seat") ?? "any");
  const { minutes, priceCents, names } = pickServices(formData.getAll("services").map(String));
  const fail = (error: string): BookingFormState => ({ error, values: { name, phone: phoneRaw } });

  if (minutes === 0) return fail("Sila pilih sekurang-kurangnya satu servis.");
  if (Number.isNaN(startsAt.getTime()) || !isBookableStart(startsAt, minutes, new Date())) {
    return fail("Sila pilih masa yang sah.");
  }
  const seatOptions =
    seatChoice === "any" ? SEATS.map((s) => s.id) : SEATS.filter((s) => String(s.id) === seatChoice).map((s) => s.id);
  if (seatOptions.length === 0) return fail("Sila pilih seat.");
  if (name.length < 2) return fail("Sila isi nama.");
  if (phone.length < 10 || phone.length > 12) {
    return fail("Nombor telefon tak sah (contoh 0123456789).");
  }

  const endsAt = new Date(startsAt.getTime() + minutes * 60_000);

  // Kunci jadual booking dalam transaksi supaya dua orang yang tekan serentak
  // tak boleh dapat seat & masa yang bertindih.
  const bookingId = await db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(7452001)`;
    const busy = await tx.booking.findMany({
      where: { status: "CONFIRMED", seat: { in: seatOptions }, startsAt: { lt: endsAt }, endsAt: { gt: startsAt } },
      select: { seat: true, startsAt: true, endsAt: true },
    });
    const seat = seatOptions.find((id) => seatFree(busy, id, startsAt, endsAt));
    if (!seat) return null;

    const booking = await tx.booking.create({
      data: { customerName: name, customerPhone: phone, seat, services: names, priceCents, startsAt, endsAt },
    });
    return booking.id;
  });

  if (!bookingId) return fail("Masa ni dah ditempah orang lain. Sila pilih masa lain.");
  redirect(`/booking/berjaya?id=${bookingId}`);
}
