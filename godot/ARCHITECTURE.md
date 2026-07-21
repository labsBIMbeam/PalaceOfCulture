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
| meaningverse | `scripts/moc/moc_loop.gd`, `moc_demo.gd`, `leviathan_assembly.gd`, `kerni_world_agent.gd`, `kerni_live_client.gd`, `kerni_3d.gd` |
| world | `scripts/main.gd`, `scripts/world/home_world.gd`, `scripts/world/palace_world.gd`, `tests/smoke.gd` |

Autoloads (project.godot, already wired): `Catalog`, `Economy`, `Store`, `Game` — the four
core scripts, each `extends Node`.

## Catalog (catalog.gd) — static data, no state

```gdscript
const DRIP_PER_MINUTE := {"wood": 0.015, "stone": 0.0075}  # ≈21.6/10.8 per DAY. THE knob.
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
(drip), `boards` refined (Pokopia Small Log→Lumber analog; NO drip). **Ultra-low time
preference (2026-07-04): craft times are month-scale in the lock numerology** — the wait
is why a crafted piece is worthy Palace decor. Processing: `mill_boards` = 10 wood →
50 boards, **21 h**. Blocks `block_stone`/`block_boards` ×9 for 9 base material, **2.1 h**.
Furniture: `stool` (5 wood, **21 days** — the month chair), `lantern` (2 boards+2 stone,
**210 h**, needed for move-in), `sawbench` (8 wood, **2.1 d**, specialty wood ×1.5, the
thematic board maker — "Chop"), `kiln` (10 stone, **2.1 d**, ×1.5 stone), `fountain`
(12 stone+6 boards, **42 d**, attracts). Dev testing: `-- --timescale=N` multiplies
drip + queue speed (Economy.time_scale, default 1.0 = real time; move-in sustain stays
wall-clock). Durations render as `21d 4h` / `3h 12m` / `04:32`; drip renders per day.

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
var typing: bool   # compatibility mirror for chat focus
func set_world_input_blocked(owner: StringName, blocked: bool) -> void
func world_input_blocked() -> bool  # chat/craft/media gate all Player, Magnet and MoC polling
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
`flat_style(...)`, `mono_label(value, size, color)` (ready JetBrains-Mono data label),
`glow_border(color, ...)` (focus-only glow stylebox — never ambient),
`font_display()/font_copy()/font_copy_bold()/font_mono()` (Cinzel /
Spectral / Spectral-SemiBold / JetBrains Mono) and the palette dict `UITheme.C` (keys:
ink, panel, panel_ink, panel_strong, border, border_strong, text, body, muted, gold,
gold_bright, cream, coral, teal_light — `ink` is the near-black menu backdrop tier).
Never mutate a stylebox obtained from `theme()`; build fresh ones.

Layer map: HUD + voice dock 10, chat panel 12, media player 15, craft menu 20, main menu 30
(in MENU space main.gd lifts the media player to 31 so Palace Radio draws above the menu).
Screen estate: material rows top-left, mode button top-right, hotbar bottom-center, chat
dock bottom-left (380×300 — clears the hotbar at the 1280-wide logical canvas), voice pill
directly above it, media browse panel right (380 px), now-playing card bottom-right
floating above the hotbar row. Responsive: 1280×720 base, `canvas_items` stretch +
`expand` aspect (logical canvas is always ≥1280×720; corners stay anchored), window
min size 960×540 set in main.gd.

- `hud.gd`: top-left material rows "Wood 128 (+2.0/min)" (live), craft-queue mini status,
  bottom hotbar (9 slots: blocks first then owned furniture, counts, selected highlight,
  number keys + click), top-right mode button (Walk ⟷ Magnet) + key hints, Esc → menu.
- `craft_menu.gd`: toggled by `craft_menu` action; recipe list (name, cost colored by
  affordability, duration) + Queue button; running queue with progress bars; uses Economy
  signals. Pause game input while open (`get_viewport().set_input_as_handled()` style).
- `main_menu.gd`: cypherpunk title screen — near-black ink backdrop (`C.ink`) under a calm
  "600" matrix rain (web MatrixField port: static faint zero-bed + 6-0-0 column-group
  sweeps, pure `_draw`, GL-compat/web safe), massive Cinzel "600 BILLION" wordmark,
  tagline, mono terminal home rows (hosted marker ★ = the ONLY coral), `[ ENTER HOME ]` /
  `[ VISIT PALACE ]` / `[ CREATE ]` text-buttons with gold hover + focus glow, and a
  mempool-style mono data strip (approx block height off wall time, drip rates, home
  count, RADIO [M] hint, version). Static 5 % scanline shader overlay; no keyart, no
  boxed panel. Grabs button focus on open (keyboard/gamepad first-class).
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

### Meaningverse + Kerni authority boundary

`moc_loop.gd` owns the action-driven cultural state. `kerni_world_agent.gd` receives only a copied
snapshot dictionary and returns canonical dialogue/orientation/acknowledgement proposals. It never
receives a `MocLoop` reference. External selectors cannot supply prose: they may choose one ID from
an exact phase-owned template list, bound to a short-lived single-use request capability.
`moc_demo.gd` independently validates request ID, phase, schema and authority before presentation
through `kerni_3d.gd`; presentation cannot transition a phase, commit a module, create peer
provenance, save or publish. `kerni_live_client.gd` is opt-in (`--kerni-live`), hardcodes
`127.0.0.1:8791`, rejects redirects/oversized or malformed responses, and never sends player text or
world objects. The release always retains the deterministic offline policy.

Slot 26 is deliberately unreachable until a real receive-side peer transport exists. Do not model
transport provenance as a caller-supplied Boolean. `MocLoop` never emits it, and
`MocLeviathanAssembly` independently rejects it in `reveal_to`, `apply_occupied_slots` and
`pulse_commit`; its final visibility sink also sanitizes poisoned occupied-state maps and future
slots. The verified solo set is slots `1–25, 27–30`; slot 26 and future slots 31–36 remain visibly
empty.

- `home_world.gd` (`extends Node3D`): cream ground plane 64×64 (StaticBody3D + collider),
  soft DirectionalLight + WorldEnvironment (cream fog like the web build), BuildSystem
  (allow_blocks = true), Player at (6, 2, 24), Magnet, loads/saves `Game.current_home`.
- `palace_world.gd`: instantiates `res://assets/palace.glb`, generates trimesh collisions on
  its MeshInstance3Ds, invisible floor plane at y=0 (600×600), BuildSystem
  (allow_blocks = false) fed from Store palace decor, Player at (6, 2, 44).
- `main.gd`: owns ALL UI layers (HUD, craft menu, main menu, chat panel, voice transport +
  dock, media player) + world swapping per Game.space; boots to menu; sets the window
  min size (960×540). Chat + voice dock are visible only in HOME/PALACE; the media player
  stays visible in EVERY space (Palace Radio works on the title screen — layer-hopped to
  31 above the menu there) with its browse panel force-closed on each space swap. Child add
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
  chat panel + voice dock + media player; finally a menu layout pass instantiates the
  title screen headless, resizes the window to 960×540 and 1920×1080 and asserts the key
  nodes (Root/MatrixRain/Title/HomeList/EnterButton/PalaceButton/DataStrip) survive.
  Failure prints `SMOKE FAIL: <reason>` and returns 1; success prints `SMOKE OK` and
  returns 0.

## Verification

```
G:\Tools\Godot\Godot_v4.7-stable_win64_console.exe --headless --path G:\Github\PalaceOfCulture\godot --import
G:\Tools\Godot\Godot_v4.7-stable_win64_console.exe --headless --path G:\Github\PalaceOfCulture\godot -- --smoke
```

Clean = no `SCRIPT ERROR` / `Parse Error` / `SMOKE FAIL` on stderr/stdout and `SMOKE OK` printed.
