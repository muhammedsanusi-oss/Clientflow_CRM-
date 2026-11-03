---
type: feature
---
# GitHub sign-in establishes a database session

## Why

Users prove their identity with GitHub before opening their private CRM workspace. Editing browser cookies cannot select another user's account.

## Where it lives

- `packages/auth/`: Auth.js configuration and session-derived `currentUserId()`.
- `packages/db/prisma/schema.prisma` and `migrations/0005_github_auth.sql`: adapter models and additive migration.
- `apps/web/app/api/auth/[...nextauth]/route.ts`: Auth.js handlers.
- `apps/web/app/login/page.tsx` and `sign-out-button.tsx`: GitHub sign-in and server-side sign-out.
- Private web pages, server actions, API handlers, and their domain queries.
- `docs/specs/auth.md`, affected feature specs, READMEs, and HTTP verification scripts.

## Behavior

- GitHub is the only identity provider. Auth.js v5 uses the Prisma adapter and explicit database session strategy; the session callback exposes the adapter user's string ID.
- `currentUserId()` returns the authenticated session user's ID, or null. It accepts no browser user ID, legacy cookie, header, environment identity, username, or email sign-in shortcut.
- The login page offers GitHub sign-in and a safe failure message. Sign-in and the header's sign-out button use forms with inline Server Actions, retaining Next.js Origin checks. Auth.js owns callback validation, CSRF protection, cookies, and session expiration. Sign-out deletes the database session and clears its cookie before returning to `/login`.
- `/login`, `/api/health`, and the Auth.js endpoints are public. The existing `/` workspace dashboard remains private, as required by `web.md`; there is no public landing page in the current app.
- Every private page and server action checks the session before accessing tenant data. Signed-out page/action requests redirect to `/login`. Private APIs return 401 with `{ "error": { "code": "UNAUTHENTICATED", "message": "Sign in first" } }` before parsing or accessing tenant data.
- Every private read/write checks the authenticated user's business membership and the requested child's business/parent relationship. Foreign and missing resources return the same 404. Existing role rules remain in force.
- The old username login/logout handlers and exported cookie setters are removed. Tests and drills no longer manufacture identities through those endpoints.
- `User.id` remains `String @default(cuid())`. Existing User rows, usernames, employee memberships, and all CRM foreign keys remain intact. User receives nullable adapter profile fields (`name`, unique `email`, `emailVerified`, `image`); legacy `username` becomes nullable and retains its unique index.
- Account, Session, and VerificationToken follow the assignment's adapter schema: Account has the composite provider/providerAccountId primary key; Session has a unique sessionToken; VerificationToken has a composite identifier/token primary key and unique token. Account and Session have cascading User foreign keys. The new numbered SQL migration uses the existing `_migrations` runner; existing migrations are immutable. Migration and rerun tests use disposable PGlite databases and include populated legacy rows.
- OAuth identities are keyed by GitHub provider account ID. Existing username/email records are never automatically linked or reassigned based on browser input or a matching name/email. Legacy data remains stored; granting an OAuth user access to legacy memberships requires a separately reviewed, verified migration procedure.
- Employee creation continues to preserve its existing employee/User relationship, but entering an employee email does not grant that person OAuth access. An invitation/account-claim workflow is outside this change.
- Secrets live only in ignored `apps/web/.env.local`; committed examples contain placeholders. No database reset or existing-data mutation is part of verification.

## Examples

| State / input | Behavior |
|---|---|
| First successful GitHub callback | Creates adapter user/account and database session; opens the private workspace |
| Browser restarts with its unexpired cookie | Same database user and workspace remain available |
| Signed out; direct GET `/customers` | Redirects to `/login` |
| Signed out; POST `/api/Business` with malformed body | 401 envelope before validation |
| Legacy `session` cookie contains an existing User ID | No authenticated identity |
| Auth.js session token replaced with another User ID or random string | No authenticated identity |
| Account B requests account A's private customer | 404 for reads and mutations; A's data is unchanged |
| Logout then replay the previous session token | No authenticated identity |
| Existing employee username equals GitHub profile email | No automatic account claim or business access |

## Verify

- Run `pnpm prisma:generate`, `pnpm test`, `pnpm typecheck`, `pnpm build`, and `git diff --check`.
- Test the actual Auth.js session boundary with the Prisma adapter on disposable PGlite: persisted, expired, deleted, and fabricated tokens; prove legacy identity inputs cannot authenticate.
- Exercise private route and server-action rejection and cross-user read/write isolation. Existing domain tests may mock session identity, but those tests are not OAuth/session proofs.
- Confirm migrations replay and rerun, match the Prisma schema, and preserve populated User/Employee/CRM relationships.
- Check `git check-ignore apps/web/.env.local`; do not print secrets.
- A teammate independently reviews the diff and performs all four manual proofs in `docs/reviews/github-sign-in.md`: persistent login, logout protection including browser Back, one-character cookie tampering, and isolation between two real GitHub accounts on the same running app. The reviewer personally runs cookie tampering and account isolation. Automated mocks do not complete those proofs.
- Record executed commands, outcomes, and pending manual checks separately in the draft PR.

## Constraints & decisions

- Add `next-auth` v5 and `@auth/prisma-adapter` to the auth package, plus its workspace DB dependency; use pnpm and retain the repository's Prisma 6 driver-adapter setup. These dependencies implement OAuth and persistent sessions through the supported adapter.
- Resolve sessions in Node server entry points rather than importing the Prisma driver into Edge middleware.
- Database session cookies contain opaque random bearer tokens; they are not user IDs and need not be described as signed JWTs. Database lookup and expiry determine validity.
- No dangerous email account linking, development identity bypass, seeded GitHub identity, or application user ID from GitHub's browser-visible profile fields is accepted.
- Update the infrastructure auth spec to describe the implemented contract and remove obsolete stub guidance from active docs; accepted ADRs and landed postmortems remain immutable historical records.
- The assignment requires the UNAUTHENTICATED error code and 401 status for private APIs but does not prescribe the message text; retain the repository's existing message. Server Actions use the existing page redirect convention for signed-out form submissions because React Server Actions do not expose a route handler's custom HTTP status interface.

## Out of scope

- Other OAuth providers, roles redesign, invitations, automatic legacy account merging, password login, account deletion/export, and payment authorization changes.
- Merging the PR. Preparing a draft PR is authorized; a teammate owns review and manual proof completion. The assignment's final merge occurs only through the human team's process.
