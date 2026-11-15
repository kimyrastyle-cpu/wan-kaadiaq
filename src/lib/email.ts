import "server-only";

import type { Order } from "@prisma/client";
import { db } from "@/lib/db";
import { orderRef, shippedLines } from "@/lib/notify";
import { BRAND, formatAddress } from "@/lib/product";

// Resend (https://resend.com). Tanpa RESEND_API_KEY, email tak dihantar langsung.
export function emailConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** Hantar email "baju dah dipos". Pulangkan mesej ralat, atau null kalau berjaya. */
export async function sendShippedEmail(order: Order): Promise<string | null> {
  if (!emailConfigured()) return "Email belum disediakan (RESEND_API_KEY / EMAIL_FROM).";

  const lines = shippedLines(order);
  const text = [
    `Salam ${order.firstName},`,
    "",
    `Terima kasih abang kakak! Order #${orderRef(order)} (baju ${BRAND} size ${order.size} × ${order.quantity}) dah dipos.`,
    "",
    ...lines,
    "",
    "Dihantar ke:",
    `${order.firstName} ${order.lastName}`,
    formatAddress(order),
    "",
    `— ${BRAND}`,
  ].join("\n");

  const trackingButton = order.trackingUrl
    ? `<p><a href="${esc(order.trackingUrl)}" style="display:inline-block;background:#111;color:#fff;padding:10px 18px;border-radius:999px;text-decoration:none;font-weight:600">Semak tracking</a></p>`
    : "";
  const html = `<div style="font-family:system-ui,sans-serif;line-height:1.5;color:#111;max-width:520px">
<h2 style="margin:0 0 12px">Baju anda dah dipos 📦</h2>
<p>Salam ${esc(order.firstName)},</p>
<p>Terima kasih abang kakak! Order <b>#${orderRef(order)}</b> (baju ${BRAND} size <b>${esc(order.size)}</b> × ${order.quantity}) dah dipos.</p>
${lines.length ? `<p>${lines.map(esc).join("<br>")}</p>` : ""}
${trackingButton}
<p style="color:#555;font-size:14px">Dihantar ke:<br>${esc(`${order.firstName} ${order.lastName}\n${formatAddress(order)}`).replace(/\n/g, "<br>")}</p>
<p>— ${BRAND}</p>
</div>`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM,
        to: [order.customerEmail],
        reply_to: process.env.EMAIL_REPLY_TO || undefined,
        subject: `Baju ${BRAND} anda dah dipos (#${orderRef(order)})`,
        text,
        html,
      }),
      cache: "no-store",
    });
    if (!res.ok) {
      const body = await res.text();
      console.error("Resend gagal", res.status, body);
      return `Email gagal (${res.status}): ${body.slice(0, 160)}`;
    }
    await db.order.update({ where: { id: order.id }, data: { emailedAt: new Date() } });
    return null;
  } catch (err) {
    console.error("Resend gagal", err);
    return "Email gagal dihantar (rangkaian).";
  }
}
