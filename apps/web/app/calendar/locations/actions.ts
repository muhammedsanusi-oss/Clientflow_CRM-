"use server";

import { currentUserId } from "../../../../../packages/auth/src/index";
import { apiError, createOwnerLocation, getOwnerBookingSettings, OwnerLocationInput } from "../../../../../packages/domain/src/index";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";

export type LocationFormState = { error?: string; fieldErrors?: Record<string, string[] | undefined>; savedId?: string };

export async function addOwnerLocationAction(_state: LocationFormState, form: FormData): Promise<LocationFormState> {
  const userId = await currentUserId();
  if (!userId) redirect("/login");
  const businessId = String(form.get("businessId") ?? "");
  if (!await getOwnerBookingSettings(userId, businessId)) notFound();
  const parsed = OwnerLocationInput.safeParse(Object.fromEntries(
    ["businessId", "name", "address", "phone_number", "email"].map(key => [key, String(form.get(key) ?? "")]),
  ));
  if (!parsed.success) return { error: "Review the highlighted fields.", fieldErrors: parsed.error.flatten().fieldErrors };
  try {
    const location = await createOwnerLocation(userId, parsed.data);
    revalidatePath("/calendar");
    revalidatePath("/calendar/locations");
    revalidatePath("/owner");
    revalidatePath(`/sites/${encodeURIComponent(businessId)}`);
    return { savedId: location.id };
  } catch (error) {
    const mapped = apiError(error);
    if (mapped.status === 404) notFound();
    return { error: mapped.code === "CONFLICT" ? "A location with that name or address already exists in this business." : mapped.message };
  }
}
