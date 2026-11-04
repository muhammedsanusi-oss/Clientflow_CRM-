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

## Automated verification

```sh
pnpm test
pnpm typecheck
pnpm build
node tests/http/website-templates.mjs
```

The HTTP drill targets a disposable local development app at `API_BASE_URL` (default `http://localhost:3000`). It uses the public project test developer account, creates four synthetic businesses and owners, activates the owners, checks public pages, sends contact messages, and verifies isolated private inboxes. It prints only demo site URLs and intentionally public test account details. It must not target production or real customer data.

When browser tooling is available, verify mobile layouts, keyboard navigation, focus visibility, preview dialog behavior, sample-fill interaction, and contact pending/error/success states. Record unavailable visual checks in the handoff.

## Verification record

The local HTTP drill passes for all four designs, contact delivery, owner activation, and inbox isolation. Build and typecheck pass. The 126 package/integration tests pass when the pre-existing duplicate `0003_business_services.sql` is temporarily excluded from fresh-database replay; that file is restored unchanged. Browser automation was unavailable, so visual/mobile inspection and the keyboard-only preview/sample-fill drill remain unverified.
