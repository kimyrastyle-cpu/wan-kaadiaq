import "server-only";

import type { Order } from "@prisma/client";
import { myDateKey } from "@/lib/booking";
import { db } from "@/lib/db";
import { PRODUCT } from "@/lib/product";

// EasyParcel Malaysia (API individu). Demo: https://demo.connect.easyparcel.my
// Live: https://connect.easyparcel.my  — demo & live guna API key berbeza.
const BASE_URL = (process.env.EASYPARCEL_BASE_URL || "https://demo.connect.easyparcel.my").replace(/\/$/, "");

const STATE_CODE: Record<string, string> = {
  Johor: "jhr",
  Kedah: "kdh",
  Kelantan: "ktn",
  Melaka: "mlk",
  "Negeri Sembilan": "nsn",
  Pahang: "phg",
  Perak: "prk",
  Perlis: "pls",
  "Pulau Pinang": "png",
  Sabah: "sbh",
  Sarawak: "srw",
  Selangor: "sgr",
  Terengganu: "trg",
  "W.P. Kuala Lumpur": "kul",
  "W.P. Labuan": "lbn",
  "W.P. Putrajaya": "pjy",
};

const SENDER_ENV = [
  "SHIP_FROM_NAME",
  "SHIP_FROM_PHONE",
  "SHIP_FROM_ADDR1",
  "SHIP_FROM_CITY",
  "SHIP_FROM_POSTCODE",
  "SHIP_FROM_STATE",
] as const;

/** Senarai env yang belum diisi. Kosong = sedia guna. */
export function easyparcelMissing() {
  const missing: string[] = [];
  if (!process.env.EASYPARCEL_API_KEY) missing.push("EASYPARCEL_API_KEY");
  for (const k of SENDER_ENV) if (!process.env[k]) missing.push(k);
  const st = process.env.SHIP_FROM_STATE;
  if (st && !STATE_CODE[st]) missing.push(`SHIP_FROM_STATE (nama negeri tak dikenali: "${st}")`);
  return missing;
}

export function easyparcelIsDemo() {
  return BASE_URL.includes("demo.");
}

function weightKg(order: Pick<Order, "quantity">) {
  const perItem = parseFloat(process.env.SHIP_WEIGHT_KG_PER_ITEM || "0.3");
  return Math.max(0.1, Math.round(perItem * order.quantity * 100) / 100).toFixed(2);
}

function stateCode(name: string) {
  const code = STATE_CODE[name];
  if (!code) throw new Error(`Negeri tak dikenali untuk EasyParcel: ${name}`);
  return code;
}

type ApiResponse = {
  api_status?: string;
  error_code?: string;
  error_remark?: string;
  result?: unknown;
};

async function call(action: string, bulk?: Record<string, string>[]) {
  const body = new URLSearchParams({ api: process.env.EASYPARCEL_API_KEY ?? "" });
  bulk?.forEach((item, i) => {
    for (const [k, v] of Object.entries(item)) body.append(`bulk[${i}][${k}]`, v);
  });

  const res = await fetch(`${BASE_URL}/?ac=${action}`, { method: "POST", body, cache: "no-store" });
  const text = await res.text();
  let data: ApiResponse;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`EasyParcel ${action} balas bukan JSON: ${text.slice(0, 200)}`);
  }
  if (data.api_status !== "Success") {
    throw new Error(`EasyParcel: ${data.error_remark || data.error_code || "ralat tak diketahui"}`);
  }
  return data;
}

function first<T>(data: ApiResponse): T {
  const r = Array.isArray(data.result) ? (data.result[0] as T & { status?: string; remarks?: string }) : undefined;
  if (!r) throw new Error("EasyParcel: tiada result");
  if (r.status && r.status !== "Success") throw new Error(`EasyParcel: ${r.remarks || r.status}`);
  return r;
}

function routeFields(order: Order) {
  return {
    pick_code: process.env.SHIP_FROM_POSTCODE!,
    pick_state: stateCode(process.env.SHIP_FROM_STATE!),
    pick_country: "MY",
    send_code: order.postcode,
    send_state: stateCode(order.state),
    send_country: "MY",
    weight: weightKg(order),
  };
}

