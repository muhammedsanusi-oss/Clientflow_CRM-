---
type: feature
---
# Owners and developers customize and publish business websites

## Why

Business owners and authorized developers need to customize a business website
without editing application source code. Both roles can adjust approved content,
visual styles, and images in the portal, preview the result, and explicitly
publish it to the private owner view and public website.

## Where it lives

- `apps/web/app/page.tsx` and `businesses/[id]/page.tsx`: developer editor links.
- `apps/web/app/businesses/[id]/website/`: shared editor, preview, upload, and
  publish actions.
- `apps/web/app/website/`: owner's website view and editor entry point.
- `apps/web/components/owner-workspace.*`: template-themed owner navigation,
  including the in-app published website preview entry.
- `apps/web/app/customers/page.tsx`: owner's Website navigation.
- `apps/web/components/business-sites/`: shared rendering and inert previews.
- `apps/web/app/api/sites/[businessId]/`: public website image delivery.
- `packages/domain/src/`: shared website validation, authorized queries, and
  transactional publication; existing developer grants and owner memberships.
- `packages/services/src/storage.ts`: website image storage through the existing
  Azure Blob/Azurite seam.
- `packages/db/prisma/`: website content and revision models plus a new
  append-only migration.
- `tests/integration/` and `tests/http/`: persistence, authorization, publication,
  and owner visibility verification.
- `docs/specs/businesses/website-templates.md`, `docs/specs/web.md`, `README.md`,
  and `MVP.md`: update with implementation to include website editing.

## Behavior

### Open the right website

- Each configured business card on the developer dashboard offers Edit website
  alongside Open website; the provisioning detail page offers the same actions.
- Edit website opens `/businesses/<id>/website`, showing saved content, a public
  site link, editable controls, and a live unsaved preview.
- The owner workspace's Preview Website action opens the published website
  preview inside Clientflow. It does not expose draft content before publication.
- The owner workspace's public website link opens the published site in a new
  tab. After publication it reflects the newly published content.
- A regular session and an active OWNER membership authorize an owner to read,
  upload images for, and publish changes to that owner's business website.
- A regular session, developer role, and that developer's explicit
  DeveloperBusinessAccess grant authorize a developer to read, upload images
  for, and publish changes to that business website. Developer status alone
  never authorizes an arbitrary business ID.
- Owners and developers can edit the same public content, style settings,
  additional text sections, and image slots. Template selection and restoring
  template defaults remain developer-only.
- Signed-out pages redirect to login. Activation-only sessions, inactive or
  staff-only memberships, and developers without a grant cannot enter the
  editor or publish. Unauthorized, unknown, and unconfigured websites return
  the same not-found result; an API entry uses the standard 401/404 error
  envelope.

### Customize and preview

- The website preview is the editing surface for both owners and developers.
  There is no separate Edit website/Design inspector or section-tab panel.
  Hovering a section highlights it and reveals a real Click to edit button;
  clicking it opens a compact toolbar at the top of that section. The toolbar
  stays open while its controls are used and avoids the fixed session header.
  It stays in normal flow in its section and scrolls out of view with that
  section; neither the toolbar nor an open color picker follows page scrolling.
  Tapping or keyboard focus/Enter provides the same access without hover.
- Text is edited directly in place. Clicking a text field targets it; selecting
  words targets only that range. The toolbar displays the current font, size,
  text color, and section background. Without a range, formatting applies to
  the focused field. Alignment applies to the whole focused field.
- The editor updates section-specific text: the header business name; hero
  introduction, headline, description, and button label; feature labels; about
  heading and text; offering titles; contact details; and up to six additional
  sections. Hero description and about text are independent so editing one
  section does not silently change the other.
- The Word-style toolbar offers Aptos, Arial, Verdana, Trebuchet MS, Georgia,
  Times New Roman, and Courier New with system fallbacks. The Word-style size
  dropdown offers 8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 36, 48, 72,
  and 96 CSS pixels, and displays a saved/template size between those presets.
  It also offers bold, italic, underline, text highlighting, alignment, letter case, and clear
  formatting. Font size is changed through the Size dropdown. Previously saved
  strikethrough/subscript/superscript formatting remains readable, with no toolbar
  buttons for adding it. Formatting is stored as plain text plus allowed marks,
  never executable HTML or CSS.
  Pasting retains plain text/line breaks and discards source formatting and
  embedded content. Existing site-wide typography remains the fallback layer.
