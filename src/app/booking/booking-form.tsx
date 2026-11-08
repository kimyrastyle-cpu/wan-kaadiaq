"use client";

import Image from "next/image";
import { useActionState, useEffect, useState } from "react";
import type { SlotsResponse } from "@/app/api/booking/slots/route";
import { SEATS, SERVICES, formatDuration, pickServices } from "@/lib/booking";
import { formatRM } from "@/lib/product";
import { createBooking, type BookingFormState } from "./actions";

const initialState: BookingFormState = { error: null };

const STEPS = ["Servis", "Seat", "Masa", "Maklumat", "Semak"] as const;

const inputClass =
  "w-full rounded-lg border border-line bg-card px-3 py-3 text-sm outline-none placeholder:text-muted/70 focus:border-foreground";

const chipDay = new Intl.DateTimeFormat("ms-MY", { weekday: "short", timeZone: "UTC" });
const chipDate = new Intl.DateTimeFormat("ms-MY", { day: "numeric", month: "short", timeZone: "UTC" });
const reviewDate = new Intl.DateTimeFormat("ms-MY", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "Asia/Kuala_Lumpur",
});

type SeatChoice = "any" | `${number}`;

export function BookingForm() {
  const [state, formAction, pending] = useActionState(createBooking, initialState);
  const [step, setStep] = useState(0);
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [seat, setSeat] = useState<SeatChoice>("any");
  const [date, setDate] = useState<string | null>(null);
  const [startsAt, setStartsAt] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [data, setData] = useState<SlotsResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const { minutes, priceCents, picked } = pickServices(serviceIds);
  const servicesKey = serviceIds.join(",");

  // Muat slot bila pakej / tarikh berubah, atau lepas booking gagal (masa mungkin dah diambil).
  useEffect(() => {
    if (!servicesKey) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    const query = new URLSearchParams({ services: servicesKey, ...(date ? { date } : {}) });
    fetch(`/api/booking/slots?${query}`, { cache: "no-store" })
      .then((r) => r.json() as Promise<SlotsResponse>)
      .then((res) => {
        if (cancelled) return;
        setData(res);
        setLoading(false);
      })
      .catch(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [servicesKey, date, state]);

  // Bila booking gagal, balik ke langkah masa & kosongkan masa yang dipilih.
  useEffect(() => {
    if (!state.error) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStep(state.error.includes("masa") || state.error.includes("Masa") ? 2 : 3);
    setStartsAt("");
  }, [state]);

  const selectedDate = date ?? data?.date ?? null;
  const fitsSeat = (free: number[]) => (seat === "any" ? free.length > 0 : free.includes(Number(seat)));
  const slot = data?.slots.find((s) => s.startsAt === startsAt && fitsSeat(s.freeSeats));
  const seatLabel = seat === "any" ? "Mana-mana seat" : SEATS.find((s) => String(s.id) === seat)?.name;

  const canNext = [
    serviceIds.length > 0,
    true,
    Boolean(slot),
    name.trim().length >= 2 && phone.replace(/\D/g, "").length >= 10,
  ][step];

  function toggleService(id: string) {
    setServiceIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
    setStartsAt("");
  }

  return (
    <form action={formAction} className="space-y-8">
      {/* Nilai yang dihantar ke server */}
      {serviceIds.map((id) => (
        <input key={id} type="hidden" name="services" value={id} />
      ))}
      <input type="hidden" name="seat" value={seat} />
      <input type="hidden" name="startsAt" value={slot ? startsAt : ""} />
      <input type="hidden" name="name" value={name} />
      <input type="hidden" name="phone" value={phone} />

      <ol className="flex items-center gap-1 text-[11px] sm:gap-2 sm:text-xs">
        {STEPS.map((label, i) => (
          <li key={label} className="flex flex-1 items-center gap-1 sm:gap-2">
            <button
              type="button"
              disabled={i > step}
              onClick={() => setStep(i)}
              className="flex flex-col items-center gap-1 disabled:cursor-default"
            >
              <span
                className={`grid size-7 place-items-center rounded-full border text-xs font-semibold ${
                  i < step
                    ? "border-foreground bg-foreground text-background"
                    : i === step
                      ? "border-foreground"
                      : "border-line text-muted"
                }`}
              >
                {i < step ? "✓" : i + 1}
              </span>
              <span className={i === step ? "font-semibold" : "text-muted"}>{label}</span>
            </button>
            {i < STEPS.length - 1 && <span className="mb-5 h-px flex-1 bg-line" />}
          </li>
        ))}
      </ol>

      {step === 0 && (
        <section>
          <h2 className="text-xl font-bold">Pilih servis</h2>
          <p className="mt-1 text-sm text-muted">Boleh pilih lebih dari satu.</p>
          <ul className="mt-4 space-y-2">
            {SERVICES.map((s) => {
              const active = serviceIds.includes(s.id);
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => toggleService(s.id)}
                    className={`flex w-full items-center justify-between rounded-xl border px-4 py-3.5 text-left transition ${
                      active ? "border-foreground bg-card" : "border-line bg-card/50 hover:border-muted"
                    }`}
                  >
                    <span>
                      <span className="block font-semibold">{s.name}</span>
                      <span className="block text-sm text-muted">
                        dari {formatRM(s.priceCents)} · {formatDuration(s.minutes)}
                      </span>
                    </span>
                    <span
                      className={`grid size-6 shrink-0 place-items-center rounded-full border text-xs ${
                        active ? "border-foreground bg-foreground text-background" : "border-line"
                      }`}
                    >
                      {active && "✓"}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {step === 1 && (
        <section>
          <h2 className="text-xl font-bold">Pilih seat</h2>
          <div className="mt-4 grid grid-cols-3 gap-3">
            {[{ id: "any" as const, name: "Mana-mana", photo: null }, ...SEATS.map((s) => ({ ...s, id: `${s.id}` as const }))].map((s) => {
              const active = seat === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setSeat(s.id);
                    setStartsAt("");
                  }}
                  className={`flex flex-col items-center gap-3 rounded-xl border p-4 transition ${
                    active ? "border-foreground bg-card" : "border-line bg-card/50 hover:border-muted"
                  }`}
                >
                  <span className="relative grid size-16 place-items-center overflow-hidden rounded-full border border-line bg-background text-muted sm:size-20">
                    {s.photo ? (
                      <Image src={s.photo} alt={s.name} fill className="object-cover" sizes="80px" />
                    ) : s.id === "any" ? (
                      <svg viewBox="0 0 24 24" className="size-7" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                        <circle cx="9" cy="8" r="3" />
                        <circle cx="16" cy="9" r="2.5" />
                        <path d="M3 19c0-3 2.7-5 6-5s6 2 6 5M14 14.5c3 0 7 1.4 7 4.5" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" className="size-7" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                        <circle cx="12" cy="8" r="3.5" />
                        <path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6" />
                      </svg>
                    )}
                  </span>
                  <span className="text-sm font-semibold">{s.name}</span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="space-y-6">
          <div>
            <h2 className="text-xl font-bold">Pilih tarikh & masa</h2>
            <p className="mt-1 text-sm text-muted">
              {seatLabel} · {formatDuration(minutes)}
            </p>
          </div>
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
            {(data?.dates ?? []).map((d) => {
              const at = new Date(`${d}T00:00:00Z`);
              const active = d === selectedDate;
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => {
                    setDate(d);
                    setStartsAt("");
                  }}
                  className={`shrink-0 rounded-xl border px-4 py-2.5 text-center transition ${
                    active ? "border-foreground bg-foreground text-background" : "border-line hover:border-muted"
                  }`}
                >
                  <span className="block text-xs">{chipDay.format(at)}</span>
                  <span className="block text-sm font-semibold">{chipDate.format(at)}</span>
                </button>
              );
            })}
          </div>
          {loading && !data ? (
            <p className="text-sm text-muted">Memuatkan slot…</p>
          ) : data && data.slots.filter((s) => fitsSeat(s.freeSeats)).length === 0 ? (
            <p className="text-sm text-muted">Tiada masa kosong pada tarikh ni. Sila pilih tarikh lain.</p>
          ) : (
            <div className={`grid grid-cols-3 gap-2 sm:grid-cols-4 ${loading ? "opacity-50" : ""}`}>
              {data?.slots.map((s) => {
                const ok = fitsSeat(s.freeSeats);
                const active = s.startsAt === startsAt;
                return (
                  <button
                    key={s.startsAt}
                    type="button"
                    disabled={!ok}
                    onClick={() => setStartsAt(s.startsAt)}
                    className={`rounded-lg border px-2 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:line-through disabled:opacity-30 ${
                      active ? "border-foreground bg-foreground text-background" : "border-line hover:border-muted"
                    }`}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>
          )}
        </section>
      )}

      {step === 3 && (
        <section className="space-y-3">
          <h2 className="text-xl font-bold">Maklumat anda</h2>
          <input
            placeholder="Nama"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
          />
          <input
            type="tel"
            placeholder="No. telefon (WhatsApp)"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={inputClass}
          />
        </section>
      )}

      {step === 4 && slot && (
        <section>
          <h2 className="text-xl font-bold">Semak booking</h2>
          <dl className="mt-4 divide-y divide-line rounded-xl border border-line bg-card text-sm">
            <Row label="Servis">
              {picked.map((s) => (
                <span key={s.id} className="flex justify-between gap-4">
                  <span>{s.name}</span>
                  <span className="text-muted">{formatRM(s.priceCents)}</span>
                </span>
              ))}
            </Row>
            <Row label="Seat">{seatLabel}</Row>
            <Row label="Masa">
              {reviewDate.format(new Date(slot.startsAt))}, {slot.label} ({formatDuration(minutes)})
            </Row>
            <Row label="Nama">
              {name} · {phone}
            </Row>
            <div className="flex justify-between px-4 py-3 text-base font-semibold">
              <dt>Jumlah (bayar di kedai)</dt>
              <dd>{formatRM(priceCents)}</dd>
            </div>
          </dl>
        </section>
      )}

      {state.error && (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}

      <div className="flex gap-3">
        {step > 0 && (
          <button
            type="button"
            onClick={() => setStep(step - 1)}
            className="rounded-full border border-line px-6 py-3.5 text-sm font-semibold"
          >
            Kembali
          </button>
        )}
        {/* key berbeza: kalau tak, React guna butang sama & klik "Teruskan" terus submit */}
        {step < STEPS.length - 1 ? (
          <button
            key="next"
            type="button"
            disabled={!canNext}
            onClick={() => setStep(step + 1)}
            className="flex-1 rounded-full bg-foreground py-3.5 text-sm font-semibold text-background hover:opacity-90 disabled:opacity-40"
          >
            {step === 0 && serviceIds.length > 0
              ? `Teruskan · ${formatRM(priceCents)} · ${formatDuration(minutes)}`
              : "Teruskan"}
          </button>
        ) : (
          <button
            key="submit"
            type="submit"
            disabled={pending || !slot}
            className="flex-1 rounded-full bg-foreground py-3.5 text-sm font-semibold text-background hover:opacity-90 disabled:opacity-40"
          >
            {pending ? "Sedang booking…" : "Sahkan booking"}
          </button>
        )}
      </div>
    </form>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[80px_1fr] gap-3 px-4 py-3">
      <dt className="text-muted">{label}</dt>
      <dd className="space-y-1">{children}</dd>
    </div>
  );
}
