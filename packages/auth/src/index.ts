/*
 * Code guide: packages/auth/src/index.ts
 * Authentication entry point. Exposes session resolution, cookie/session lifecycle, credential login, and
 * temporary-password replacement; hashing helpers have a separate import entry.
 */
// Re-export connection: { currentUserId, currentSession, sessionToken, startSession, endSession,
// SESSION_COOKIE } -> packages/auth/src/current-user.ts. Importing this entry exposes definitions; it does
// not call them.
export { currentUserId, currentSession, sessionToken, startSession, endSession, SESSION_COOKIE } from "./current-user";
// Re-export connection: { authenticate, replaceTemporaryPassword, AuthenticationError } ->
// packages/auth/src/credentials.ts. Importing this entry exposes definitions; it does not call them.
export { authenticate, replaceTemporaryPassword, completeOwnerSetup, AuthenticationError } from "./credentials";
