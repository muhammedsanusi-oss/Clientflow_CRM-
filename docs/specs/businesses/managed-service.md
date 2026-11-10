---
type: feature
---
# Managed subscribers request content changes and track included service time

Managed-service fulfillment builds on
[demo subscriptions](demo-subscriptions.md).

## Why

The Managed service offering includes 30 minutes of content changes each month.
Owners need to request that work and see its progress and remaining allowance;
developers need an authorized queue, time records, and a clear boundary for
additional work. The demo demonstrates the fulfillment workflow without charging
money or pretending that software performs a developer's work automatically.

## Where it lives

- `apps/web/app/managed-service/`: private owner request form, request history,
  progress, and monthly allowance summary.
- `apps/web/app/businesses/[id]/managed-service/`: developer-grant-scoped queue,
  status controls, completion notes, and time recording.
- `apps/web/app/api/`: authenticated, same-origin managed-service mutations.
- Owner workspace, developer business links, and subscription screens: service
  navigation and accurate benefit descriptions.
- `packages/domain/`: validation, user-scoped queries, Managed entitlement,
  monthly budget calculation, transactional writes, and history.
- `packages/db/prisma/`: additive request, time-entry, and audit storage.
- `tests/integration/`: lifecycle, allowance, isolation, concurrency, and rollback.
- `docs/runbooks/`: disposable demo drill and developer fulfillment procedure.
- `.github/pr-drafts/`: implementation scope and verification evidence.

## Behavior

### Eligibility and access

- Only an active, unexpired MANAGED demo subscription permits new managed-service
  requests, starting work, recording time, or completing work. Standard, CRM,
  pending, failed, canceled, expired, and unenrolled legacy businesses do not
  receive this service allowance implicitly.
- The owner is the signed-in user with an active OWNER membership. Developer
  access requires both developer status and an explicit business grant. Staff,
  foreign users, and unknown resources receive 404; signed-out API calls receive
  401 and private pages redirect to sign-in.
- Eligible owners see a Managed service navigation item and an allowance summary
  on the subscription page. Granted developers can open the corresponding queue
  from a business card or details page.
- Owners and granted developers retain read access to existing requests, time
  entries, and history after downgrade, cancellation, failure, or expiry. The
  page explains that active Managed service is required for further work.
- Entitlement and authorization are enforced by domain functions and HTTP
  handlers, including direct calls. Submitted user IDs, prices, remaining
  balances, timestamps, and employee roles never establish authority.

### Owner requests and developer fulfillment

- An owner submits a title (1–150 characters) and description (1–4,000 characters),
  both trimmed. The form asks which existing content should change and what it
  should say. Examples include text, opening hours, contact details, and replacing
  existing images through the established editor.
- Requests start SUBMITTED. Developers can move SUBMITTED to IN_PROGRESS or
  DECLINED, and IN_PROGRESS to COMPLETED or DECLINED. Terminal requests do not
  reopen in this increment. Declining requires a reason.
- Owners can cancel their business's SUBMITTED requests, including after their
  subscription becomes inactive. Work already in progress cannot be canceled
  through an owner control; the owner is directed to discuss it with the developer.
- Developers perform approved changes through the existing website editor and
  record the time used. The queue does not automatically edit or publish content.
  COMPLETED requires a completion note and at least one non-voided time entry.
- Owners see status, developer notes, logged minutes, and a chronological audit
  trail. They cannot change status, record time, or mark their own request complete.
- Submitted requests are independent of the existing website feature-request
  quotas. Existing feature requests continue to mean proposed enhancements;
  they are not automatically converted into included content-change work.
- Platform bug fixes and owners' own website edits do not consume the allowance.
  Only requested content-change work is recorded here.
- There is no unlimited-development or guaranteed-turnaround promise. Requests
  for new functionality, redesigns, or work exceeding the available allowance
  display “Additional work requires a separate quote.” This increment does not
  create a quote or collect additional payment.
- A request may be submitted when the remaining allowance is zero. The page
  clearly shows that included work must wait for the next eligible month or
  be discussed separately; submission does not reserve minutes or promise delivery.

### Monthly allowance and time records

- Each business has 30 included minutes per UTC calendar month while its Managed
  subscription is active. The UI identifies the month and its UTC reset boundary;
  this is an explicit demo convention, independent of simulated billing dates.
- Upgrading to Managed makes that month's unused balance available immediately.
  There is no proration or carryover. Renewal in advance does not make future
  months' allowances available early.
- Cancellation, plan switching, failure, or reactivation never resets usage within
  the same month. Returning to Managed in that month restores only the remaining
  balance. A new calendar month starts a fresh allowance if service is active.
- Developers record whole minutes, from 1 to 30 per entry, against an IN_PROGRESS
  request, with a work description. The server assigns the month and timestamp
  when work is recorded; arbitrary backdating and future dating are unavailable.
- Time is deducted when recorded, not when requested, started, or completed.
  Multiple requests share one business allowance; a request can span months.
- A time entry exceeding the business's remaining allowance returns 409 without
  writing an entry or deducting minutes. The UI shows the remaining minutes and
  explains the separate-quote boundary; there are no automatic overage charges.
- Time entries are immutable. Before completion, a granted developer can void an
  erroneous entry with a reason and record a replacement. The original remains
  visible in history; its minutes are restored to its original month only.
  Completed requests' time entries cannot be voided in this increment.
