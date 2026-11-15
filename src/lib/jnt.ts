import "server-only";

import { createHash } from "node:crypto";
import type { Order } from "@prisma/client";
import { PRODUCT } from "@/lib/product";

// J&T Express Malaysia — format API sama macam plugin rasmi WooCommerce J&T
// (data_param + data_sign). Semua key di bawah diberi oleh J&T untuk akaun VIP.
const BASE_URL = (process.env.JNT_BASE_URL || "https://ylstandard.jtexpress.my").replace(/\/$/, "");

const REQUIRED_ENV = [
  "JNT_USERNAME",
  "JNT_API_KEY",
  "JNT_CUSTOMER_CODE",
  "JNT_PASSWORD",
  "JNT_SIGN_KEY",
  "JNT_SENDER_NAME",
  "JNT_SENDER_PHONE",
  "JNT_SENDER_ADDRESS",
  "JNT_SENDER_POSTCODE",
] as const;

export function jntConfigured() {
  return REQUIRED_ENV.every((name) => Boolean(process.env[name]));
}

export function jntTrackingUrl(awb: string) {
  return `https://www.jtexpress.my/tracking/${encodeURIComponent(awb)}`;
}

const md5 = (value: string) => createHash("md5").update(value, "utf8").digest("hex");

type JntResult = {
  awb_no?: string;
  orderid?: string;
  status?: string;
  reason?: string;
  data?: { code?: string | number };
};

// Balasan J&T: { "details": [ { awb_no, orderid, status, reason, … } ] }
function firstResult(body: unknown): JntResult | undefined {
  if (!body || typeof body !== "object") return undefined;
  for (const value of Object.values(body)) {
    if (Array.isArray(value) && value[0] && typeof value[0] === "object") {
      return value[0] as JntResult;
    }
  }
  return undefined;
}

async function post(path: string, payload: unknown) {
  const json = JSON.stringify(payload);
  // Tandatangan: base64( md5-hex( json + sign key ) )
  const sign = Buffer.from(md5(json + process.env.JNT_SIGN_KEY)).toString("base64");

  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    body: new URLSearchParams({ data_param: json, data_sign: sign }),
    cache: "no-store",
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`J&T ${path} gagal (${res.status}): ${text.slice(0, 300)}`);
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error(`J&T ${path} balas bukan JSON: ${text.slice(0, 200)}`);
  }
}

// No. order untuk J&T: tarikh (yyMMddHHmm) + 6 digit rawak, macam plugin rasmi.
function newJntOrderId() {
  const stamp = new Date().toISOString().replace(/\D/g, "").slice(2, 12);
  return stamp + String(Math.floor(Math.random() * 1_000_000)).padStart(6, "0");
}

// Cipta consignment. Pulangkan no. AWB (tracking) dan no. order J&T.
export async function createJntOrder(order: Order) {
  const jntOrderId = newJntOrderId();
  const ref = order.id.slice(-8).toUpperCase();
  const receiverAddr = [order.company, order.address1, order.address2, order.city, order.postcode, order.state]
    .filter(Boolean)
    .join(" ");
  const itemValueCents = PRODUCT.priceCents * order.quantity;

  const body = await post("/blibli/order/createOrder", {
    detail: [
      {
        username: process.env.JNT_USERNAME,
        api_key: process.env.JNT_API_KEY,
        cuscode: process.env.JNT_CUSTOMER_CODE,
        password: process.env.JNT_PASSWORD,
        orderid: jntOrderId,
        shipper_name: process.env.JNT_SENDER_NAME,
        shipper_addr: process.env.JNT_SENDER_ADDRESS,
        shipper_contact: process.env.JNT_SENDER_NAME,
        shipper_phone: process.env.JNT_SENDER_PHONE,
        sender_zip: process.env.JNT_SENDER_POSTCODE,
        receiver_name: `${order.firstName} ${order.lastName}`,
        receiver_addr: receiverAddr,
        receiver_phone: order.customerPhone,
        receiver_zip: order.postcode,
        qty: order.quantity,
        weight: Number((PRODUCT.weightKg * order.quantity).toFixed(2)),
        servicetype: process.env.JNT_SERVICE_TYPE || "1", // 1 = pickup, 6 = drop-off
        item_name: `${order.quantity} X ${PRODUCT.name} (${order.size})`.slice(0, 200),
        goodsType: "PARCEL",
        goodsvalue: (itemValueCents / 100).toFixed(2),
        goodsdesc: `#${ref}`,
        expressType: "EZ",
        payType: "PP_PM", // penghantar bayar, bil bulanan
        cod: 0,
        offerFeeFlag: 0, // tanpa insurans
      },
    ],
  });

  const result = firstResult(body);
  if (!result?.awb_no) {
    const reason = result?.reason || JSON.stringify(body).slice(0, 300);
    throw new Error(`J&T tak keluarkan AWB: ${reason}`);
  }
  return { awb: result.awb_no, jntOrderId: result.orderid || jntOrderId };
}

export async function cancelJntOrder(awb: string, jntOrderId: string) {
  await post("/blibli/order/cancelOrder", {
    username: process.env.JNT_USERNAME,
    api_key: process.env.JNT_API_KEY,
    awb_no: awb,
    orderid: jntOrderId,
    remark: "",
  });
}

// Label penghantaran (consignment note) dalam PDF, saiz thermal.
export async function fetchJntLabel(awb: string) {
  const res = await fetch(`${BASE_URL}/jandt_report_web/print/facelistAction!print.action`, {
    method: "POST",
    body: new URLSearchParams({
      logistics_interface: JSON.stringify({
        billcode: awb,
        account: process.env.JNT_USERNAME,
        password: process.env.JNT_API_KEY,
        customercode: process.env.JNT_CUSTOMER_CODE,
      }),
      data_digest: md5(awb),
      msg_type: "1",
    }),
    cache: "no-store",
  });
  const pdf = Buffer.from(await res.arrayBuffer());
  if (!res.ok || pdf.subarray(0, 4).toString() !== "%PDF") {
    throw new Error(`J&T tak pulangkan label PDF (${res.status}): ${pdf.subarray(0, 200).toString()}`);
  }
  return pdf;
}
