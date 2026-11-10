/*
 * Code guide: packages/auth/src/test-accounts.ts
 * Fixed synthetic developer/teammate/owner identities for local development. Their public test password is
 * not a production credential; the auth layer rejects these IDs outside development.
 */
// Public, synthetic credentials for local project testing only.
// Intentionally public synthetic password for the local test identities; not a production credential.
export const LOCAL_TEST_PASSWORD = "Clientflow-test-2026!";
// Fixed development-only developer/teammate/owner identifiers and display information.
export const LOCAL_TEST_ACCOUNTS = {
  developer: { id: "local-test-developer", email: "developer@clientflow.test", name: "Test developer" },
  teammate: { id: "local-test-teammate", email: "friend@clientflow.test", name: "Test teammate" },
  owner: { id: "local-test-owner", email: "owner@clientflow.test", name: "Test business owner" },
} as const;
/*
 * Identifies the fixed synthetic account IDs so authentication and session lookup can disable them outside
 * development.
 */
export function isLocalTestAccount(id: string) {
  return Object.values(LOCAL_TEST_ACCOUNTS).some(account => account.id === id);
}
