# @600b/web — r3f client (Tier 0)

The desktop browser client. Demo writes are safe-off; the production key/seal flow will stay
**on-device** and consume the already implemented `@600b/ownership` verifier when that product path
is wired. Data-driven rendering targets desktop 3D; mobile gameplay is a separate app per ADR 0007.

## src/ layout

| Dir | Responsibility |
|---|---|
| `scene/` | r3f Canvas, lighting, `InstancedMesh` + LOD world rendering |
| `map/` | Globe → Country → Plot navigation; Natural Earth polygons; randomized placement; clustering |
| `avatar/` | VRM avatar (`@pixiv/three-vrm`) + `ecctrl` controller; enforce avatar perf tiers on import |
| `assets/` | GLB/VRM loading from CDN manifest; DRACO/KTX2; IndexedDB cache |
| `ui/` | quiet, palette-true interface (gold/cream/teal/coral); the world is the hero |
| `net/` | Colyseus client for volatile HQ movement/presence; durable shared-state transport is pending |

Run: `pnpm dev:web` (from repo root) or `pnpm dev` here.
