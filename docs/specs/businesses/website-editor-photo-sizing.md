---
type: feature
---
# Owners style their website with a polished editor and adjustable photo sizes

## Why

Business owners need an inviting, easy-to-scan website editor with photo controls
that feel like a finished product. They choose how large each photo appears,
see the result immediately, and publish the same appearance for visitors.

## Where it lives

- `apps/web/app/businesses/[id]/website/`: editor header, publishing toolbar,
  product-photo panel, image-size controls, and draft updates.
- `apps/web/components/business-sites/`: shared preview and published gallery
  rendering across all four templates.
- `packages/domain/src/website-content.ts`, `website-editing.ts`, and
  `websites.ts`: defaults, validated photo presentation, authorized publication,
  and public content projection.
- `packages/db/prisma/`: persisted photo presentation and revision snapshots;
  any necessary database migration is append-only.
- `tests/integration/`, `tests/browser/`, and
  `docs/runbooks/project-walkthrough.md`: persistence and visual verification.

## Behavior

### Editor and product-photo presentation

- The editor uses a coordinated soft neutral surface, subtle violet accents,
  rounded cards, restrained shadows, compact typography, and clear spacing.
  Styling is scoped to the editor so each public template retains its theme.
- The header identifies the business and presents Edit website with concise
  guidance. A compact publishing card groups the draft-status badge, primary
  Save and publish action, Cancel, and Open published website.
- Product photos presents a clear title, concise placement guidance, and a
  photo-allowance badge. Capped plans also show a usage meter and remaining
  count; uncapped legacy sites display a count without inventing a maximum.
- An upload card combines the destination selector with a clearly styled file
  picker and JPEG, PNG, WebP / 5 MB guidance. Its empty state includes a simple
  decorative illustration and an explicit first-upload action.
- Uploaded photos appear in tidy cards grouped by destination. Each card
  contains its preview, size control, and existing move, reorder, and remove
  actions, with descriptive labels and visible keyboard focus.
- Controls wrap within a 390px viewport and remain usable at enlarged text
  sizes. Pending operations, quota warnings, and failures retain visible text;
  decorative artwork is hidden from assistive technology.

### Photo-size selection

- Owners and authorized developers choose a display size for each product
  photo using Small, Medium, and Large presets plus a labeled width slider.
  Presets correspond to 33%, 66%, and 100% of the photo's gallery slot; the
  slider permits whole-number percentages from 25% through 100%.
- A visible percentage describes the current choice. The setting changes the
  displayed photo within its existing gallery slot and never changes the
  original uploaded file or consumes another photo allowance.
- Explicitly sized photos keep their original proportions, remain centered in
  their slot, and fit the available space without horizontal overflow. Images
  with no saved size retain their existing template appearance.
- Size changes update the live website preview immediately and mark the draft
  unpublished. Save and publish persists them with the other content and its
  transactional revision. The published site changes only after success.
- The saved setting follows the uploaded photo when it is moved or reordered.
  Removing a placement continues to retain its uploaded file. Size changes do
  not bypass placement limits, subscription limits, or ownership validation.
- Reopening the editor and reloading the signed-out website retain the saved
  dimensions. Failed or stale publication preserves the current draft.
- Server validation rejects non-integers, percentages outside 25–100, unknown
  presentation fields, and foreign or arbitrary image references without
  changing published content.

### Product names and prices

- Every photo card offers an optional Product name (up to 120 trimmed
  characters) and Price (USD). A price requires a product name, accepts at
  most two decimal places, and ranges from $0.01 to $10,000. Empty fields
  leave ordinary decorative photos without a product caption.
- Name and price appear below the photo in the live preview and publish with
  the website in the same revision as size changes. Names also describe the
  image to screen readers. Moving or reordering a photo retains its details.
- These captions work on every template. Bakery inventory and purchasable
  products remain governed by `bakery-orders.md`; a Manage shop products link
  takes owners to their existing catalog for stock and checkout configuration.

### Access

- The existing owner-membership and explicit developer-grant rules apply.
  Signed-out editor requests redirect to login; foreign and unknown businesses
  return 404. Client-supplied user IDs or plan claims never authorize changes.
- Editing remains available regardless of subscription state. Photo counts,
  upload validation, file retention, and image delivery remain governed by
  `product-photos.md`; publication remains governed by `website-editing.md`.

## Examples

| State / input | Behavior |
|---|---|
| Owner opens an editor with no photos | Styled empty state explains destination selection and first upload |
| Standard owner uses 7 of 10 photos | Allowance badge and meter show 7 used and 3 remaining |
| Owner selects Small for a photo | Live preview displays it at 33% of its gallery slot and shows unpublished changes |
| Owner adjusts width to 80% and publishes | Reloaded editor and public website retain 80% with original proportions |
| Owner moves a resized photo from Offerings to About | The photo keeps its saved width |
| Existing website has no size metadata | Its current photo appearance is preserved |
| Publication submits a width of 0, 101, or 42.5 | Rejected; published content remains unchanged |
| Owner submits another business's photo reference | Rejected without reading or changing foreign content |
| Another editor publishes first | Stale publication fails and the current sizing draft remains available |

## Verify

- Run `pnpm test`, `pnpm typecheck`, and `pnpm build`.
- Integration tests verify valid and invalid sizes, unchanged legacy defaults,
  authorized publication, tenant isolation, persisted revision content, and
  saved sizes after movement and reordering.
- On an isolated development instance, open both editor panels at 1440px and
  390px; inspect empty, populated, at-limit, pending, and failed-upload states.
- Upload a real rectangular image. Use every preset and keyboard slider
  controls; measure rendered dimensions in the live preview and verify the
  selected width and original proportions.
- Publish, reopen the editor, and reload the signed-out public site. Verify
  the size persists across all four templates and standard/custom galleries.
- Move and reorder the photo, publish again, and confirm its size follows it.
  Confirm upload counts remain unchanged and existing unsized photos retain
  their appearance. Exercise stale publication and verify draft retention.
- Update the project walkthrough with the photo-sizing drill, and confirm the
  ordinary development app remains usable after isolated verification.

## Constraints & decisions

- In this editor, customers means business owners managing their websites.
  Public visitors view the chosen sizes; they do not edit website content.
- Size is relative to the existing gallery slot, preserving the established
  section layouts while allowing each photograph to be visually emphasized.
- Presentation metadata is separate from image bytes. Existing records use
  backward-compatible defaults; stored images and credentials are preserved.
- The visual refresh uses existing local components, CSS, and simple inline
  vector decoration. No dependency or external service is added.

## Out of scope

- Image cropping, filters, arbitrary drag placement, changing file resolution,
  and public visitor uploads.
- Resizing the dedicated logo/hero layout, changing bakery catalog-card sizes,
  or restyling other admin pages.
- Changes to subscriptions, image quotas, ecommerce behavior, and publication
  access; their existing specs continue to govern them.