- Each field allows at most 256 formatting runs and retains its existing text
  length limit; a publication is limited to 128 KiB. Formatting must match the
  corresponding plain-text field. Contacts retain email/phone validation.
- Section options & images expands inside the selected toolbar for image
  management, feature/offering lists, and custom-section ordering/removal.
  Developer-only template selection stays in a compact separate disclosure.
- It allows up to six additional plain-text sections. Each section has a
  heading of 1-100 characters and body of 1-2,000 characters, can be reordered,
  edited, or removed, and is included in preview and publication. Removing a
  section requires explicit confirmation.
- It allows up to 10 images in each website section, including the header, hero,
  features, about, offerings, contact, and each additional text section. Users
  select the destination by clicking the section in the live preview; each
  section's images appear in upload order. Existing logo and hero references are
  preserved in the header and hero galleries. Uploads accept JPEG, PNG, or WebP
  images up to 5 MB each; SVG,
  animated images, and arbitrary files are rejected. New image uploads are
  scoped to the authorized business. The website image API reads only image
  references configured for the requested business.
- For self-signup businesses with a saved website plan, the editor additionally
  enforces a site-wide cap of 10 images for Free, 20 for Plus, or 50 for Premium.
  It counts distinct references across fixed and additional sections, counting
  the same logo or hero reference only once. The existing limit of 10 images
  within any one section also remains in effect. The upload API and publication
  validation enforce the plan cap; client-side checks are only for feedback.
- Free-plan owners can edit existing sections but cannot add custom sections or
  submit feature requests. Plus and Premium owners can add up to six custom
  sections, matching the existing editor maximum. Businesses without a saved
  plan retain existing editor behavior.
- Plus and Premium owners can submit feature requests from the owner editor.
  Each request has a title and description and is privately associated with
  the business and submitting owner. Developers with an explicit grant to the
  business can review it in the developer portal. Plus allows five requests per
  business; Premium allows any number. Free-plan requests are rejected. There
  is no status, response, support, or feature-implementation workflow, and a
  request does not promise that the feature will be built. See [developer
  notifications](../notifications/developer-notifications.md).
- Plan prices and 24/7 support benefits are demonstrative only. There is no
  payment processing or live support service.
- Removing an image requires an explicit user action and confirmation. Removing
  an image only removes its published reference; it
  does not delete the stored blob. Old blobs are retained and are not silently
  removed.
- Public name is 1-100 characters; description 1-1,000; email valid and at most
  254; phone 7-30; address at most 300; hours at most 500. Public text is trimmed.
- About-section text is independently editable and limited to 1,000 characters.
  Existing about sections initialize from the current business description.
- Eyebrow is 1-100 characters, headline 1-200, about heading 1-160, button label
  1-60, and each feature/offering title 1-100. Empty arrays hide their sections.
  Only Bakery, Barbershop, Salon, and Contact are accepted templates.
- Opening an older site initializes the editor from its current saved business
  information and template defaults. Existing site appearance is preserved
  until publication. Changing a template retains custom text; an explicit
  Use template text action resets only the template headings, feature labels,
  and offering titles after a warning; styles, extra sections, and image
  references remain unchanged.
- The live preview uses the same renderer as the published site and reflects
  unsaved text, style, section, and image changes. It is visibly marked Preview
  and cannot submit a contact inquiry.
- The owner workspace uses the business's saved website template to choose its
  admin colors and exposes appointments, customers, website editing, and the
  published in-app preview. The editor's live draft preview and the read-only
  published preview remain distinct.
- The public site serves only configured images in supported website sections
  for that business through a public website image route; callers cannot request
  an arbitrary blob name or another business's image by changing a URL.
- All content renders as escaped text. The form accepts neither arbitrary HTML,
  JavaScript, CSS, nor client-supplied author or ownership fields.
