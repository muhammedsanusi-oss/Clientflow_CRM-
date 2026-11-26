# Product photo placement verification

## Implemented scope

Owners and granted developers use Edit website > Product photos to choose a
section, upload an image, move it between sections, reorder a gallery, or remove
a placement with confirmation. Draft and published views remain separate.

The current subscription selects the shared image allowance: Standard 10, CRM
20, Managed 50. Legacy businesses retain their stored tier or existing uncapped
site total. Every section still permits at most 10 images. Upload and publication
checks run on the server; no client limit is trusted. Downgrades retain public
content and require reducing an over-limit draft before publishing.

Movement preserves a business-owned upload reference. Publication and public
image delivery accept recognized website upload namespaces for that business,
including legacy logo references, without accepting foreign or arbitrary blobs.
Revision snapshots record before/after image arrays. Public image URLs identify
the photo as well as its position to avoid stale gallery caches after reordering.

## Checks

- `corepack.cmd pnpm test`: passed, 372 tests (167 package + 205 root).
- `corepack.cmd pnpm typecheck`: passed.
- `corepack.cmd pnpm build`: passed.
- `git diff --check`: passed, with existing CRLF-policy notices only.
- Focused subscription/placement tests cover plan caps, legacy fallback,
  foreign access/references, duplicate counting, stale publication, section
  capacity, upgrade/downgrade, expiration, and inactive membership.

Two pre-existing subscription assertions expected the stored Plus tier to keep
a 20-image cap on Standard. They now assert the approved 10-image subscription
cap while retaining the stored section/request benefits. All lifecycle tests
pass with that updated contract.

## Real browser and storage drill

`tests/browser/product-photos.mjs` ran against a disposable PGlite development
instance using `CLIENTFLOW_DEV_INSTANCE=photos`, port 3100, local Azurite, and an
isolated headless Chromium instance on port 9392. Synthetic red/blue PNGs were
uploaded through the actual file input on Bakery, Barbershop, Salon, and Contact.

Verified:

- Uploads remained unavailable through public image routes before publication.
- Published image endpoints returned the exact uploaded bytes on all templates.
- Moving/reordering an existing photo preserved the draft thumbnail and served
  the correct bytes from the new published section/index.
- Invalid-file feedback retained other photos; canceled removal retained its
  placement, and confirmed removal updated the draft.
- Ten real uploads filled Standard's shared allowance; an additional direct
  upload to a different section returned 409.
- A CRM upgrade changed the displayed allowance to 20 and permitted another
  upload; a Standard downgrade displayed the over-limit warning and preserved
  the already published photos.
- Destination selection responded to keyboard controls. The panel and live
  galleries fit at 390px; screenshots of all four template editors were inspected.
- The main port-3000 developer login browser drill still passed after the
  isolated verification and production build.

## Render verification

The expanded browser drill checks decoded images in both the live website
preview and signed-out public pages, rather than relying on HTML tags or HTTP
responses. For each image it asserts completed loading, nonzero natural size,
positive rendered dimensions, and the expected pixel color using a canvas.

Bakery, Barbershop, Salon, and Contact public galleries pass at both 1440px and
390px, retain their correct order, and survive a full browser reload. The drill
also moves a real photo through Header, Hero, Features, About, Products &
offerings, Contact, and a custom section, verifying the actual rendered pixels
after publication. Separate gallery screenshots document desktop/mobile public
output, including moved and reordered photos. No rendering code change was
needed for these additional checks.

Screenshots use generated color fixtures to prove placement and ordering, not
real product photography. No new dependency, schema migration, real billing,
or external image service was introduced. Removed/abandoned uploads remain
stored under the existing retention policy; the allowance limits website image
placements rather than retained storage bytes.
