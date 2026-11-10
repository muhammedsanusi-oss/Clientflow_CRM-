# Create and test a business website

Use a local app with its database migrations applied. Use synthetic information for testing.

## Create a site

1. Open `/login`, choose **Developer**, and use the test developer account.
2. On the existing dashboard, select **Create business**.
3. Select **Bakery**, **Barbershop**, **Salon**, or **Contact**. Choose **Preview template** to see the design with the current form details; Escape or **Close preview** closes it.
4. Choose **Use sample details** to fill fictional information and a fresh owner email, or enter the business and owner information yourself. The owner login email is private; business contact fields are public.
5. Select **Create business & website**. Copy the one-time owner credential from the confirmation, then select **Open website**. The website URL is `/sites/<businessId>`.
6. Check the business name, description, contact details, address, and hours. Repeat for the remaining templates. Previous business records are not published automatically.

## Test contact delivery and owner access

1. Open the saved website, enter a synthetic name/email/message in the contact form, and send it. Expect a delivery confirmation.
2. In a separate browser session, sign in as **Business owner** with the email and temporary password from creation. Choose a permanent password.
3. In the owner workspace, select **Website inquiries** and confirm that the message appears with its sender and time.
4. Open another owner's business and confirm its messages are not accessible. Signed-out users cannot read the inbox.

Messages are saved in Clientflow; this increment does not send email, create customers automatically, reserve appointments, or take payment. Example offering cards are marked as examples.

## Customize and publish

1. In the developer dashboard, choose **Edit website** on a configured business; the business detail page offers the same action.
2. Edit the public details, template, headings, feature labels, or offering titles. Public contact email is separate from owner login email.
3. Choose **Preview changes**. Verify the unsaved text, use keyboard navigation to inspect the controls, and confirm preview messages are disabled. **Cancel** leaves the live website unchanged.
4. Return to the editor, make the changes again, and choose **Save and publish**. Expect a success announcement and updated public content at the same website URL.
5. Sign in as that business's owner, choose **Website**, and verify the published text and timestamp. The owner sees no publishing controls.
6. Load the editor in two developer sessions; publish one, then submit the older version in the other. Expect a conflict with inputs retained. Copy any text to retain before reloading.
7. Quote and collect any extra customization fee manually; publication performs no charge and creates no appointment payment.

## Automated checks

```sh
pnpm test
pnpm typecheck
pnpm build
node tests/http/website-templates.mjs
node tests/http/website-editing.mjs
```

The HTTP drill targets a disposable local development app at `API_BASE_URL` (default `http://localhost:3000`). It uses the public project test developer account, creates four synthetic businesses and owners, activates the owners, checks public pages, sends contact messages, and verifies isolated private inboxes. It prints only demo site URLs and intentionally public test account details. It must not target production or real customer data.

The website-editing drill also requires `DEVELOPER_EMAIL` and `DEVELOPER_PASSWORD` for an existing developer on the disposable instance. It reads that instance's local Next.js action manifest, so run it from the same checkout that serves the app. It provisions synthetic owners, calls the real publication action, checks owner/public visibility, conflicts, same-origin protection, escaped content, and business isolation. It does not target a remote deployment.

When browser tooling is available, verify mobile layouts, keyboard navigation, focus visibility, preview dialog behavior, sample-fill interaction, and contact pending/error/success states. Record unavailable visual checks in the handoff.

## Verification record

The automated suite includes fresh-schema parity, a populated website upgrade, transactional revision rollback, concurrent publication, and developer/owner authorization checks. Browser automation was stopped because the current browser URL could not be identified reliably; visual/mobile inspection and keyboard-only interaction remain unverified.
