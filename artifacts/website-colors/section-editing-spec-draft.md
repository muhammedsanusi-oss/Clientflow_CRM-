# Click a website section to edit text and appearance — review draft

Approved design reference. The implemented contract lives in
`docs/specs/businesses/website-editing.md`. The separate Edit website/Design
inspector is removed; editing controls live on the selected section.

## Why

Business owners and developers edit the part of a website they are looking at,
with familiar word-processor controls, without searching for a separate panel
or accidentally restyling the entire website.

## Where it lives

- `apps/web/app/businesses/[id]/website/`: shared editor and contextual toolbar.
- `apps/web/components/business-sites/`: editable preview and published renderer.
- `packages/domain/src/website-content.ts`, `website-editing.ts`, `websites.ts`:
  structured text, section appearance, validation, authorized publication.
- `packages/db/prisma/`: append-only storage changes and revision compatibility.
- Domain, integration, and browser tests for formatting and section isolation.
- `docs/specs/businesses/website-editing.md`: canonical behavior after approval.

## Behavior

### Find the editor and select a section

- Both roles use the same editing experience. Developers enter from their
  dashboard's Edit website action or business detail; owners enter from their
  website workspace. No project recreation or account recreation is required.
- Hovering an editable section highlights it and reveals Edit section. Clicking
  the section, its text, or that control selects the section and opens its toolbar
  directly at the top of the selected section. The selection remains visible
  while interacting with the toolbar. Merely hovering does not open or hide it.
- Clicking an editable text field focuses that field for in-place editing and
  targets its text controls. Clicking an otherwise empty section area selects
  its primary text field and exposes the section background control.
- Each fixed section and each additional custom section is independently
  selectable. Clicking a different section moves the toolbar and loads its
  settings; previous unsaved edits stay in the current draft.
- The toolbar stays within the preview, wraps at narrow widths, and avoids the
  fixed subscription/sign-out controls. Tapping replaces hover on touch screens.
  Keyboard users can focus a section and press Enter to select it, then reach
  labeled text fields and toolbar controls through normal keyboard navigation.

### Edit text like a word processor

- The toolbar exposes font family, size, bold, italic, underline, alignment,
  text color, and section background color. The initial font allowlist is Arial,
  Verdana, Trebuchet MS, Georgia, Times New Roman, and Courier New, with system
  fallbacks. Text sizes range from 12 to 96 CSS pixels.
- With text selected, font, size, emphasis, and text color apply only to that
  selection within one text field. Without a selection, these controls apply
  to the focused text field. Alignment applies to that field as a block.
- Heading and body text remain separate fields; changing a heading never
  silently formats its description. Plain-text limits from the existing spec
  continue to apply. Contact email/phone fields remain validated plain text.
- Pasting content retains its text and line breaks, stripping scripts, external
  styles, HTML attributes, embedded objects, and unsupported formatting. Links
  and buttons keep their existing destinations and behavior.
- Text and section colors reuse the full wheel/native-picker/HEX controls.
  Valid `#RGB`/`#RRGGBB`, optionally without `#`, normalize to uppercase
  `#RRGGBB`. Invalid values stay in the field, leave the last valid preview
  intact, and block publication until corrected.

### Change only the selected section

- Section background changes the selected section's background without changing
  neighboring sections, the site-wide palette, or the CRM workspace theme.
- Section-specific styles take precedence over website-wide defaults. Unset
  properties inherit existing website/template settings. Existing websites
  retain their current appearance until an explicit edit is published.
- Readability warnings compare actual configured text colors with the selected
  section background. Low contrast warns without blocking valid colors;
  image-backed text still requires visual review.
- Undo restores the preceding draft edit; Reset section asks for confirmation
  and restores only that section to the version loaded when the editor opened.
  Other sections' draft edits remain intact.

### Preview and publish

- All edits update the live preview; no toolbar action publishes automatically.
  Save and publish uses the existing explicit publication control. Cancel or
  refresh discards unsaved edits under the existing editor behavior.
- The server validates a bounded structured document of plain text plus allowed
  formatting marks and section styles. It never accepts executable HTML/CSS.
  Each text field is limited to 256 formatting runs and the total publication
  body to 128 KiB; text-length and additional-section limits still apply.
- Publication rechecks developer grants or active owner membership/access and
  writes content, formatting, section colors, version, and before/after revision
  snapshots in one transaction. Failure writes nothing. Stale versions return
  CONFLICT while preserving the current draft for review.
- Signed-out visitors redirect to login. Foreign, unknown, inactive, and
  ungranted business access returns 404; API errors retain the standard envelope.
  Public websites render saved formatting without editable controls.

## Examples

| State / input | Behavior |
|---|---|
| Developer clicks the Hero section in the example | Hero is outlined; its toolbar appears in that section |
| Owner selects three headline words and chooses Georgia/bold | Only those words change |
| Owner changes Hero background to `#E8EDDF` | Hero changes; About and Contact stay unchanged |
| Developer clicks About after editing Hero | About controls open; unsaved Hero edits remain |
| User enters `#12ZZ99` | Inline error; last valid preview remains; no publication |
| User pastes text containing a script | Script does not execute; only permitted text is retained |
| Two editors publish from the same version | One succeeds; the other gets CONFLICT |
| A developer without access requests the editor | 404; no content or formatting is written |

## Verify

- Run `pnpm test`, `pnpm typecheck`, and `pnpm build`.
- Test structured-text limits, font/style allowlists, HTML/script rejection,
  color normalization, legacy fallback, and plain-text length validation.
- Test owner/developer publication, foreign-business denial, history snapshots,
  transactional rollback, concurrent versions, and public renderer isolation.
- In every template and both roles, select fixed/custom sections, type text,
  select a substring, apply each toolbar control, switch sections, undo/reset,
  and verify only the intended field/section changes.
- Cancel/reopen and publish/refresh to distinguish draft from public appearance.
- Complete a keyboard-only pass and touch/mobile pass; verify toolbar wrapping,
  focus/selection preservation, contrast warnings, and no fixed-header overlap.

## Constraints & decisions

This extends the existing shared editor, publication boundary, and renderer.
Structured text stores allowed formatting instead of arbitrary HTML. No new
dependency is approved by this draft; an editor library, if needed, must be
named with its reason before implementation. Saved site-wide colors remain the
default styling layer; the standalone Colors/Design panel is removed.

The accompanying interactive preview illustrates the proposed interaction; it
does not change a running website, save project data, or establish permissions.

## Out of scope

Dragging/resizing layouts, arbitrary HTML/CSS, uploading fonts, animations,
collaborative cursors, automatic publication, template changes for owners,
CRM workspace recoloring, and changes to business access or subscriptions.
