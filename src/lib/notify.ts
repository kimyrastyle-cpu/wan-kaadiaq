import type { Order } from "@prisma/client";
import { BRAND } from "@/lib/product";

// 012-345 6789 / +6012... / 6012... → 60123456789 (format wa.me)
export function waNumber(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("60")) return digits;
  if (digits.startsWith("0")) return `6${digits}`;
  return `60${digits}`;
}

export function orderRef(order: Pick<Order, "id">) {
  return order.id.slice(-8).toUpperCase();
}

type ShipInfo = Pick<
  Order,
  "id" | "firstName" | "size" | "quantity" | "status" | "courier" | "trackingNumber" | "trackingUrl"
>;

export function shippedLines(o: ShipInfo) {
  return [
    o.courier && `Kurier: ${o.courier}`,
    o.trackingNumber && `No. tracking: ${o.trackingNumber}`,
    o.trackingUrl && `Semak: ${o.trackingUrl}`,
  ].filter(Boolean) as string[];
}

export function whatsappMessage(o: ShipInfo) {
  const item = `baju ${BRAND} size ${o.size} × ${o.quantity}`;
  if (o.status === "SHIPPED") {
    return [
      `Salam ${o.firstName}, terima kasih abang kakak! 🙏`,
      `Order #${orderRef(o)} (${item}) dah dipos.`,
      ...shippedLines(o),
    ].join("\n");
  }
  return [
    `Salam ${o.firstName}, terima kasih abang kakak! 🙏`,
    `Order #${orderRef(o)} (${item}) dah kami terima. Kami akan pos secepat mungkin dan bagi no. tracking nanti.`,
  ].join("\n");
}

export function whatsappLink(o: ShipInfo & Pick<Order, "customerPhone">) {
  return `https://wa.me/${waNumber(o.customerPhone)}?text=${encodeURIComponent(whatsappMessage(o))}`;
}
