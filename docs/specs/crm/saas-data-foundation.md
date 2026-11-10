---
type: feature
---
# CRM records share an enforced business boundary

Review draft: this describes the proposed cleanup and database increment, not
capabilities already implemented. It requires human review before implementation.

## Why

Independent subscribing businesses need reliable separation of their customer
records. Clientflow keeps the working CRM and business websites while removing
retired login helpers and making business ownership explicit in related records.

## Where it lives

- `packages/db/prisma/schema.prisma` and a new append-only SQL migration:
  explicit business keys, indexes, and tenant-consistent foreign keys.
- `packages/domain/src/queries/`: shared active-membership checks and writes.
- `packages/domain/src/customers.ts` and `appointments.ts`: existing UI workflows.
- `packages/domain/src/schemas/user.ts`, `queries/users.ts`, and `index.ts`:
  removal of unused username-only login exports.
- `apps/web/app/api/Business/`: existing CRM API contracts and error mapping.
- `apps/migrate/src/seed.ts` and test fixtures: new required business keys.
- `tests/integration/`: migration, direct database, and authorization regressions.
- `docs/specs/crm/api.md`, `docs/specs/businesses/management-api.md`, and
  `packages/db/README.md`: updated descriptions accompanying implementation.

## Behavior

### Keep the product boundary

- Business remains the tenant. User is a login identity; Employee is that user's
  business membership, including its role and active state. One user can belong
  to several businesses.
- Customers, notes, appointments, locations, services, tasks, interactions,
  appointment service lines, and appointment payments remain available through
  their existing workflows and APIs.
- Website templates, public sites, inquiries, and developer provisioning remain
  available. Platform provisioning grants do not confer owner CRM access.
- Existing Session and AuthThrottle records remain part of authentication.
- The unused `findOrCreateUser`, `Username`, `SignIn`, and `SignInInput` exports
  and their otherwise unused implementations are removed. The current email and
  password login remains the only login workflow.

### Make ownership enforceable

- Appointment, Note, Task, Interaction, Payment, and Appointment_Service each
  have a required `business_id`; the server derives it from an authorized parent,
  never from a writable client ownership field.
- Customer, Employee, Location, Service, and Appointment expose unique
  `(business_id, id)` keys for composite references.
- Appointment references Customer, Employee, and Location using the same
  business key. Note, Task, and Interaction reference Customer and Employee
  using the same business key. Appointment_Service references Appointment and
  Service using the same business key. Payment references Appointment using
  that business key. Each new business key also references Business.
- These foreign keys reject cross-business relationships even for a direct
  database insert that bypasses the application. Tenant keys cannot be changed
  to move existing records between businesses; reference updates do not cascade
  a tenant reassignment.
- Tenant and parent lookup indexes support the existing list queries. New
  indexes are added only when an existing unique/index prefix does not serve
  the lookup; equivalent indexes are not duplicated.
- CRM reads and writes require an active membership at the domain boundary;
  API prechecks alone are insufficient. Related records included in responses
  are constrained to that same business.
- Signed-out APIs return the standard 401 envelope. Foreign, unknown, or
  inactive-membership resources return the same 404 envelope. Existing role
  restrictions within an authorized business retain their specified behavior.
- Appointment and service-line creation remains atomic. Failed writes leave
  neither a parent record nor partial related records.

### Upgrade existing data

- Migration history is append-only; the next migration preserves IDs, records,
  memberships, credentials, and existing public site URLs.
- Before changing tables, the migration checks all existing relationship paths
  for business disagreement. Inconsistent rows abort the transaction with an
  actionable diagnostic; no business is guessed and no row is deleted.
- New keys are backfilled from Customer for Appointment, Note, Task, and
  Interaction; Payment and Appointment_Service derive their key from Appointment.
  The migration verifies other referenced records against that key before
  validating constraints and making columns required.
- The upgrade does not reset the database or touch `.pgdata/`, `.azurite/`, or
  `.env` files. Existing legacy authentication data stays intact.

## Examples

| State / input | Behavior |
|---|---|
| Active member schedules a customer with a service and location in business A | Appointment and line are created with business A atomically |
| Direct database insert links A's customer to B's employee | Database rejects the composite foreign key |
| A's appointment references B's service | Database rejects the service line; transactional creation rolls back |
| Inactive member calls a domain query directly | No private business records are returned |
| User belongs to both A and B | Each operation uses one authorized business; relationships cannot mix A and B |
| Populated database has valid relationships | Migration preserves IDs and data and fills business keys |
| Populated database contains a cross-business note | Migration aborts without partial schema or data changes |
| Owner opens their existing website inquiry inbox | The existing website and inbox workflow still works |

