---
type: feature
---
# Developers provision business portals and owners activate their accounts

## Why

The project team creates a business's private CRM portal before handing it to the owner. The owner uses an email and a temporary password to choose a personal password before accessing business data.

## Where it lives

- `apps/web/app/login/`: email/password login and role-based routing.
- `apps/web/app/page.tsx` and `apps/web/app/businesses/`: existing developer dashboard, extended business form, and credential handoff.
- `apps/web/app/change-password/`: required first-login password replacement.
- `packages/auth/`: password hashing, opaque database sessions, and restricted activation sessions.
- `packages/domain/`: validation, developer authorization, transactional provisioning, and owner activation.
- `packages/db/prisma/`: additive credential, developer-access, business-description, and activation changes.
- `apps/migrate/`: optional developer account provisioning command; no arbitrary public developer registration.
- `tests/integration/`: provisioning, activation, authorization, and session tests.
- `README.md`, `MVP.md`, `docs/specs/auth.md`, `docs/specs/web.md`, and `docs/specs/businesses/create-business.md`: revised project scope and related contracts with implementation.

## Behavior

### Developer login and access

- The main login page offers Developer and Business owner choices. In local development, Use test account fills ready-to-use synthetic credentials for the selected role; no account-creation command is required. The first test login idempotently initializes the fixed test accounts and sample owner business.
- Existing developer credentials can also be entered normally. The optional local account command remains available for individual credentials. Test accounts and their existing sessions are denied outside development.
- `/login` accepts an email, password, and optional account-type selector. The selector must match the stored role and never assigns permissions; emails are trimmed and lowercased, passwords are not silently trimmed or lowercased. Developer sessions open the existing `/` dashboard; activated owner sessions open their business workspace.
- Public input cannot assign a developer role. Fixed local test fixtures are the only automatic developer accounts. Owners cannot open developer pages or invoke provisioning actions; unknown and unauthorized business resources return 404.
- Both explicitly provisioned project developers receive developer-access grants for businesses created through this flow. Developer queries scope records through the signed-in developer's grants. Developer access is separate from an employee OWNER membership.
- The existing dashboard keeps its layout and displays business name, owner email, and activation state: pending, expired, or active. Its primary action is `Create business`.

### Create a business portal

- The form collects business name, business type, a short description of what it does, business contact email and phone, and the owner's first name, last name, and login email. Business contact email and owner login email are separate labeled fields.
- Business name is 1-100 characters, description 1-1000, owner names 1-50 each, and phone follows the existing 10-15 character validation. Emails are validated and normalized; business type uses the existing enum.
- The server derives the developer from the session. It does not accept owner user IDs, developer roles, or access grants from form input.
- One transaction creates the business, owner account and hashed temporary credential, active OWNER employee membership, and developer-access grants. Failure rolls back all records.
- An owner email already associated with a login or legacy employee identity returns a safe 409 conflict. Provisioning never resets, claims, links, or transfers an existing account by email. Multiple-business invitations for existing accounts are separate work.
- Successful creation opens a confirmation screen with business name, owner login email, login URL, expiration, and a generated temporary password shown once. The response is not cached; passwords never appear in URLs, logs, business listings, or database plaintext.
- Developers copy and share the credentials themselves. Automatic email sending is outside this feature.
- Each newly provisioned business also receives the selected Bakery, Barbershop, Salon, or Contact public website at /sites/<businessId>. The private owner workspace and credentials remain separate. See [website templates](website-templates.md) for public fields and inquiries.

### Owner activation

