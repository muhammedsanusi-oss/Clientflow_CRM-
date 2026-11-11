---
type: feature
---
# Developers receive business, prospect, and uptime notifications

## Why

Developers need a central place to notice owner inquiries and requested
changes, respond to prospective clients who need a custom CRM, and learn when
an external uptime monitor reports an outage or recovery.

## Where it lives

- `apps/web/app/page.tsx` and `apps/web/components/`: developer dashboard
  notification bell and unread count.
- `apps/web/app/notifications/`: developer-only notification center.
- `apps/web/app/businesses/[id]/requests/`: developer-grant-scoped view of
  owner website inquiries and change requests.
- `apps/web/app/custom-crm-requests/`: developer-only prospect request inbox.
- `apps/web/app/signup/`: tailored website/CRM contact and callback choice;
  `apps/web/app/request-custom-crm/` redirects older links into signup.
- `apps/web/app/api/`: public request submission and authenticated external
  uptime-monitor webhook.
- `packages/domain/`: validation, developer-scoped reads, request persistence,
  notification state, and health-transition handling.
- `packages/db/prisma/schema.prisma` and append-only migrations: durable
  prospect requests, notification events and per-developer read state, and
  monitor state.
- `tests/integration/`: access control, submission, notification, read-state,
  monitor authentication, and duplicate-event coverage.
- `docs/runbooks/developer-notifications.md`: external monitor configuration
  and request review steps.

## Behavior

- A notification bell with a visible "Notifications" label appears in the
  developer dashboard header. Its badge shows the signed-in developer's unread
  count and it opens `/notifications`.
- Only signed-in developer accounts can view or update developer
  notifications. Each developer has independent read state; one developer
  marking an item read does not clear another developer's badge.
- All current developer accounts receive each new event. Notifications are
  created for:
  - a new public website inquiry, visible only to developers with an explicit
    grant to that business;
  - a new owner website-feature request, visible only to developers with an
    explicit grant to that business;
  - a new public custom CRM request, visible to developers; and
  - an external monitor's down or recovery transition, visible to developers.
- Managed content-change requests notify only explicitly granted developers.
  Request creation, history, and notifications commit together; revoked grants
  hide these notifications and their unread counts. Their links open the Managed
  queue. See [managed service](../businesses/managed-service.md).
- A notification links to the authorized source: the developer's business
  inquiry and owner-request list, the custom CRM request details, or the health
  status. Unknown and foreign business references do not reveal source data.
- The notification center lists newest first, supports marking one item or all
  items read, and clearly distinguishes read from unread notifications. Mark
  read is scoped to the current developer.
- The custom CRM request form is part of the tailored-service choice in signup,
  rather than a separate option below sign-in. A prospect submits contact name,
  phone, fallback email, optional business name, requested work, and a future
  preferred callback date/time with an explicit time zone. It validates and
  persists the request before notifying developers. It creates no account,
  business, or subscription. The callback is requested rather than confirmed;
  developers see the phone, fallback email, and selected time zone in the inbox.
  Older requests remain readable with missing callback fields labeled not
  provided. See [tailored signup](../businesses/custom-website-signup.md).
- Existing owner website-feature requests keep their current plan limits and
  authorization. Each successfully saved request also notifies developers with
  access to that business. Website contact inquiries likewise keep their
  current public validation and owner inbox behavior while adding developer
  notifications for authorized developers.
- The app does not infer that it is down. A configured external uptime monitor
  posts authenticated up/down events to a dedicated webhook. The webhook
  rejects requests with a missing or invalid shared secret, validates a strict
  payload, and deduplicates monitor event IDs. A state transition creates one
  notification per developer; repeated reports of the same state do not create
  repeated outage notifications.
- Inserting a source request/inquiry and its associated notification event is
  atomic. Fan-out to developer read-state records is also atomic. A health
  transition and its notification event are persisted atomically.
- All notification and request queries are scoped to the authenticated
  developer or explicit business grant. Public and owner requests cannot
  read developer notifications.
- Errors use the standard API error shape and do not expose raw database or
  webhook credentials.

## Examples

| State / input | Behavior |
|---|---|
| An owner submits a website inquiry | The owner sees it in their existing inbox; developers granted access to that business receive an unread notification |
| An owner submits an allowed website feature request | The request is saved under existing plan rules and developers granted access to that business are notified |
| A prospect submits a valid custom CRM request | The request is saved without creating an account and all developers receive a notification |
| A signed-in owner opens `/notifications` | The request is rejected or redirected; developer-only notification data is not disclosed |
| One of two developers marks a notification read | Only that developer's unread count changes |
| The monitor sends the same down event repeatedly | Only the first down transition creates a notification |
| A caller posts an invalid monitor secret or payload | The webhook rejects the request and creates no health event or notification |

## Verify

- Integration tests cover authorized and unauthorized notification reads,
  per-developer read state, all notification source types, and atomic writes.
- Integration tests verify custom CRM form validation, duplicate/rate-limited
  submissions, no account creation, and developer-only access.
- Callback tests cover time zones, daylight-saving gaps and repeated times,
  required phone/fallback email, future dates, persistence, and rollback if
  developer notification creation fails.
- Integration tests exercise authenticated monitor down/up transitions,
  repeated-state suppression, duplicate event IDs, and invalid credentials.
- `pnpm test`, `pnpm typecheck`, and `pnpm build` pass.
- Manually submit an owner inquiry and feature request, submit a public custom
  CRM request, verify the developer badge and links, and confirm marking read
  does not alter another developer's badge.
- Configure an external monitor with the documented webhook secret, simulate
  down then recovery transitions, and verify one notification for each
  transition.

## Constraints & decisions

- Notifications are in-app only; email and push delivery are not included.
- Developer notifications are distributed to all active developer accounts;
  business-linked details remain accessible only to developers with grants.
- The monitor integration is provider-neutral and uses a documented
  authenticated webhook (`POST /api/monitoring/webhook`) with a bearer value
  configured as `UPTIME_WEBHOOK_SECRET` (at least 32 characters). The JSON
  payload contains `eventId`, `monitorId`, `status` (`UP` or `DOWN`), and
  ISO-8601 `observedAt`. The endpoint does not perform its own external
  monitoring.
- Custom CRM requests are leads, not promises to build software, accounts,
  quotes, or subscriptions.
- This feature supports the listed business, prospect, and uptime events;
  it does not automatically notify on every database or application event.
- Notification history is retained; marking read does not delete a notification
  or its source record.

## Out of scope

- Email or SMS delivery, escalation policies, and on-call scheduling.
- Automatic polling of external servers or cloud platforms by the application.
- CRM request quoting, project tracking, billing, and customer account creation.
- A general-purpose event bus or notifications for unrelated CRM activity.
