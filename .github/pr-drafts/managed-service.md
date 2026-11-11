# Fulfill Managed content-change requests with a shared monthly allowance

Managed subscribers can request changes to existing website content and follow
their progress. Granted developers start work, record included minutes, and
complete requests with notes. The 30-minute cap is shared across requests per
UTC calendar month; concurrent writes cannot overspend it, and changing plans
or reactivating service does not reset same-month usage.

Behavior: `docs/specs/businesses/managed-service.md`.
Drill: `docs/runbooks/managed-service.md`.

- Additive request, immutable time/void records, and transactional audit models.
- Server-side owner/developer authorization and active Managed enforcement.
- Granted-developer notifications, hidden after grant revocation.
- Owner and developer forms, allowance summary, retained history, and plan copy.
- Local Managed preview with one 10-minute completed example and one submitted
  example, preserving existing websites, credentials, subscriptions, and CRM data.
- Platform bug fixes and owners' own edits do not consume included service time.

Website edits still use the existing publication flow. This change does not
implement real billing, paid overages, quote management, automatic edits,
hosting deployment, or staffed support. No dependencies are added.

## Validation

- [x] `pnpm test` ? 209 tests
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] Disposable managed-service drill
- [x] Migration replay and existing-data preservation
- [x] Local preview: The Corner Chair retains two examples and 20 available minutes
- [ ] Keyboard/narrow-layout drill: desktop developer layout and owner form accessibility inspected; computer use stopped before keyboard submission because it could not confidently determine the browser URL. The disposable browser-check fixture was removed.

This is a local PR draft. The current branch also contains previously approved
local work; review the combined diff before deciding how to publish it.