- A randomly generated temporary password expires after 24 hours. It is stored only as a salted password hash.
- Its first successful use atomically consumes it and creates a restricted 15-minute activation session. Concurrent attempts cannot consume the same credential twice.
- The activation session can only access password replacement and logout. Opening the dashboard, developer section, or any private CRM API before replacement is denied server-side; the UI redirect is not the access boundary.
- `/change-password` requires a new password and confirmation. New passwords are 15-128 characters, support spaces and password managers, and must differ from the temporary password. Invalid or mismatched input preserves the activation session without granting CRM access.
- Successful replacement atomically stores the new hash, marks the account active, revokes all activation and prior login sessions, and creates a fresh regular session. The owner then enters their own business workspace.
- The consumed temporary password no longer works. Subsequent logins use email and the owner's chosen password.
- Developers can regenerate a temporary credential only for a pending account they are authorized to provision. Regeneration revokes earlier temporary credentials and activation sessions; it never changes an active owner's password.
- Missing, expired, consumed, or invalid credentials produce safe errors without revealing whether a login email exists. Login and activation attempts are limited to 10 attempts per 15-minute fixed window per normalized email or activation ticket. Counters persist in the database and increment atomically, including unknown emails.

### Shared authentication and data rules

- The unsigned demo user-ID cookie and username-only login no longer authorize requests. Existing rows and applied migrations remain intact; legacy accounts receive no automatic password or developer role.
- Regular sessions use random opaque tokens validated against unexpired database rows, with HTTP-only, SameSite=Lax cookies and Secure cookies under HTTPS. Logout revokes the database session as well as clearing the cookie.
- Password and temporary-password hashes use Node's built-in scrypt with per-credential random salts and timing-safe verification; no added dependency is planned. The scrypt parameters are N=32768, r=8, p=3 with a 16-byte random salt and a 64-byte key.
- State-changing requests enforce same-origin protection. Private reads and mutations retain membership checks, soft-delete filtering where applicable, transactional history, and the standard error envelope.
- The existing customer and calendar features remain available after owner activation; simplifying their forms or adding new CRM features is separate work.

## Examples

| State / input | Behavior |
|---|---|
| Provisioned developer logs in | Opens developer directory |
| Developer submits valid business and a new owner email | Creates all provisioning records together and displays temporary password once |
| Owner email is already used | 409; no business or credential is changed |
| Owner logs in with unexpired temporary password | Consumes credential and opens required password replacement |
| Restricted session calls customer API | Denied before any CRM query or write |
| Owner submits matching valid new password | Activates account and opens its business with a fresh session |
| Consumed temporary password is reused | Login rejected |
| Owner A requests business B | 404; no business data disclosed |
| Owner opens developer provisioning | Denied; no business created |
| Expired activation session or temporary password | No access; developer can reissue while account is pending |
| Anonymous visitor supplies an old demo cookie | No authenticated identity |

## Verify

- Run `pnpm test`, `pnpm typecheck`, and `pnpm build`.
- On a disposable instance, provision both developer accounts, sign in separately, create a business, and confirm both can see its provisioning record without becoming its employee owner.
- Copy the one-time credential, sign out, log in as the owner, and verify every private page/action/API denies CRM access until password replacement.
- Replace the password; confirm owner workspace access, temporary-password reuse rejection, restricted-session invalidation, and logout replay rejection.
- Test expiry, regeneration, concurrent credential consumption, duplicate email conflicts, provisioning rollback, malformed input, same-origin protection, and rate limits.
- Create a second owner/business and verify foreign resource 404s, owner/developer separation, and rejection of legacy identity cookies.
- Check keyboard navigation, labels, pending states, and safe errors on login, business creation, credential handoff, and password replacement.
- Inspect persisted records and captured logs to confirm plaintext passwords and session tokens are absent from logs and stored credentials are hashed.

## Constraints & decisions

The application has private developer/owner areas and explicit public template website routes. Templates share code within the same app and do not generate separate deployments. Manual credential delivery keeps the class project independent of email services. Development identity is replaced, rather than combined with password-based access, so an old cookie cannot bypass owner activation. See `docs/adr/0014-developer-provisioned-owner-access.md` for provisioning and `docs/adr/0015-browser-role-login-for-project-testing.md` for browser entry and local test accounts.

Password and activation design follows [OWASP authentication guidance](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html) and [single-use credential guidance](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html).

## Out of scope

Subscriptions, billing, public signup, automatic email delivery, custom domains, custom website themes beyond the standard templates, staff invitations, forgotten-password recovery for active accounts, and editing or deleting business portals. The existing customer and appointment specs own their unchanged workflows. Hosting and production launch are separate decisions.
