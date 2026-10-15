# Integration tests

End-to-end tests against a real Postgres engine running in-process via PGlite
(Postgres-in-WebAssembly). No server, no Docker, no network.

| File | What it tests |
|---|---|
| `smoke.test.ts` | Boilerplate — verifies the PGlite door connects, inherited from `main` |
| `customers.test.ts` | Add-customer validation, business scoping, cross-business uniqueness, and inactive-employee rejection |

**Note**: PGlite does not support `pg_notify`. SSE tests require a real
Postgres connection or mocking.