- Offering titles customize presentation only; they do not create CRM Service
  rows, prices, booking availability, or checkout. Example labels remain marked
  as examples until their titles differ from template defaults; customized offerings are presented as business
  content without fabricated descriptions, prices, or availability claims.
- Cancel leaves without publishing. Refresh discards unsaved edits. No edit is
  visible to the owner or public before Save and publish succeeds.

### Choose exact website colors

- Page background, Text color, Highlight, and Section background open a compact floating picker
  on the selected section, showing its current color. A hue/saturation wheel,
  brightness slider, native picker, and HEX field support all 16,777,216 opaque
  sRGB colors. Both roles use the same picker under the existing access rules.
- Page background changes the whole page canvas, including the side gutters
  and preview notice background. It uses the existing saved page color and
  previews immediately. Section overrides remain independent; setting both to
  the same HEX color produces a continuous background. The preview notice text
  retains the website text color and is absent on the public website.
- Background changes affect only the selected fixed or additional section.
  Text colors affect only the selected words or focused field. Section/field
  overrides take precedence over saved website-wide defaults in all templates;
  other sections and the CRM workspace theme remain unchanged.
- Sections have no colored hover or selected outline. Click to edit remains
  available on hover and keyboard focus. Border color controls are absent;
  previously stored border overrides are ignored by the renderer.
- HEX accepts `#RGB` or `#RRGGBB`, optionally without `#`, and normalizes to
  uppercase `#RRGGBB` on client and server. Short values commit on blur or Enter;
  complete six-digit values preview immediately. Incomplete input stays visible
  without replacing the last valid preview color. Invalid input shows an inline
  error and blocks publication. Enter commits the color instead of publishing.
- Up to 12 reusable swatches are saved per website with publication. Duplicates
  normalize to one swatch. The floating picker offers saved swatches and Save
  swatch. Undo restores the preceding draft edit; one wheel drag is one undo
  step. Reset section asks for confirmation and restores only that section's
  text, formatting, images, and background to its loaded version; draft changes
  to other sections remain intact.
- Contrast checks compare the active text color with the selected section's
  background. Ratios below 4.5:1 warn without prohibiting valid publication.
  Image-backed text and decorative illustration text require visual review.
- Empty overrides/swatches preserve template appearance and saved typography
  colors. Only explicitly changed roles override rendering. Draft changes affect
  the preview until Save and publish; cancel or refresh discards them.
- Colors/swatches use the existing atomic publication/version/history write.
  Server validation rejects malformed values, unknown roles, and over 12
  swatches. Stale publication preserves draft input and returns CONFLICT.
- Controls have labels and keyboard alternatives to wheel dragging. The toolbar
  wraps within the preview on narrow screens and the picker fits the viewport.
- Increasing font size wraps text within its available column and expands line
  boxes and section height. Long words can break as needed; text does not shrink
  automatically, clip, overlap adjacent content, or force horizontal scrolling.
  The same layout rules apply to editor previews and published websites.

### Publish once and see the same result

- Save and publish explicitly states that it updates the live website. The
  server validates the payload and rechecks the owner's active membership or
  the developer role and business grant inside the write transaction.
- Publication atomically updates public business fields and website content,
  style settings, section-specific text, and image references; increments the site's
  version; and appends a revision containing the editor user ID and before/after
  public-content snapshots. Failure writes nothing.
- Owner login identity, credentials, memberships, inquiries, customer records,
  appointment data, and the website URL are not editable through this action.
  Public business name/contact fields remain shared with the business portal,
  so their new values also appear there after publication.
- The submitted version is checked atomically. If another developer publishes
  first, the stale save returns CONFLICT and preserves the form input with a
  reload instruction; it never silently overwrites the newer publication.
- First publication on an uncustomized site uses version zero. Concurrent first
  publications allow one success and return a conflict for the other.
- Successful publication shows a confirmation and Open published website action.
  Relevant developer, owner, and public routes are revalidated. A subsequent
  request or owner refresh displays the published version; an already open page
  does not require a push notification or live synchronization.
