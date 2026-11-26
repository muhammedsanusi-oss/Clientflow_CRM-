# Developer test login repair

## Reproduction

The live `/login` page returned 200 and the documented developer credentials
worked through `POST /api/auth/login`, but the browser's
`/_next/static/chunks/app/login/page.js` request returned 404. Without that
bundle, the test-account button and client-side form had no active handlers.

## Repair

Separate the disposable verification server's compiled files using
`CLIENTFLOW_DEV_INSTANCE=showcase`, which selects `.next-dev-showcase`.
The ordinary demo retains `.next-dev`. Next.js automatically restarted the
running web process after its configuration changed and regenerated the assets.
No password, membership, account, or database reset was needed.

## Verification

- Ran the complete showcase browser drill on the isolated instance while the
  normal demo remained running.
- Ran `tests/browser/developer-login.mjs` on port 3000 afterward: every login
  script returned 200, an actual mouse click on Use test developer filled both
  credentials, and Sign in as developer opened the developer dashboard.
- `pnpm test`: 366 tests passed (167 package tests and 199 root tests).
- `pnpm typecheck`, `pnpm build`, and `git diff --check`: passed.
- Configuration regression tests cover the normal, named, and production
  output directories and invalid instance names.

Refresh an existing login tab before retrying. Use test developer fills the
fields; Sign in as developer submits the credentials.
