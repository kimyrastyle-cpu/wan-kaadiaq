"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  endAdminSession,
  passwordMatches,
  requireAdmin,
  startAdminSession,
} from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { bookShipment } from "@/lib/easyparcel";
import { sendShippedEmail } from "@/lib/email";

export type LoginState = { error: string | null };

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const password = String(formData.get("password") ?? "");
  if (!passwordMatches(password)) {
    // Lambatkan sikit untuk susahkan orang teka password.
    await new Promise((r) => setTimeout(r, 800));
    return { error: "Password salah." };
  }
  await startAdminSession();
  redirect("/admin");
}

export async function logout() {
  await endAdminSession();
  redirect("/admin");
}

export async function markShipped(formData: FormData) {
  await requireAdmin();
  const orderId = String(formData.get("orderId") ?? "");
  const trackingNumber = String(formData.get("trackingNumber") ?? "").trim() || null;
  const courier = String(formData.get("courier") ?? "").trim() || null;

  const { count } = await db.order.updateMany({
    where: { id: orderId, status: "PAID" },
    data: { status: "SHIPPED", trackingNumber, courier, shippedAt: new Date() },
  });
  if (count) {
    const order = await db.order.findUniqueOrThrow({ where: { id: orderId } });
    await sendShippedEmail(order); // gagal pun tak apa — admin nampak butang "Hantar email"
  }
  revalidatePath("/admin");
}

export async function resendShippedEmail(formData: FormData) {
  await requireAdmin();
  const order = await db.order.findUnique({ where: { id: String(formData.get("orderId") ?? "") } });
  if (order?.status === "SHIPPED") await sendShippedEmail(order);
  revalidatePath("/admin");
}

export type ShipState = { error: string | null };

export async function bookEasyParcel(_prev: ShipState, formData: FormData): Promise<ShipState> {
  await requireAdmin();
  const orderId = String(formData.get("orderId") ?? "");
  const serviceId = String(formData.get("serviceId") ?? "");
  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order) return { error: "Order tak jumpa." };
  if (!serviceId && !order.epOrderNo) return { error: "Pilih kurier dulu." };

  try {
    const shipped = await bookShipment(order, serviceId);
    await sendShippedEmail(shipped);
  } catch (err) {
    revalidatePath(`/admin/pos/${orderId}`);
    return { error: err instanceof Error ? err.message : "EasyParcel gagal." };
  }
  revalidatePath("/admin");
  redirect("/admin?status=SHIPPED");
}

export async function cancelBooking(formData: FormData) {
  await requireAdmin();
  const bookingId = String(formData.get("bookingId") ?? "");

  // Booking CANCELLED tak dikira lagi, jadi masa tu boleh dibook semula.
  await db.booking.updateMany({
    where: { id: bookingId, status: "CONFIRMED" },
    data: { status: "CANCELLED" },
  });
  revalidatePath("/admin/booking");
}

export async function undoShipped(formData: FormData) {
  await requireAdmin();
  const orderId = String(formData.get("orderId") ?? "");

  await db.order.updateMany({
    where: { id: orderId, status: "SHIPPED" },
    // Order EasyParcel yang dah dibayar tak boleh dibatalkan dari sini — batalkan di easyparcel.com.
    data: {
      status: "PAID",
      trackingNumber: null,
      courier: null,
      trackingUrl: null,
      labelUrl: null,
      epOrderNo: null,
      shippedAt: null,
      emailedAt: null,
    },
  });
  revalidatePath("/admin");
}
