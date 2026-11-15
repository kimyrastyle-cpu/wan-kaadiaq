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
import { cancelJntOrder, createJntOrder, jntConfigured } from "@/lib/jnt";

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

  await db.order.updateMany({
    where: { id: orderId, status: "PAID" },
    data: { status: "SHIPPED", trackingNumber, shippedAt: new Date() },
  });
  revalidatePath("/admin");
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

// Cipta consignment J&T untuk order yang dah dibayar; AWB jadi no. tracking.
export async function createJntShipment(formData: FormData) {
  await requireAdmin();
  const orderId = String(formData.get("orderId") ?? "");

  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order || order.status !== "PAID" || !jntConfigured()) redirect("/admin");

  let error = "";
  try {
    const { awb, jntOrderId } = await createJntOrder(order);
    await db.order.updateMany({
      where: { id: order.id, status: "PAID" },
      data: { status: "SHIPPED", trackingNumber: awb, jntOrderId, shippedAt: new Date() },
    });
  } catch (err) {
    console.error(err);
    error = err instanceof Error ? err.message : "Ralat tak diketahui";
  }

  revalidatePath("/admin");
  if (error) {
    const ref = order.id.slice(-8).toUpperCase();
    redirect(`/admin?status=PAID&ralat=${encodeURIComponent(`#${ref}: ${error}`.slice(0, 300))}`);
  }
}

export async function undoShipped(formData: FormData) {
  await requireAdmin();
  const orderId = String(formData.get("orderId") ?? "");

  // Kalau consignment dibuat melalui J&T, batalkan di J&T dulu.
  const order = await db.order.findUnique({ where: { id: orderId } });
  if (order?.status === "SHIPPED" && order.jntOrderId && order.trackingNumber && jntConfigured()) {
    try {
      await cancelJntOrder(order.trackingNumber, order.jntOrderId);
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : "Ralat tak diketahui";
      redirect(`/admin?status=SHIPPED&ralat=${encodeURIComponent(`Tak dapat batal di J&T: ${message}`.slice(0, 300))}`);
    }
  }

  await db.order.updateMany({
    where: { id: orderId, status: "SHIPPED" },
    data: { status: "PAID", trackingNumber: null, jntOrderId: null, shippedAt: null },
  });
  revalidatePath("/admin");
}
