# ADR-0013: Restore username-only demo sign-in

## Status

Accepted

## Context

The project no longer needs GitHub OAuth. The requested behavior is the email-or-username demo login immediately preceding the GitHub integration, rather than the older automatic identity stub.

## Decision

Restore that demo login, its unsigned HTTP-only user-ID cookie, logout, and explicit production login guard. Remove GitHub runtime requirements while preserving stored data and applied migrations. Update the infrastructure identity contract and affected documentation with implementation.

## Consequences

Local use requires no OAuth setup. Demo identity does not establish account ownership: users can select another username or alter their identity cookie. This is a deliberate return to the previous demo behavior, not production authentication. Existing tenant-scoped queries continue to operate on the selected identity.

## See also

- `../specs/auth/demo-sign-in.md`
- `../specs/auth.md`
