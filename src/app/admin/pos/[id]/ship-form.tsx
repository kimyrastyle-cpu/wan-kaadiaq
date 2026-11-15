"use client";

import { useActionState } from "react";
import type { Rate } from "@/lib/easyparcel";
import { bookEasyParcel, type ShipState } from "../../actions";

export function ShipForm({
  orderId,
  rates,
  balance,
  pendingEpOrder,
}: {
  orderId: string;
  rates: Rate[];
  balance: string | null;
  pendingEpOrder: string | null;
}) {
  const [state, action, pending] = useActionState<ShipState, FormData>(bookEasyParcel, { error: null });

  return (
    <form action={action} className="mt-6 space-y-4">
      <input type="hidden" name="orderId" value={orderId} />
      {balance !== null && (
        <p className="text-sm text-muted">
          Kredit EasyParcel: <span className="font-semibold text-foreground">RM{balance}</span>
        </p>
      )}

      {pendingEpOrder ? (
        <p className="rounded-xl border border-line bg-card p-4 text-sm">
          Order EasyParcel <span className="font-mono">{pendingEpOrder}</span> dah dibuat tapi belum dibayar
          (biasanya sebab kredit tak cukup). Topup kredit di easyparcel.com, kemudian tekan butang di bawah.
        </p>
      ) : rates.length === 0 ? (
        <p className="text-sm text-muted">Tiada kurier tersedia untuk alamat ni.</p>
      ) : (
        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm font-semibold">Pilih kurier</legend>
          {rates.map((r, i) => (
            <label
              key={r.serviceId}
              className="flex cursor-pointer items-center gap-3 rounded-xl border border-line bg-card p-3 text-sm has-[:checked]:border-foreground"
            >
              <input type="radio" name="serviceId" value={r.serviceId} defaultChecked={i === 0} className="accent-current" />
              {r.logo && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={r.logo} alt="" className="h-8 w-12 rounded bg-white object-contain p-0.5" />
              )}
              <span className="flex-1">
                <span className="font-semibold">{r.courier}</span>
                <span className="block text-xs text-muted">
                  {r.serviceName}
                  {r.detail && ` · ${r.detail === "pickup" ? "kurier datang ambil" : r.detail === "dropoff" ? "hantar sendiri ke kaunter" : "ambil / hantar sendiri"}`}
                  {r.delivery && ` · ${r.delivery}`}
                </span>
              </span>
              <span className="font-semibold">RM{r.priceRM}</span>
            </label>
          ))}
        </fieldset>
      )}

      {state.error && <p className="rounded-lg border border-danger/40 px-3 py-2 text-sm text-danger">{state.error}</p>}

      {(pendingEpOrder || rates.length > 0) && (
        <button
          disabled={pending}
          className="w-full rounded-full bg-foreground px-5 py-3 font-semibold text-background disabled:opacity-60"
        >
          {pending ? "Sedang tempah…" : pendingEpOrder ? "Bayar & dapatkan label" : "Tempah & bayar guna kredit EasyParcel"}
        </button>
      )}
      <p className="text-xs text-muted">
        Lepas berjaya: status jadi &quot;Dah dipos&quot;, no. tracking &amp; label PDF disimpan, dan customer dapat email.
      </p>
    </form>
  );
}
