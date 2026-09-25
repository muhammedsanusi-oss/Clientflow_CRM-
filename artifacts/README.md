# ClientFlow CRM API route priorities

Recommended API routes, ordered by implementation priority. Start with the
customer endpoints: they support the core business-scoped customer workflow
and build on the existing customer domain logic. Appointment routes come later,
when appointment behavior is ready.

| Priority | Route | Purpose |
|---|---|---|
| 1 | `GET /api/customers` | List the signed-in employee’s business customers. Add basic `?search=` support once the plain list works. |
| 2 | `POST /api/customers` | Create a customer using shared validation. Derive business ownership on the server; never accept it from the request. |
| 3 | `GET /api/customers/[customerId]` | Fetch one customer; return 404 if it is missing or belongs to another business. |
| 4 | `GET /api/locations` | List the current business’s locations as groundwork for branch-aware workflows. |
| 5 | `GET /api/appointments?date=YYYY-MM-DD` | List a business’s appointments for a date, once appointment behavior is ready. |
| 6 | `POST /api/appointments` | Create an appointment associated with a customer, employee, and location; validate that all belong to the same business. |
| 7 | `GET /api/dashboard/summary` | Return a small business-scoped overview, such as today’s appointments and customer count. |

## API conventions

- Reuse shared domain schemas and queries instead of duplicating validation or
  tenant-scoping logic.
- Derive the business from the signed-in user and their active employee
  relationship; never trust a business ID supplied by the client.
- Scope every lookup to that business. Missing and foreign resources both
  return 404.
- Use the API error shape documented in `docs/specs/web.md`:
  `{ error: { code, message } }`.
- Add tests showing that one business cannot read another business’s customers.
