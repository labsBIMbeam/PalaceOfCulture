# Meaningverse of Culture — Steam vertical-slice build report

Verified: 2026-07-18T09:08:07+00:00

## Gate result

**Godot 4.7.1 / Linux + Windows desktop: GO for human vertical-slice playtest.**

This is not a Steam store submission yet. GodotSteam, a real Steam App ID, live peer transport,
consented contributor provenance, store art, audio and signing are intentionally absent.

## Product contract

- One Palace workshop and one 36-module Leviathan.
- `24` visible modules are explicitly labelled **DEVELOPMENT SEED**, not human contributors.
- The local human places slot 25.
- Slot 26 is reserved and unreachable until a real receive-side peer transport exists.
- Three trial actions reveal 27–29; the chorus reveals 30.
- Slots 31–36 stay open.
- Solo continuation never invents a friend and ends visibly incomplete at 29/30.
- The `~21 MIN` display is a count-up pacing target. Elapsed time alone never changes phase.
- AI may suggest; only a person commits.
- Kerni is the visibly labelled embodied world agent; asking Kerni never advances the loop.
- Local JSON save is recoverability, not canonical or Nostr authority.

## Verified execution

| Gate | Result |
|---|---|
| Godot editor import/compile | 0 errors, 0 script errors, 0 warnings |
| Source headless smoke | `SMOKE OK`, 0/0/0 |
| Live sidecar headless smoke | Loopback mock → Godot → Kerni3D: `SMOKE OK`, 0/0/0 |
| Sidecar absent | Godot receives an empty candidate; no model prose or state mutation fallback |
| Spatial input smoke | E/I/R route through real Palace positions; solo ends 29/30 |
| Save/restart | Versioned atomic JSON round-trip succeeds |
| Poisoned saves | wrong types, unknown provenance, unconfirmed/second module and caller-made slot 26 rejected |
| Phase/invite attacks | coercive types, extra keys, phase mismatch and transplanted invitation rejected transactionally |
| Renderer attacks | Slot 26 APIs + poisoned `_occupied_slots`; slot 31 pulse/state poisoning all fail closed at final sink |
| Leviathan import | 36 meshes, unique slots 1–36 |
| Asset language | No `turret`, `weapon`, `gun`, `armor`, or `bewaffnung` node names |
| Asset budget | 21,410 Blender polygons |
| Native release render | GTX 1060, OpenGL GL Compatibility, 1600×900, 63.1 FPS |
| Kerni native render | GTX 1060, 1200×900, 488.9 FPS uncapped, `authority=suggestion_only` |
| Kerni interaction | Spatial `E` speaks while `MocLoop.phase` remains unchanged |
| Kerni external boundary | exact template capability, app token, phase binding, replay/stale/oversize/nested-field rejection |
| Overlay input | Craft/Media/real Chat focus + Player/Magnet polling suppress movement, jump, aim, `E`, `I` and `R` |
| Python sidecar | 7 pytest PASS; Ruff + format PASS; exact loopback HTTP round-trip |
| Independent hostile closure review | **GO**; renderer sink, animation, overlay lifecycle and polling re-verified read-only |
| Kerni art | 28 GLB meshes, 13,064 imported triangles, no weapon/armour/crown node names |
| Linux release export | 0 errors/warnings; exported binary prints `SMOKE OK` |
| Windows release export | 0 errors/warnings; valid PE32+ x86-64 GUI binary |
| Steam adapter absent | Fails closed with status `disabled`; gameplay remains available |

## Local artifacts

