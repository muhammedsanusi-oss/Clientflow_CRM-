# Authentication

Auth.js v5 uses GitHub OAuth, the Prisma adapter and database sessions in both
development and production. The cookie contains a random token, not a User ID.

- currentUserId(): the session user's string ID, or null.
- auth(): resolves the authenticated database session.
- handlers: GET/POST endpoints mounted at /api/auth/[...nextauth].
- signIn/signOut: server-side form actions; sign-out revokes the database session.

There are no username, browser user-ID, or environment identity shortcuts.
Legacy usernames and employee relationships remain stored; matching profile
email does not claim them. See [identity contract](../../docs/specs/auth.md)
and [OAuth setup](../../docs/runbooks/github-oauth-setup.md).
