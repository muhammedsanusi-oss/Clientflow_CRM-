# Project UX audit

## Coverage and limits

All 29 page entry points were inventoried. Source review covered page layouts,
shared navigation, editor controls, customer/scheduling forms, booking gates,
and relevant subscription/domain contracts. Browser review exercised 27 paths
at 1440px and 390px: 54 checks using synthetic developer/owner accounts and
signed-out public access. Evidence: `browser-results.json` and the audit script
in this directory. Browser screenshots show local demo data.

This is a UX and navigation audit, not a full security or production certification.
The browser fixture contains no customers or appointments. Customer detail,
customer edit, and internal appointment screens were source-reviewed, not
exercised with populated records. Restricted activation and expired/Standard/
Managed subscription states were reviewed in source rather than changed live.
The root request-custom route is a source-confirmed redirect to tailored signup.

All exercised paths returned successful final HTTP responses; no horizontal
overflow occurred in the sampled initial states. This does not establish that
every form, populated calendar, long record, or plan state works correctly.
No business content, subscription, credential, or appointment was changed.

## Confirmed findings

| Priority | Finding and effect | Evidence | Recommended correction |
|---|---|---|---|
| High | Fixed account controls obscure mobile back navigation on business creation, notifications, and custom CRM requests | Browser rectangles overlap at 390px on `/businesses/new`, `/notifications`, `/custom-crm-requests`; shared fixed header in `apps/web/app/layout.tsx` | Reserve account-header space consistently across private screens |
| High | Selected business is lost when the customer list's Calendar link uses `/calendar` without `businessId` | Browser link inventory; `apps/web/app/customers/page.tsx`; unscoped calendar enters a different layout/query path | Preserve the authorized selected business in navigation |
| High | Standard website owners have a Back to business portal link targeting CRM-only customers; inactive website owners still see an Edit website CTA in their published preview | `apps/web/app/website/page.tsx`, `ownerWorkspaceHref`, `getCustomerBusinessForUser`, website entitlement checks | Use the existing workspace destination helper and entitlement-aware CTAs; keep server checks intact |
| High | Every public website offers Book online, although public booking queries require CRM access | Shared `business-website.tsx` header renders the link unconditionally; `getPublicBookingOptions` applies `crmEntitlementWhere` | Supply an authorized public booking capability; show contact fallback for ineligible sites |
| High | Booking needs an active location but owners have no location-management screen | Public/internal forms require a location; APIs exist at `/api/Business/[id]/locations`; no page or form configures locations; provisioning does not create one | Add a separately reviewed location setup increment using the existing protected API, with a useful setup checklist |
| Medium | Inquiries and all-business customer notes exist but are absent from the main owner navigation | `owner-workspace.tsx` links omit both; inquiries is nested under Customers; no link opens `/notes` | Add eligible destinations and correct active states, keeping plan restrictions |
| Medium | Website editor repeats instructions in the page introduction, action card, preview notice, and contextual tools; its chrome differs from the overview | Developer editor screenshot and editor route JSX | Compact page introduction and action area, consistent surfaces, clearer section/image controls |
| Medium | Editor exposes no clear unsaved/saved draft status or leave warning | Editor has publication success state but no dirty comparison, beforeunload handler, or Cancel confirmation | Show draft status and protect accidental departures; no autosave or sticky section toolbar |
| Medium | Some previously supported color roles have no direct control after the inspector was removed | Color schema/shared renderer support link and button background; current toolbar provides text/highlight/section/page only | Expose relevant controls when the user focuses a link/button; retain inline editing |
| Medium | Calendar and customer/appointment profiles lack consistent content gutters; a populated seven-column calendar is a mobile readability risk | Calendar mobile screenshot shows edge-to-edge heading/actions; profile/appointment `main` omits padding; calendar has fixed seven-column structure | Consistent padding and a compact mobile agenda; test populated appointments before claiming the calendar fits |
| Medium | Customer empty state offers Refresh customer list instead of a nearby first-customer action; managed-service and developer inbox empty states are bare text | Customer, managed-service, and requests page JSX | Explain the empty state and provide the existing next action where one exists |
| Medium | Timestamps and statuses vary between raw ISO dates, locale text, uppercase enums, and sentence labels | Subscription/managed history, owner preview, overview, and inbox JSX | Consistent readable labels and explicit timezone/date context |
| Medium | Owner dark-theme styling relies on broad utility-class overrides, while some headings use fixed dark colors | `owner-workspace.css`; managed-service/subscription heading `text-[#172b4d]` | Use shared semantic surface/text styles; verify all four themes in nested screens |
| Medium | Scheduling forms can submit without local pending/success feedback and redirect invalid entries to a generic error | Hours/services page forms and server actions | Preserve values on failure, identify invalid fields, and show per-form pending/success states |

## Existing test-health blocker

The latest `pnpm test` attempt fails eight database migration-contract tests
because `0003_business_services.sql` re-adds `Service.business_id`. This prevents
the root integration stage from running. The last overview-specific six tests,
typecheck, and production build passed. This audit does not alter migrations.
Resolving the migration conflict needs a separate repair that respects the
append-only contract and preserves local data.

## Proposed order

1. Shared private-page spacing and navigation correctness, including contextual
   business IDs and plan-aware links; carry the overview treatment into the
   editor, inquiries, subscriptions, and managed-service pages.
2. Inline editor usability: concise instructions, grouped controls, unsaved state,
   accidental-leave protection, and the missing button/link color controls.
3. Owner CRM polish: navigation, consistent gutters, useful empty states,
   readable dates/statuses, and a tested mobile calendar with populated records.
4. Separate scheduling setup increment: location management and setup guidance,
   then form feedback; separately resolve the migration test blocker.

The implementation contract for the first increment is drafted at
`docs/specs/workspace/usability.md`. The remaining increments need their detailed
feature specs reviewed before implementation. No application code was changed
as part of this audit.
