# Analytics Developer Guide

Metrics, marts, and analytics helper layer.

**Maturity Tier:** `Hardened`

## Purpose And Architecture Role

Provides shared analytics helpers and typed telemetry-friendly patterns for packages that need stable measurement primitives.

### This library is the right fit when

- You need **analytics helpers**, **typed metrics**, **telemetry composition** as a reusable, package-level boundary.
- You want to consume typed exports from `@platform/analytics` instead of reaching into app-specific internals.
- You want documentation, verification, and package boundaries to stay aligned in the extracted-repo model.

### This library is intentionally not

- Not a vertical application or domain plugin by itself.
- Not a generic hook bus or hidden orchestration layer.

## Repo Map

| Path | Purpose |
| --- | --- |
| `package.json` | Root extracted-repo manifest, workspace wiring, and repo-level script entrypoints. |
| `framework/libraries/analytics` | Nested publishable library package. |
| `framework/libraries/analytics/src` | Public runtime source and exported modules. |
| `framework/libraries/analytics/tests` | Unit and contract verification where present. |

## Package Contract

| Field | Value |
| --- | --- |
| Package ID | `analytics` |
| Display Name | Analytics |
| Import Name | `@platform/analytics` |
| Version | `0.1.0` |
| UI Surface | Headless typed exports |
| Consumption Model | Imports + typed helpers |

## Dependency Graph And Compatibility

| Field | Value |
| --- | --- |
| Direct Dependencies | None |
| Peer Dependencies | None |
| Dev Dependencies | None |
| React Runtime | No |
| Workspace Scoped | No |

### Dependency interpretation

- Direct dependencies describe what the library needs at runtime to satisfy its public exports.
- Workspace-scoped dependencies mean extracted repos should be consumed through a compatible Gutu workspace or vendor-synced environment.
- Peer dependencies should be satisfied by the host when the library is integrated outside the certification workspace.

## Public API Surface

| Module | File | Named Exports |
| --- | --- | --- |
| - | - | - |

### Source module map

| Source File | Exported Symbols |
| --- | --- |
| `index.ts` | `packageId`, `packageDisplayName`, `packageDescription`, `defineMetric`, `defineSegment`, `createMetricRegistry`, `snapshotMetric`, `evaluateSegment` |

## React, UI, And Extensibility Notes

- UI surface: **Headless typed exports**
- Consumption model: **Imports + typed helpers**
- Extensibility points: explicit imports, props, callbacks, registries, providers, and typed helper APIs.
- This repo must **not** be documented as exposing a generic WordPress-style hook bus unless such a hook surface is explicitly exported through the public entrypoint.

## Failure Modes And Recovery

- Version drift between extracted repos can surface as missing `workspace:*` dependency resolution. Use a compatible Gutu workspace or vendor lock when integrating.
- Hosts should import from `@platform/analytics`, not deep internal file paths, so refactors inside `src/` do not become accidental breaking changes.
- React-facing hosts should mount providers, registries, and callback surfaces exactly as documented by the public exports instead of depending on internal implementation details.
- When a host needs orchestration, keep it in the surrounding application or plugin runtime; this library does not promise hidden side effects outside what its public API exports.

## Mermaid Flows

### Primary Consumption Flow

```mermaid
graph TD
  host["Host app or plugin"] --> import["Import from @platform/analytics"]
  import --> api["Public modules and named exports"]
  api --> compose["Compose headless typed exports"]
  compose --> verify["Verify with build, test, and docs checks"]
```

## Integration Recipes

### 1. Package identity

```ts
import { packageId, packageDisplayName, defineMetric } from "@platform/analytics";

console.log(packageId, packageDisplayName);
console.log(typeof defineMetric);
```

### 2. Safe consumption pattern

- Import from the package entrypoint, not `src/` internals.
- Compose through documented modules such as the exported entrypoint constants.
- Let host applications own orchestration, persistence, and cross-package business logic unless this library explicitly exports those concerns.

### 3. Cross-package composition

- Pair this library with sibling packages through typed imports and documented contracts, not hidden globals.
- If a plugin or app depends on this library, keep compatibility pinned through the workspace lock/vendor flow.
- Treat this library as a reusable foundation layer, not as a substitute for domain ownership.

## Test Matrix

| Lane | Present | Evidence |
| --- | --- | --- |
| Build | Yes | `bun run build` |
| Typecheck | Yes | `bun run typecheck` |
| Lint | Yes | `bun run lint` |
| Test | Yes | `bun run test` |
| Unit | Yes | 1 file(s) |
| Contracts | No | No contract files found |
| Integration | No | No integration files found |
| Migrations | No | No migration files found |

### Verification commands

- `bun run build`
- `bun run typecheck`
- `bun run lint`
- `bun run test`
- `bun run docs:check`
- `bun run test:unit`

## Current Truth And Recommended Next

### Current truth

- Publishes 0 public modules from `@platform/analytics`.
- Exports 16 named symbols through the public entrypoint, including `packageId`, `packageDisplayName`, `packageDescription`, `defineMetric`, `defineSegment`, `createMetricRegistry`, and more.
- Keeps the public surface headless and import-driven rather than requiring a UI runtime.
- Verification lanes present: Build+Typecheck+Lint+Test.

### Current gaps

- Broad public API surface still relies on unit coverage only; there is no separate contract lane yet.

### Recommended next

- Strengthen contract coverage around the most widely consumed helper surfaces.
- Add deeper integration examples where downstream packages repeatedly compose the same APIs.
- Add contract-focused tests around the most reused public modules and exported helpers.

### Later / optional

- Reference adapters and richer cookbook examples once more external connectors exist.
