"use server";

import { currentUserId } from "@project/auth";
import {
  addBookingStaff,
  addBookingStaffHours,
  addBusinessHoursInterval,
  apiError,
  deleteBookingStaffHours,
  deleteBusinessHoursInterval,
  hoursIntervalInputSchema,
  staffHoursIntervalInputSchema,
  staffNameInputSchema,
  updateBookingStaff,
} from "@project/domain";
import { log } from "@project/log";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function scheduleUrl(businessId: string, error?: string) {
  return `/calendar/hours?businessId=${encodeURIComponent(businessId)}${error ? `&error=${error}` : ""}`;
}

async function completeUpdate(userId: string, businessId: string, update: () => Promise<unknown>) {
  try {
    await update();
  } catch (error) {
    const mapped = apiError(error);
    if (mapped.status === 404) notFound();
    if (mapped.code === "INTERNAL_ERROR") {
      log.error({ userId }, "business schedule update failed");
      redirect(scheduleUrl(businessId, "internal"));
    }
    redirect(scheduleUrl(businessId, mapped.code.toLowerCase()));
  }
  revalidatePath("/calendar");
  revalidatePath("/owner");
  redirect(scheduleUrl(businessId));
}

async function requireUser() {
  const userId = await currentUserId();
  if (!userId) redirect("/login");
  return userId;
}

export async function addBusinessHoursAction(formData: FormData) {
  const userId = await requireUser();
  const parsed = hoursIntervalInputSchema.safeParse({
    businessId: readString(formData, "businessId"),
    dayOfWeek: readString(formData, "dayOfWeek"),
    startTime: readString(formData, "startTime"),
    endTime: readString(formData, "endTime"),
  });
  if (!parsed.success) redirect(scheduleUrl(readString(formData, "businessId"), "invalid"));
  await completeUpdate(userId, parsed.data.businessId, () => addBusinessHoursInterval(userId, parsed.data));
}

export async function removeBusinessHoursAction(formData: FormData) {
  const userId = await requireUser();
  const businessId = readString(formData, "businessId");
  const intervalId = readString(formData, "intervalId");
  if (!businessId || !intervalId) redirect(scheduleUrl(businessId, "invalid"));
  await completeUpdate(userId, businessId, () => deleteBusinessHoursInterval(userId, businessId, intervalId));
}

export async function addBookingStaffAction(formData: FormData) {
  const userId = await requireUser();
  const parsed = staffNameInputSchema.safeParse({
    businessId: readString(formData, "businessId"),
    name: readString(formData, "name"),
  });
  if (!parsed.success) redirect(scheduleUrl(readString(formData, "businessId"), "invalid"));
  await completeUpdate(userId, parsed.data.businessId, () => addBookingStaff(userId, parsed.data));
}

export async function updateBookingStaffAction(formData: FormData) {
  const userId = await requireUser();
  const businessId = readString(formData, "businessId");
  const staffId = readString(formData, "staffId");
  const name = readString(formData, "name").trim();
  const isActive = readString(formData, "isActive") === "true";
  if (!businessId || !staffId || !name || name.length > 100) redirect(scheduleUrl(businessId, "invalid"));
  await completeUpdate(userId, businessId, () => updateBookingStaff(userId, businessId, staffId, name, isActive));
}

export async function addBookingStaffHoursAction(formData: FormData) {
  const userId = await requireUser();
  const parsed = staffHoursIntervalInputSchema.safeParse({
    businessId: readString(formData, "businessId"),
    staffId: readString(formData, "staffId"),
    dayOfWeek: readString(formData, "dayOfWeek"),
    startTime: readString(formData, "startTime"),
    endTime: readString(formData, "endTime"),
  });
  if (!parsed.success) redirect(scheduleUrl(readString(formData, "businessId"), "invalid"));
  await completeUpdate(userId, parsed.data.businessId, () => addBookingStaffHours(userId, parsed.data));
}

export async function removeBookingStaffHoursAction(formData: FormData) {
  const userId = await requireUser();
  const businessId = readString(formData, "businessId");
  const staffId = readString(formData, "staffId");
  const intervalId = readString(formData, "intervalId");
  if (!businessId || !staffId || !intervalId) redirect(scheduleUrl(businessId, "invalid"));
  await completeUpdate(userId, businessId, () => deleteBookingStaffHours(userId, businessId, staffId, intervalId));
}
