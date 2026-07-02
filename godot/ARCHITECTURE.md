# Godot Homebuilder — module contract

Godot **4.7**, GDScript (typed, tabs, `##` doc comments, English). Gameplay spec:
`600-Billion-Handover-final/04-design/HOMEBUILDER-GAMEPLAY.md` (docs workspace).
Design law recap: Home = private, full magnet building. Palace = public, decorate-only,
NO block tools. No farming — materials drip with real time; **drip rate is the single
balancing knob**. Building instant; crafting takes real time (offline-friendly).

**Scene policy: code-first.** The ONLY .tscn is `scenes/Main.tscn` (root Node + main.gd).
Everything else is constructed procedurally: scripts extend a Node type and are instanced
via `load("res://scripts/x.gd").new()`. No .tscn authoring, no editor-generated resources.

Palette (design brief): cream `#efe6d2` (ground/sky fog), gold `#e7b23c`, teal `#23806f`,
coral `#e8735a` (single accent). Toon low-poly: StandardMaterial3D, flat colors, roughness ~0.9.

## Files & owners

| Module | Files (all under `godot/`) |
| --- | --- |
| core | `scripts/catalog.gd`, `scripts/economy.gd`, `scripts/store.gd`, `scripts/game.gd` |
| play | `scripts/player.gd`, `scripts/magnet_controller.gd`, `scripts/build_system.gd` |
| ui | `scripts/ui/hud.gd`, `scripts/ui/craft_menu.gd`, `scripts/ui/main_menu.gd` |
| world | `scripts/main.gd`, `scripts/world/home_world.gd`, `scripts/world/palace_world.gd`, `tests/smoke.gd` |

Autoloads (project.godot, already wired): `Catalog`, `Economy`, `Store`, `Game` — the four
core scripts, each `extends Node`.

## Catalog (catalog.gd) — static data, no state

```gdscript
const DRIP_PER_MINUTE := {"wood": 2.0, "stone": 1.0}  # THE balancing knob. Touch nothing else.
const ATTRACTION_SUSTAIN_SEC := 86400.0                # move-in condition hold time (24 h)

## MATERIALS: id -> {display: String, color: Color}
## OBJECTS: id -> {display, kind: "block"|"furniture", color: Color,
##                 size: Vector3 (metres, furniture only),
##                 specialty: {} or {material_id: multiplier} e.g. {"wood": 1.5},
##                 attracts: bool}
## RECIPES: id -> {display, output_id, output_count, cost: {material_id: int}, seconds: float}
func get_object(id: String) -> Dictionary
func get_recipe(id: String) -> Dictionary
func recipe_ids() -> Array[String]
func block_ids() -> Array[String]      # kind == "block"
func furniture_ids() -> Array[String]
func make_material(color: Color) -> StandardMaterial3D  # toon-flat helper, cached
```

Content v0 — blocks: `block_cream`, `block_gold`, `block_teal` (1×1×1 m). Furniture:
`stool` (5 wood, 120 s), `lantern` (3w+2s, 300 s, needed for move-in), `sawbench`
(8w, 600 s, specialty wood ×1.5), `kiln` (10s, 600 s, specialty stone ×1.5), `fountain`
(12s+4w, 1200 s, attracts). Block recipes: `craft_block_<x>` → 9 blocks, 9 matching
materials (gold/teal → stone, cream → wood), 60 s.

## Economy (economy.gd) — inventory, drip, craft queue, move-in

```gdscript
signal inventory_changed
signal craft_completed(recipe_id: String)
signal move_in_arrived(object_id: String)

func get_material(id: String) -> int          # floor of float accumulator
func get_count(object_id: String) -> int      # crafted objects owned (not placed)
func drip_rate(id: String) -> float           # per minute, base × placed-specialty multipliers
func can_afford(recipe_id: String) -> bool
func queue_craft(recipe_id: String) -> bool   # consumes materials up-front
func get_queue() -> Array                     # [{recipe_id, remaining, total}] display order
func consume_object(object_id: String) -> bool  # placement takes from inventory
func return_object(object_id: String) -> void   # absorb gives back
func set_specialty_context(multipliers: Dictionary) -> void  # BuildSystem reports {mat: mult}
func notify_condition(met: bool) -> void      # BuildSystem reports move-in condition state
```

Drip + queue tick in `_process`; **offline catch-up**: Store persists `last_tick` unix time,
Economy applies elapsed time on load (drip + queue). Move-in v0: condition = ≥9 blocks AND
≥1 lantern placed (Home); sustained `ATTRACTION_SUSTAIN_SEC` (Economy times it from
`notify_condition`) → grants `fountain` ×1 via `move_in_arrived` + inventory. New game
starter kit: 60 wood, 40 stone, 18 `block_cream`.

## Store (store.gd) — local-first JSON persistence (user://)

```gdscript
func list_homes() -> Array[String]                 # home names
func create_home(name: String) -> void
func load_home(name: String) -> Dictionary         # {} if missing
func save_home(name: String, data: Dictionary) -> void
func hosted_home() -> String                       # exactly one; first created auto-hosted
func set_hosted(name: String) -> void
func load_state() -> Dictionary                    # {materials, inventory, queue, last_tick, condition_since}
func save_state(data: Dictionary) -> void
func load_palace_decor() -> Array                  # [{id, pos: [x,y,z], rot_y}]
func save_palace_decor(items: Array) -> void
```

Home data shape: `{"blocks": [{"id": String, "cell": [x,y,z]}], "decor": [{"id", "pos": [x,y,z], "rot_y": float}]}`.
Files: `user://homes/<name>.json`, `user://state.json`, `user://palace.json`. JSON only.

