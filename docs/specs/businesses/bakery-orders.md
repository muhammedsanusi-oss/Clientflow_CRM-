---
type: feature
---
# Customers order bakery products and owners manage delivery progress

## Why

Bakery customers buy available products shown by the business and follow their
order from receipt to delivery dispatch. Owners maintain the catalog and update
orders in their existing admin panel. Salon and barbershop owners also see
upcoming online appointments directly on their dashboard.

## Where it lives

- `apps/web/app/owner/` and `apps/web/components/owner-workspace.tsx`: upcoming
  appointments and links to bakery products, delivery settings, and orders.
- `apps/web/app/products/`, `apps/web/app/orders/`, and
  `apps/web/app/orders/settings/`: owner catalog, fulfillment, and delivery setup.
- `apps/web/components/business-sites/` and `apps/web/app/sites/[businessId]/`:
  bakery product cards, cart, checkout, and private-link customer tracking.
- `apps/web/app/api/sites/[businessId]/`: public catalog, delivery quote,
  checkout, and token-protected tracking endpoints.
- `packages/domain/src/`: validated catalog, delivery, checkout, order-status,
  and upcoming-appointment queries; all database access stays in the domain.
- `packages/db/prisma/schema.prisma` and new append-only migrations: products,
  delivery zones/settings, orders, order items, and transactional order history.
- `tests/integration/`, `tests/browser/`, and
  `docs/runbooks/project-walkthrough.md`: isolation checks and showcase drill.

## Behavior

### Booking visibility

- Existing public salon/barbershop bookings continue to create a confirmed
  appointment and associated customer atomically, as specified in
  `../appointments/customer-booking.md`.
- With existing CRM eligibility, the owner dashboard lists the next five
  non-canceled appointments starting today, including customer, service, date,
  time, and location, with a link to the appropriate calendar month.
- The list is scoped to the selected business and uses the calendar's existing
  business-local time convention. An empty list explains where to share the
  booking link. Refreshing the dashboard shows newly confirmed bookings.
- Appointment creation, eligibility, and conflict rules remain governed by the
  existing booking spec; this feature adds a visible dashboard entry point.

### Owner catalog

- Bakery owners with a regular session and active OWNER membership manage
  products from their admin panel, regardless of subscription billing state.
  This follows the owner website-editing access policy.
- Each product has a required name, optional description, USD price, available
  stock quantity, active/unavailable toggle, display order, and optional photo
  chosen from that business's published website photos.
- Prices are positive integer cents, capped at $10,000 per item. Stock is an
  integer from 0 through 100,000. Names are 1-120 characters; descriptions are
  at most 2,000 characters. Server validation trims text and rejects invalid
  values without discarding entered form values.
- Reusing a published photo consumes no additional image allowance. Uploads
  continue through the existing photo editor and its subscription limits.
  Removing a photo from the website leaves the product with a placeholder;
  the catalog cannot publish arbitrary blob references or foreign photos.
- Saving product changes makes them available immediately on the public bakery
  catalog; the UI distinguishes this from website Save and publish.
- Public cards show active products, photo, price, and availability. Products
  with zero stock show Sold out and cannot be added to a cart. Owners can
  deactivate products; prior order-item snapshots remain intact.

### Delivery settings and estimate

- The owner configures preparation minutes (0-240), assumed delivery speed
  (5-60 miles/hour), and delivery zones. Each zone has a label, exact supported
  US ZIP codes, approximate distance from the bakery (0-50 miles), and a fixed
  delivery fee (0-$100). One ZIP code belongs to at most one active zone.
- Checkout collects a delivery name, email, phone, street address, city, state,
  and ZIP code. The server matches the ZIP to an active zone. Unsupported ZIPs
  prevent checkout and show an explanation before payment simulation.
- Before checkout the customer sees approximate zone distance, fee, and an
  estimated arrival window. The lower bound is preparation minutes plus
  distance divided by configured speed, rounded up to minutes; the upper bound
  adds 15 minutes. The window starts at successful checkout time.
