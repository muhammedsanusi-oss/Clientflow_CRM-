# Present the Clientflow showcase

## Purpose and limits

Demonstrate a business website connected to bookings, customer records, and a
private owner workspace. All accounts, businesses, and visitor details used in
the presentation are fictional. Subscription payments are simulated; there are
no real charges, email/SMS deliveries, custom domains, or cloud deployments.

## Prepare

1. From the repository run `pnpm install`, `pnpm prisma:generate`, and `pnpm dev`.
   Windows uses `corepack.cmd pnpm` and the [Windows runbook](run-local-windows.md).
2. Wait for the web server and database. `/api/health` must return
   `{"status":"ok","db":"ok"}`. Keep the terminal open.
3. Use `pnpm dev` for the presentation. A production build deliberately disables
   fixed test accounts and local signup; `pnpm build` is a compilation check.
4. Keep two separate browser sessions: developer and owner. Open the public
   website in a signed-out session when demonstrating visitor access.
5. Use a fresh fictional owner email for each new-business walkthrough. Do not
   reset the database or overwrite existing owners to prepare the presentation.

## Developer-led setup

1. Open `/login`, choose Developer, use the test account, and sign in:
   `developer@clientflow.test` / `Clientflow-test-2026!`.
2. Choose Create business, preview a template, and use sample details. Give the
   owner a fresh `.test` email. Save with Create business & website.
3. Copy the single-use setup link from the confirmation and open it in the owner
   browser. Choose a password of 15-128 characters. The link expires after 24
   hours and cannot be reused. Previously issued temporary passwords continue
   to work through Business owner sign-in and password replacement.
4. The owner enters their business dashboard. Developer-provisioned businesses
   without a subscription retain explicitly labeled legacy demo access.

## Alternative: local self-service signup

1. From `/login`, follow Sign up and select Website + standard CRM.
2. Enter fictional owner, business, and billing-address details. Local signup
   skips email verification; it is unavailable outside development.
3. The app opens Demo subscription. Simulate successful payment to activate
   the selected plan. No card or bank information is needed.
4. Return to the selected business dashboard. Standard website alone does not
   include customer records or booking; CRM and Managed plans do.

## Five-minute feature walkthrough

1. **Publish a website.** Open Edit website, select the hero section, and change
   its headline. Show Unpublished changes. Click Cancel or a dashboard link and
   decline the departure warning; the draft remains. Save and publish, then open
   the public website and show the new headline. Same-page anchors and new-tab
   links do not discard drafts; browser Back/Forward is outside the warning.
2. **Receive an inquiry.** Submit a fictional contact message on the public
   site. Open Website inquiries in the owner workspace and find that message.
   Explain that this is an in-app inbox, with no automatic email delivery.
3. **Configure booking.** In Scheduling open Business locations and add a name
   and address. Add a 30-minute service under Bookable services. Add 09:00-17:00
   opening hours for a future demonstration date's weekday. Staff display names
   are optional; without them one shared schedule prevents overlapping bookings.
4. **Show readiness.** Open the calendar. Location, service, and hours should
   say configured. Follow Open public booking, or use Book online on the public
   site. Before setup, or on a website-only plan, the site keeps its contact
   action without offering an unusable booking link.
5. **Book as a visitor.** In the signed-out browser choose service, location,
   future date, and an available time. Enter fictional contact details and book.
   Show the confirmation. Dates/times use the business's entered local schedule.
6. **Close the loop.** Refresh the owner's calendar for the booked month. Show
   the appointment, open the customer, and add a note. Find the same customer
   through search. No manual database editing is needed.
7. **Show subscription recovery.** On Demo subscription simulate failed payment:
   paid CRM/support tools become unavailable while website editing, the dashboard,
   and recovery remain. Open Edit website and publish a small change to show
   that owner editing works even without active billing.
   Simulate successful payment and show access returning with data intact.
   Cancellation also retains published content and stored records.
