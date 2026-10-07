# Migration drift and missing tenant checks broke business management

**Reported:** local repository review. **Spec:** `docs/specs/businesses/management-api.md`. No issue or PR number is assigned to this local fix.

## Report
A fresh PGlite database failed while replaying `0004_schema_update.sql`: `Note.updated_at` did not exist. The location and employee HTTP handlers accepted arbitrary business IDs after checking only that a session was present. The production build also logged a native Prisma engine load failure on ARM64 Windows.

## Expected vs actual
The web contract requires queries scoped to the current user, foreign-resource 404 responses, and mapped errors. The API trusted client-supplied business IDs, assigned new employees to the caller's user account, and did not map database failures. The active Prisma schema contained changes with no corresponding SQL transition.

## Root cause
The missing schema transition left lookup-table foreign keys, defaults, column types and indexes inconsistent with the client. The follow-up migration assumed that transition existed. Business ownership checks were not part of the domain operations, so route authentication did not enforce tenancy. Prisma's native Windows query-engine library was x64 while the Node process was ARM64.

## The fix
An added `0003` transition repairs replay without editing existing migration files and preserves legacy lookup data. Domain operations require active membership, employee creation resolves a separate email account transactionally, and routes map domain, Prisma and PGlite adapter failures. Prisma uses its supported JavaScript engine with the existing database adapters. Native module loading and explicit Next.js file tracing keep its WebAssembly compiler available at runtime; the live HTTP drill caught the bundler resolving that file from the wrong directory despite a successful build.

## Why our defenses missed it
`pnpm test` ran validation and service unit tests but omitted the root integration suite. The inherited database test only executed `SELECT 1`, and no tests exercised foreign business IDs, duplicates, employee permissions, or existing-data conversion. A zero build exit code hid engine errors logged during page collection.

## What changed beyond the fix
The default test command includes integration tests. Migration tests compare the replayed database's columns, defaults, enums, indexes and constraints with SQL generated from the current Prisma schema, verify legacy-data conversion, and prove invalid values roll back. Handler integration tests cover tenant isolation, active memberships, role checks, email sign-in, stable errors, and transaction rollback. Turbo generates the database client before dependent checks and builds.
