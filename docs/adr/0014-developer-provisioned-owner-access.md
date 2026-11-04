# ADR-0014: Developer provisioning and password-based owner activation

## Status

Accepted

## Context

The project needs two developer accounts that create private business portals and hand them to owners. The current unsigned demo identity contract cannot enforce developer-only creation or mandatory owner password replacement.

## Decision

Replace demo identity with email/password authentication and opaque revocable database sessions. Provision developers explicitly. Developers create business and owner records transactionally; owners receive a single-use, expiring temporary password that grants only password-replacement access until activation. Existing accounts are not claimed or reset by matching email.

Use explicit developer business-access grants for administrative queries, separate from owner employee memberships. Both project developers receive grants on provisioned businesses. Preserve existing migrations and data; add schema transitions rather than reverting history.

Use the existing app for private business workspaces. Independent website generation and automatic email delivery are excluded. Node's built-in cryptographic primitives avoid a new password-hashing dependency.

## Consequences

Developers can onboard owners without GitHub or an email service. Owners choose their own permanent passwords before receiving CRM access. The app must enforce activation restrictions across every server entry, protect credential handoff, rate-limit login, and revoke sessions. Legacy demo identities stop working until explicitly provisioned; no automatic legacy account transfer is included.

This decision replaces the authentication mechanism described in ADR-0013 when implemented. That decision remains historical and unchanged.

## See also

- `../specs/businesses/developer-provisioning.md`
- `../specs/auth.md`
- `0013-restore-demo-sign-in.md`