## Game (game.gd) — app flow, modes, input

```gdscript
enum Space { MENU, HOME, PALACE }
enum Mode { WALK, MAGNET }
signal mode_changed(mode: int)
var space: int
var mode: int
var current_home: String
func goto_menu() -> void; func goto_home(home_name: String) -> void; func goto_palace() -> void
func toggle_mode() -> void   # ignored in MENU; in PALACE magnet = decorate-only (Game exposes
func magnet_can_build() -> bool   # true only in HOME
```

Scene switching: main.gd listens to Game signals/calls and swaps world child nodes.
`Game._enter_tree()` registers ALL input actions in code (InputMap) — **no [input] section
in project.godot**: `move_forward/back/left/right` (WASD+arrows), `jump` (Space),
`sprint` (Shift), `toggle_magnet` (B), `interact` (E), `craft_menu` (C), `hover_up` (Space),
`hover_down` (Ctrl), `place` (mouse left), `absorb` (mouse right), `hotbar_1..hotbar_9`
(number keys), `ui_cancel` stays built-in (Esc).

## BuildSystem (build_system.gd, `extends Node3D`) — one per world

Owns a `GridMap` (cell 1×1×1 m, MeshLibrary built procedurally from Catalog blocks) + a
`Node3D` decor root. Constructor takes `allow_blocks: bool` (false in Palace).

```gdscript
signal contents_changed
func setup(allow_blocks: bool) -> void
func place_blocks(cells: Array, block_id: String) -> int   # consumes Economy, returns placed count
func absorb_block(cell: Vector3i) -> bool                  # returns to Economy
func replace_blocks(cells: Array, block_id: String) -> int # atomic absorb+place
func place_decor(object_id: String, pos: Vector3, rot_y: float) -> bool
func absorb_decor(node: Node3D) -> bool
func to_data() -> Dictionary; func from_data(data: Dictionary) -> void
func block_count() -> int; func decor_count(object_id: String) -> int
```

After any change: recompute specialty multipliers + move-in condition, push both to Economy;
world script autosaves via Store. Footprint helper: 3×3×1 cells around aim point (magnet).

## Player (player.gd, `extends CharacterBody3D`) & Magnet (magnet_controller.gd, `extends Node3D`)

Player: capsule (teal body, cream head sphere), SpringArm3D third-person cam (mouse orbit,
captured mouse), WASD + jump + sprint, gravity 18. Speed 5 / sprint 9.
Magnet: free-fly ghost (gold translucent 3×3×1 box preview snapped to grid; a coral outline
when decorating). Fly: WASD + hover_up/down, speed 12. LMB `place` (blocks footprint 3×3×1,
or selected furniture single), RMB `absorb`. Hotbar selection comes from HUD via
`set_selected(object_id: String)`. In decorate-only worlds block ids are rejected (HUD hides
them too). Worlds own switching: on `Game.mode_changed` they toggle Player vs Magnet active.

## UI (all `extends CanvasLayer` / build Controls in code)

- `hud.gd`: top-left material rows "Wood 128 (+2.0/min)" (live), craft-queue mini status,
  bottom hotbar (9 slots: blocks first then owned furniture, counts, selected highlight,
  number keys + click), top-right mode button (Walk ⟷ Magnet) + hints, Esc → menu.
- `craft_menu.gd`: toggled by `craft_menu` action; recipe list (name, cost colored by
  affordability, duration) + Queue button; running queue with progress bars; uses Economy
  signals. Pause game input while open (`get_viewport().set_input_as_handled()` style).
- `main_menu.gd`: title "Palace of Culture — Homebuilder", tagline "money buys style — time
  builds legend", home list (load/create/set-hosted marker ★), buttons: Enter Home,
  Visit Palace. Cream panel, gold accents.

## Worlds

- `home_world.gd` (`extends Node3D`): cream ground plane 64×64 (StaticBody3D + collider),
  soft DirectionalLight + WorldEnvironment (cream fog like the web build), BuildSystem
  (allow_blocks = true), Player at (6, 2, 24), Magnet, loads/saves `Game.current_home`.
- `palace_world.gd`: instantiates `res://assets/palace.glb`, generates trimesh collisions on
  its MeshInstance3Ds, invisible floor plane at y=0 (600×600), BuildSystem
  (allow_blocks = false) fed from Store palace decor, Player at (6, 2, 44).
- `main.gd`: owns UI layers + world swapping per Game.space; boots to menu. If
  `OS.get_cmdline_user_args()` contains `--smoke`, it instead instantiates `tests/smoke.gd`,
  calls `run()`, and quits with the returned exit code (so autoloads are fully up).
- `tests/smoke.gd` (`extends Node`, `func run() -> int`): headless smoke — asserts autoload
  APIs, builds each world, places/absorbs a block via Economy+BuildSystem, queues a craft,
  saves+reloads a home. Failure prints `SMOKE FAIL: <reason>` and returns 1; success prints
  `SMOKE OK` and returns 0.

## Verification

```
G:\Tools\Godot\Godot_v4.7-stable_win64_console.exe --headless --path G:\Github\PalaceOfCulture\godot --import
G:\Tools\Godot\Godot_v4.7-stable_win64_console.exe --headless --path G:\Github\PalaceOfCulture\godot -- --smoke
```

Clean = no `SCRIPT ERROR` / `Parse Error` / `SMOKE FAIL` on stderr/stdout and `SMOKE OK` printed.
