# Subscription status hid the owner's website editor

**Spec:** `docs/specs/businesses/website-editing.md`. Local policy correction;
no issue or pull request created.

## Report

An owner saw Website preview and a notice saying editing required an active
plan. Edit website was missing from both the dashboard and published preview.

## Expected vs actual

The requested owner-admin behavior permits editing regardless of subscription.
The previous subscription contract instead made pending, past-due, canceled,
and expired plans ineligible. Its navigation and server tests encoded that
earlier policy consistently, so exposing a button alone would still fail.

## Root cause

The editor's domain authorization combined active OWNER membership with paid
subscription status. The dashboard and preview independently reused the paid
status predicate to hide Edit website. Ownership and paid CRM/support access
were treated as the same capability.

## The fix

Authorize website reads, uploads within the existing allowance, and publication
through regular sessions and active owner membership, independently of billing.
Always expose the configured website's editor links. Keep image quotas, CRM,
paid feature requests, and managed-service rules in their existing boundaries.

## Why our defenses missed it

Existing lifecycle assertions expected the editor to reject inactive plans,
matching the prior written policy. They did not represent the corrected product
requirement that owners retain website control regardless of billing.

## What changed beyond the fix

Specs and subscription copy distinguish website editing from paid access.
Regression tests cover every plan with pending, active, overdue, canceled, and
expired subscriptions, while retaining cross-business/staff rejection and paid
CRM restrictions. A browser drill follows actual dashboard and preview links,
uploads before checkout, and publishes after failed payment and cancellation.