## Verify

- Run `pnpm prisma:generate`, `pnpm test`, `pnpm typecheck`, and `pnpm build`.
- Replay the entire migration chain against a fresh PGlite database.
- Apply the new migration to a disposable database with representative
  pre-upgrade rows for every changed table; compare IDs, business assignments,
  row counts, credentials, website settings, and appointment price snapshots.
- Seed a cross-business relationship before applying the migration; assert that
  it fails and rolls back, retaining the original data and migration ledger.
- Attempt direct inserts and updates for every composite relationship with
  mismatched business keys; assert database rejection. Include a user who is
  a member of both businesses so authorization cannot hide missing constraints.
- Exercise domain functions with an inactive member as well as HTTP requests
  with signed-out, restricted activation, active owner, and foreign sessions.
- Verify appointment/service-line rollback and existing error envelopes.
- Run the existing business API and website-template HTTP drills against a
  disposable instance, and manually create/edit a customer, add a note, schedule
  a visit, inspect the calendar, and submit/read a website inquiry.
- Confirm removal candidates have no remaining imports or barrel exports.

## Constraints & decisions

### Repository audit findings

| Candidate | Evidence | Disposition |
|---|---|---|
| Username-only login helpers | `schemas/user.ts` and `findOrCreateUser` are exported but have no callers in app or test source | Remove these helpers in this increment |
| OAuth Account and VerificationToken models; User.image and emailVerified | No current runtime references found; password sessions use Session instead | Retain stored legacy data under `auth.md`; assess archival in a separate change |
| User.username | Still used by employee account creation, provisioning collision checks, developer creation, seed, dashboard fallback, and fixtures | Keep until an explicit identity migration replaces all consumers |
| Employee | Already serves as tenant membership and record author/scheduler | Keep; a rename to Membership adds churn without changing isolation |
| Task, Interaction, Payment | Each has domain queries, HTTP routes, and integration coverage | Keep; lacking a dedicated screen does not make a table unused |
| Service, Location, Appointment_Service | The scheduling form and calendar use them | Keep; deleting them breaks appointments |
| Worker and storage/queue/notify adapters | Worker only logs/discards jobs; no product callers of upload, download, enqueue, or live subscriptions found | Separate ADR proposal required before removal |
| Business form wrapper | `business-form.tsx` is a one-line re-export used by `new/page.tsx` | Harmless indirection; no database or product benefit from removing it here |
| Website templates and inquiries | Implemented product workflows retained in the SaaS direction | Keep |

This is a source audit, not an inspection of stored user data or proof about
external API consumers. No production database was read or changed.

Business remains the existing tenant boundary described by
`docs/adr/0012-business-tenant-boundary.md`; adding a separate Workspace or
Organization table duplicates that boundary without a defined product need.
Explicit business keys deliberately duplicate derivable ownership so relational
constraints can enforce it. They supplement session authorization.

The storage and worker removal candidate conflicts with the infrastructure
contracts in `docs/specs/seams.md`, `storage.md`, and `monorepo.md`. Removal
requires a proposed ADR and corresponding contract review before implementation;
this increment retains them. Accepted ADRs and landed postmortems are untouched.

`docs/specs/auth.md` explicitly requires legacy records to remain intact, so
unused OAuth models are not permission to drop their tables. Staff provisioning
also creates username-only users without credentials; replacing that mechanism
requires a separate reviewed invitation/identity contract, rather than silently
matching a new login by contact email.

Names and existing API payloads remain compatible. Naming cleanup, optional
customer contact fields, timezone conversion, and new timestamp/price validation
rules each need their own behavior decision. No dependencies are added.

## Out of scope

- Subscription billing: appointment Payment records describe customer visits,
  not businesses paying for Clientflow. Business subscriptions and idempotent
  billing event handling need a separate spec; none exists yet.
- Public signup, staff invitations, password recovery, and production launch:
  current identity behavior remains owned by `docs/specs/auth.md`.
- Removing working CRM APIs, deleting legacy records, changing payment behavior,
  or rewriting migration history.
- Renaming database columns/tables, extracting website settings, or adding
  Workspace/Organization abstractions without a defined behavior requirement.
- Removing Azure adapters, the worker, or Azurite; see the infrastructure
  contract dependency above.