- A work description does not establish that a website was published. Completion
  notes document the work and direct the owner to the existing published preview.

### Consistency, history, and validation

- Request creation, status changes, time recording, and voiding each write an
  audit event in the same transaction as the underlying change. Events retain
  the actor, before/after state, server timestamp, and relevant minutes or reason.
- Request creation uses a per-submission UUID so retrying an unchanged request
  returns the existing request without duplicate history or notifications.
  Reusing that UUID with different content returns 409. Other mutations include
  the expected request version. Stale or competing updates
  return 409 without duplicate status changes, time entries, or notifications.
- Business/month budget updates are serialized across requests. Two developers
  cannot spend the same remaining minutes, including when acting on different
  requests. Subscription changes and work authorization are checked within the
  transactional boundary so cancellation cannot be bypassed by an earlier read.
- New requests notify explicitly granted developers through the existing in-app
  notification mechanism; notification writes commit with the request. No real
  email or SMS is sent. Notification reads retain their existing grant checks.
- Malformed input returns 400, deliberate conflicts return 409, and unknown
  failures use the existing safe `{ error: { code, message } }` envelope.
- Existing businesses, websites, subscription records, website limits, and CRM
  data remain intact. Applied migrations and accepted ADRs are not edited.

### Demo presentation

- Signup and subscription descriptions replace “allowance not implemented” with
  the available request-and-time workflow. Hosting, maintenance, email support,
  and real payment delivery are not described as newly implemented by this work.
- The existing Managed preview business can be populated explicitly with one
  clearly labeled completed demo request using 10 minutes and one submitted demo
  request, leaving 20 minutes available for exploration in the current UTC month.
  Preview setup is idempotent and does not reset later user edits or renew usage
  every time someone signs in. Other service plans receive no request fixtures.

## Examples

| State / input | Behavior |
|---|---|
| Managed owner requests an opening-hours correction | A SUBMITTED request and history appear; granted developers are notified |
| Developer starts the request, records 12 minutes, and completes it with a note | Owner sees COMPLETED and 18 minutes remaining for the month |
| Two requests each attempt to spend the final 10 minutes concurrently | One succeeds; the other returns 409 and no minutes are overspent |
| Owner submits a request after all 30 minutes are used | Request is stored with an exhausted-allowance explanation; no additional charge occurs |
| Owner switches to CRM and back to Managed in the same month after using 12 minutes | 18 minutes remain; switching does not grant another 30 |
| A new UTC month begins with an active Managed subscription | The current month's allowance is 30; previous history remains readable |
| Developer voids a 5-minute entry from the previous month before completion | Previous-month usage is corrected; the current month's balance is unchanged |
| Standard owner calls the request-creation API directly | 404 and no request, history, or notification write |
| Subscription is canceled while a request is in progress | History remains readable; further time recording and completion are denied |
| Developer lacks the business grant | Unknown and foreign requests both return 404 |

## Verify

- Run `pnpm test`, `pnpm typecheck`, and `pnpm build`.
- Integration tests cover owner creation, developer transitions, cancellation,
  required notes, completion preconditions, notifications, and the separate
  behavior of existing website feature requests.
- Test active Managed, Standard, CRM, pending, failed, canceled, expired, and
  legacy businesses with direct domain calls and HTTP handlers.
- Test staff, foreign owners, inactive memberships, ungranted developers,
  revoked grants, signed-out calls, and cross-origin writes.
- With a controlled clock, verify UTC month boundaries, advance renewal,
  non-carryover, same-month reactivation, and corrections to the original month.
- Competing writes on different requests prove the shared 30-minute cap cannot
  be exceeded; stale submissions prove no duplicate work or notifications.
- Inject history/notification failure and assert complete transactional rollback.
- Verify the additive migration preserves existing data and replays against the
  generated Prisma schema without pre-enrolling non-Managed businesses.
- Run a disposable lifecycle drill: create a Managed request, start work, record
  minutes, complete, exhaust the balance, reject excess time, downgrade, recover,
  and advance the clock to a new month. Document the command in the runbook.
- Run a keyboard-only pass through owner submission and developer status/time
  controls; check validation, pending states, narrow layout, and history display.

## Constraints & decisions

- No new dependency or external service is needed.
- UTC calendar months keep the allowance deterministic despite advance simulated
  renewals; production billing-cycle alignment would require a separate change.
- This is a fulfillment and accounting workflow. A developer still performs and
  publishes the changes; recording a status does not generate or deploy a site.
- Only content work is included. Custom development remains separately scoped.
- Whole-minute records, no carryover, and no automatic overage charges make the
  30-minute promise explicit and reviewable.
- History and void records preserve accountability without deleting prior work.
- [Demo subscriptions](demo-subscriptions.md),
  [website editing](website-editing.md), and
  [developer notifications](../notifications/developer-notifications.md) continue
  to own their existing authorization and publication contracts.

## Out of scope

- Real hosting deployment, maintenance operations, or staffed email support.
- Real billing, paid overages, invoices, refunds, or automatic charges.
- Local email inbox, verification, or recovery delivery.
- Tailored-project quotes, approvals, development tracking, and handoff workflows.
- Automatic website edits, new template fields, uploads inside request messages,
  general chat, staff service requests, or arbitrary CRM changes.
- Timers, fractional minutes, backdating, allowance reservations, rollover,
  request reopening, or correcting time after completion.
