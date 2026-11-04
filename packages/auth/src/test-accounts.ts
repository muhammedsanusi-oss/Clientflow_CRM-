// Public, synthetic credentials for local project testing only.
export const LOCAL_TEST_PASSWORD = "Clientflow-test-2026!";
export const LOCAL_TEST_ACCOUNTS = {
  developer: { id: "local-test-developer", email: "developer@clientflow.test", name: "Test developer" },
  teammate: { id: "local-test-teammate", email: "friend@clientflow.test", name: "Test teammate" },
  owner: { id: "local-test-owner", email: "owner@clientflow.test", name: "Test business owner" },
} as const;
export function isLocalTestAccount(id: string) {
  return Object.values(LOCAL_TEST_ACCOUNTS).some(account => account.id === id);
}
