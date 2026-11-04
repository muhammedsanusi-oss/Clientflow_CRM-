# Authentication

Email/password login supports developer accounts and developer-provisioned business owners. Developer accounts open the existing dashboard. A temporary owner password grants a restricted session until the owner chooses a permanent password.

Public exports include currentUserId(), currentSession(), authenticate(), replaceTemporaryPassword(), startSession(), and endSession(). The crypto-only password subpath provides salted scrypt hashing for the domain and the interactive developer bootstrap command without importing Next.js request APIs.

Cookies contain opaque tokens; the database stores their SHA-256 digests. Restricted sessions resolve to no CRM identity. Logout revokes the database record. No username-only, GitHub, header, or environment identity bypass exists.

See [the identity contract](../../docs/specs/auth.md), [developer provisioning](../../docs/specs/businesses/developer-provisioning.md), and [developer setup](../../docs/runbooks/developer-owner-setup.md).
