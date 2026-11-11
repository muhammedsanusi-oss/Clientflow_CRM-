# Website-less examples appeared as active businesses

**Specs:** `docs/specs/businesses/website-backed-directory.md`, `docs/specs/web.md`

## Report

The developer directory displayed example and placeholder businesses with no
attached Clientflow website, alongside a bare Active label.

## Expected vs actual

The directory should represent businesses with Clientflow websites. Previously
its query included every granted business, and Active described the owner's
login activation rather than the presence or availability of a website.
A missing owner also fell through the conditional into Active.

## Root cause

The dashboard reused a grant-scoped provisioning list without a website
eligibility condition. Cards and totals shared that unrestricted list, while
the activation label omitted its subject and treated absence as activation.

## The fix

The directory query requires configured website settings as well as a developer
grant. Cards label Owner access explicitly and handle missing owners separately.
Filtering changes no stored business, customer, or membership records.

## Why our defenses missed it

Provisioning tests created website-backed businesses and tested access grants;
they did not mix website-less examples into the same developer directory or
assert the rendered status of a missing owner.

## What changed beyond the fix

Integration tests include a real owner signup, website-less active and pending
examples, foreign websites, and an unassigned owner. They assert visible cards,
counts, owner labels, the empty state, and preservation of excluded data.
The directory and web specs define website eligibility separately from owner
account activation.
