# Loading feedback verification

- Shared PageLoading fallbacks replace the previous inconsistent placeholders.
  The root fallback covers every route without its own loading boundary;
  existing route boundaries and dashboard/subscription/public site/booking
  boundaries use readable labels and the same visual treatment.
- Shared AppLink uses the installed Next version's public useLinkStatus API.
  It preserves link behavior while showing a nonblocking pending notice before
  response content arrives. No guessed progress or production delay is added.
- The browser drill holds real navigation requests for owner, developer, and
  signed-out public links. All three show feedback and remove it after completion.
  The test checks mobile wrapping and reduced-motion animation suppression.
- Loading screenshots were visually reviewed. Placeholder elements are hidden
  from assistive technology; visible status text uses a polite live region.
- Typecheck and production build pass; 28 targeted renderer/navigation tests pass.
  All 191 root integration tests pass in the temporary source copy that excludes
  the existing duplicate migration. The original `pnpm test` attempt still fails
  eight pre-existing migration tests due to duplicate Service.business_id.
- No dependencies, schema changes, subscription updates, or saved content writes.

Review: [mobile navigation feedback](loading-390.png), [desktop feedback](loading-1440.png).
