"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { BakeryDeliveryData } from "../../../packages/domain/src/bakery";
import { money, orderLabels, shopFetch } from "./bakery-shared";
import "./bakery.css";

type Product = { id?: string; name: string; description: string; priceCents: number; stock: number; active: boolean; displayOrder: number; photoRef: string };
type Photo = { ref: string; url: string; label: string };
const emptyProduct: Product = { name: "", description: "", priceCents: 500, stock: 0, active: true, displayOrder: 0, photoRef: "" };
function useSave(businessId: string) {
  const router = useRouter(), [pending, setPending] = useState(false), [message, setMessage] = useState("");
  return { pending, message, save: async (action: string, value: unknown) => {
    setPending(true); setMessage("");
    try { await shopFetch(`/api/bakery/${businessId}`, { action, value }); setMessage("Saved successfully."); router.refresh(); return true; }
    catch (error) { setMessage(error instanceof Error ? error.message : "Unable to save. Try again."); return false; }
    finally { setPending(false); }
  } };
}
function ProductForm({ businessId, initial, photos }: { businessId: string; initial: Product; photos: Photo[] }) {
  const { pending, message, save } = useSave(businessId);
  const [value, setValue] = useState(initial), [price, setPrice] = useState((initial.priceCents / 100).toFixed(2));
  const update = (patch: Partial<Product>) => setValue(v => ({ ...v, ...patch }));
  return <form onSubmit={async e => { e.preventDefault(); if (await save("product", { ...value, priceCents: Math.round(Number(price) * 100) }) && !initial.id) { setValue(emptyProduct); setPrice("5.00"); } }}>
    <fieldset disabled={pending}><legend>{initial.id ? `Edit ${initial.name}` : "Add a product"}</legend>
      <label>Product name<input name="name" required maxLength={120} value={value.name} onChange={e => update({ name: e.target.value })} /></label>
      <label>Description<textarea name="description" maxLength={2000} value={value.description} onChange={e => update({ description: e.target.value })} /></label>
      <div className="shop-grid"><label>Price (USD)<input name="price" type="number" min="0.01" max="10000" step="0.01" required value={price} onChange={e => setPrice(e.target.value)} /></label>
      <label>Units in stock<input name="stock" type="number" min={0} max={100000} required value={value.stock} onChange={e => update({ stock: Number(e.target.value) })} /></label>
      <label>Display order<input name="displayOrder" type="number" min={0} max={100000} required value={value.displayOrder} onChange={e => update({ displayOrder: Number(e.target.value) })} /></label></div>
      <label>Published website photo<select name="photoRef" value={value.photoRef} onChange={e => update({ photoRef: e.target.value })}><option value="">No photo</option>{photos.map((photo, index) => <option key={`${photo.ref}-${index}`} value={photo.ref}>{photo.label}</option>)}</select></label>
      {photos.find(p => p.ref === value.photoRef) && <img style={{ maxWidth: 250 }} src={photos.find(p => p.ref === value.photoRef)!.url} alt="Selected product photo" />}
      <label>Available on website<input name="active" type="checkbox" checked={value.active} onChange={e => update({ active: e.target.checked })} /></label>
      <button>{pending ? "Saving…" : "Save product"}</button>
    </fieldset><p role="status">{message}</p>
  </form>;
}
export function BakeryProducts({ businessId, products, photos }: { businessId: string; products: Product[]; photos: Photo[] }) {
  return <><p className="shop-note">Saving changes updates the public catalog immediately. Photos must first be uploaded and published in Edit website.</p>
    {!photos.length && <p>No published photos yet. <a href={`/businesses/${businessId}/website`}>Open Edit website</a> to add them.</p>}
    <ProductForm businessId={businessId} initial={emptyProduct} photos={photos} />
    {!products.length && <p>No products yet. Add your first product above.</p>}
    {products.map(product => <details key={`${product.id}-${product.stock}-${product.priceCents}-${product.name}-${product.active}-${product.photoRef}-${product.displayOrder}`}><summary>{product.name} · {money(product.priceCents)} · {product.stock} in stock · {product.active ? "Active" : "Unavailable"}</summary><ProductForm businessId={businessId} initial={product} photos={photos} /></details>)}
  </>;
}
const defaultDelivery: BakeryDeliveryData = { preparationMinutes: 20, speedMph: 20, zones: [] };
export function BakeryDeliverySettings({ businessId, initial }: { businessId: string; initial: BakeryDeliveryData | null }) {
  const [value, setValue] = useState(initial ?? defaultDelivery), { pending, message, save } = useSave(businessId);
  const zone = (index: number, patch: Partial<BakeryDeliveryData["zones"][number]>) => setValue(v => ({ ...v, zones: v.zones.map((z, i) => i === index ? { ...z, ...patch } : z) }));
  return <form onSubmit={e => { e.preventDefault(); void save("delivery", value); }}><p className="shop-note">Demo estimates use each postal-code zone's approximate distance from your bakery, preparation time, and assumed speed. Addresses are not geocoded; traffic and road routing are not included. Arrival windows add a 15-minute buffer.</p>
    <fieldset disabled={pending}><legend>Delivery setup</legend><label>Preparation time (minutes)<input name="preparationMinutes" type="number" min={0} max={240} required value={value.preparationMinutes} onChange={e => setValue(v => ({ ...v, preparationMinutes: Number(e.target.value) }))} /></label>
    <label>Assumed delivery speed (miles/hour)<input name="speedMph" type="number" min={5} max={60} required value={value.speedMph} onChange={e => setValue(v => ({ ...v, speedMph: Number(e.target.value) }))} /></label>
    {value.zones.map((z, i) => <fieldset key={i}><legend>Zone {i + 1}</legend><label>Zone name<input required maxLength={100} value={z.label} onChange={e => zone(i, { label: e.target.value })} /></label>
      <label>ZIP codes (comma separated)<input required value={z.zipCodes.join(",")} onChange={e => zone(i, { zipCodes: e.target.value.split(",").map(s => s.trim()) })} /></label>
      <label>Approximate distance from bakery (miles)<input type="number" min={0} max={50} step="0.1" required value={z.miles} onChange={e => zone(i, { miles: Number(e.target.value) })} /></label>
      <label>Delivery fee (USD)<input type="number" min={0} max={100} step="0.01" required value={z.feeCents / 100} onChange={e => zone(i, { feeCents: Math.round(Number(e.target.value) * 100) })} /></label>
      <label>Zone active<input type="checkbox" checked={z.active} onChange={e => zone(i, { active: e.target.checked })} /></label><button type="button" onClick={() => setValue(v => ({ ...v, zones: v.zones.filter((_, index) => index !== i) }))}>Remove zone</button>
    </fieldset>)}
    <div className="shop-row"><button type="button" disabled={value.zones.length >= 30} onClick={() => setValue(v => ({ ...v, zones: [...v.zones, { label: "", zipCodes: [], miles: 0, feeCents: 0, active: true }] }))}>Add delivery zone</button><button>{pending ? "Saving…" : "Save delivery settings"}</button></div></fieldset><p role="status">{message}</p>
  </form>;
}
export function BakeryStatusButton({ businessId, orderId, version, status }: { businessId: string; orderId: string; version: number; status: string }) {
  const { pending, message, save } = useSave(businessId), next = status === "RECEIVED" ? "WORKING_ON_IT" : status === "WORKING_ON_IT" ? "OUT_FOR_DELIVERY" : null;
  return <>{next && <button disabled={pending} onClick={() => void save("status", { orderId, version, status: next })}>{pending ? "Updating…" : `Mark ${orderLabels[next]}`}</button>}<p role="status">{message}</p></>;
}
