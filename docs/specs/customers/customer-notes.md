---
type: feature
---
# Employees can read and add notes on a customer

## Why

Employees need a shared, durable record of customer context so that another employee can continue the relationship without losing prior comments or observations.

## Where it lives

- `apps/web/app/customers/page.tsx` - links each customer to their detail page.
- `apps/web/app/customers/[customerId]/page.tsx` - renders the customer and their notes.
- `apps/web/app/customers/[customerId]/actions.ts` - handles note creation.
- `apps/web/app/customers/[customerId]/note-form.tsx` - provides the add-note form and accessible pending and error states.
- `apps/web/app/customers/[customerId]/loading.tsx` - renders the loading state for customer details and notes.
- `apps/web/app/customers/[customerId]/not-found.tsx` - renders the indistinguishable unknown-or-foreign state.
- `packages/domain/src/customers.ts` - owns note validation and business-scoped customer and note operations.
- `packages/domain/src/index.ts` - exports the domain functions and schema.
- `tests/integration/customer-notes.test.ts` - verifies note validation, authorship, ordering, and tenant isolation.

## Behavior

- Each customer in `/customers` links to `/customers/[customerId]`.
- The customer detail page shows the customer's contact details and all saved notes, newest first.
- Each note shows its content, creation date and time, and the first and last name of the employee who wrote it.
- Saving a note records the current employee as the employee who spoke with the customer; that employee ID is derived on the server and stored with the note.
- Note content preserves line breaks when displayed.
- When no notes exist, the page states that no notes have been added and still presents the add-note form.
- An active employee can view and add notes for any customer belonging to the employee's business.
- The server derives the current employee and business from the current user; the client cannot select a note author or business.
- Customer lookup and note creation scope the route's customer ID to the current employee's business.
- An unknown customer, a customer in another business, or a user without an active employee relationship receives the same not-found result.
- Note content is trimmed, required, and limited to 2,000 characters through shared Zod validation before any database write.
- Invalid note content returns a field error, keeps the submitted content, and creates no note.
- A valid submission creates exactly one note linked to the customer and current employee, then revalidates the customer detail page.
- The form prevents duplicate submissions and announces pending and error states accessibly.
- Raw database errors never reach the client.

## Examples

| State / input | Behavior |
|---|---|
| Active employee submits `Prefers morning calls` for a customer in their business | One note is created under that customer with the employee as author |
| Another active employee in the same business opens the customer | The employee can read the saved note and add another |
| Notes were written at 9:00 and 10:00 | The 10:00 note appears first |
| Content is blank after trimming | A field error is shown and nothing is written |
| Content exceeds 2,000 characters | A field error is shown and nothing is written |
| Employee opens an unknown or another business's customer ID | The page returns not found and reveals no customer data |
| Employee posts a note to another business's customer ID | Nothing is written and the action returns not found |
| User has no active employee relationship | No customer or note data is exposed and nothing is written |

## Verify

- Run `pnpm test`.
- Run `pnpm typecheck`.
- Run `pnpm build`.
- Verify an active employee can open a customer, add a note, and see the author and timestamp.
- Verify a second active employee in the same business can read the first employee's note and add another.
- Verify notes display newest first and preserve line breaks.
- Verify blank and over-2,000-character submissions create no rows.
- Verify unknown and foreign customer IDs have indistinguishable not-found behavior for both reads and writes.
- Complete the detail page and add-note form using only the keyboard.

## Constraints & decisions

- Business is the tenant boundary defined by `docs/adr/0012-business-tenant-boundary.md`; "taking the case" means being an active employee in the same business because the system has no individual customer assignment model.
- Notes are append-only in this feature so prior employee context is not silently rewritten; editing and deletion require separate behavior.
- The existing `Note` relation stores the customer, author, content, and creation time, so this feature requires no database migration.
- Ownership, authorship, and active status are derived and checked on the server.
- Validation and database operations live in `packages/domain` per `docs/adr/0009-domain-web-only.md`.
- Errors and foreign-resource handling follow `docs/specs/web.md`.

## Out of scope

- Editing or deleting notes.
- Private notes visible to only one employee.
- Assigning a customer to a particular employee or tracking case ownership.
- Note attachments, mentions, notifications, or rich-text formatting.
- Customer editing or deletion.
