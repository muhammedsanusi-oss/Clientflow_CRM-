---
type: feature
---
# Employees can search and edit their business's customers

## Why

Employees need to find a returning customer quickly and keep their contact information accurate without creating duplicate profiles.

## Where it lives

- `apps/web/app/customers/page.tsx` renders search and its results.
- `apps/web/app/customers/business-selector.tsx` selects the business being searched.
- `apps/web/app/customers/[customerId]/page.tsx` links to editing.
- `apps/web/app/customers/[customerId]/edit/` contains the edit page, form, loading/error UI, and Server Action.
- `packages/domain/src/customers.ts` owns search validation and scoped search/update operations.
- `packages/domain/src/index.ts` exports the domain contracts.
- `tests/integration/customer-search-edit.test.ts` verifies search, updates, validation, and tenant isolation.

## Behavior

- `/customers` offers a labeled search field and Search button. GET submissions store the query in `q` and preserve the selected `businessId`.
- The query is trimmed and limited to 100 characters. Invalid query values show an accessible validation message without executing a customer search.
- Search matches case-insensitive substrings of first name, last name, email, or the stored phone number. Whitespace-separated terms must each match at least one of those fields, allowing a full name to match across name fields.
- A blank query lists the selected business's customers in last-name, first-name, then ID order. Search uses the same ordering.
- Search is performed in the database and scoped to an active membership of the session-derived user. Foreign and unknown business selections return 404.
- No matching results show a clear-search action that retains the selected business. Switching businesses clears the search.
- Customer profiles offer an Edit customer link to `/customers/[customerId]/edit`.
- The edit form is prefilled with first name, last name, phone number, email, address, and preferred contact method. It offers Save changes and Cancel actions.
- The server derives identity before reading or writing customer data. Signed-out page visits and submissions redirect to `/login`.
- Unknown customers and customers outside the user's active business memberships have identical not-found behavior on both reads and submissions, including after membership is deactivated.
- Updates reuse customer creation's strict field validation and limits. The customer ID is a lookup key only; neither user nor business ownership can be changed by the form.
- All six editable fields are saved atomically on the existing customer. Its ID, business, notes, appointments, tasks, and interactions remain attached to the same record.
- Invalid fields show field errors and preserve submitted values without changing the record. A duplicate email or phone within the business shows a safe conflict message and changes nothing. Keeping the customer's current email and phone succeeds.
- The same contact values in an unrelated business do not prevent saving. Unexpected failures are logged server-side and expose only a safe error message.
- Save has an accessible pending state and prevents duplicate submissions. Success revalidates the list and profile and redirects to the profile. Cancel returns to the profile without writing.
- Errors follow `docs/specs/web.md`, using `{ error: { code, message } }`; form field errors may accompany the standard error.

## Examples

| State / input | Behavior |
|---|---|
| Search `MARIA` in a business containing Maria Lopez | Maria appears regardless of name capitalization |
| Search `Maria Lopez` | Each term matches a name field on the same customer |
| Search a stored email fragment or phone suffix | Only matching customers in the selected business appear |
| Search whitespace only | Lists the selected business's customers |
| Query exceeds 100 characters or repeats `q` | Shows a validation message without searching |
| No customer matches | Shows no matches and a clear-search action |
| Save a corrected phone number | Profile and list show the new number; existing notes remain attached |
| Save without changing email or phone | Succeeds without a duplicate conflict |
| Another customer in the same business owns the submitted email | Shows a conflict and preserves the original record |
| Submitted name is blank | Shows a field error and writes nothing |
| Customer ID is foreign or unknown, or membership is inactive | Not found; no record is changed |
| User cancels an edit | Returns to the profile without saving |

## Verify

- Run `pnpm test`, `pnpm typecheck`, and `pnpm build`.
- Against a disposable local app, run `node tests/http/customer-search-edit.mjs` to exercise rendered search pages and HTML Server Action submissions. Set `API_BASE_URL` when using another port.
- Integration tests verify case-insensitive search, full-name tokens, phone/email fragments, blank queries, no matches, ordering, invalid queries, and isolation between businesses.
- Integration tests verify persisted updates, unchanged contact values, validation failures, duplicate conflicts with no partial update, inactive membership rejection, and indistinguishable unknown/foreign IDs. Check that related notes and appointments retain their customer ID.
- Using only the keyboard, select a business, search by name and phone suffix, clear the search, open a profile, edit its contact details, and save. Confirm the profile and list reflect the change.
- Submit an invalid email and a same-business duplicate; confirm useful errors, retained input, and unchanged saved values.
- Cancel an edit and confirm no saved values change. Sign out and confirm list/edit pages redirect to login.

## Constraints & decisions

- Business remains the tenant boundary described by `docs/adr/0012-business-tenant-boundary.md`; authorization uses active membership, never a trusted client-supplied owner.
- Validation and queries stay in `packages/domain` per `docs/adr/0009-domain-web-only.md`.
- This slice uses existing schema fields and dependencies; no migration or new dependency is required.
- Search matches stored phone text without adding phone normalization or fuzzy matching; formatting-independent matching requires a separate contract.
- The existing JSON APIs retain their current contracts; this feature uses server-rendered pages and a Server Action.
- Concurrent edits use last successful save wins; conflict detection and edit history require separate design.

## Out of scope

- Pagination, fuzzy search, CSV import/export, and bulk editing; no dedicated specifications exist yet.
- Customer deletion, ownership transfer, and audit history; no dedicated specifications exist yet.
- Editing notes or appointments, which are governed separately by `customer-notes.md` and `../appointments/customer-calendar.md`.
- Production authentication, governed by `../auth.md`.
