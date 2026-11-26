"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { money, orderLabels, type ShopReceipt } from "./bakery-shared";
import "./bakery.css";
export function BakeryTracking({ businessId }: { businessId: string }) {
  const [order, setOrder] = useState<ShopReceipt | null>(null), [message, setMessage] = useState(""), [pending, setPending] = useState(false), [link, setLink] = useState("");
  const [number, setNumber] = useState("");
  const [credential, setCredential] = useState<{ token: string } | { number: string } | null>(null);
  const activeRequest = useRef<AbortController | null>(null);
  const refresh = useCallback(async () => {
    if (!credential) return;
    activeRequest.current?.abort();
    const controller = new AbortController(); activeRequest.current = controller;
    setPending(true);
    try {
      const headers: Record<string, string> = "token" in credential ? { "x-order-token": credential.token } : { "x-order-number": credential.number };
      const response = await fetch(`/api/sites/${businessId}/shop`, { cache: "no-store", headers, signal: controller.signal });
      const value = await response.json(); if (!response.ok) throw new Error(response.status === 404 ? "No order found. Check the order number and make sure you are on the correct bakery's website." : value.error?.message ?? "Unable to refresh order.");
      if (controller.signal.aborted) return;
      setOrder(value); setMessage("");
    } catch (error) { if (!controller.signal.aborted) setMessage(error instanceof Error ? error.message : "Unable to refresh. Try again."); }
    finally { if (!controller.signal.aborted) setPending(false); }
  }, [businessId, credential]);
  useEffect(() => {
    const token = window.location.hash.slice(1);
    if (/^[a-f0-9]{64}$/.test(token)) { setCredential({ token }); setLink(window.location.href); }
    else if (token) setMessage("This tracking link is unavailable. Enter the order number from your confirmation below.");
  }, [businessId]);
  useEffect(() => {
    if (!credential) return;
    void refresh();
    const timer = setInterval(() => { if (document.visibilityState === "visible") void refresh(); }, 15000);
    const visibility = () => { if (document.visibilityState === "visible") void refresh(); };
    document.addEventListener("visibilitychange", visibility);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", visibility); activeRequest.current?.abort(); };
  }, [refresh, credential]);
  return <main className="bakery-panel"><h1>Order status</h1><p><a href={`/sites/${businessId}/shop`}>Back to shop</a></p>
    <p>Enter the order number from your checkout confirmation to see what you ordered and its current status.</p>
    <form role="search" aria-label="Find your bakery order" onSubmit={e => {
      e.preventDefault(); activeRequest.current?.abort(); setOrder(null); setLink(""); setPending(false);
      window.history.replaceState(null, "", window.location.pathname);
      const value = number.trim().toUpperCase();
      if (!/^BK-[A-F0-9]{32}$/.test(value)) { setCredential(null); setMessage("Enter a complete order number: BK- followed by 32 letters and numbers from your confirmation."); return; }
      setMessage(""); setCredential({ number: value });
    }}>
      <label htmlFor="order-number">Order number
        <input id="order-number" name="orderNumber" type="search" required maxLength={80} autoComplete="off" spellCheck={false} placeholder="BK-…" value={number} onChange={e => setNumber(e.target.value)} />
      </label>
      <button type="submit" disabled={pending}>Check order status</button>
    </form>
    <p className="shop-note">Keep your order number and tracking link private. Anyone with either can see this receipt and progress.</p>
    {link && <label>Private tracking link<input readOnly value={link} onFocus={e => e.target.select()} /></label>}
    {pending && <p role="status">Refreshing order…</p>}{message && <p role="alert" className="shop-error">{message}</p>}
    {order && <section aria-label="Your order" aria-live="polite"><h2>Order {order.orderNumber ?? order.id}</h2>
      {order.orderNumber && <label>Your order number<input readOnly value={order.orderNumber} onFocus={e => e.target.select()} /></label>}
      <p><strong>{orderLabels[order.status]}</strong></p><p>Demo payment successful. No real charge; taxes not calculated.</p>
      <ul>{order.items.map((item, i) => <li key={i}>{item.quantity} × {item.name} — {money(item.quantity * item.priceCents)}</li>)}</ul>
      <p>Products {money(order.subtotalCents)} + delivery {money(order.deliveryFeeCents)} = <strong>{money(order.totalCents)}</strong></p>
      <p>Original estimated arrival: <time>{new Date(order.arrivalFrom).toLocaleString()}</time> – <time>{new Date(order.arrivalTo).toLocaleTimeString()}</time></p>
      <p>Approximate postal-code zone estimate; traffic and live routing are not included.</p>
      <ol className="shop-timeline">{Object.entries(orderLabels).map(([key, label]) => {
        const event = order.events.find(e => e.status === key);
        return <li key={key} aria-current={order.status === key ? "step" : undefined}>{label}{event ? ` — ${new Date(event.createdAt).toLocaleString()}` : " — Pending"}</li>;
      })}</ol><p>Progress refreshes every 15 seconds while this page is visible.</p>
    </section>}
    {credential && <button disabled={pending} onClick={() => void refresh()}>Refresh order status</button>}
  </main>;
}
