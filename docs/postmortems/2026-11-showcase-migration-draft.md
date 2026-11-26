# An untracked duplicate migration prevented the showcase database from replaying

**Spec:** `docs/specs/deploy.md` (Migration recovery). Local repair; no issue or PR created.

## Report

After restoring locked dependencies, `pnpm test` failed eight migration tests
with `column "business_id" of relation "Service" already exists`. The package
failure prevented the root integration stage from starting.

## Expected vs actual

The migration contract requires historical SQL to remain intact and the chain
to replay. A second, untracked migration attempted to repeat a tracked change.

## Root cause

`0003_business_services.sql` repeated the Service business column, two indexes,
and foreign key already created by `0002_business_tenancy.sql`. The runner and
raw migration tests enumerate every `.sql` file, including untracked drafts.

## The fix

Preserved the untracked file byte-for-byte under `artifacts/migration-drafts/`
and verified its checksum after moving it out of the executable directory.
No tracked migration, local data directory, or database ledger was edited.

## Why our defenses missed it

The existing migration tests caught the conflict, but earlier walkthrough notes
described temporarily excluding the file instead of leaving a replayable tree.
An untracked local file also does not appear in a normal tracked diff.

## What changed beyond the fix

The deployment spec clarifies where SQL drafts belong; the archived draft has
a README explaining its provenance. The full migration replay tests remain the
regression check, without skipping files or weakening assertions.
