# Analytics TODO

**Maturity Tier:** `Hardened`

## Shipped Now

- Publishes 0 public modules from `@platform/analytics`.
- Exports 16 named symbols through the public entrypoint, including `packageId`, `packageDisplayName`, `packageDescription`, `defineMetric`, `defineSegment`, `createMetricRegistry`, and more.
- Keeps the public surface headless and import-driven rather than requiring a UI runtime.
- Verification lanes present: Build+Typecheck+Lint+Test.

## Current Gaps

- Broad public API surface still relies on unit coverage only; there is no separate contract lane yet.

## Recommended Next

- Strengthen contract coverage around the most widely consumed helper surfaces.
- Add deeper integration examples where downstream packages repeatedly compose the same APIs.
- Add contract-focused tests around the most reused public modules and exported helpers.

## Later / Optional

- Reference adapters and richer cookbook examples once more external connectors exist.