8. **Optional Managed demonstration.** Simulate a successful change to Managed,
   submit a content-change request, and show its developer workflow and tracked
   time. Follow [the managed-service drill](managed-service.md).

## Quick preview and boundaries

Owner editing works on every plan and subscription state. The dashboard and
published preview both offer Edit website; a failed payment, cancellation,
pending checkout, or expiry must not hide it. The photo allowance, active owner
membership, and paid CRM/support rules continue to apply. Run
`tests/browser/owner-website-editing.mjs` against the isolated disposable
instance to demonstrate pending and inactive editing without changing the
normal sample business or subscription.

### Show product photos

In Edit website open Product photos. Choose a section in Post photo in and upload
a JPEG, PNG, or WebP up to 5 MB. Select Products & offerings for product examples.
Use Move to section, Earlier/Later, and Remove on thumbnails to arrange the
gallery; canceled removal keeps the photo. Changes remain a draft until Save
and publish. Open the public website to verify the resulting placement.

The displayed usage includes every distinct website image. Current demo
subscriptions allow Standard 10, CRM 20, and Managed 50 photos across the site,
with at most 10 in a section. Legacy businesses use their saved website tier,
or retain an uncapped site total when no tier is stored. A simulated subscription
upgrade changes the allowance when the editor is reopened. A downgrade keeps
the existing public site but may require removing photos before publishing.

`pnpm dev` includes local Azurite storage. Keep that service running for uploads
and public image delivery; no Azure account is required. Retained image files
are not deleted when their placements are removed.

For the real-upload browser drill, use an isolated development instance with
`PGLITE_DATA_DIR=memory://`, `CLIENTFLOW_DEV_INSTANCE=photos`, and
`AZURE_STORAGE_CONNECTION_STRING=UseDevelopmentStorage=true` on port 3100.
With local Azurite and isolated Chromium on port 9392, run
`corepack.cmd pnpm exec node tests/browser/product-photos.mjs`. The drill creates
fictional owners and small PNG fixtures, inspects all four templates, moves and
reorders photos, checks served bytes, and tests allowance changes. Screenshots
are written to `artifacts/product-photos/`. Afterwards run
`tests/browser/developer-login.mjs` against port 3000 to verify the normal demo.

The test owner `owner@clientflow.test` uses the same public test password and
opens Sample business. This fixture has a sample location, service, weekday
hours, and staff schedule. Login does not restore canceled subscriptions or
reset edits; use Demo subscription to recover its simulated access if needed.

Use a second fictional business to show isolation: its owner cannot open the
first business's private records, locations, or inquiries. Sign out and confirm
private pages require login. Developers have explicit provisioning grants;
those grants do not make them owner CRM members.

## Automated verification

Run `pnpm test`, `pnpm typecheck`, and `pnpm build`. Tests use disposable PGlite
and need no running services. Keep SQL drafts outside the executable migrations
directory; see `artifacts/migration-drafts/README.md` for the preserved duplicate.

For a complete browser drill, start a separate disposable web instance:

```powershell
$env:PGLITE_DATA_DIR = 'memory://'
$env:CLIENTFLOW_DEV_INSTANCE = 'showcase'
corepack.cmd pnpm --dir apps/web exec next dev --port 3100
```

Open an isolated Chromium instance with remote debugging on port 9392 and an
`about:blank` tab. In a second terminal:

```powershell
$env:API_BASE_URL = 'http://localhost:3100'
$env:COLOR_BROWSER_URL = 'http://localhost:9392'
corepack.cmd pnpm exec node tests/browser/showcase-completion.mjs
```

This drill creates fictional data on that disposable instance: signup, simulated
checkout, the actual location form and duplicate feedback, service/hours forms,
publication and unsaved-edit warnings, rejected publication/recovery, visitor
booking, and owner calendar/customer visibility. Screenshots are saved under
`artifacts/showcase-completion/`. It checks 390px setup/booking pages and a
1440px populated calendar. It is not a full accessibility or security audit.