- Pending, success, validation, conflict, not-found, and generic server errors
  are announced accessibly. Raw errors, credentials, and stack traces are never
  shown. A failed publish retains unsaved inputs for retry.

### Owner access

- The owner's business portal adds Website, opening
  `/website?businessId=<selected-business>` with the published preview, last
  publication time if available, Open website, and Edit website.
- The private view requires an active OWNER membership in the selected business.
  Unknown, foreign, inactive, and staff-only memberships return 404. Multiple
  businesses use an authorized selector; a URL parameter alone grants nothing.
- Owners can edit and publish the website for the selected business, but cannot
  change its template, owner identity, credentials, memberships, or website URL.
- Website publishing does not charge anyone or create an appointment Payment
  record. Any separately arranged customization fees remain outside this flow.

Subscription-controlled access follows [demo subscriptions](demo-subscriptions.md). Legacy businesses retain existing access.
Owner editing requires active demo access after enrollment. Explicit developer
grants continue to authorize editing; published public content stays readable.

## Examples

| State / input | Behavior |
|---|---|
| Granted developer changes a salon headline and hours, then previews | Only their unsaved preview changes |
| Developer selects Save and publish | Public site and owner's next private view show the new headline and hours |
| Owner opens Website from business A | Shows A's published content and Edit website action |
| Owner changes about text | The about section changes without changing the hero description |
| Owner adds a text section and uploads images to selected sections | Preview shows all changes; publication updates only business A |
| Developer selects a section in the live preview and edits its text | The section's controls open and the preview updates without publishing |
| Owner uploads images to a selected section | The images appear in that section in upload order, up to 10 for that section |
| Owner for A requests B's private Website view | 404 |
| Developer without B's grant submits a publish request for B | 404; no business, content, or revision write |
| Two developers publish from the same version | One succeeds; the other receives CONFLICT without losing unsaved input |
| An owner without active membership uploads an image for a business | 404; no blob or database reference is written |
| Payload contains an unsupported template or HTML author field | Validation rejects unsupported fields; no publication occurs |
| Upload contains SVG or exceeds 5 MB | Validation rejects it; no image reference or blob is written |
| Owner removes a text section and confirms | The published content omits the section; earlier revision remains intact |
| Owner replaces a hero image | The new image is published; the former blob remains stored |
| Text contains `<script>` | Displays as text; no script executes |
| Database write fails after business changes but before revision insert | Entire publication rolls back |
| Developer changes public business email | Public contact information changes; owner login email stays the same |
| Owner enters `f80` for button background and leaves the field | Preview uses `#FF8800`; publication saves it |
| Developer enters `#12ZZ99` | Inline error; publication is blocked |
| Body text and page background both use `#FFFFFF` | Readability warning; publication remains available |
| Developer publishes colors for business A | A's views and history show them; business B is unchanged |

## Verify

- Change Page background in the inline toolbar for both roles. Check that the
  canvas and top preview notice match the chosen HEX while section overrides
  retain their colors. Match section and page values to remove gutter contrast.

- Check that selecting or hovering a section shows no colored section outline,
  that Click to edit still works, and that border controls are absent.

- Run `pnpm prisma:generate`, `pnpm test`, `pnpm typecheck`, and `pnpm build`.
- Replay migrations on a clean database and a populated disposable database;
  verify pre-existing websites keep their URLs, appearance, and inquiries.
- Integration tests cover granted and ungranted developers, developer-role
  revocation, owners, inactive owners, foreign IDs, unknown IDs, and restricted
  activation sessions for editor reads, publication, image uploads, and owner
  private views.
- Verify public responses contain only allowed public content, excluding editor
  IDs, revision snapshots, private owner emails, and credentials.
- Verify transactional rollback, consecutive revision history, concurrent first
  publication, and stale-version conflicts against the database.
- From Developer login, edit a business, change headline/hours/offering titles,
  preview, and cancel; verify neither public nor owner content changes.
- Publish those changes, refresh the public URL, sign in as its owner, and open
  Website; verify the same content and public business fields appear.
- From Owner login, click each website section, edit its text, and upload up to
  10 images in that section; verify the live preview updates before publishing,
  verify the about text and hero description are independent, then publish and
  verify the public and owner views match.
