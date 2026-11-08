// Tetapan barbershop. Tukar di sini kalau waktu / pakej / seat berubah.
export const BOOKING = {
  openHour: 12, // 12 tengah hari
  closeHour: 24, // 12 malam
  stepMinutes: 15, // masa mula boleh dipilih setiap 15 minit
  daysAhead: 14, // boleh book sampai 14 hari ke depan
};

export const SERVICES = [
  { id: "haircut", name: "Hair Cut", priceCents: 3800, minutes: 45 },
  { id: "beard", name: "Beard Trim", priceCents: 2500, minutes: 30 },
  { id: "kids", name: "Kid's Cut", priceCents: 3000, minutes: 30 },
  { id: "wash-cut", name: "Wash & Cut", priceCents: 4300, minutes: 45 },
  { id: "wash-style", name: "Wash & Style", priceCents: 2000, minutes: 15 },
  { id: "waxing", name: "Waxing (per area)", priceCents: 2000, minutes: 15 },
  { id: "haircut-beard", name: "Haircut & Beard", priceCents: 6300, minutes: 75 },
  { id: "perm", name: "Perm", priceCents: 18000, minutes: 120 },
] as const;

// photo: letak path gambar barber dalam /public bila dah ada, contoh "/seat-1.jpg".
export const SEATS: { id: number; name: string; photo: string | null }[] = [
  { id: 1, name: "Seat 1", photo: null },
  { id: 2, name: "Seat 2", photo: null },
];

export type ServiceId = (typeof SERVICES)[number]["id"];

export function pickServices(ids: string[]) {
  const picked = SERVICES.filter((s) => ids.includes(s.id));
  return {
    picked,
    minutes: picked.reduce((n, s) => n + s.minutes, 0),
    priceCents: picked.reduce((n, s) => n + s.priceCents, 0),
    names: picked.map((s) => s.name).join(" + "),
  };
}

export function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return [h && `${h} jam`, m && `${m} min`].filter(Boolean).join(" ");
}

// Malaysia sentiasa UTC+8 (tiada daylight saving).
const MY_OFFSET_MS = 8 * 60 * 60 * 1000;

// "YYYY-MM-DD" untuk tarikh Malaysia bagi masa tertentu.
export function myDateKey(at: Date) {
  return new Date(at.getTime() + MY_OFFSET_MS).toISOString().slice(0, 10);
}

export function isDateKey(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

// Masa sebenar (UTC) untuk jam:minit waktu Malaysia pada tarikh tu.
export function myTime(dateKey: string, minutesFromMidnight: number) {
  return new Date(Date.parse(`${dateKey}T00:00:00Z`) + minutesFromMidnight * 60_000 - MY_OFFSET_MS);
}

// Masa mula yang muat untuk tempoh pakej: 12:00, 12:15, … (habis sebelum tutup).
export function slotStarts(dateKey: string, durationMinutes: number) {
  const starts: Date[] = [];
  for (
    let m = BOOKING.openHour * 60;
    m + durationMinutes <= BOOKING.closeHour * 60;
    m += BOOKING.stepMinutes
  ) {
    starts.push(myTime(dateKey, m));
  }
  return starts;
}

// Tarikh yang boleh dibook: hari ni hingga daysAhead ke depan.
export function bookableDates(now: Date) {
  const today = myDateKey(now);
  return Array.from({ length: BOOKING.daysAhead }, (_, i) =>
    myDateKey(new Date(Date.parse(`${today}T00:00:00Z`) + i * 86_400_000)),
  );
}

export function isBookableStart(startsAt: Date, durationMinutes: number, now: Date) {
  const dateKey = myDateKey(startsAt);
  return (
    startsAt > now &&
    bookableDates(now).includes(dateKey) &&
    slotStarts(dateKey, durationMinutes).some((s) => s.getTime() === startsAt.getTime())
  );
}

type Busy = { seat: number; startsAt: Date; endsAt: Date };

export function seatFree(busy: Busy[], seat: number, start: Date, end: Date) {
  return !busy.some((b) => b.seat === seat && b.startsAt < end && b.endsAt > start);
}

const timeFmt = new Intl.DateTimeFormat("ms-MY", {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZone: "Asia/Kuala_Lumpur",
});

const dayFmt = new Intl.DateTimeFormat("ms-MY", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "Asia/Kuala_Lumpur",
});

export function formatSlotTime(at: Date) {
  return timeFmt.format(at);
}

export function formatDay(at: Date) {
  return dayFmt.format(at);
}
