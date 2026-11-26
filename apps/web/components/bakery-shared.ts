export const money = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
export const orderLabels: Record<string, string> = { RECEIVED: "Received", WORKING_ON_IT: "Working on it", OUT_FOR_DELIVERY: "On the way for delivery" };
export async function shopFetch(url: string, body?: unknown) {
  const response = await fetch(url, { cache: "no-store", ...(body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}) });
  const value = await response.json();
  if (!response.ok) throw new Error(value.error?.message ?? "Unable to complete this request. Try again.");
  return value;
}
export type ShopProduct = { id: string; name: string; description: string; priceCents: number; stock: number; imageUrl: string | null };
export type ShopCatalog = { name: string; products: ShopProduct[]; deliveryAvailable: boolean };
export type ShopQuote = { label: string; miles: number; feeCents: number; minutesFrom: number; minutesTo: number };
export type ShopReceipt = { id: string; orderNumber: string | null; status: string; totalCents: number; subtotalCents: number; deliveryFeeCents: number; createdAt: string; arrivalFrom: string; arrivalTo: string; items: { name: string; quantity: number; priceCents: number }[]; events: { status: string; createdAt: string }[] };