- Labels explicitly describe this as a demo estimate using the postal-code
  zone's approximate distance. An address is not silently treated as geocoded;
  traffic, road routing, and GPS are not claimed. Settings explain this model.
- The accepted address, delivery settings, fee, and arrival window are saved
  with the order. Later settings edits do not rewrite an existing estimate.

### Cart and simulated checkout

- Signed-out visitors select products and quantities from the public bakery
  website and review a cart. The cart survives a reload in the same browser and
  stays separate for each business. It stores product IDs and quantities only;
  customer contact information is not persisted in browser storage.
- Carts contain at most 30 distinct products and 99 units per product. The
  server revalidates business, active products, current prices, stock, delivery
  settings, quantities, and totals at checkout; browser-supplied totals have
  no authority. Changed prices or availability require cart review before retry.
- Checkout displays USD product subtotal, delivery fee, total, and estimate.
  Taxes are not calculated and this is clearly labeled as a demo quote.
- The total is capped at $20,000,000 to keep integer-cent amounts within the
  database's signed-integer range; an excessive cart is rejected before writes.
- Payment is explicitly simulated: the customer chooses a successful or
  declined demo payment. No card fields, real charge, gateway, or payment
  credentials are involved, consistent with the existing showcase scope.
- A successful checkout atomically creates an order with product name/price/
  quantity snapshots, simulated-payment result, RECEIVED status, history event,
  and stock decrement. A declined payment creates no order and changes no stock.
- Concurrent checkouts cannot oversell. A unique checkout attempt key makes
  retries return the same successful order without another stock decrement.
  Failures preserve the cart; success clears only that business's cart.

### Order management and customer tracking

- Owners see their business's orders in the admin panel, newest first, with
  status filters, order number, creation time, items, total, contact/address,
  approximate distance, and original arrival window.
- Owners update status through Received -> Working on it -> On the way for
  delivery. These labels map to RECEIVED, WORKING_ON_IT, and OUT_FOR_DELIVERY.
  Skipped, backward, and stale updates are rejected; a repeated current-state
  update is a no-op. Each actual change and its timestamp are transactional.
- Successful checkout gives the customer a private tracking link. The page
  shows order items, total, original estimated window, and status timeline.
  It refreshes status every 15 seconds while visible and offers manual refresh.
  Errors retain the last confirmed status and explain retry.
- Tracking uses a cryptographically random bearer token with at least 128 bits
  of entropy; only its hash is stored. It grants access only to that order's
  minimal receipt and progress, never full address/contact details or CRM data.
  Token pages use no-store caching, no indexing, and no-referrer policy.
- The tracking token lives in the private link's URL fragment and travels in a
  dedicated request header, keeping it out of server URL/access logs. Checkout
  attempt keys and tracking tokens are generated with the browser's cryptographic
  random source; retries must match the original validated request exactly.
- Successful checkout also assigns an unguessable order number (`BK-` followed
  by 32 hexadecimal characters from 16 cryptographically random bytes). The
  confirmation receipt and owner order list display the same number; checkout
  retries return the original number. Existing orders retain private-link access.
- The bakery website and shop link to Order status. Signed-out customers enter
  their number into a labeled search bar and submit Check order status to see
  item names, quantities, prices, totals, the original estimate, and the three
  progress steps. No account or contact details are required. Input ignores
  surrounding whitespace and letter case. Empty, malformed, unknown, and foreign
  numbers never expose an order; starting another search clears the old receipt.
- Order numbers grant the same minimal receipt access as private links. They
  travel in a dedicated request header, never query parameters, and are not
  persisted in browser storage. The UI tells customers to keep them private.
  Polling and manual refresh work after either a link visit or a number search;
  refresh errors retain the last confirmed receipt for that same search.
- No public order list or sequential-number lookup exists. Unknown credentials
  and mismatched business/order combinations return indistinguishable 404 results.

### Access and failures

