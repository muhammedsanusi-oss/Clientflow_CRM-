---
type: infrastructure
---
# Seams — the unifying pattern

The same shape appears across every cloud dependency in this project:

```
local dev:  a stand-in (emulator, stub, env flag)
production: the real thing (Azure, real auth, etc.)
```

The stand-in is the default. Production is a single environment variable away.
This is called the **seam pattern** — a deliberate cut point where local and
production behavior diverge, controlled by configuration, not code branches.

## Instances

| Subsystem | Local stand-in | Production | Env var / switch |
|---|---|---|---|
| Database (tests) | PGlite (in-memory) | — | `PGLITE_DATA_DIR` flag |
| Database (dev) | Local Postgres via `apps/db-server/` | Azure Postgres | `DATABASE_URL` |
| Blob storage | Azurite | Azure Blob Storage | `AZURE_STORAGE_CONNECTION_STRING` |
| Queue | Azurite | Azure Storage Queue | `AZURE_STORAGE_CONNECTION_STRING` |
| Identity | Email/password and database sessions | Same identity mechanism | Explicit account provisioning; see auth.md |

Local PostgreSQL listens on port 15432 by default. The database client, migration
command, and notification listener use the matching local URL. A custom port
requires both `DB_PORT` for the server and a matching `DATABASE_URL` for clients.
Restart the development processes after changing connection settings; do not
reset stored data to repair a port binding failure. See the
[Windows startup runbook](../runbooks/run-local-windows.md).

## Design intent

- **No code branches.** The seam is never an `if (isLocal)`. The stand-in and
  the real thing implement the same interface, and the configuration chooses
  which one the SDK connects to.
- **Default to running.** Every seam works out of the box with zero cloud
  setup. `pnpm dev` starts the stand-ins (Postgres, Azurite).
- **Safe by default.** Identity has no development bypass; the same database-session boundary applies locally and when hosted.
- **One env var per seam.** Azure Blob and Queue share
  `AZURE_STORAGE_CONNECTION_STRING`; the database has its own
  (`DATABASE_URL`). Identity uses the same verified session mechanism in all environments. Each configurable cloud seam
  is a distinct env var away from production, and none requires more than
  one.

## ADRs

- [ADR-0005](../adr/0005-pglite-tests.md) — PGlite as the test-database seam.
- [ADR-0008](../adr/0008-azurite-seam.md) — Azurite as the blob/queue seam.
- [ADR-0003](../adr/0003-dev-identity-stub.md) — the identity stub as the auth
  seam.

## Adding a new seam

1. Write the stand-in (emulator, stub, env guard).
2. Default to the stand-in.
3. Require one env var to swap to production.
4. Add a health check or probe that tells the user if the stand-in is down.
5. Write an ADR capturing the decision.
6. Add a row to this table.