The instance name isolates compiled assets in `.next-dev-showcase`. A different
port alone does not isolate Next.js files; never run the verification server
alongside the demo with the same development directory. Normal `pnpm dev`
uses `.next-dev`; production builds use `.next`.

Stop the disposable server and isolated browser afterward; its in-memory data
is discarded. Normal showcase data stays in the regular local development app.

## Workspace appearance

On a disposable development instance with its own `CLIENTFLOW_DEV_INSTANCE`,
run `pnpm exec node tests/browser/workspace-polish.mjs`. The drill creates
fictional developer-provisioned businesses and verifies overview, inbox,
managed-service requests and usage, owner dashboards, subscriptions, bakery
tools, CRM pages, and scheduling settings at 1440px and 390px. It checks all
four owner themes, header clearance, and public/editor style boundaries.
Screenshots are saved under `artifacts/workspace-polish/`. The demo app remains
on port 3000; disposable verification uses port 3100 and its own output folder.

## Bakery ordering and booking visibility

### Style product photos

In Edit website, upload a rectangular photo and use its Small, Medium, and
Large controls, then adjust Photo width with the keyboard slider. The live
preview changes immediately. Add Product name and Price (USD), choose Save and
publish, and reload the public site: verify the caption, price, chosen width,
and original proportions. Reopen the editor and move/reorder the photo to
confirm those details follow it. Invalid prices block publication; clearing
the price permits an ordinary named photo. Check all four templates and a
390px viewport; old unsized photos keep their existing template appearance.

These are website captions. Bakery items sold through checkout are configured
using Manage shop products, including their stock and shop price.

### Order and fulfill

1. Sign up with the Bakery template or open an existing bakery owner's dashboard.
   Bakery tools remain available before subscription payment. Generate the
   Prisma client and apply pending migrations with `pnpm prisma:generate` and
   `pnpm db:migrate` if the ordinary local database was already running; restart
   the web process to load the generated client. No data reset is needed.
2. In Edit website, upload a product photo to Products & offerings and Save and
   publish. Open Products from the dashboard, add Bread at $5.00 with 3 units,
   select that published photo, and Save product. Product saves are immediately
   public and independent of website publication.
3. Open Delivery settings. Use preparation 20 minutes, assumed speed 20 mph,
   and a zone for ZIP 10001, approximate distance 4 miles, and fee $3.00. Save.
   These are approximate zone distances; the demo does not geocode addresses.
4. Open the public website and choose Shop available products. As a signed-out
   customer, add two loaves and reload to confirm the cart persists. Fill the
   delivery form, request an estimate for 10001, and verify $13.00 total and
   32-47 minutes after checkout. Unsupported ZIP codes prevent checkout.
5. Simulate declined payment: the cart remains and stock stays at 3. Change to
   successful payment and submit: stock becomes 1 and a private tracking link
   shows Received and an order number. Copy the number, reopen Order status
   from the public bakery website or shop, and enter it in the search bar.
   Check order status shows the same items, quantities, total, and progress
   without sign-in. Keep the number and link private; either authorizes only
   receipt/progress. Orders placed before number lookup keep their private links.
6. In the owner's Customer orders page, mark Working on it, then On the way
   for delivery. The customer's tracking page refreshes every 15 seconds while
   visible or when Refresh order status is pressed. Owner details include the
   customer's delivery address; public tracking does not.
7. For Salon or Barbershop, complete the existing booking drill with active CRM
   access. Refresh the owner's dashboard and confirm the new booking appears
   under Upcoming appointments and links to its calendar month.

With the isolated app, Azurite, and Chromium configured as above, automate the
bakery drill using `pnpm exec node tests/browser/bakery-orders.mjs`. Screenshots
are saved under `artifacts/bakery-orders/`. It creates fictional data only on the
chosen local instance and covers owner forms, image decoding, cart reload,
unsupported ZIPs, declined/successful checkout, status changes, signed-out
tracking, stock feedback, keyboard checkout, and 390px/1440px layouts. Run
`tests/browser/showcase-completion.mjs` for public booking and owner visibility.
