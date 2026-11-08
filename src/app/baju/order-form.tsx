"use client";

import { useActionState, useEffect, useState } from "react";
import { MY_STATES, PRODUCT, formatRM, orderTotalCents } from "@/lib/product";
import { createOrder, type OrderFormState } from "./actions";

const initialState: OrderFormState = { error: null };

const inputClass =
  "w-full rounded-lg border border-line bg-card px-3 py-3 text-sm outline-none placeholder:text-muted/70 focus:border-foreground";

const selectClass = "w-full appearance-none bg-transparent pr-6 text-sm outline-none disabled:opacity-100";

const SAVED_KEY = "wk_penghantaran";
const SAVED_FIELDS = ["email", "firstName", "lastName", "company", "address1", "address2", "postcode", "city", "state", "phone"];

type Saved = Record<string, string>;

function loadSaved(): Saved | null {
  try {
    const raw = localStorage.getItem(SAVED_KEY);
    return raw ? (JSON.parse(raw) as Saved) : null;
  } catch {
    return null;
  }
}

function SelectBox({ label, className = "", children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={`relative rounded-lg border border-line bg-card px-3 pb-2 pt-1.5 focus-within:border-foreground ${className}`}>
      <span className="block text-[11px] text-muted">{label}</span>
      {children}
      <span aria-hidden className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">
        ▾
      </span>
    </div>
  );
}

export function OrderForm() {
  const [state, formAction, pending] = useActionState(createOrder, initialState);
  const [size, setSize] = useState<string>("");
  const [quantity, setQuantity] = useState(1);
  const [saved, setSaved] = useState<Saved | null>(null);
  const { subtotal, postage, total } = orderTotalCents(quantity);

  useEffect(() => {
    // localStorage hanya ada dalam browser, jadi baca selepas render pertama.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSaved(loadSaved());
  }, []);

  // Nilai yang dihantar (bila ada error) lebih penting dari yang tersimpan.
  const v = (key: string) => state.values?.[key as keyof NonNullable<OrderFormState["values"]>] ?? saved?.[key] ?? "";

  function rememberInfo(e: React.FormEvent<HTMLFormElement>) {
    const data = new FormData(e.currentTarget);
    try {
      if (data.get("saveInfo")) {
        localStorage.setItem(SAVED_KEY, JSON.stringify(Object.fromEntries(SAVED_FIELDS.map((k) => [k, String(data.get(k) ?? "")]))));
      } else {
        localStorage.removeItem(SAVED_KEY);
      }
    } catch {
      // storage disekat (private mode) — abaikan
    }
  }

  return (
    <form action={formAction} onSubmit={rememberInfo} className="space-y-6">
      <fieldset>
        <legend className="mb-2 text-sm font-medium">Size</legend>
        <div className="grid grid-cols-5 gap-2">
          {PRODUCT.sizes.map((s) => (
            <label
              key={s}
              className={`cursor-pointer rounded-lg border py-2.5 text-center text-sm font-semibold transition ${
                size === s
                  ? "border-foreground bg-foreground text-background"
                  : "border-line hover:border-muted"
              }`}
            >
              <input
                type="radio"
                name="size"
                value={s}
                checked={size === s}
                onChange={() => setSize(s)}
                className="sr-only"
                required
              />
              {s}
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <span className="mb-2 block text-sm font-medium">Kuantiti</span>
        <div className="inline-flex items-center rounded-lg border border-line">
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            className="px-4 py-2 text-lg"
            aria-label="Kurangkan"
          >
            −
          </button>
          <input
            name="quantity"
            value={quantity}
            readOnly
            className="w-10 bg-transparent text-center text-sm"
            aria-label="Kuantiti"
          />
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.min(PRODUCT.maxQuantity, q + 1))}
            className="px-4 py-2 text-lg"
            aria-label="Tambah"
          >
            +
          </button>
        </div>
      </div>

      {/* key: lukis semula bila maklumat tersimpan dah dimuat */}
      <div key={saved ? "saved" : "blank"} className="space-y-6">
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Hubungi</h2>
          <input name="email" type="email" placeholder="Emel" autoComplete="email" required defaultValue={v("email")} className={inputClass} />
        </div>

        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Penghantaran</h2>
          <SelectBox label="Negara">
            <select disabled className={selectClass} defaultValue="Malaysia">
              <option>Malaysia</option>
            </select>
          </SelectBox>
          <div className="grid grid-cols-2 gap-3">
            <input name="firstName" placeholder="Nama pertama" autoComplete="given-name" required defaultValue={v("firstName")} className={inputClass} />
            <input name="lastName" placeholder="Nama akhir" autoComplete="family-name" required defaultValue={v("lastName")} className={inputClass} />
          </div>
          <input name="company" placeholder="Syarikat (pilihan)" autoComplete="organization" defaultValue={v("company")} className={inputClass} />
          <input name="address1" placeholder="Alamat" autoComplete="address-line1" required defaultValue={v("address1")} className={inputClass} />
          <input name="address2" placeholder="Apartmen, suite, dll. (pilihan)" autoComplete="address-line2" defaultValue={v("address2")} className={inputClass} />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <input
              name="postcode"
              placeholder="Poskod"
              autoComplete="postal-code"
              inputMode="numeric"
              pattern="\d{5}"
              maxLength={5}
              title="5 digit"
              required
              defaultValue={v("postcode")}
              className={inputClass}
            />
            <input name="city" placeholder="Bandar" autoComplete="address-level2" required defaultValue={v("city")} className={inputClass} />
            <SelectBox label="Negeri" className="col-span-2 sm:col-span-1">
              <select name="state" required defaultValue={v("state") || "Selangor"} autoComplete="address-level1" className={selectClass}>
                {MY_STATES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </SelectBox>
          </div>
          <input name="phone" type="tel" placeholder="Telefon" autoComplete="tel" required defaultValue={v("phone")} className={inputClass} />
          <label className="flex items-center gap-2 text-sm">
            <input name="saveInfo" type="checkbox" defaultChecked={Boolean(saved)} className="size-4 accent-foreground" />
            Simpan maklumat ini untuk lain kali
          </label>
        </div>
      </div>

      <dl className="space-y-1.5 rounded-lg border border-line bg-card p-4 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted">Baju × {quantity}</dt>
          <dd>{formatRM(subtotal)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted">Postage ({formatRM(PRODUCT.postagePerItemCents)} sehelai)</dt>
          <dd>{formatRM(postage)}</dd>
        </div>
        <div className="flex justify-between border-t border-line pt-2 text-base font-semibold">
          <dt>Jumlah</dt>
          <dd>{formatRM(total)}</dd>
        </div>
      </dl>

      {state.error && (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-foreground py-3.5 text-sm font-semibold text-background hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Sedang proses…" : `Bayar ${formatRM(total)} (FPX / Kad)`}
      </button>
    </form>
  );
}
