import { db } from "@/lib/db";
import {
  SEATS,
  bookableDates,
  formatSlotTime,
  isDateKey,
  myTime,
  pickServices,
  seatFree,
  slotStarts,
} from "@/lib/booking";

export type SlotsResponse = {
  dates: string[];
  date: string;
  slots: { startsAt: string; label: string; freeSeats: number[] }[];
};

// Masa mula yang ada untuk pakej yang dipilih, dengan seat mana yang kosong.
// ?date=YYYY-MM-DD&services=haircut,beard
export async function GET(request: Request) {
  const now = new Date();
  const dates = bookableDates(now);
  const params = new URL(request.url).searchParams;
  const requested = params.get("date") ?? "";
  const date = isDateKey(requested) && dates.includes(requested) ? requested : dates[0];
  const { minutes } = pickServices((params.get("services") ?? "").split(","));

  if (minutes === 0) return Response.json({ dates, date, slots: [] } satisfies SlotsResponse);

  const busy = await db.booking.findMany({
    where: {
      status: "CONFIRMED",
      startsAt: { lt: myTime(date, 24 * 60) },
      endsAt: { gt: myTime(date, 0) },
    },
    select: { seat: true, startsAt: true, endsAt: true },
  });

  const slots = slotStarts(date, minutes)
    .filter((s) => s > now)
    .map((s) => {
      const end = new Date(s.getTime() + minutes * 60_000);
      return {
        startsAt: s.toISOString(),
        label: formatSlotTime(s),
        freeSeats: SEATS.filter((seat) => seatFree(busy, seat.id, s, end)).map((seat) => seat.id),
      };
    });

  return Response.json({ dates, date, slots } satisfies SlotsResponse);
}
