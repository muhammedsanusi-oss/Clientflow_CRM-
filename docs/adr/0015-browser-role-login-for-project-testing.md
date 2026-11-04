# ADR-0015: Browser role selection and ready-to-use project test accounts

## Status

Accepted

## Context

The project needs developer and business-owner entry points on the website. Requiring a developer to create their first login from a terminal obstructs the intended classroom testing workflow.

## Decision

The main login page offers Developer and Business owner sign-in. The stored account role determines permissions; the selected option is checked against it and never assigns a role. Developers open the existing dashboard. Owners open the workspace linked through their business membership.

Local development offers fixed synthetic test credentials in the page. The first test login idempotently initializes two test developers, a test owner, and its sample business. This is a fixed fixture, not arbitrary public registration. Existing accounts and passwords are not reset or reassigned.

Known test-account IDs cannot authenticate or resolve sessions outside development, even if a development database is reused. Real owner provisioning, temporary password replacement, membership isolation, and opaque sessions retain their existing behavior.

## Consequences

Both roles can be tested entirely in the browser after starting the app. The terminal-based account command remains optional for individually chosen developer credentials; it is no longer the required local testing path. Displayed credentials are intentionally public and refer only to synthetic test identities.

This supersedes the requirement in ADR-0014 that initial developer access use command-line account creation. Its business-owner provisioning and activation decisions remain in force.

## See also

- `../specs/businesses/developer-provisioning.md`
- `../specs/auth.md`
- `0014-developer-provisioned-owner-access.md`
