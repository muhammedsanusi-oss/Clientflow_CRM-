---
type: feature
---
# Owners request a tailored website and a callback during signup

## Why

Business owners who need a tailored website and CRM choose that service during
signup and provide enough information for the Clientflow team to call them,
with email available as a fallback if they cannot answer the phone.

## Where it lives

- `apps/web/app/login/login-form.tsx`: standard signup entry only.
- `apps/web/app/signup/`: standard-template and tailored-service choices.
- `apps/web/app/request-custom-crm/`: compatibility entry for the signup choice.
- `apps/web/app/api/custom-crm-requests/`: callback request submission.
- `apps/web/app/custom-crm-requests/`: private developer request inbox.
- Developer provisioning and owner password-setup routes: account creation,
  setup-link handoff, and mandatory first-use password replacement.
- `packages/domain/src/developer-notifications.ts`: validation, persistence,
  and transactional developer notifications.
- `packages/domain/src/provisioning.ts` and `packages/auth/`: developer-only
  provisioning and restricted, single-use owner activation.
- `packages/db/prisma/schema.prisma` and a new append-only migration:
  callback contact and scheduling fields.
- `tests/integration/`: validation, persistence, authorization, and notifications.
- Related contracts: [owner signup](owner-self-service-signup.md),
  [developer notifications](../notifications/developer-notifications.md),
  and [authentication](../auth.md).

## Behavior

- The sign-in page has no separate custom CRM call to action. Its existing
  owner signup entry opens `/signup`.
- Signup starts with two clearly labeled choices: use a standard website
  template, or request a website and CRM tailored to the business.
- Standard signup continues through the existing account, business, template,
  and plan flow. The tailored choice opens its contact and callback form
  within signup, with navigation back to the choice without submitting.
- The tailored form requires contact name, phone number, email, a description
  of the website/CRM needs, and a preferred callback date, time, and time zone.
  Business name remains optional. Email is labeled as the fallback contact
  when the owner cannot be reached by phone.
- Name is trimmed and limited to 100 characters; email is normalized and
  validated with a 254-character limit; phone is trimmed, limited to 32
  characters, and must contain 7 to 15 digits, allowing international prefixes,
  spaces, parentheses, and hyphens. Description requires 20 to 3000 characters;
  optional business name is limited to 120 characters.
- Time zone defaults to the visitor's browser zone and is visible and editable.
  The server validates the zone, calendar date, and time and rejects a callback
  in the past or a nonexistent local time. Ambiguous daylight-saving times
  require the visitor to choose an unambiguous time.
- The selected time is a preferred callback request, not a confirmed meeting
  or a claim about team availability. The form and success message state this.
- A successful submission stores the contact details, preferred callback
  instant and time zone, and requested work, then notifies developers in the
  same transaction. A failure creates neither a partial request nor notices.
- The tailored request never creates an owner account automatically. After
  consultation, a developer creates the owner's account and business through
  authorized provisioning and provides a password-setup link for the team to
  send to the owner's contact email.
- Newly provisioned owners must set their own password before accessing the
  admin portal. The setup link authorizes only password setup; it grants no
  CRM access and never includes a plaintext password. Password and confirmation
  follow the existing password policy.
- Setup links use cryptographically random tokens stored only as hashes, expire
  after 24 hours, and are single-use. Merely opening a link does not consume it;
  successful password setup consumes the token and activates the account in
  one transaction. Invalid, expired, or used links offer safe guidance to
  contact the team without exposing account details.
- The token travels in the URL fragment, which is removed from the browser's
  visible URL after loading. It is submitted only in the same-origin password
  POST body, never in server request URLs or referrers.
- A developer may regenerate a pending account's setup link, invalidating
  previous setup links and restricted sessions. This does not reset an already
  activated owner's password. Pending owners who try to sign in remain in the
  password-setup flow and cannot bypass it to reach the portal.
- Successful setup issues a regular session and opens the owner's existing
  business portal. The owner manages only their own authorized business and
  submits website-change requests under the existing plan and access rules.
- The developer inbox shows the phone, fallback email, requested work, and
  callback date/time with an explicit time zone. Those details are private;
  signed-out access redirects to login and non-developers receive 404.
