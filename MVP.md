# Clientflow project MVP

## Current scope

The existing Clientflow dashboard is the private portal for the two project developers. Its design remains in place.

1. The website offers Developer and Business owner sign-in, with ready-to-use test accounts for the local project. Developers open the existing Clientflow dashboard.
2. A developer selects Create business and supplies the business name, type, description, contact email/phone, and owner's name and login email.
3. Saving creates the business portal and owner account together. The developer receives a temporary password shown once and shares it manually.
4. The owner selects Business owner and signs in with the email saved during provisioning and that password, then must choose a permanent password before accessing business data.
5. The owner uses their assigned business workspace. Existing customer, notes, and calendar features remain available.

The temporary password expires after 24 hours and is consumed once. Developers can regenerate a password for a pending owner, but cannot reset an active owner's password through this screen. Developers manage provisioning records separately from owner CRM memberships.

See the [implementation spec](docs/specs/businesses/developer-provisioning.md) and [developer setup](docs/runbooks/developer-owner-setup.md).

## Standard website templates

Developers select Bakery, Barbershop, Salon, or Contact during business creation. Each template has a distinct reusable design, sample details, and a preview. Saving creates the public site, owner account, and private workspace together. Visitors can leave messages through the site's contact form; the linked owner reads them in Website inquiries.

## Website customization

Developers with access to a business select Edit website from its dashboard card or details. They edit supported public information and template content, preview without publishing, then Save and publish. Publication records revision history and rejects stale versions. Owners view the same published content from Website in their portal. Customization is an extra service with a manually agreed quote and payment; the app does not bill for publication. See [website editing](docs/specs/businesses/website-editing.md).

## Service boundaries

Creating a business provisions a private workspace inside Clientflow. Its public template site shares the same application; it does not generate an independent deployment, custom domain, or drag-and-drop theme. Automatic email delivery, public signup, staff invitation flows, and subscription billing remain outside this project increment.

Existing customer forms and scheduling rules are unchanged. Simplifying customers to first name, last name, phone, and notes can be a separately reviewed change.

## Later SaaS direction

Monthly workspace subscriptions and business-specific improvements remain future product ideas. The initial customer segment, pricing, hosting, and subscription behavior are open decisions. Validate those choices with potential users before expanding the project. No billing or hosted launch is implied by the current MVP.
