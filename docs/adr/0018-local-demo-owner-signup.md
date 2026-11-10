# ADR-0018: Local-only unverified owner signup for demos

## Status

Accepted

## Context

ADR-0017 establishes verified email ownership before self-service accounts and
businesses are created. No email-delivery provider is selected, so verified
signup cannot yet be demonstrated end to end. A local demo flow can exercise
business onboarding and the existing website editor without sending email, but
unverified signup must not be exposed in production.

## Decision

- Allow the self-service signup flow only when the server is running in local
  development mode. Production and other non-development runtimes return 404
  for signup pages and endpoints; client input cannot override this restriction.
- Do not send verification email or imply that a local demo email address has
  been verified.
- On a valid completed local signup, atomically create the owner identity, one
  business, its website template, the private structured billing address, an
  active OWNER membership, and explicit developer access grants.
- Bind the business to the owner through the authenticated user ID and OWNER
  membership. Do not authorize by an email or business ID supplied by the
  browser.
- Do not claim or reset existing accounts by matching email. A duplicate
  signup email fails without changing existing records.
- Keep all existing developer-provisioned accounts and internal onboarding
  available. Preserve existing account, business, website, and image data.
- Keep production self-service signup disabled until a provider is selected and
  verified email ownership is implemented under ADR-0017.

## Consequences

Local demos can exercise owner signup, tenant isolation, website editing, and
publication without an email provider. The demo does not prove control of an
email address and must not be available in production. Production signup
continues to require verified email ownership.

## Open question before implementation

- Which email-delivery provider should be used when production signup is
  implemented?

## Supersedes

If accepted and implemented, this decision supersedes ADR-0017 only for
local-development demos. ADR-0017 continues to govern production self-service
signup and email verification.

## See also

- [Owner self-service signup](../specs/businesses/owner-self-service-signup.md)
- [Verified owner signup architecture](0017-owner-self-service-signup.md)
- [Authentication](../specs/auth.md)
