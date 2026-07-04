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
| theme | `scripts/ui/ui_theme.gd` (shared Theme/stylebox/font factory, static funcs) |
| social ui | `scripts/ui/chat_panel.gd`, `scripts/ui/voice_dock.gd`, `scripts/ui/media_player.gd` |
| net seams | `scripts/net/chat_transport.gd`, `scripts/net/voice_transport.gd`, `scripts/net/media_catalog.gd` |
| world | `scripts/main.gd`, `scripts/world/home_world.gd`, `scripts/world/palace_world.gd`, `tests/smoke.gd` |

Autoloads (project.godot, already wired): `Catalog`, `Economy`, `Store`, `Game` — the four
core scripts, each `extends Node`.

## Catalog (catalog.gd) — static data, no state

```gdscript
const DRIP_PER_MINUTE := {"wood": 2.0, "stone": 1.0}  # THE balancing knob. Touch nothing else.
const ATTRACTION_SUSTAIN_SEC := 86400.0                # move-in condition hold time (24 h)

## MATERIALS: id -> {display: String, color: Color}
##   wood + stone = raw (drip); boards = refined (no drip entry — milled from wood)
## OBJECTS: id -> {display, kind: "block"|"furniture", color: Color,
##                 size: Vector3 (metres, furniture only),
##                 specialty: {} or {material_id: multiplier} e.g. {"wood": 1.5},
##                 attracts: bool}
## RECIPES: id -> {display, output_id, output_count, cost: {material_id: int}, seconds: float}
##   output_id may be an OBJECTS id (crafting) or a MATERIALS id (processing, e.g. mill_boards)
func get_object(id: String) -> Dictionary
func get_recipe(id: String) -> Dictionary
func recipe_ids() -> Array[String]
func block_ids() -> Array[String]      # kind == "block"
func furniture_ids() -> Array[String]
func make_material(color: Color) -> StandardMaterial3D  # toon-flat helper, cached
```

Content v0 (Pokopia structure, shrunk to basics) — materials: `wood` + `stone` raw
(drip), `boards` refined (Pokopia Small Log→Lumber analog; NO drip). Processing:
`mill_boards` = 10 wood → 50 boards, 180 s (mirrors Pokopia's Chop batch 10 logs → 50
lumber, request-then-wait via the craft queue). Blocks: `block_stone` (stone-grey-cream),
`block_boards` (warm wood), 1×1×1 m; block recipes `craft_block_<x>` → 9 blocks for 9 of
the base material, 60 s. Furniture: `stool` (5 wood, 120 s), `lantern` (2 boards+2 stone,
300 s, needed for move-in), `sawbench` (8 wood, 600 s, specialty wood ×1.5, the thematic
board maker — "Chop"), `kiln` (10 stone, 600 s, specialty stone ×1.5), `fountain`
(12 stone+6 boards, 1200 s, attracts).

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
starter kit: 60 wood, 40 stone, 0 boards, 18 `block_stone`. Stale saves may reference
removed ids (`block_cream`/`block_gold`/`block_teal`, old recipes): loaders and UI skip
unknown ids gracefully — never crash.

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
var typing: bool   # chat input owns the keyboard; player + magnet early-return on it
func goto_menu() -> void; func goto_home(home_name: String) -> void; func goto_palace() -> void
func toggle_mode() -> void   # ignored in MENU; in PALACE magnet = decorate-only (Game exposes
func magnet_can_build() -> bool   # true only in HOME
```

Scene switching: main.gd listens to Game signals/calls and swaps world child nodes.
`Game._enter_tree()` registers ALL input actions in code (InputMap) — **no [input] section
in project.godot**: `move_forward/back/left/right` (WASD+arrows), `jump` (Space),
`sprint` (Shift), `toggle_magnet` (B), `interact` (E), `craft_menu` (C), `hover_up` (Space),
`hover_down` (Ctrl), `place` (mouse left), `absorb` (mouse right), `hotbar_1..hotbar_9`
(number keys), `chat_focus` (Enter/KP-Enter), `media_player` (M), `voice_toggle` (V),
`ui_cancel` stays built-in (Esc). The social UI modules also register their own action
defensively (`InputMap.has_action` guard), so ownership can move either way without conflict.

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

All panels consume `scripts/ui/ui_theme.gd` (`const UITheme := preload(...)`) — static
funcs `theme()` (cached global Theme), `panel_style(strong)` (fresh StyleBoxFlat per call),
`flat_style(...)`, `font_display()/font_copy()/font_copy_bold()/font_mono()` (Cinzel /
Spectral / Spectral-SemiBold / JetBrains Mono) and the palette dict `UITheme.C` (keys:
panel, panel_strong, border, border_strong, text, body, muted, gold, gold_bright, cream,
coral, teal_light). Never mutate a stylebox obtained from `theme()`; build fresh ones.

Layer map: HUD + voice dock 10, chat panel 12, media player 15, craft menu 20, main menu 30.
Screen estate: material rows top-left, mode button top-right, hotbar bottom-center, chat
dock bottom-left (460×300), voice pill directly above it, media browse panel right (380 px),
now-playing card bottom-right floating above the hotbar row.

- `hud.gd`: top-left material rows "Wood 128 (+2.0/min)" (live), craft-queue mini status,
  bottom hotbar (9 slots: blocks first then owned furniture, counts, selected highlight,
  number keys + click), top-right mode button (Walk ⟷ Magnet) + key hints, Esc → menu.
- `craft_menu.gd`: toggled by `craft_menu` action; recipe list (name, cost colored by
  affordability, duration) + Queue button; running queue with progress bars; uses Economy
  signals. Pause game input while open (`get_viewport().set_input_as_handled()` style).
- `main_menu.gd`: title "Palace of Culture — Homebuilder", tagline "money buys style — time
  builds legend", home list (load/create/set-hosted marker ★), buttons: Enter Home,
  Visit Palace. Title art backdrop, dark warm panel, gold accents.
- `chat_panel.gd`: WoW-style dock, tabs All/World/Plaza/Whisper with unread dots, BBCode
  scrollback, slash commands (`/w /p /world /me`), Enter (`chat_focus`) to talk, idle fade.
  Sets `Game.typing` on input focus enter/exit; owns its `chat_transport.gd` child.
- `voice_dock.gd`: slim pill — status dot (off/amber connecting/green live), Join/Leave,
  mic mute (coral slash), speaker chips. `attach_transport()` wires it to a voice
  transport node; `voice_toggle` (V) joins/leaves. Transport is owned by main.gd, not the dock.
- `media_player.gd`: "Palace Radio" — right browse panel (Music/Podcasts/Live rows with
  V4V ⚡ recipient labels, live listener counts) + bottom-right now-playing card (play/next,
  gold progress, mm:ss mono, ⚡ Boost sats counter). Toggled by `media_player` (M); caches
  audio in `user://media_cache/`; headless-safe (no HTTPRequest when headless, "offline" state).

