# Business overview verification

The approved overview is implemented at `/businesses/[id]`. Existing developer
authorization, destination routes, and credential actions remain in place.

- Six overview rendering/state tests pass, covering grouped details, links,
  missing owners and websites, pending/expired setup, and authentication paths.
- Browser drill passes against the local demo business at 1440, 720, and 390
  CSS pixel widths, including long names/emails, 200 percent root text scaling,
  44px touch targets, visible keyboard focus, unknown-resource 404, and signed-out
  redirection. Root text scaling is a layout stress check, not a claim that
  every browser's native zoom behavior was tested.
- Desktop and mobile screenshots were visually reviewed; no clipping or
  overlapping content was observed. Images show the synthetic local demo.
- `pnpm typecheck` and `pnpm build` pass. `git diff --check` passes.
- `pnpm test` is blocked by eight existing migration-contract failures:
  `0003_business_services.sql` duplicates `Service.business_id`. The migration
  was left intact. The root integration stage consequently does not run through
  that command; overview tests were run directly.
- No new dependencies, schema changes, or saved business changes are included.

Review images: [desktop](overview-1440.png), [mobile](overview-390.png).
