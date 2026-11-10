"use server";

import { currentUserId } from "@project/auth";
import {
  apiError,
  ownerServiceInputSchema,
  saveOwnerService,
  setOwnerServiceActive,
} from "@project/domain";
import { log } from "@project/log";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function servicesUrl(businessId: string, error?: string) {
  return `/calendar/services?businessId=${encodeURIComponent(businessId)}${error ? `&error=${error}` : ""}`;
}

async function requireUser() {
  const userId = await currentUserId();
  if (!userId) redirect("/login");
  return userId;
}

async function finish(userId: string, businessId: string, update: () => Promise<unknown>) {
  try {
    await update();
  } catch (error) {
    const mapped = apiError(error);
    if (mapped.status === 404) notFound();
    if (mapped.code === "INTERNAL_ERROR") {
      log.error({ userId }, "business service update failed");
      redirect(servicesUrl(businessId, "internal"));
    }
    redirect(servicesUrl(businessId, mapped.code.toLowerCase()));
  }
  revalidatePath("/calendar");
  revalidatePath("/owner");
  redirect(servicesUrl(businessId));
}

export async function saveServiceAction(formData: FormData) {
  const userId = await requireUser();
  const parsed = ownerServiceInputSchema.safeParse({
    businessId: readString(formData, "businessId"),
    serviceId: readString(formData, "serviceId"),
    name: readString(formData, "name"),
    description: readString(formData, "description"),
    durationMinutes: readString(formData, "durationMinutes"),
  });
  if (!parsed.success) redirect(servicesUrl(readString(formData, "businessId"), "invalid"));
  await finish(userId, parsed.data.businessId, () => saveOwnerService(userId, parsed.data));
}

export async function setServiceActiveAction(formData: FormData) {
  const userId = await requireUser();
  const businessId = readString(formData, "businessId");
  const serviceId = readString(formData, "serviceId");
  const isActiveValue = readString(formData, "isActive");
  if (!businessId || !serviceId || !["true", "false"].includes(isActiveValue)) {
    redirect(servicesUrl(businessId, "invalid"));
  }
  await finish(userId, businessId, () =>
    setOwnerServiceActive(userId, businessId, serviceId, isActiveValue === "true"),
  );
}
