# Set up developer accounts and hand a portal to its owner

Use a local project database and synthetic data for demonstrations. Never commit credentials or database files.

## Developer accounts

1. Install packages, generate Prisma, and start the local services:

   ```sh
   pnpm install
   pnpm prisma:generate
   pnpm dev
   ```

2. Open http://localhost:3000/login. Choose Developer, click Use test developer, and sign in. No account-creation command is needed. Developer access opens the existing dashboard.
3. To test the owner side, sign out, choose Business owner, click Use test business owner, and sign in. This account opens Sample business.

Both test accounts use Clientflow-test-2026!. The emails are developer@clientflow.test and owner@clientflow.test. A teammate can also enter friend@clientflow.test with the same password on the Developer option. These are synthetic local-development identities and are disabled outside development, including existing sessions.

For individually chosen developer credentials, the optional command pnpm --filter @project/migrate create-developer prompts for an email and hidden password. It remains a maintenance option, not a prerequisite for testing the website.

The web app applies migrations using the configured database. If startup fails on duplicate Service.business_id, resolve the duplicate local migration without editing applied history or resetting real data.

## Create and hand off a business

1. Select **Create business** and enter business name, type, description, contact email and phone, owner names, and owner login email.
2. Save. Copy the sign-in URL, owner email, and temporary password from the confirmation. The password is displayed once and expires in 24 hours.
3. Share those details privately with the owner. This increment does not send email.
4. In a separate browser session, the owner signs in and chooses a permanent password of 15-128 characters before accessing their business workspace.
5. On the developer dashboard, open the business card to check activation status. For a pending or expired account, **Generate new temporary password** invalidates the previous credential and unfinished setup sessions. Active owners cannot be reset here.

An owner email already used by an existing account is rejected. Do not reuse or transfer a legacy account without separately reviewed work.

## Verification drill

On a disposable app with a provisioned developer, supply `DEVELOPER_EMAIL` and `DEVELOPER_PASSWORD` through the process environment, and optionally `API_BASE_URL`, then run:

```sh
node tests/http/owner-provisioning.mjs
pnpm verify:api
node tests/http/customer-search-edit.mjs
```

These scripts create synthetic owners and businesses. They verify provisioning, first-password replacement, business isolation, owner provisioning denial, existing customer workflows, and logout replay protection. Do not print credentials or run the drill against a real customer database.

Manually verify keyboard access and error/pending states on login, business creation, credential handoff, and password replacement. Confirm that expired or regenerated credentials fail, owners cannot open developer business pages, and logout prevents private access with the old cookie.