- Verify unauthorized image uploads do not write blobs, public image delivery
  cannot read arbitrary blob names or another business's images, and removing
  or replacing an image reference never deletes stored blobs.
- Verify maximum text-section and per-section image counts, field lengths,
  supported style choices, and rejected invalid image MIME types and oversized
  uploads.
- Provision a second business and prove edits do not change its content. Confirm
  contact submissions still reach only the correct owner's inquiries.
- Complete the editor using only a keyboard, inspect mobile layout, verify field
  labels and error announcements, and confirm preview contact forms are inert.
- Verify an owner can open the published preview in Clientflow and the public
  website in a new tab; draft changes remain private until publication, after
  which both published views show the new content.
- Verify the owner workspace palette matches each saved website template.
- Test HEX normalization, invalid input/roles, 12-swatch limits, duplicates,
  contrast math, and picker conversions. Verify migration on populated content
  preserves previous fields, images, inquiries, credentials, and revisions.
- Verify owner/developer color publication, public/owner readback, before/after
  history, cross-business denial, rollback on history failure, and stale writes.
- In all four templates, change each role, cancel/reopen, publish, and refresh
  the public page. Check wheel/HEX/native-picker synchronization, brightness at
  black/white, partial HEX typing, Enter, swatches, undo/reset, keyboard use,
  mobile reflow, and nonblocking contrast warnings.
- At desktop and mobile widths, apply 96px text with long unbroken words and
  verify line/section growth, wrapping, and no overlap or horizontal overflow in
  every template. Scroll while a toolbar/picker is open and verify its document
  position stays fixed to its section rather than following the viewport.
- Against a disposable development app and an isolated Chromium instance with
  remote debugging on port 9391, run
  `pnpm exec node tests/browser/website-inline-editing.mjs`. The browser drill
  changes unsaved drafts only and exercises both roles, selection formatting,
  font/color changes, section isolation, validation, undo, and mobile layout.

## Constraints & decisions

This behavior builds on the existing website-template renderer, developer
grants, and owner memberships. Website content stores explicit public fields,
style settings, text sections, image references, version, publication timestamp,
and publishing user relation. Append-only BusinessWebsiteRevision records are
scoped to the same business and retain prior published text, styles, sections,
and image references. Existing sites without content records continue using
template defaults. Public content is selected through an explicit allowlist;
revision reads and arbitrary blob reads are not public.

Website history is transactional as required by `AGENTS.md`. Publication checks
authorization in the database transaction; a revoked grant, developer role, or
owner membership cannot be reused from a previously loaded editor. A database
uniqueness constraint covers each business/version pair in revision history.
Uploaded image bytes use the existing Azure Blob/Azurite storage seam; the
database stores only validated references. Public delivery exposes only
configured website image references for a configured business. The new
section-image migration carries existing logo and hero references forward and
adds empty image arrays to existing custom sections without deleting any
stored files or content.

The feature updates the website-template spec's existing exclusion of editing;
it uses the established public-route and developer-grant boundaries from
`docs/specs/auth.md` and `docs/specs/web.md` without broadening private CRM access.
No new dependencies are planned. The approved CRM database cleanup remains a
separate increment; this feature does not depend on completing that restructure.

Colors are a strict optional-role JSON object; swatches are bounded normalized
HEX strings. Empty defaults preserve older content and revisions. Validated
values reach the shared renderer through CSS custom properties. No new
dependencies are required.

## Out of scope

- Automatic billing, pricing, payment approval, invoices, or subscriptions.
- In-app customization requests, quotes, or owner approval queues; publishing
  remains an explicit direct action and does not manage fees.
- Draft persistence, revision rollback UI, drag-and-drop layout builders,
  arbitrary code edits, image deletion/retention management, custom domains, and
  independent hosting.
- Custom layouts beyond the four templates and their supported content fields.
- CRM schema cleanup, staff invitations, or changing appointment services.
- Transparency, gradients, wide-gamut/HDR colors,
  automatic palettes, image recoloring, and CRM workspace recoloring.
