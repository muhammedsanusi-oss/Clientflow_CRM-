# Session controls covered owner navigation

**Spec:** `docs/specs/web.md`

## Report

The final owner workspace navigation button was hidden behind the fixed
Demo subscription and Sign out controls.

## Expected vs actual

Every workspace button should remain visible and clickable at narrow viewport
widths and enlarged browser zoom. Navigation started in the same vertical space
as the fixed session bar, so wrapping alone did not prevent overlap.

## Root cause

The session bar is outside document flow. The owner header reserved no space
for it; additional navigation exposed the collision. The mobile padding rule
also replaced desktop padding and needed the same reserved space.

## The fix

Owner headers reserve a top band for the session bar on desktop and mobile.
Navigation is constrained to the available width and continues to wrap.

## Why our defenses missed it

Rendered navigation tests checked links and entitlements, not geometry or
occlusion by fixed elements. The prior browser keyboard check was interrupted
before responsive layout verification completed.

## What changed beyond the fix

The web spec explicitly requires owner navigation to remain below session
controls, including at enlarged zoom and mobile widths.
