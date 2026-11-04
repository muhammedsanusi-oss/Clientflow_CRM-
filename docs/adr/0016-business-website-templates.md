# ADR-0016: Reusable public business templates with a private owner inbox

## Status

Accepted

## Context

Developers need reusable Bakery, Barbershop, Salon, and Contact website standards that become testable after business creation. Clientflow currently provisions private workspaces and explicitly excludes public business websites. Its authentication and web contracts keep routes private except the existing login, authentication, and health surfaces.

## Decision

Add explicit website configuration to newly provisioned businesses and render it through four shared template designs at `/sites/<businessId>`. Keep the existing developer dashboard, owner-email provisioning, password activation, and private CRM workspace. Old businesses remain private unless separately configured in future work.

Declare the configured website route and its contact submission endpoint public. These paths use an explicit projection of public business fields and expose no private owner, credential, CRM, or inquiry data. Public contact messages are persisted to a business-bound owner inbox; they are not forwarded by email or converted into customers automatically.

Create websites as routes of the existing application. Do not generate separate repositories, apps, cloud deployments, or domains. Use existing packages and append-only schema changes without adding third-party dependencies.

## Consequences

Developers can test all four website types immediately with sample form information. Shared components keep each template consistent across businesses. Public contact handling introduces validation, abuse limits, and explicit private inbox authorization that must be verified alongside existing tenant isolation.

This extends ADR-0014's private-workspace scope with deliberate public website routes. It does not change developer/owner identity boundaries or authorize a production hosting launch.

## See also

- `../specs/businesses/website-templates.md`
- `../specs/businesses/developer-provisioning.md`
- `../specs/auth.md`
- `../specs/web.md`
