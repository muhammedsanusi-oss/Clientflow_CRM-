# Showcase completion verification

## Changes covered

- Owner location creation/listing, field validation, duplicate feedback, and
  owner/tenant/CRM-plan checks.
- Booking setup links for location, service, and opening hours.
- Public booking CTA eligibility with a contact fallback for other sites.
- Unpublished editor status, canceled departure, refresh/close listener,
  failed-publication preservation, and successful-publication cleanup.
- Presenter walkthrough and current showcase scope in README/MVP.

## Automated checks

- `corepack.cmd pnpm test`: 366 tests passed (167 package tests, 199 root tests),
  including the development-output isolation regressions.
- `corepack.cmd pnpm typecheck`: passed across all workspaces.
- `corepack.cmd pnpm build`: passed, including `/calendar/locations`.
- `git diff --check`: passed; Git emits line-ending notices for existing CRLF policy.

Locked dependencies were restored using the existing Windows x64 runbook
command; no dependency versions or lockfile were changed. The untracked duplicate
SQL draft was moved unchanged to `artifacts/migration-drafts/`, with its checksum
verified. The normal migration replay suite passes without file exclusions.

## Browser drill

`tests/browser/showcase-completion.mjs` ran against a disposable development
server on port 3100 using `PGLITE_DATA_DIR=memory://`,
`CLIENTFLOW_DEV_INSTANCE=showcase`, and isolated headless Chrome
on port 9392. It created fictional data and exercised actual browser forms.

Verified signup and simulated checkout; no booking CTA before setup; location
creation and duplicate feedback with preserved fields; service/hours setup;
readiness links; inline headline editing; canceled link departure; website
publication remains available after failed simulated payment; successful payment
restores paid CRM access; clean departure; signed-out public website and booking;
appointment confirmation; matching owner calendar and customer record.

The final drill also used Tab/Enter and native text input to create the location
at desktop size, then keyboard selection, contact entry, and submission on the
390px public booking form. This is a targeted keyboard check, not a complete
keyboard-only audit of every scheduling control.

Screenshots cover location setup, readiness, editor, public booking, customer
directory at 390px, and the populated calendar at 1440px. Visual inspection found
no horizontal overflow or clipped controls in those sampled states.

## Limits

This checks the local showcase, not production readiness or every feature.
The owner-editing policy is extended by
`artifacts/owner-website-editing/verification.md`: billing no longer blocks
authorized owner editing, upload within image limits, or publication.
The initial parallel drill shared `.next-dev` with a pre-existing demo server;
the final rerun used isolated output and was followed by a successful browser
developer login on the main server. See `artifacts/developer-login/verification.md`.
No email/SMS, real payment, domain, deployment, or background job was introduced.
Browser history Back/Forward does not participate in the editor's leave warning.
The browser drill does not exercise image uploads, the full managed-service
workflow, all four themes, or a complete accessibility audit. Existing integration
suites remain responsible for their covered authorization and workflow checks.
