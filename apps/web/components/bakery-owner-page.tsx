import { currentUserId } from "../../../packages/auth/src/index";
import { DomainError, getBakeryOwner, listBakeryOrders, BakeryDeliveryInput } from "../../../packages/domain/src/index";
import { notFound, redirect } from "next/navigation";
import { OwnerWorkspace } from "./owner-workspace";
import { BakeryProducts, BakeryDeliverySettings, BakeryStatusButton } from "./bakery-owner";
import { money, orderLabels } from "./bakery-shared";
import "./bakery.css";

export async function BakeryOwnerPage({ searchParams, section }: { searchParams: Promise<{ businessId?: string; status?: string }>; section: "products" | "orders" | "settings" }) {
  const userId = await currentUserId(); if (!userId) redirect("/login");
  const { businessId, status } = await searchParams;
  if (!businessId || typeof businessId !== "string") notFound();
  const query = `?businessId=${encodeURIComponent(businessId)}`;
  const title = { products: "Bakery products", orders: "Customer orders", settings: "Delivery settings" }[section];
  try {
    if (status && !Object.keys(orderLabels).includes(status)) notFound();
    const data = await getBakeryOwner(userId, businessId);
    const orders = section === "orders" ? (await listBakeryOrders(userId, businessId, status)).orders : [];
    const delivery = data.delivery ? BakeryDeliveryInput.parse({ preparationMinutes: data.delivery.preparationMinutes, speedMph: data.delivery.speedMph, zones: data.delivery.zones }) : null;
    return <OwnerWorkspace business={data.business} description={title}><main className="bakery-panel"><h1>{title}</h1>
      <nav className="shop-links" aria-label="Bakery tools"><a href={`/products${query}`}>Products</a><a href={`/orders/settings${query}`}>Delivery settings</a><a href={`/orders${query}`}>Orders</a><a href={`/sites/${businessId}/shop`} target="_blank" rel="noreferrer">Open shop</a></nav>
      {section === "products" && <BakeryProducts businessId={businessId} products={data.products} photos={data.photos} />}
      {section === "settings" && <BakeryDeliverySettings businessId={businessId} initial={delivery} />}
      {section === "orders" && <><nav className="shop-links" aria-label="Order filters"><a href={`/orders${query}`}>All orders</a>{Object.entries(orderLabels).map(([key, label]) => <a key={key} aria-current={status === key ? "page" : undefined} href={`/orders${query}&status=${key}`}>{label}</a>)}</nav>
        {!orders.length && <p>No orders in this view. Share your shop after adding products and a delivery zone.</p>}
        {orders.map(order => {
          const customer = order.customer as Record<string, string>, delivery = order.delivery as Record<string, string | number>;
          return <article className="shop-card" key={order.id} style={{ marginBottom: 20 }}><h2>Order {order.orderNumber ?? order.id}</h2><p><strong>{orderLabels[order.status]}</strong> · {order.createdAt.toLocaleString("en-US")}</p>
            <ul>{order.items.map(item => <li key={item.id}>{item.quantity} × {item.name} — {money(item.quantity * item.priceCents)}</li>)}</ul>
            <p>Products {money(order.subtotalCents)} + delivery {money(order.deliveryFeeCents)} = <strong>{money(order.totalCents)}</strong></p>
            <p>Simulated payment successful. No real charge; taxes not calculated.</p>
            <p>{customer.name} · {customer.email} · {customer.phone}<br />{customer.street}, {customer.city}, {customer.state} {customer.zip}</p>
            <p>{delivery.label} · approximately {delivery.miles} miles<br />Original estimated arrival: {order.arrivalFrom.toLocaleString("en-US")} – {order.arrivalTo.toLocaleTimeString("en-US")}</p>
            <ol>{order.events.map(event => <li key={event.id}>{orderLabels[event.status]} · {event.createdAt.toLocaleString("en-US")}</li>)}</ol>
            <BakeryStatusButton businessId={businessId} orderId={order.id} version={order.version} status={order.status} />
          </article>;
        })}</>}
    </main></OwnerWorkspace>;
  } catch (error) { if (error instanceof DomainError && error.code === "NOT_FOUND") notFound(); throw error; }
}
