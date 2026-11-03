# Local GitHub OAuth setup

Configure credentials locally, then have a teammate perform the independent manual proofs. No secrets belong in chat or the PR.

1. Open GitHub Settings → Developer settings → OAuth Apps → New OAuth App (or Register a new application).
2. Set Application name to `Clientflow local`; Homepage URL to `http://localhost:3000`; Authorization callback URL to `http://localhost:3000/api/auth/callback/github`. Leave device flow disabled. Register the application.

   Each teammate running a separate development instance registers their own OAuth app. For Codespaces, use `https://<your-codespace>-3000.app.github.dev` as the homepage and that exact origin plus `/api/auth/callback/github` as the callback; set AUTH_URL to that origin. The two-account proof uses one shared running instance, not two independent databases.
3. Copy the Client ID into your local editor. Generate a client secret and copy it directly into the local file below. Never paste secrets into chat, commit them, or include them in screenshots/PRs.
4. Create `apps/web/.env.local` locally with these keys, replacing the placeholders:

   ```dotenv
   AUTH_GITHUB_ID=replace-with-client-id
   AUTH_GITHUB_SECRET=replace-with-client-secret
   AUTH_SECRET=replace-with-random-secret
   AUTH_URL=http://localhost:3000
   ```

5. Generate AUTH_SECRET with PowerShell, then paste the result directly into your local file:

   ```powershell
   $authBytes = New-Object byte[] 32
   $authRng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
   $authRng.GetBytes($authBytes)
   [Convert]::ToBase64String($authBytes)
   $authRng.Dispose()
   ```

6. Run `git check-ignore apps/web/.env.local`; it must print that path. Do not force-add this file. Keep placeholders in tracked examples.
7. After implementation, run `pnpm install`, `pnpm prisma:generate`, and `pnpm dev`. The existing embedded database process applies numbered migrations without resetting data. If using an external database, review its backup and migration procedure before running `pnpm db:migrate`. Never run `pnpm db:reset` to resolve an OAuth problem.
8. Open exactly `http://localhost:3000/login` and use GitHub sign-in. Keep the hostname and callback identical; `127.0.0.1` is a different origin. Restart the web process after changing environment variables.
9. A teammate completes and records all four proofs in `docs/reviews/github-sign-in.md`, using two separate browser profiles and two GitHub accounts for the isolation proof.

Existing demo/employee accounts remain stored but are not automatically claimed by an OAuth login with a matching email or username. Use newly created businesses for the two-account drill; legacy access requires a separately verified membership transfer.

References: [GitHub OAuth app registration](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app), [Auth.js GitHub provider](https://authjs.dev/getting-started/providers/github), [Auth.js Prisma adapter](https://authjs.dev/getting-started/adapters/prisma).

## HTTP drills with real sessions

After signing into the same disposable running app as GitHub A and B, save each
Auth.js cookie as a single name=value line in a separate local text file outside
the repository. These are bearer credentials: never print, share or commit them.
Use a fresh A account for the onboarding drill because it expects no businesses.
Set AUTH_COOKIE_FILE_A and AUTH_COOKIE_FILE_B to those file paths in your shell,
then run pnpm verify:api, node tests/http/business-onboarding.mjs, or
node tests/http/customer-search-edit.mjs. Use API_BASE_URL matching the exact
origin you signed into. The scripts create CRM rows and require real sessions;
they do not perform the GitHub OAuth flow or replace the teammate's four proofs.
Delete the local cookie files and sign out afterward to revoke those sessions.

For Codespaces, keep Next.js Server Action allowedOrigins limited to the exact
forwarded hostname and pass CODESPACE_NAME/GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN
through Turbo if configuring that deployment. Do not disable Origin checks or
use wildcard allowed origins to resolve an Invalid Server Actions request.