- Signed-out owner pages redirect to login; owner APIs require a regular
  session and active OWNER membership. Foreign/unknown resources return 404.
  Activation-only sessions cannot manage products, delivery settings, or orders.
- Public catalog data exposes only published product fields and safe delivery
  choices. Checkout is an explicit public operation with server-side input
  limits, same-origin writes, and the existing abuse-control conventions.
- Errors use `{ error: { code, message } }`; no raw errors, customer addresses,
  tracking tokens, or payment input reach logs. Owner history records the actor
  from the session, never a client-supplied user ID.
- Pending controls prevent duplicate submissions, and visible empty/error
  states explain the next action. Forms and status controls support keyboards
  and a 390px viewport.

## Examples

| State / input | Behavior |
|---|---|
| Visitor books a salon haircut | Owner sees the appointment in the calendar and next-five dashboard list |
| Bakery posts $5 bread with 3 units available | Public card allows a quantity up to available stock |
| Two visitors simultaneously buy the final loaf | One order succeeds; the other gets an availability error |
| Two $5 loaves, $3 delivery, 4-mile zone, 20-minute preparation, 20mph | Demo total is $13; estimated arrival is 32-47 minutes after checkout |
| Customer selects a declined demo payment | No order or stock change; cart remains available |
| Browser retries the same successful checkout | Same order is returned with one stock decrement |
| Address ZIP has no active delivery zone | Checkout explains that delivery is unavailable |
| Owner moves Received directly to On the way for delivery | Rejected; status and history remain unchanged |
| Owner changes Working on it to On the way for delivery | Customer tracking reflects the change within 15 seconds or on refresh |
| Another owner submits a product ID or order ID | 404; no foreign data or changes |

## Verify

- Run `pnpm test`, `pnpm typecheck`, and `pnpm build`.
- Integration tests cover owner isolation, activation-only rejection, product
  validation, published-photo ownership, price/stock tampering, concurrent
  last-unit checkout, idempotent retries, declined payment, delivery calculation,
  snapshots, legal/stale status transitions, and minimal token-protected reads.
- On an isolated development instance, book a salon/barbershop appointment as
  a visitor and verify the selected owner's dashboard and calendar show it.
- As a bakery owner, publish a product photo, add a priced product and delivery
  zone, then order as a signed-out customer. Verify photo rendering, cart reload,
  fee/estimate, successful and declined checkout, and no duplicate on retry.
- Keep customer tracking and the owner order page open separately; advance
  through all three statuses and confirm the customer's timeline updates.
- Copy the confirmation's order number, reopen Order status from the bakery
  website without its private fragment, and search with that number. Verify the
  same receipt and progress, lowercase/whitespace normalization, unknown-number
  feedback, and rejection of another bakery's number and internal order ID.
- Repeat cart/checkout and owner controls at 390px and with keyboard navigation;
  verify empty stock, unavailable zones, and errors preserve usable state.
- Confirm the ordinary development app's login still works after isolated
  verification; update the project walkthrough with the complete bakery drill.

## Constraints & decisions

- This is a local showcase using simulated payments and approximate zone-based
  distance estimates. It needs no new dependency, external account, maps key,
  live payment provider, or cloud service.
- Products and orders are dedicated business-scoped records, separate from CRM
  services and appointments. New migrations are append-only; existing records,
  passwords, and applied migrations are preserved.
- Product/order access does not add a new subscription tier. Existing photo
  quotas and CRM appointment eligibility retain their own contracts.
- Catalog changes are immediately saved independently of website content
  publication. Product photos must already be published on the same website.
- The status flow stops at the requested delivery-dispatch state. Its original
  estimate stays labeled estimated even if fulfillment takes longer.

## Out of scope

- Real payments, taxes, refunds, cancellations, completed-delivery confirmation,
  driver assignment, live GPS, road-distance calculation, and SMS/email delivery
  are future features without an implemented contract.
- Photo uploads, placement, and quotas belong to `product-photos.md`.
- Appointment availability and calendar rules belong to
  `../appointments/customer-booking.md` and `../appointments/customer-calendar.md`.