## Net seams (`scripts/net/`) — mock-first, one-file migrations

Each seam is a plain `extends Node` mock that the UI talks to through a stable contract;
swapping in the real backend never touches UI code.

- `chat_transport.gd` — `signal message_received(msg)` (`{id, channel, author, body, at_ms,
  self, system}`), `send(channel, body)`, `channel_ids()`. Mock: loopback + backlog +
  ambient townsfolk drip. **Migration:** world/plaza → NIP-29 relay groups (kind-9 chat),
  whispers → NIP-17 private DMs (NIP-59 gift-wrap + NIP-44); the per-seal Nostr key signs
  sends and `author` becomes the npub profile name.
- `voice_transport.gd` — `signal state_changed(state)` (`{status: off|connecting|live,
  muted, speakers}`), `connect_voice()`, `disconnect_voice()`, `set_muted()`, `get_state()`.
  Central room voice, NO spatial audio (ADR 0002). **Migration:** LiveKit self-hosted SFU
  room first (ADR 0005 default), later MoQ room-scoped `audio.pcm`/`speaking.json` tracks
  keyed by npub.
- `media_catalog.gd` — `load_items() -> Array[Dictionary]` (`{id, title, author, kind:
  music|podcast|live, audio_url, tone, value_recipient, listeners}`). **Migration:**
  music/podcasts → Podcasting 2.0 RSS (`podcast:medium`, `enclosure`, `podcast:value`
  for V4V splits; Nostr kind 31337/32123 for music), live → NIP-53 `kind:30311`
  subscriptions (HLS stream URL, `current_participants` = listeners). Boost button →
  NIP-57 zaps to `value_recipient`.

## Worlds

- `home_world.gd` (`extends Node3D`): cream ground plane 64×64 (StaticBody3D + collider),
  soft DirectionalLight + WorldEnvironment (cream fog like the web build), BuildSystem
  (allow_blocks = true), Player at (6, 2, 24), Magnet, loads/saves `Game.current_home`.
- `palace_world.gd`: instantiates `res://assets/palace.glb`, generates trimesh collisions on
  its MeshInstance3Ds, invisible floor plane at y=0 (600×600), BuildSystem
  (allow_blocks = false) fed from Store palace decor, Player at (6, 2, 44).
- `main.gd`: owns ALL UI layers (HUD, craft menu, main menu, chat panel, voice transport +
  dock, media player) + world swapping per Game.space; boots to menu. Social layers are
  visible only in HOME/PALACE (hidden in MENU, media browse panel force-closed). Child add
  order defines `_unhandled_input` priority (reverse): craft menu → media → chat → voice
  dock → HUD, so overlays swallow Esc/keys before the HUD acts on them. If
  `OS.get_cmdline_user_args()` contains `--smoke`, it instead instantiates `tests/smoke.gd`,
  calls `run()`, and quits with the returned exit code (so autoloads are fully up; the
  smoke path builds no UI).
- `tests/smoke.gd` (`extends Node`, `func run() -> int`): headless smoke — asserts autoload
  APIs, builds each world, places/absorbs a block via Economy+BuildSystem, queues a craft,
  saves+reloads a home; then the social seams: UITheme contract (cached Theme, palette
  keys), chat loopback (`send` → `message_received` with `self=true`, blank/unknown sends
  dropped), voice handshake (connecting → live in ~1 s, self in speakers), media catalog
  fields (`audio_url` + `value_recipient` on every item), and headless instantiation of
  chat panel + voice dock + media player. Failure prints `SMOKE FAIL: <reason>` and
  returns 1; success prints `SMOKE OK` and returns 0.

## Verification

```
G:\Tools\Godot\Godot_v4.7-stable_win64_console.exe --headless --path G:\Github\PalaceOfCulture\godot --import
G:\Tools\Godot\Godot_v4.7-stable_win64_console.exe --headless --path G:\Github\PalaceOfCulture\godot -- --smoke
```

Clean = no `SCRIPT ERROR` / `Parse Error` / `SMOKE FAIL` on stderr/stdout and `SMOKE OK` printed.
