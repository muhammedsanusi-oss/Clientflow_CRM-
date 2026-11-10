# ADR-0017: Owner self-service signup and website ownership

## Status

Accepted

## Context

ADR-0014 assigns developers responsibility for creating owner accounts and
businesses. Business owners now need to create their own account and website
using an email address they control. The current authentication contract does
not include public signup or email delivery, and the website editor already
provides the customization and publication experience after a business exists.

The owner identity must be bound to the business through an authenticated
membership, not by trusting a submitted email address or URL parameter. Billing
address information is private business data and must not enter public website
projections.

## Decision

- Add an owner self-service onboarding path. Each owner account creates at most
  one business through this path. Keep developer provisioning for existing
  accounts and internal onboarding. Signup does not claim, merge, or reset an
  existing account based only on a matching email.
- Require proof of control of the normalized signup email before granting an
  authenticated owner session or creating the owner’s business. No unverified
  registration may access private routes.
- Integrate the chosen email-delivery provider behind the existing services
  seam. The provider is intentionally undecided; signup implementation is
  blocked until a provider is selected.
- After verification and completion of the business setup, create the owner
  identity, business, active OWNER membership, website template selection, and
  explicit developer access grants atomically.
- Store the requested billing address as private structured business data:
  street, optional apartment/suite, city, state, and ZIP code. Do not expose it
  in public website responses or editor previews.
- Continue to authorize owner reads and writes by the active OWNER membership.
  The email identifies the account; it is not itself an authorization grant.
- Reuse the existing website template and visual editor, including its draft
  preview and publish workflow.

## Consequences

Owners can initiate their own account and website setup without a developer
creating credentials. Public signup adds abuse, duplicate-account, verification
token, and email-delivery concerns. Existing developer-provisioned accounts and
businesses remain intact and use their existing activation path.

No email vendor or payment processing is selected by this proposal. Billing
address collection does not authorize or charge a payment method.

## Open questions before implementation

- Which email-delivery provider should send and verify signup links?

## Relationship to existing decisions

ADR-0014 continues to govern developer provisioning for existing accounts and
internal onboarding. This decision adds a verified, owner-initiated path without
changing developer identity, explicit developer grants, owner membership
authorization, or existing account data.

## See also

- [Owner self-service signup](../specs/businesses/owner-self-service-signup.md)
- [Authentication](../specs/auth.md)
- [Developer provisioning](../specs/businesses/developer-provisioning.md)
