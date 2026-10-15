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
3. Seed the demo workspace in a second PowerShell terminal in the same repository:

   ```powershell
   $env:DATABASE_URL = "postgresql://postgres:postgres@127.0.0.1:55433/postgres"
   corepack.cmd pnpm db:seed
   ```

4. Open `http://localhost:3000/login` and sign in as `demo-user`.
5. Open Customers from the homepage, select a customer, and choose Schedule; open Calendar to see appointments.
6. Stop the services with Ctrl+C in the first terminal.

## Verify it worked

1. Run `curl.exe -s http://localhost:3000/api/health` and expect `{"status":"ok","db":"ok"}`.
2. Confirm `/`, `/customers`, `/customers/new`, and `/calendar` render after sign-in.
3. Confirm a seeded customer has a scheduling form with two locations and three services.
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

3. For an empty customer list, sign out and sign in as the seeded `demo-user`; other usernames have no demo employee membership.

## Related

- [Web](../specs/web.md)
- [Customer calendar](../specs/appointments/customer-calendar.md)
