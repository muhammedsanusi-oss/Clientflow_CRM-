# Visual website editor verification

Implemented behavior: `docs/specs/businesses/website-editing.md`.

## Passing checks

- `pnpm prisma:generate`, `pnpm typecheck`, and `pnpm build`.
- Domain tests: 132 passed, including HEX/picker validation and structured text.
- Renderer tests: all four templates expose the seven custom roles and keep
  legacy defaults unchanged.
- Populated website migration preservation test.
- Chromium browser drill against the running local app: developer and owner
  controls, short HEX/Enter, malformed HEX blocking, native picker synchronization,
  brightness through black and back, live computed CSS, saved draft swatches,
  wheel selection, undo, confirmed reset, contrast warnings, mobile overflow and
  ordering, and discarding edits on refresh. All seven roles were checked with
  computed styles in all four templates. No website was published by this drill.
- HTTP checks: both roles can load the shared editor; the existing public
  sample website remains available.
- `git diff --check`.

## Existing repository test blocker

`pnpm test` fails because the existing untracked
`packages/db/prisma/migrations/0003_business_services.sql` adds the Service
business column already introduced by `0002_business_tenancy.sql`. This file
predates the color implementation and was not edited or removed.

To verify the feature independently, a temporary source copy excluded that file
and reused installed dependencies. In that copy, all 169 integration tests and
all 12 database migration-contract tests passed, including schema comparison,
owner/developer publication, isolation, revision snapshots, version conflicts,
and rollback. This does not mean the full test command passes in the original
checkout.

The color and inline-editing migrations are applied to the local development
database. The live editor opens from Edit website. Hover over any section and
choose Click to edit; there is no separate Design/section inspector anymore.

## Inline text and section editing

- Domain tests: 132 passed, including structured runs, selection splitting,
  safe font/mark allowlists, limits, field consistency, and byte-size validation.
- Renderer tests: 6 passed, including escaped rich text and public pages without
  editor controls.
- Browser drill: `pnpm exec node tests/browser/website-inline-editing.mjs` with
  an isolated browser on port 9391. Both developer and owner passed inline
  typing, substring-only formatting, font changes, text HEX, independent section
  backgrounds, undo, invalid HEX blocking, mobile picker fit, and refresh discard.
- All 169 integration tests passed across the isolated run and its rerun of the
  updated subscription fixture. All 12 database migration tests passed in the
  temporary source copy without the pre-existing duplicate migration.
- The original checkout's full test command remains blocked by the same
  duplicate migration described above; that file was left intact.

## Size dropdown and scrolling refinement

- Domain tests: 139 passed, including acceptance of sizes 8-11 and rejection
  outside the supported range. Toolbar renderer tests: 6 passed.
- Browser checks passed for both roles: size presets, live 96px text, expanding
  sections, nonoverlapping lines, and unchanged toolbar/picker document positions
  after scrolling. Large text wrapped without horizontal overflow in all four
  templates at desktop and mobile widths.
- Unformatted template text retains its original line height; custom sizes use
  proportional line height in the shared preview/public renderer.

## Border colors

Superseded by the removal below.

- Domain tests: 140 passed. Renderer tests: 10 passed, including all four
  templates, section/text borders, and a single outer CTA border.
- Developer and owner browser checks passed for live border colors, resetting,
  preservation while typing and changing backgrounds, and mobile wrapping.
- Publication and rendering suites: 20 tests passed in a temporary source copy
  excluding the existing duplicate migration; the original migration is intact.
- Typecheck and production build passed. The full test command still fails on
  the existing duplicate Service.business_id migration described above.

## Editing outline removal

- Removed the colored section hover/selection outline and the added border
  controls. Stored border overrides no longer render; template borders remain.
- Both roles passed the browser drill, including absence of the section outline,
  working inline editing, live colors, large text wrapping, and stationary tools.
- All 10 renderer tests, typecheck, and production build passed. The full-suite
  duplicate migration blocker above remains unchanged.

## Page background control

- The inline toolbar exposes the saved page color through the shared wheel/HEX
  picker. Side gutters and the preview notice use this page background.
- Both roles passed live canvas/notice/section color checks and the existing
  editing browser drill. All 10 renderer tests, typecheck, and build passed.
- This uses the existing page-color persistence contract; no migration or
  dependency was added. The full-suite migration blocker remains unchanged.
