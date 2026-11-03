---
type: infrastructure
---
# Identity comes exclusively from a database session

GitHub OAuth through Auth.js v5 proves identity in development and production.
The Prisma adapter persists accounts and opaque session tokens. Each request
resolves its unexpired Session row; signing out revokes that row.

## Server entry contract

- Call currentUserId() before private queries or writes. Null means signed out.
- Pages and form actions redirect signed-out users to /login. Private APIs return
  401 with { error: { code: "UNAUTHENTICATED", message: "Sign in first" } }.
- /login, /api/health, and /api/auth/* are public. The existing / dashboard is private.
- Scope every operation to the session user's business membership. Foreign and
  unknown resources return 404. Browser IDs are lookup keys, never authority.
- No username login, legacy identity cookie, header, or environment fallback exists.
- OAuth users do not automatically claim legacy accounts by matching email or name.

## Configuration and verification

See [GitHub sign-in](auth/github-sign-in.md) for models, examples and tests,
[local setup](../runbooks/github-oauth-setup.md) for OAuth app registration and
ignored secrets, and [review checklist](../reviews/github-sign-in.md) for all four
teammate manual proofs. Database migrations are additive; do not reset existing data.

## Constraints & decisions

GitHub is the only provider. Roles, invitations, legacy membership transfer,
account deletion/export and other providers are separate work. The adapter User
keeps its string ID and existing employee relationships. Secrets belong in
apps/web/.env.local; examples contain placeholders.

## Historical decision

[ADR-0003](../adr/0003-dev-identity-stub.md) records the retired identity stub;
it is historical and does not describe current authentication.
