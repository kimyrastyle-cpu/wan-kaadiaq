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

export async function undoShipped(formData: FormData) {
  await requireAdmin();
  const orderId = String(formData.get("orderId") ?? "");

  await db.order.updateMany({
    where: { id: orderId, status: "SHIPPED" },
    data: { status: "PAID", trackingNumber: null, shippedAt: null },
  });
  revalidatePath("/admin");
}