| Artifact | Bytes | SHA-256 |
|---|---:|---|
| `dist/linux/MeaningverseOfCulture.x86_64` | 73,470,264 | `2cb27aee3f7fdf763d0ae16972f6975606959a071f4cd33f6ef1429eb8385049` |
| `dist/linux/MeaningverseOfCulture.pck` | 20,641,764 | `49949e95ce2bf2f2c7a06aeb0344b95baacb9dea4cd331af63650e3b532ada02` |
| `dist/windows/MeaningverseOfCulture.exe` | 109,071,360 | `04baf75cc1d69dd93eb709533ecab4fd7770bb8a530645717017a06a9d9809fc` |
| `dist/windows/MeaningverseOfCulture.pck` | 20,641,764 | `49949e95ce2bf2f2c7a06aeb0344b95baacb9dea4cd331af63650e3b532ada02` |
| `assets/moc/leviathan.glb` | 1,487,756 | `131bafa724f3f94e1c0d605b9b0c8800760869e90977b2f08ef6ba89a226994d` |
| `assets/moc/kerni.glb` | 345,316 | `c1b3447f12b8f188e3da04a742c4711f3149bc090270d6b8e66d57e489eb562a` |
| `../art/blender/kerni_3d.blend` | 232,669 | `7f247bb26aebe031020365088b8e456c29241c642d1e099a8e168d329c45a06e` |
| `../art/blender/moc_leviathan.blend` | 283,206 | `9236e0c717abdd2ecf19fae25b12638364d4cdb933eb71af0210e35b773b9abe` |

`dist/` is intentionally ignored by Git; rebuild from source rather than committing binaries.

## Reproduce

```bash
# Source gate
godot4 --headless --editor --path godot --import
godot4 --headless --path godot -- --smoke

# Optional free live-selector gate
cd services/world-agent
uv run kerni-sidecar --backend mock
# second terminal, from repository root:
godot4 --headless --path godot -- --smoke --kerni-live

# Blender SSOT + GLB + three QA renders
blender --background --factory-startup --python tooling/blender/build_moc_leviathan.py
blender --background --factory-startup --python tooling/blender/build_kerni_3d.py

# Desktop packages
godot4 --headless --path godot --export-release "Linux Steam"
godot4 --headless --path godot --export-release "Windows Steam"

# Test the exported Linux package
godot/dist/linux/MeaningverseOfCulture.x86_64 --headless -- --smoke
godot/dist/linux/MeaningverseOfCulture.x86_64 --headless -- --moc-route-smoke

# Native Kerni/world-agent and longest intro-card visual QA
godot4 --path godot -- --moc-kerni-capture
godot4 --path godot -- --moc-intro-capture
```

Godot export templates were downloaded from the official 4.7.1 release URL. The downloaded TPZ
matched the official HTTP content length (1,280,486,955 bytes) and passed a complete ZIP CRC test.
The official release page did not publish a checksum link, so no cryptographic upstream match is
claimed.

## Human playtest checklist

- [ ] Watch or skip the current decorative raccoon→Kerni video; advance Chomp → Diagnostic → Locktard Street; confirm the tiny blood beat stays non-graphic, the Builder faints, Kerni is the raccoon, and “We’re not a cult. We’re culture.” is readable.
- [ ] Fresh start with `--moc-fresh`; reach the workshop from the Palace spawn.
- [ ] Read every Calling marker at normal third-person distance.
- [ ] Create and visibly place slot 25 in under ten minutes without instructions from the tester.
- [ ] Copy the invite; confirm solo continuation explicitly says no ghost friend was invented.
- [ ] Complete three trial ribs and three chorus points; confirm solo legacy is 29/30.
- [ ] Quit/restart; confirm phase, authorship and visible module count restore.
- [ ] Confirm keyboard/mouse focus survives chat, menu and window focus changes.
- [ ] Run a real two-author peer transport when implemented; only then accept 30/30 co-creation.

## Known release blockers

1. No real peer/LAN receive-side transport exists; slot 26 is therefore hard-disabled.
2. No consented 24–30 contributor manifest exists; current geometry is visibly a development seed.
3. No GodotSteam GDExtension or Steam App ID is configured.
4. Station labels are too small in the wide hero view; foreground Palace rail harms store-art composition.
5. Audio/VFX and accessibility/reduced-motion passes are not complete.
6. Windows binary is structurally verified but was not executed on Windows in this session.
