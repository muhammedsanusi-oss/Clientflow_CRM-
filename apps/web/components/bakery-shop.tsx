"use client";
import { useEffect, useRef, useState } from "react";
import { money, shopFetch, type ShopCatalog, type ShopQuote } from "./bakery-shared";
import "./bakery.css";

export function BakeryShop({ businessId, initial }: { businessId: string; initial: ShopCatalog }) {
  const [catalog, setCatalog] = useState(initial), [cart, setCart] = useState<Record<string, number>>({}), [loaded, setLoaded] = useState(false);
  const [message, setMessage] = useState(""), [busy, setBusy] = useState(false), [quote, setQuote] = useState<(ShopQuote & { zip: string }) | null>(null), [zip, setZip] = useState("");
  const attempt = useRef<{ key: string; token: string; signature: string } | null>(null), submitted = useRef(false);
  const storageKey = `bakery-cart:${businessId}`, endpoint = `/api/sites/${businessId}/shop`;
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) ?? "{}");
      if (saved && typeof saved === "object" && !Array.isArray(saved)) {
        setCart(Object.fromEntries(Object.entries(saved).filter(([id, count]) => id.length <= 100 && typeof count === "number" && Number.isInteger(count) && count > 0 && count <= 99).slice(0, 30)) as Record<string, number>);
      }
    } catch { /* An unavailable cart store still permits ordering in this tab. */ }
    setLoaded(true);
  }, [storageKey]);
  useEffect(() => { if (loaded) { try { localStorage.setItem(storageKey, JSON.stringify(cart)); } catch { /* Keep the in-memory cart. */ } } }, [cart, loaded, storageKey]);
  const items = Object.entries(cart).map(([id, quantity]) => ({ product: catalog.products.find(p => p.id === id), id, quantity }));
  const subtotal = items.reduce((sum, item) => sum + (item.product?.priceCents ?? 0) * item.quantity, 0);
  const invalid = items.some(x => !x.product || x.quantity > (x.product?.stock ?? 0));
  const add = (id: string) => {
    if (!cart[id] && Object.keys(cart).length >= 30) { setMessage("Your cart can contain up to 30 different products."); return; }
    setCart(v => ({ ...v, [id]: Math.min(99, catalog.products.find(p => p.id === id)?.stock ?? 0, (v[id] ?? 0) + 1) })); setMessage("");
  };
  const refresh = async () => { const next = await shopFetch(endpoint) as ShopCatalog; setCatalog(next); return next; };
  const deliveryQuote = async () => {
    if (submitted.current) return;
    submitted.current = true; setBusy(true); setMessage("");
    try { const next = await shopFetch(`${endpoint}?zip=${encodeURIComponent(zip)}`) as ShopQuote; setQuote({ ...next, zip }); }
    catch (error) { setQuote(null); setMessage(error instanceof Error ? error.message : "Unable to get an estimate."); }
    finally { submitted.current = false; setBusy(false); }
  };
  return <main className="bakery-panel"><h1>{catalog.name} shop</h1><nav className="shop-links" aria-label="Bakery shopping"><a href={`/sites/${businessId}`}>Back to website</a><a href={`/sites/${businessId}/track`}>Order status</a></nav>
    <p className="shop-note">Showcase checkout: simulated payments only. No real charges. USD prices; taxes are not calculated.</p>
    {!catalog.products.length && <p>No products are available yet. Please check back soon.</p>}
    <div className="shop-grid">{catalog.products.map(product => <article className="shop-card" key={product.id} data-product-id={product.id}>
      {product.imageUrl ? <img src={product.imageUrl} alt={product.name} /> : <div className="shop-preview" aria-label="No product photo">Photo coming soon</div>}
      <h2>{product.name}</h2><p>{product.description}</p><p><strong>{money(product.priceCents)}</strong> · {product.stock ? `${product.stock} available` : "Sold out"}</p>
      <button disabled={!loaded || busy || product.stock <= (cart[product.id] ?? 0) || (cart[product.id] ?? 0) >= 99} onClick={() => add(product.id)}>Add {product.name} to cart</button>
    </article>)}</div>
    <section aria-labelledby="cart-heading"><h2 id="cart-heading" style={{ marginTop: 28 }}>Shopping cart</h2>
      {!loaded ? <p role="status">Loading cart…</p> : !items.length ? <p>Your cart is empty. Choose a product above.</p> : <>
        {items.map(item => <div className="shop-card" key={item.id} style={{ marginBottom: 10 }}><h3>{item.product?.name ?? "Product no longer available"}</h3>
          {item.product && <p>{money(item.product.priceCents)} each</p>}
          <label>Quantity for {item.product?.name ?? "unavailable product"}<input aria-label={`Quantity for ${item.product?.name ?? "unavailable product"}`} type="number" min={1} max={Math.min(99, item.product?.stock ?? 99)} value={item.quantity} disabled={busy} onChange={e => { const n = Number(e.target.value); if (Number.isInteger(n) && n >= 1 && n <= 99) setCart(v => ({ ...v, [item.id]: n })); }} /></label>
          <button disabled={busy} onClick={() => setCart(v => { const copy = { ...v }; delete copy[item.id]; return copy; })}>Remove {item.product?.name ?? "product"}</button>
        </div>)}
        {invalid && <p role="alert">Some items are no longer available in this quantity. Adjust your cart before checkout.</p>}
        <p>Product subtotal: <strong>{money(subtotal)}</strong></p>
        {!catalog.deliveryAvailable && <p>Delivery is not set up yet. Please contact the bakery.</p>}
        <form onSubmit={async e => {
          e.preventDefault(); if (submitted.current || !quote || quote.zip !== zip || invalid) return;
          const form = new FormData(e.currentTarget), customer = Object.fromEntries(["name", "email", "phone", "street", "city", "state"].map(key => [key, String(form.get(key) ?? "")]));
          const payload = { items: items.map(x => ({ productId: x.id, quantity: x.quantity, priceCents: x.product!.priceCents })), expectedDeliveryFeeCents: quote.feeCents, payment: String(form.get("payment")), customer: { ...customer, zip } };
          const signature = JSON.stringify(payload);
          if (!attempt.current || attempt.current.signature !== signature) {
            const bytes = crypto.getRandomValues(new Uint8Array(32));
            attempt.current = { key: crypto.randomUUID(), token: Array.from(bytes, b => b.toString(16).padStart(2, "0")).join(""), signature };
          }
          submitted.current = true; setBusy(true); setMessage("");
          try {
            const result = await shopFetch(endpoint, { ...payload, attemptKey: attempt.current.key, trackingToken: attempt.current.token });
            try { localStorage.removeItem(storageKey); } catch { /* Checkout is already saved. */ }
            window.location.assign(`/sites/${businessId}/track#${result.trackingToken}`);
          } catch (error) {
            setMessage(error instanceof Error ? error.message : "Unable to check out. Try again.");
            try { await refresh(); } catch { /* Preserve current cart and checkout error. */ }
          } finally { submitted.current = false; setBusy(false); }
        }}><fieldset disabled={busy || !catalog.deliveryAvailable}><legend>Delivery and demo payment</legend>
          <div className="shop-grid">{[{ name: "name", label: "Full name", max: 120 }, { name: "email", label: "Email", type: "email", max: 254 }, { name: "phone", label: "Phone", type: "tel", max: 30 }, { name: "street", label: "Street address", max: 250 }, { name: "city", label: "City", max: 100 }, { name: "state", label: "State (two letters)", max: 2 }].map(f => <label key={f.name}>{f.label}<input name={f.name} type={f.type ?? "text"} required maxLength={f.max} autoComplete={f.name === "name" ? "name" : f.name === "email" ? "email" : f.name === "phone" ? "tel" : "off"} /></label>)}</div>
          <label>Delivery ZIP code<input name="zip" inputMode="numeric" pattern="[0-9]{5}" maxLength={5} required value={zip} onChange={e => { setZip(e.target.value); setQuote(null); }} /></label>
          <button type="button" disabled={!/^\d{5}$/.test(zip)} onClick={() => void deliveryQuote()}>Get delivery estimate</button>
          {quote && <div className="shop-note" role="status"><p>{quote.label}: approximately {quote.miles} miles from the bakery. Estimated arrival {quote.minutesFrom}–{quote.minutesTo} minutes after checkout, using approximate postal-code zone distance.</p><p>Delivery {money(quote.feeCents)} · Total <strong>{money(subtotal + quote.feeCents)}</strong></p><p>Demo estimate; no live traffic or road routing. Taxes not calculated.</p></div>}
          <label>Demo payment outcome<select name="payment"><option value="SUCCESS">Simulate successful payment</option><option value="DECLINED">Simulate declined payment</option></select></label>
          <button disabled={!quote || invalid || !items.length}>{busy ? "Processing…" : "Place order with demo payment"}</button>
        </fieldset></form>
      </>}
    </section><p role="status" className="shop-error">{message}</p><button disabled={busy} onClick={async () => { setBusy(true); try { await refresh(); setMessage("Products and prices refreshed. Please review your cart."); } catch { setMessage("Unable to refresh products. Try again."); } finally { setBusy(false); } }}>Refresh products</button>
  </main>;
}
