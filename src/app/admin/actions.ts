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
import { cancelJntOrder, createJntOrder, jntConfigured, jntTrackingUrl } from "@/lib/jnt";

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

// Cipta consignment J&T untuk order yang dah dibayar; AWB jadi no. tracking.
export async function createJntShipment(formData: FormData) {
  await requireAdmin();
  const orderId = String(formData.get("orderId") ?? "");

  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order || order.status !== "PAID" || !jntConfigured()) redirect("/admin");

  let error = "";
  try {
    const { awb, jntOrderId } = await createJntOrder(order);
    const { count } = await db.order.updateMany({
      where: { id: order.id, status: "PAID" },
      data: {
        status: "SHIPPED",
        trackingNumber: awb,
        courier: "J&T Express",
        trackingUrl: jntTrackingUrl(awb),
        jntOrderId,
        shippedAt: new Date(),
      },
    });
    if (count) {
      await sendShippedEmail(await db.order.findUniqueOrThrow({ where: { id: order.id } }));
    }
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
    // Order EasyParcel yang dah dibayar tak boleh dibatalkan dari sini — batalkan di easyparcel.com.
    data: {
      status: "PAID",
      trackingNumber: null,
      courier: null,
      trackingUrl: null,
      labelUrl: null,
      epOrderNo: null,
      jntOrderId: null,
      shippedAt: null,
      emailedAt: null,
    },
  });
  revalidatePath("/admin");
}
