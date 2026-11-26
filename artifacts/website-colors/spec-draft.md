# Website colors — proposed spec for review

Approved design reference. The canonical behavior lives in
`docs/specs/businesses/website-editing.md`; this file retains the reviewed scope.

## Why

Business owners and authorized developers choose exact brand colors for their
websites, including text, without being limited to a fixed palette.

## Where it lives

- `apps/web/app/businesses/[id]/website/website-editor.tsx`: shared Colors panel.
- `apps/web/components/business-sites/`: preview and published-site rendering.
- `packages/domain/src/website-content.ts` and `website-editing.ts`: validated
  color settings, authorization, and transactional publication.
- Website revision snapshots and an append-only migration if storage requires it.
- Domain and integration tests for colors, compatibility, and publication.

## Behavior

- Authorized developers and business owners have the same color controls,
  subject to existing business grants, memberships, and subscription access.
- The Colors panel offers a hue/saturation wheel, a brightness slider, a native
  color picker, and synchronized HEX input. All 16,777,216 opaque sRGB colors
  are accepted; choices are not restricted to named colors or presets.
- Editable website-wide roles are page background, section background, headings,
  body text, links, button background, and button text. Every template uses the
  same roles; CRM workspace navigation keeps its existing theme.
- HEX input accepts `#RGB` and `#RRGGBB`, optionally without `#`, normalizes
  valid committed values to uppercase `#RRGGBB`, and rejects other input on the
  server. Incomplete typing stays in the field without replacing the last valid
  preview color. Invalid input gives an inline error and blocks publication.
- Colors update the unsaved preview immediately. Only Save and publish updates
  the public site. Cancel or refresh discards draft edits under existing rules.
- Up to 12 reusable color swatches are saved per website with publication;
  duplicate colors are not added. Selecting a swatch updates the chosen role.
- Undo reverses the last draft color change. Reset colors restores the colors
  loaded when this editor was opened, with confirmation when edits would be lost.
  Owners and developers can reset draft colors without resetting template text.
- Text/background contrast is calculated for body text on both backgrounds,
  headings on both backgrounds, links on both backgrounds, and button text on
  buttons. Ratios below 4.5:1 show a warning; any valid color remains selectable
  and publishable. Warnings do not imply certification of image-backed text.
- Existing saved typography colors and template appearances remain intact until
  a custom role is explicitly changed. Unset roles inherit the existing renderer.
- Publication validates all colors, rechecks business authorization, stores
  settings and reusable swatches, increments the version, and appends history in
  one transaction. Stale versions return CONFLICT and preserve draft input.
- Signed-out visitors redirect to login. Foreign, unknown, inactive, and
  ungranted business access returns 404; API errors retain the standard envelope.
- Controls have visible labels and keyboard alternatives. At narrow widths the
  preview stacks below the Colors panel. The wheel has equivalent HEX/native
  controls, so pointer dragging is never required.

## Examples

| State / input | Behavior |
|---|---|
| Owner enters `f80` for button background | Preview uses `#FF8800`; publication saves it |
| Developer selects a wheel color | HEX, native picker, and preview agree |
| User enters `#12ZZ99` | Inline error; no publication |
| Body and page background both use `#FFFFFF` | Contrast warning; user may still publish |
| User changes website A | Website B retains its colors |
| Site predates custom color roles | Existing appearance is preserved |
| Another editor publishes first | Conflict; unsaved color choices remain available |

## Verify

- Run `pnpm test`, `pnpm typecheck`, and `pnpm build`.
- Test HEX parsing, black/white boundaries, malformed input, and normalization.
- Test authorized owner/developer publication, denied cross-business access,
  history rollback, version conflicts, saved swatches, and legacy defaults.
- In each of the four templates, change every role, preview, cancel, reopen,
  publish, and refresh the public page; only publication changes the public site.
- Check wheel/HEX/native-picker synchronization, undo/reset, warning behavior,
  keyboard operation, and mobile layout.

## Constraints & decisions

No new dependencies are planned. Only validated opaque sRGB colors are stored;
arbitrary CSS is rejected. Color controls extend the existing shared editor and
renderer rather than adding separate role-specific implementations.

The accompanying interactive concept demonstrates local preview behavior only;
it does not save a website or model production permissions.

## Out of scope

Transparency, gradients, wide-gamut/HDR colors, per-section overrides, automatic
palette generation, image recoloring, and changes to CRM workspace colors.
Existing content editing and publication are owned by the website-editing spec.
