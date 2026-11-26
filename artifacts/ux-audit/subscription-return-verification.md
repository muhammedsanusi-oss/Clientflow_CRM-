# Subscription return navigation

- The former fixed `/owner` footer link is replaced by a destination for the
  selected business and signed-in role. Developer accounts return to business
  details. Active CRM/Managed owners return to the selected calendar; Standard
  owners return to their website workspace. Inactive owners with a configured
  website can return to its read-only preview without a checkout loop.
- Six targeted navigation/state tests pass. Typecheck and production build pass.
- The browser click drill passes for the developer and owner demo identities.
  The local test business is currently CANCELED, so the owner drill verifies the
  read-only website workspace. Subscription state was not modified.
- The full `pnpm test` attempt retains the existing eight migration failures
  caused by duplicate `Service.business_id`; the migration was not changed.
