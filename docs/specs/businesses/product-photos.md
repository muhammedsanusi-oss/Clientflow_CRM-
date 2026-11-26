---
type: feature
---
# Owners place product photos on their business website within their subscription allowance

## Why

Business owners show their products on their public website without asking a
developer to place each photo. They see their allowance, choose a website
section, arrange photos, preview the result, and publish when ready.

## Where it lives

- `apps/web/app/businesses/[id]/website/`: shared editor, photo manager,
  destination selection, previews, and publication feedback.
- `apps/web/components/business-sites/`: existing published section galleries.
- `apps/web/app/api/sites/[businessId]/images/[slot]/`: existing protected upload route.
- `packages/domain/src/website-plans.ts` and `subscription-access.ts`: shared
  image allowance resolution from server-owned plans.
- `packages/domain/src/websites.ts`: authorized upload/publication checks and
  business-owned image references that can be placed in different sections.
- `packages/domain/src/website-content.ts`: existing section image arrays.
- `tests/integration/` and `tests/browser/`: allowance, isolation, and real upload/placement checks.
- `docs/specs/businesses/website-editing.md`, `demo-subscriptions.md`, and
  `docs/runbooks/project-walkthrough.md`: related contracts and demo instructions.

## Behavior

### Owner entry and image allowance

- Edit website offers a clearly labeled Product photos panel without requiring
  the owner to discover the existing Section options & images disclosure.
  Existing section-specific upload controls remain available.
- The panel shows the distinct photos used across the entire website, the
  applicable maximum, and remaining allowance. Product photos share the same
  total with logos, hero photos, and other website images; there is no second
  allowance that can bypass the website maximum.
- For an enrolled business, the current server-owned subscription selects the
  image allowance: Standard website permits 10, Website + standard CRM permits
  20, and Managed service permits 50. A successful simulated plan change is
  reflected when the editor is reopened. Owners can upload within the allowance
  and publish in every subscription state, including pending, canceled, past
  due, and expired; an active owner membership and regular session are required.
- Legacy businesses without a subscription retain their stored website-plan
  allowance: FREE 10, PLUS 20, PREMIUM 50. Businesses without either plan retain
  the existing uncapped site total and the per-section maximum.
- The existing maximum of 10 images per section applies to every plan. Custom
  section creation and feature-request benefits keep their existing separate
  rules; this feature changes image allowances only.
- A downgrade does not delete photos or unpublish the website. When existing
  content exceeds the new allowance, uploads are blocked and the editor explains
  how many photos must be removed before the next publication can succeed.
  Existing published content remains publicly readable.

### Choose placement and publish

- The owner selects a destination before uploading: Header, Hero, Features,
  About, Products & offerings, Contact, or an existing custom section identified
  by its current heading. Footer is excluded because it has no image gallery.
- One file is uploaded at a time using the existing JPEG, PNG, and WebP support
  with a 5 MiB maximum. Existing file-signature, format, same-origin, and session
  checks remain in force. Invalid files and unavailable storage produce useful
  errors without removing the current draft.
- The panel displays thumbnails grouped by destination, with actions to move
  a photo to another available section, move it earlier/later in its gallery,
  or remove its placement. Removing a placement requires confirmation and does
  not delete its stored file.
- Moving a photo changes its placement without reuploading the bytes or
  increasing the distinct-image count. A full destination is rejected without
  removing the source placement. Moving within the same section is a no-op.
  Reordering stays within one gallery and disables unavailable directions.
- Upload, placement, and order changes appear in the live preview as unpublished
  changes. Save and publish uses the existing version check and transactional
  revision history; the public website changes only after successful publication.
- A failed upload or publication preserves other draft content. A stale editor
  cannot overwrite a newer publication. Existing unpublished-change warnings
  also apply to photo placement and ordering.
- Both owners and developers use the same photo controls under the existing
  owner membership and explicit developer-grant rules. No client-supplied owner,
  subscription status, or image allowance authorizes access.

### Access and persistence

- Photo sizing, product-name/price captions, and the editor's presentation are
  governed by `website-editor-photo-sizing.md` and publish with website content.

- Signed-out editor pages redirect to login; signed-out upload APIs return the
  existing 401 envelope. Foreign or unknown businesses and unauthorized users
  return 404 without writes. Existing developer provisioning privileges remain.
- The domain rechecks the current allowance and distinct image count before
  upload and publication. Client-side counters provide feedback only.