export type Rate = {
  serviceId: string;
  courier: string;
  serviceName: string;
  detail: string; // dropoff / pickup / dropoff/pickup
  priceRM: string;
  pickupDate: string;
  delivery: string;
  logo: string | null;
};

export async function creditBalance() {
  const data = await call("EPCheckCreditBalance");
  return String(data.result ?? "");
}

export async function getRates(order: Order): Promise<Rate[]> {
  const data = await call("EPRateCheckingBulk", [routeFields(order)]);
  const r = first<{ rates?: Record<string, unknown>[] }>(data);
  return (r.rates ?? [])
    .map((x) => ({
      serviceId: String(x.service_id ?? ""),
      courier: String(x.courier_name ?? ""),
      serviceName: String(x.service_name ?? ""),
      detail: String(x.service_detail ?? ""),
      priceRM: String(x.price ?? ""),
      pickupDate: String(x.pickup_date ?? ""),
      delivery: String(x.delivery ?? ""),
      logo: x.courier_logo ? String(x.courier_logo) : null,
    }))
    .filter((x) => x.serviceId)
    .sort((a, b) => parseFloat(a.priceRM) - parseFloat(b.priceRM));
}

type PaidParcel = { parcelno?: string; awb?: string; awb_id_link?: string; tracking_url?: string };

async function payAndSave(order: Order, epOrderNo: string, courier: string | null) {
  const data = await call("EPPayOrderBulk", [{ order_no: epOrderNo }]);
  const r = first<{ messagenow?: string; parcel?: PaidParcel[] }>(data);
  const parcel = r.parcel?.[0] ?? {};
  if (!parcel.awb && !parcel.awb_id_link) {
    // Contoh: "Insufficient Credit" — order EasyParcel dah wujud, cuma belum dibayar.
    throw new Error(
      `EasyParcel belum bayar order ${epOrderNo}: ${r.messagenow || "tiada AWB"}. Topup kredit EasyParcel dan cuba lagi.`,
    );
  }

  return db.order.update({
    where: { id: order.id },
    data: {
      status: "SHIPPED",
      shippedAt: new Date(),
      courier: courier ?? order.courier,
      trackingNumber: parcel.awb || order.trackingNumber,
      labelUrl: parcel.awb_id_link || null,
      trackingUrl: parcel.tracking_url || null,
    },
  });
}

/**
 * Tempah kurier & bayar guna kredit EasyParcel.
 * Kalau order EasyParcel dah dibuat sebelum ni (contoh kredit tak cukup), terus bayar je.
 */
export async function bookShipment(order: Order, serviceId: string) {
  if (order.status !== "PAID") throw new Error("Order ni bukan status 'Dah bayar'.");
  if (order.epOrderNo) return payAndSave(order, order.epOrderNo, order.courier);

  const valueRM = ((PRODUCT.priceCents * order.quantity) / 100).toFixed(2);
  const data = await call("EPSubmitOrderBulk", [
    {
      ...routeFields(order),
      content: "Baju T-shirt",
      value: valueRM,
      service_id: serviceId,
      pick_name: process.env.SHIP_FROM_NAME!,
      pick_contact: process.env.SHIP_FROM_PHONE!,
      pick_addr1: process.env.SHIP_FROM_ADDR1!,
      pick_addr2: process.env.SHIP_FROM_ADDR2 || "",
      pick_city: process.env.SHIP_FROM_CITY!,
      send_name: `${order.firstName} ${order.lastName}`.slice(0, 35),
      send_contact: order.customerPhone,
      send_company: order.company || "",
      send_addr1: order.address1,
      send_addr2: order.address2 || "",
      send_city: order.city,
      collect_date: myDateKey(new Date()),
      sms: "0",
      send_email: order.customerEmail,
      reference: order.id.slice(-8).toUpperCase(),
      REQ_ID: order.id,
    },
  ]);
  const r = first<{ order_number?: string; courier?: string }>(data);
  if (!r.order_number) throw new Error("EasyParcel tak pulangkan no. order.");

  // Simpan dulu, supaya kalau bayar gagal kita tak buat order berganda.
  const saved = await db.order.update({
    where: { id: order.id },
    data: { epOrderNo: r.order_number, courier: r.courier || null },
  });
  return payAndSave(saved, r.order_number, r.courier || null);
}
