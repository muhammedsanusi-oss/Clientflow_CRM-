# Deactivated memberships retained item access and migration commits could outlive their ledger

**Specs:** `docs/specs/crm/api.md`, `docs/specs/deploy.md`

## Report

Source review found that CRM item endpoints could return records to a signed-in
user whose business membership was inactive. The same review found that an
overlapping appointment POST returned 500 and that a migration could commit
before its ledger entry was recorded. No production incident was established.

## Expected vs actual

Private CRM access requires active business membership, including known-ID
reads. Several collection routes checked active access, while item queries
checked only membership identity. Appointment conflicts should return 409, but
the POST error handler treated the domain conflict as unexpected. Migration
ledger atomicity was previously unspecified; separate commits permitted
schema changes without a matching ledger entry after an interruption.

## Root cause

Authorization depended partly on route prechecks rather than the domain query
predicate. Appointment conflict mapping was placed in GET instead of POST.
The migration runner executed historical SQL, including its COMMIT, before
issuing a separate ledger INSERT.

## The fix

Affected domain predicates require active membership, and POST maps appointment
conflicts to 409. The runner executes each migration body and ledger INSERT
inside one transaction without editing historical SQL files.

## Why our defenses missed it

Existing inactive-member tests covered selected collection and browser paths,
but not all CRM item reads. Appointment tests checked domain rejection rather
than the HTTP conflict response. Migration replay tests did not fail the
ledger write after schema operations.

## What changed beyond the fix

Regression tests exercise active and subsequently deactivated membership on
seven item endpoints and domain collections, verify the POST response and lack
of partial writes, and inject ledger failures for wrapped and unwrapped SQL.
The CRM API and deployment specs now state these contracts and verification
commands. Previously inconsistent databases still require separate diagnosis.