- Destination placement uses the existing section arrays. A movable image
  reference must belong to the same business and match a recognized website
  image namespace and generated filename. References to other businesses,
  arbitrary blobs, traversal paths, external URLs, and unknown sections are
  rejected. Old section-specific references remain valid.
- Public image delivery resolves only references present in published content
  for that business, using the current section/index locator. Draft changes and
  arbitrary uploaded files are not made public by a client-supplied blob name.
- The existing upload retention policy remains: an upload is stored before
  publication, and abandoned or removed uploads are retained. This feature
  limits photos placed on a website, not total retained blob storage.

## Examples

| State / input | Behavior |
|---|---|
| Standard website uses 9 photos and owner uploads one to Products & offerings | Draft reaches 10; photo appears publicly after publication |
| Standard website already uses 10 distinct photos | Another upload is rejected; existing photos remain |
| Owner moves a Hero photo to About | Same image count; draft changes section; public placement changes on publication |
| About already contains 10 images | Move is rejected and the original placement remains |
| Owner moves a product photo earlier in its gallery | Preview and subsequent publication use the new order |
| Standard owner simulates a successful upgrade to CRM | Reopened editor offers a 20-image allowance |
| Managed site with 25 photos downgrades to Standard | Published site remains; additions are blocked and owner must reduce to 10 before publishing |
| Owner submits another business's image reference | Rejected; neither business's published content changes |
| Owner uploads an invalid or oversized file | Useful error; no placement is added and current draft remains |
| Two editors publish the same saved version | One publication succeeds; the stale publication fails without overwriting it |

## Verify

- Run `pnpm test`, `pnpm typecheck`, and `pnpm build`.
- Integration tests exercise active Standard/CRM/Managed limits, legacy fallback,
  expired/inactive owner access, downgrade behavior, distinct-image counting,
  per-section limits, and forged client limits.
- Test upload/publication rejection for foreign users and foreign/arbitrary
  image references; verify legitimate same-business movement and legacy images.
- With a disposable development instance and local storage emulator, upload a
  real PNG as an owner, choose Products & offerings, publish, and retrieve the
  public image. Move it to About, reorder a two-photo gallery, republish, and
  verify the public placement/order and image response bytes.
- The browser drill verifies actual image decoding (`naturalWidth` and
  `naturalHeight`), positive layout dimensions, and fixture pixel colors in the
  live website preview and signed-out published pages. Check all four templates
  at 1440px and 390px, reload the public pages, and cover every supported
  destination, including an existing custom section. HTML image tags alone
  do not establish that the images render.
- Verify canceled removal, failed upload, stale publication, and at-limit
  feedback retain the current draft. Verify an upgrade/downgrade changes the
  displayed and server-enforced allowance without deleting published content.
- Exercise destination selection and placement controls with keyboard access
  and at 390px; inspect gallery previews on all four existing templates.
- Use a distinct `CLIENTFLOW_DEV_INSTANCE` for parallel browser verification;
  confirm the ordinary demo's developer login still works afterward.

## Constraints & decisions

- Reuse the existing editor, section galleries, image validation, blob adapter,
  content JSON, and publication history. Photo presentation uses the append-only
  metadata migration described in `website-editor-photo-sizing.md`; no new
  dependency is required. Existing content and credentials are preserved.
- Image allowances follow the current subscription for enrolled businesses so
  a demonstrated plan upgrade actually changes photo capacity. Stored website
  tiers remain the fallback for unenrolled businesses and continue to govern
  unrelated section/feature-request benefits.
- Photos represent website content, not CRM services or ecommerce inventory.
  Choosing a section gives controlled placement supported by every template;
  arbitrary coordinates and a replacement page builder are unnecessary here.
- Moving references must preserve tenant isolation while allowing the original
  upload section to differ from its current presentation section.

## Out of scope

- Product prices, inventory, shopping carts, checkout, ordering, and simulated
  payments are governed separately by `bakery-orders.md`, which reuses published
  photos without increasing this feature's shared image allowance.
- Separate product records, captions/alt-text editing, customer uploads, and
  posting to social media or third-party marketplaces.
- Arbitrary drag placement, image cropping, filters, batch upload, or storage
  garbage collection. Existing website editing owns publication semantics.
- Production hosting, real billing, and changes to plan prices or non-image
  plan benefits. Demo subscription lifecycle remains governed by its own spec.
