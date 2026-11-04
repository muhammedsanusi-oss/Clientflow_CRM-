# Run the local app on Windows

**Use when:** starting the combined CRM dashboard, customer pages, and scheduling calendar locally.
**Last drilled:** PowerShell startup, seed rerun, HTTP form submission and calendar checks, integration tests, typecheck, and build; browser and keyboard checks require an available browser.

## Before you start

1. Open PowerShell in the repository folder.
2. Stop any previous `pnpm dev` terminal with Ctrl+C before starting another instance.
3. Keep the project-local x64 Node launcher at `node_modules/.bin/node.exe` on Windows ARM; the embedded PostgreSQL dependency supports Windows x64.

## Steps

1. Start the services:

   ```powershell
   $env:DB_PORT = "55433"
   $env:DATABASE_URL = "postgresql://postgres:postgres@127.0.0.1:55433/postgres"
   corepack.cmd pnpm dev
   ```

2. Wait for `postgres ready` and the web server's `Ready` message. Keep this terminal open.
3. Open http://localhost:3000/login. Select Developer, click Use test developer, then sign in. No account setup in the terminal is required.
4. Use Create business to enter its details and owner login email, then share the displayed temporary password.
5. Sign out, select Business owner, and enter the owner's email and temporary password. Choose a permanent password to open the linked portal. The Use test business owner button instead opens the sample business. See [developer and owner setup](developer-owner-setup.md).
6. Stop the services with Ctrl+C in the first terminal.

## Verify it worked

1. Run `curl.exe -s http://localhost:3000/api/health` and expect `{"status":"ok","db":"ok"}`.
2. Confirm / and /businesses/new render for developers. Confirm /customers, /customers/new, and /calendar render for an activated owner.
3. Confirm the owner portal displays its business name. A newly provisioned business has no fabricated customers, locations, or services.
4. Run `corepack.cmd pnpm test`, `corepack.cmd pnpm typecheck`, and `corepack.cmd pnpm build` with development stopped before the build.

## If this didn't work

1. For port-in-use errors, stop duplicate project terminals; do not reset the database.
2. For Windows ARM architecture errors, restore the project-local x64 runtime and matching locked dependencies:

   ```powershell
   curl.exe -L --fail https://nodejs.org/dist/v24.22.0/win-x64/node.exe -o node_modules/.bin/node.exe
   corepack.cmd enable pnpm --install-directory node_modules/.bin
   corepack.cmd pnpm install --cpu=x64 --os=win32 --force --frozen-lockfile --optimistic-repeat-install=false
   corepack.cmd pnpm prisma:generate
   ```

3. New owner workspaces start empty. Add customers as the activated owner. Legacy demo users do not receive passwords or access transfers automatically.

## Related

- [Web](../specs/web.md)
- [Customer calendar](../specs/appointments/customer-calendar.md)
