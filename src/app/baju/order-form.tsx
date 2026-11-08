"use client";

import { useActionState, useState } from "react";
import { PRODUCT, formatRM, orderTotalCents } from "@/lib/product";
import { createOrder, type OrderFormState } from "./actions";

const initialState: OrderFormState = { error: null };

const inputClass =
  "w-full rounded-lg border border-line bg-card px-3 py-2.5 text-sm outline-none placeholder:text-muted/60 focus:border-foreground";

export function OrderForm() {
  const [state, formAction, pending] = useActionState(createOrder, initialState);
  const [size, setSize] = useState<string>("");
  const [quantity, setQuantity] = useState(1);
  const { subtotal, postage, total } = orderTotalCents(quantity);

  return (
    <form action={formAction} className="space-y-6">
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

      <div className="space-y-3">
        <span className="block text-sm font-medium">Maklumat penghantaran</span>
        <input name="name" placeholder="Nama penuh" autoComplete="name" required className={inputClass} />
        <div className="grid gap-3 sm:grid-cols-2">
          <input name="phone" type="tel" placeholder="No. telefon" autoComplete="tel" required className={inputClass} />
          <input name="email" type="email" placeholder="Emel" autoComplete="email" required className={inputClass} />
        </div>
        <textarea
          name="address"
          placeholder="Alamat penuh (termasuk poskod & negeri)"
          autoComplete="street-address"
          rows={3}
          required
          className={inputClass}
        />
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