- Each request offers Set up portal, opening the existing developer setup form
  with editable business name and private owner contact details. The main
  dashboard action is labeled Set up client portal. Opening the form does not
  create a portal or complete the request; creation still requires review and
  submission. Public contact fields are chosen separately from private request
  details. See [developer provisioning](developer-provisioning.md).
- Existing same-origin checks, request-size limits, honeypot handling, safe
  error envelopes, and submission rate limits remain in effect. Invalid input
  returns 400 and does not create a request.
- Existing `/request-custom-crm` links lead to the tailored choice in signup;
  there is no independently promoted request page below sign-in.
- Signup retains its existing local-development availability. This feature
  does not enable production account registration or email verification.
- Existing stored requests remain readable. Missing callback details on older
  requests display as not provided, without inventing a callback time.

## Examples

| State / input | Behavior |
|---|---|
| Owner selects standard website | Existing template and plan signup continues |
| Owner selects tailored website | Contact details and preferred callback controls appear inside signup |
| Owner submits a future time with phone and email | Request and developer notifications are saved together |
| Phone cannot be reached at the requested time | Developer can use the stored fallback email to contact the owner manually |
| Email or phone is missing, or callback is in the past | Submission is rejected with no request or notification |
| Developer views an older request | Existing information remains visible; callback details say not provided |
| Owner opens the developer request inbox | 404; other prospects' contact details are not disclosed |
| Developer provisions the consulted owner's business | A pending owner account and password-setup link are created; the team sends the link to the owner |
| Pending owner opens a valid setup link | They must choose and confirm a new password before portal access |
| Owner successfully sets their password | The link is consumed and their own business portal opens |
| Owner reuses an activated link or an expired link | No access is granted; guidance directs them to the team |
| Activated owner requests a website change | Existing owner feature-request authorization and plan limits apply |

## Verify

- Run `pnpm test`, `pnpm typecheck`, and `pnpm build`.
- Integration tests cover required fields, invalid phone/email/time zone,
  past and invalid dates, daylight-saving boundary times, persistence of the
  callback instant and zone, notification atomicity, and developer-only reads.
- Migration tests verify existing requests survive with absent callback fields.
- Activation tests cover authorized developer provisioning, mandatory password
  setup, expiry, single use, regeneration, no consumption on GET, transactional
  activation, and rejection of private CRM access before setup completes.
- Manually open sign-in and verify the standalone custom CRM link is absent.
- In local development, follow signup, select each option, and verify standard
  signup retains its existing behavior. Submit a tailored request and verify
  the developer inbox contains the phone, fallback email, and correct time zone.
- Complete the tailored path using only the keyboard and check it in a narrow
  viewport; field labels, errors, and the success message remain readable.
- Provision the consulted owner's account, open its setup link, set a password,
  and verify the owner enters only their business portal and can submit allowed
  change requests. Verify old and regenerated links cannot be reused.

## Constraints & decisions

- Tailored signup submits a service inquiry without asking the prospect for a
  password or billing address. Developers create the owner account after the
  consultation; the owner establishes their private password through the
  setup-link handoff rather than receiving a reusable developer-chosen password.
- Setup links extend the existing restricted activation and mandatory password
  replacement contracts. Standard owner signup remains unchanged. The reviewed
  implementation updates the authentication and developer-provisioning specs
  alongside these changes; it does not add active-account password recovery.
- Callback scheduling records a preferred time. Live team availability,
  reserved calendar slots, and calendar integration require a separate decision.
- The team sends the generated setup link and uses the fallback email for
  follow-up. Email delivery, calls, and confirmations are manual in this
  increment; no delivery provider is configured or implied.
- Existing public request storage and developer notifications are extended;
  a separate lead system is unnecessary. No dependencies are added.
- Database changes are additive; historical migrations and existing request
  records remain intact.
- The implementation updates the owner signup and developer notification
  specs to match the reviewed flow in the same change.

## Out of scope

- Automatic calls, email/SMS delivery, reminders, calendar invitations, confirmed
  appointments, scheduling capacity, and rescheduling workflows.
- Custom-service pricing, contracts, payments, and project tracking.
- Changes to standard website plans or existing owner feature-request limits.
- Production signup and email verification, governed by the authentication and
  owner signup contracts.
