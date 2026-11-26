# Clientflow showcase MVP

## Current scope

The showcase demonstrates a service business website connected to appointments
and customer records. It runs locally with existing development accounts and
simulated subscriptions; its completion bar is a repeatable presenter walkthrough.

1. The website offers Developer and Business owner sign-in, with ready-to-use test accounts for the local project. Developers open the existing Clientflow dashboard.
2. A developer selects Create business and supplies the business name, type, description, contact email/phone, and owner's name and login email.
3. Saving creates the business portal and owner account together. The developer receives a single-use password-setup link and shares it manually.
4. The owner opens the setup link and chooses a private password. Previously issued temporary passwords remain supported through Business owner sign-in.
5. The owner uses their assigned business workspace. Existing customer, notes, and calendar features remain available.

Setup links and compatibility temporary passwords expire after 24 hours and are
consumed once. Developers can regenerate access for a pending owner, but cannot
reset an active owner's password through this screen. Developer grants remain
separate from owner CRM memberships.

See the [implementation spec](docs/specs/businesses/developer-provisioning.md) and [developer setup](docs/runbooks/developer-owner-setup.md).

## Standard website templates

Developers select Bakery, Barbershop, Salon, or Contact during business creation. Each template has a distinct reusable design, sample details, and a preview. Saving creates the public site, owner account, and private workspace together. Visitors can leave messages through the site's contact form; the linked owner reads them in Website inquiries.

## Website customization

Owners and authorized developers use the same inline editor for text, colors,
images, and supported sections. Save and publish records a revision and rejects
stale versions. Unpublished status and refresh/close/link warnings protect the
current draft. See [website editing](docs/specs/businesses/website-editing.md).

Product photos has a destination picker and thumbnail controls for moving,
ordering, and removing placements. Current subscriptions share a site-wide
image allowance of 10 for Standard, 20 for CRM, or 50 for Managed, with a maximum
of 10 per section. Preview changes before publishing; see
[product photos](docs/specs/businesses/product-photos.md).

Owners can edit and publish their own website on every plan and subscription
state, including pending checkout, cancellation, overdue payment, and expiry.
Image allowances still apply; CRM and paid support remain subscription-controlled.

## Booking and customer workflow

CRM-capable owners add a location, configure bookable services and hours, and
optionally set staff availability. The calendar provides a setup checklist.
Ready websites offer public booking; other sites retain their contact action.
A confirmed booking creates or links a customer and appears in the same
business's private calendar. Customers, notes, and search/edit remain available.
See [booking](docs/specs/appointments/customer-booking.md).

Eligible owners also see the next five appointments directly on their dashboard.

## Bakery ordering

Bakery owners maintain priced products, available stock, and photos selected
from their published website. Customers use a cart and simulated payment, with
an approximate arrival estimate based on an owner-configured postal-code zone's
distance, preparation time, and assumed speed. Owners update Received, Working
on it, and On the way for delivery; customers follow progress through a private
tracking link. No card information, real charges, maps account, or live routing
is involved. See [bakery orders](docs/specs/businesses/bakery-orders.md).

## Simulated service plans

Local signup opens demo checkout. Standard website, Website + standard CRM,
and Managed service demonstrate different access levels. Successful payment,
failure, recovery, upgrade, and cancellation are explicit simulations with
transactional history. Managed service includes request fulfillment and tracked
developer minutes. No card information is collected and no money is charged.

## Service boundaries

Creating a business provisions a private workspace inside Clientflow. Its public
site shares the same local application. Production signup, automatic email/SMS,
custom domains, cloud deployments, real billing, staff invitations, and customer
cancellation/rescheduling remain outside the showcase. Local signup deliberately
skips email verification and uses fictional details only.

Existing customer forms and scheduling rules are unchanged. Simplifying customers to first name, last name, phone, and notes can be a separately reviewed change.

## Later SaaS direction

Real paid subscriptions, hosting, recovery operations, and market pricing remain
future decisions. Displayed demo prices do not establish a production offer.
The [presenter walkthrough](docs/runbooks/project-walkthrough.md) describes what
can be shown now; [showcase completion](docs/specs/workspace/showcase-completion.md)
defines the location setup, public readiness, and unpublished-edit controls.
