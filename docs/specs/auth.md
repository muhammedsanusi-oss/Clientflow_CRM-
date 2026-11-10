---
type: infrastructure
---
# Email and password establish revocable database sessions

The login page offers Developer and Business owner sign-in. The selected option must match the stored account role; it never assigns privileges. Developers log in to the existing Clientflow dashboard. Developers provision accounts for existing/internal onboarding with single-use temporary passwords; owners replace them before using the CRM. Local development also offers the unverified demo signup described by [owner self-service signup](businesses/owner-self-service-signup.md) and [ADR-0018](../adr/0018-local-demo-owner-signup.md). Production self-service signup remains disabled until email verification is implemented.

## Identity and authorization

- currentUserId() resolves an unexpired regular session and returns null for missing, expired, or activation-only sessions. Every private entry calls it before data access. Pages redirect signed-out visitors to /login; APIs return the standard UNAUTHENTICATED 401 error.
- The clientflow_session cookie carries a 32-byte random opaque token. Only its SHA-256 digest is stored in Session. Regular sessions expire after 30 days; activation sessions after 15 minutes. Cookies are HTTP-only, SameSite=Lax, scoped to /, and Secure in production.
- Legacy user-ID cookies, GitHub cookies, headers, and environment identity shortcuts do not authenticate.
- Developer roles are assigned only through the explicit local provisioning command. Developer business reads require that user's DeveloperBusinessAccess grant; owner CRM access requires active Employee membership. Foreign and unknown resources return 404.
- The login page redirects existing activation sessions to /change-password, developers to /, and owners to /owner. Password replacement and an existing owner session also return to /owner. The owner entry route redirects to the newest business calendar.
- `/signup` and `POST /api/auth/signup` are available only in `NODE_ENV=development`; other runtimes return 404. When Business owner is selected on `/login`, a “Don't have an account? Sign up here!” link appears directly below the sign-in button and opens `/signup`. The link is hidden for Developer sign-in and outside development. Local demo signup collects a website plan, creates one account and business with an active OWNER membership, and stores the selected tier without verifying email. Displayed prices and the 24/7 support benefit are demos, not payment processing or a live support service. Signup does not claim or reset existing accounts.
- Login, logout, and password replacement require a matching Origin. Server Actions retain Next.js Origin protection.

## Public business websites

- /sites/<businessId> and POST /api/sites/<businessId>/contact are explicitly public for businesses with a saved website template. Legacy businesses with no website configuration return 404.
- The website query selects only public business fields. Contact messages are linked to the configured business, not a client-supplied recipient, and private inquiry reads require the current user's active OWNER membership.
- Public contact submissions require same-origin requests, strict validation, an 8 KiB body limit, a honeypot, and an atomic 10-per-15-minute limit per business. No inquiry body is logged.
- All other business, CRM, and inquiry routes retain their existing private session boundary. See [website templates](businesses/website-templates.md) and ADR-0016.

## Credentials and activation

- Emails are normalized and validated in packages/domain. Login does not create or claim arbitrary accounts. Passwords are not trimmed or lowercased.
- The local demo signup route validates a new owner and business, stores the selected website plan, creates them with the OWNER membership atomically, and authenticates the new owner. Its signup email is not verified; it is unavailable outside development.
- Salted scrypt hashes use N=32768, r=8, p=3, a random 16-byte salt, and a 64-byte key with timing-safe comparison. Credential format is scrypt$saltHex$keyHex; no plaintext password is stored or logged. Unknown emails perform equivalent hashing work.
- New passwords contain 15-128 characters and match confirmation. Login permits existing passwords up to 128 characters.
- Temporary passwords are generated randomly, expire after 24 hours, and are consumed atomically on first successful login. Their session only authorizes password replacement and logout.
- Password replacement checks the unexpired restricted session again inside the transaction, changes the hash and activation state, revokes prior sessions, and issues a fresh regular ticket. Regeneration revokes pending credentials and sessions and never resets an active owner.
- Login and activation each allow 10 attempts per 15-minute fixed window per normalized email or activation ticket. AuthThrottle stores hashed keys and atomic persisted counters, including attempts against unknown emails. Excess attempts return 429 and Retry-After: 900.
- Logout deletes the persisted session and clears the cookie; replaying the old ticket fails. Auth responses use no-store caching.

## Verify

Run pnpm test, pnpm typecheck, and pnpm build. Run the provisioning feature's manual drill on a disposable app. Integration tests exercise real password hashes, database sessions, activation restrictions on all API exports, developer/owner separation, expiry, regeneration, revocation, same-origin checks, and rate limits.

## Constraints & decisions

Local development displays a Use test account button for each login type. The first test login creates fixed synthetic identities and a linked Sample business through an idempotent transaction. If Sample business has no website template, the fixture assigns one randomly selected standard template; later logins preserve the existing template and website content. If the demo business has no booking locations, services, hours, or schedulable staff, the fixture adds a sample location, service, team member, and weekday availability so the public booking flow can be tried; any existing booking setup is preserved. The synthetic owner is linked only to Sample business; when that owner signs in, any stale active memberships to other businesses are deactivated so demo data cannot cross business boundaries. The fixture does not reset existing passwords or claim accounts by matching email. The public test password is Clientflow-test-2026!; developer emails are developer@clientflow.test and friend@clientflow.test, and the sample owner is owner@clientflow.test.

Test-account IDs are fixed in packages/auth/src/test-accounts.ts. Both credential authentication and session resolution reject those identities unless NODE_ENV is development, including when a development database is reused. The fixture itself is not arbitrary self-registration; the separate local-only signup flow is described in the owner signup feature spec.

The optional interactive create-developer command still creates individually chosen developer credentials without exposing passwords as arguments. It is not required for classroom testing.

No production public signup, email delivery, subscription billing, or active-account password recovery is included. Keep applied migrations and legacy records intact. ADR-0003 and ADR-0013 describe retired identity mechanisms.
