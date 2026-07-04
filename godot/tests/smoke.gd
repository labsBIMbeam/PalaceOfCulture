extends Node
## Headless smoke test (run via `-- --smoke`): asserts the autoload contract
## APIs exist, then exercises home building, crafting, blueprint persistence,
## palace decoration, the social seams (theme, chat, voice, media) and a main
## menu layout pass (build + window resize 960x540 / 1920x1080) end to end.
## Prints SMOKE OK / SMOKE FAIL: <reason>.

const HomeWorldScript := preload("res://scripts/world/home_world.gd")
const PalaceWorldScript := preload("res://scripts/world/palace_world.gd")
const UITheme := preload("res://scripts/ui/ui_theme.gd")
const ChatTransportScript := preload("res://scripts/net/chat_transport.gd")
const ChatPanelScript := preload("res://scripts/ui/chat_panel.gd")
const VoiceTransportScript := preload("res://scripts/net/voice_transport.gd")
const VoiceDockScript := preload("res://scripts/ui/voice_dock.gd")
const MediaCatalogScript := preload("res://scripts/net/media_catalog.gd")
const MediaPlayerScript := preload("res://scripts/ui/media_player.gd")
const MainMenuScript := preload("res://scripts/ui/main_menu.gd")

const HOME_NAME := "smoke"

var _fail := ""


func run() -> int:
	var ok: bool = await _run_all()
	if ok:
		print("SMOKE OK")
		return 0
	print("SMOKE FAIL: %s" % _fail)
	return 1


func _run_all() -> bool:
	if not _check_apis():
		return false

	# --- Home: fresh blueprint, block place/absorb settling with Economy ---
	Store.create_home(HOME_NAME)
	Store.save_home(HOME_NAME, {"blocks": [], "decor": []})  # deterministic reruns
	if not _check(Store.list_homes().has(HOME_NAME), "home '%s' missing after create" % HOME_NAME):
		return false
	if not _check(Store.hosted_home() != "", "no hosted home after create"):
		return false

	Game.current_home = HOME_NAME
	var home := HomeWorldScript.new()
	add_child(home)
	await get_tree().process_frame

	for i in 9:
		Economy.return_object("block_stone")  # public grant path for objects
	var owned := Economy.get_count("block_stone")
	var cells: Array = home.build_system.footprint_cells(Vector3i(2, 0, 2))
	if not _check(cells.size() == 9, "footprint_cells is not 3x3x1"):
		return false
	if not _check(home.build_system.place_blocks(cells, "block_stone") == 9, "place_blocks did not place 9"):
		return false
	if not _check(home.build_system.block_count() == 9, "block_count != 9 after place"):
		return false
	if not _check(Economy.get_count("block_stone") == owned - 9, "blocks not consumed from Economy"):
		return false
	if not _check(home.build_system.absorb_block(Vector3i(2, 0, 2)), "absorb_block refused"):
		return false
	if not _check(Economy.get_count("block_stone") == owned - 8, "absorbed block not returned"):
		return false
	Economy.return_object("block_boards")
	if not _check(home.build_system.place_blocks([Vector3i(5, 0, 5)], "block_boards") == 1,
			"place_blocks refused block_boards"):
		return false

	# --- Craft queue ---
	if not Economy.can_afford("craft_stool"):
		Economy._materials["wood"] = 20.0  # test-only top-up; there is no public grant API
	var queued_before := Economy.get_queue().size()
	if not _check(Economy.queue_craft("craft_stool"), "queue_craft refused"):
		return false
	var queue: Array = Economy.get_queue()
	if not _check(queue.size() == queued_before + 1, "craft queue did not grow"):
		return false
	var tail: Dictionary = queue.back()
	if not _check(String(tail.get("recipe_id", "")) == "craft_stool", "queue tail is not craft_stool"):
		return false

	# --- Mill boards: processing recipe outputs a MATERIAL, never drips ---
	if not _check(Economy.drip_rate("boards") == 0.0, "boards must not drip"):
		return false
	if not Economy.can_afford("mill_boards"):
		Economy._materials["wood"] = 20.0  # test-only top-up; there is no public grant API
	var boards_before := Economy.get_material("boards")
	if not _check(Economy.queue_craft("mill_boards"), "queue mill_boards refused"):
		return false
	for entry: Dictionary in Economy._queue:  # test-only reach-in: expire all timers
		entry["remaining"] = 0.0
	Economy._advance(0.01)  # drains the whole queue (incl. the stool above)
	if not _check(Economy.get_queue().is_empty(), "queue not drained after expiring timers"):
		return false
	if not _check(Economy.get_material("boards") == boards_before + 50,
			"mill_boards did not add 50 boards"):
		return false

	# --- Save + reload the home blueprint (8 stone + 1 boards) ---
	Store.save_home(HOME_NAME, home.build_system.to_data())
	var loaded: Dictionary = Store.load_home(HOME_NAME)
	if not _check((loaded.get("blocks", []) as Array).size() == 9, "reloaded home has wrong block count"):
		return false
	home.build_system.from_data(loaded)
	if not _check(home.build_system.block_count() == 9, "from_data lost blocks"):
		return false

	# --- Stale-save robustness: unknown object ids are skipped, never crash ---
	home.build_system.from_data({
		"blocks": [{"id": "block_teal", "cell": [9, 0, 9]}],
		"decor": [{"id": "block_cream", "pos": [1.0, 0.0, 1.0], "rot_y": 0.0}],
	})
	if not _check(home.build_system.block_count() == 0, "stale block id not skipped"):
		return false
	home.queue_free()
	await get_tree().process_frame

	# --- Palace: decorate-only ---
	Store.save_palace_decor([])  # deterministic reruns
	var palace := PalaceWorldScript.new()
	add_child(palace)
	await get_tree().process_frame

	if not _check(palace.build_system.place_blocks([Vector3i.ZERO], "block_stone") == 0, "palace accepted blocks"):
		return false
	Economy.return_object("stool")
	if not _check(palace.build_system.place_decor("stool", Vector3(10, 0, 10), 0.0), "palace place_decor refused"):
		return false
	if not _check(palace.build_system.decor_count("stool") == 1, "palace decor_count != 1"):
		return false
	if not _check(Store.load_palace_decor().size() == 1, "palace decor not autosaved"):
		return false
	palace.queue_free()
	await get_tree().process_frame

	# --- Game flow signals: what main.gd's world swapping hangs on ---
	var spaces: Array = []
	var on_space := func(s: int) -> void: spaces.append(s)
	Game.space_changed.connect(on_space)
	Game.goto_home(HOME_NAME)
	if not _check(Game.space == Game.Space.HOME and Game.current_home == HOME_NAME, "goto_home state wrong"):
		return false
	Game.toggle_mode()
	if not _check(Game.mode == Game.Mode.MAGNET, "toggle_mode did not switch to magnet"):
		return false
	Game.goto_palace()
	if not _check(Game.mode == Game.Mode.WALK, "goto_palace did not reset mode to walk"):
		return false
	Game.goto_menu()
	if not _check(Game.space == Game.Space.MENU and Game.current_home == "", "goto_menu state wrong"):
		return false
	var want: Array = [Game.Space.HOME, Game.Space.PALACE, Game.Space.MENU]
	if not _check(spaces == want, "space_changed sequence wrong: %s" % [spaces]):
		return false
	Game.space_changed.disconnect(on_space)

	# --- Social seams: shared theme, chat, voice, media ---
	if not await _check_social():
		return false

	# --- World map, intro, palace landmarks ---
	if not await _check_world_screens():
		return false

	# --- Main menu: headless build + window-resize layout sanity ---
	return await _check_menu_layout()


## World map parses the shipped GeoJSON headless, the intro resolves instantly
## without a display, and the palace world carries the two landmark sites.
func _check_world_screens() -> bool:
	var map: CanvasLayer = load("res://scripts/ui/world_map.gd").new()
	add_child(map)
	await get_tree().process_frame
	map.open()
	await get_tree().process_frame
	if not _check(map._countries.size() > 100, "world map parsed %d countries" % map._countries.size()):
		return false
	if not _check(map._outlines.size() > 100, "world map projected no outlines"):
		return false
	map.close()
	map.queue_free()

	var intro: CanvasLayer = load("res://scripts/ui/intro_screen.gd").new()
	add_child(intro)
	await get_tree().process_frame
	var done := [false]
	intro.intro_done.connect(func() -> void: done[0] = true)
	intro.open()
	await get_tree().process_frame
	await get_tree().process_frame
	if not _check(done[0], "intro did not resolve headless"):
		return false
	intro.queue_free()

	var palace := PalaceWorldScript.new()
	add_child(palace)
	await get_tree().process_frame
	var garden := palace.find_child("Baumgarten", true, false)
	var pad := palace.find_child("Raketenbauplatz", true, false)
	if not _check(garden != null and pad != null, "palace landmarks missing"):
		return false
	palace.queue_free()
	await get_tree().process_frame
	return true


## Instantiates the title screen headless and resizes the window across the
## supported range (960x540 floor, 1080p): the menu must build without script
## errors and keep its key nodes alive at every size.
func _check_menu_layout() -> bool:
	var menu: CanvasLayer = MainMenuScript.new()
	add_child(menu)
	await get_tree().process_frame
	for node_name: String in ["Root", "MatrixRain", "Title", "HomeList", "EnterButton",
			"PalaceButton", "DataStrip"]:
		if not _check(menu.find_child(node_name, true, false) != null,
				"menu node %s missing" % node_name):
			return false
	var win := get_window()
	if win != null:  # headless still has a root Window; resizing it is a safe no-op at OS level
		var before: Vector2i = win.size
		for dims: Vector2i in [Vector2i(960, 540), Vector2i(1920, 1080)]:
			win.size = dims
			await get_tree().process_frame
			var ok := is_instance_valid(menu) and menu.find_child("Title", true, false) != null \
					and menu.find_child("DataStrip", true, false) != null
			if not _check(ok, "menu broke after resize to %s" % dims):
				return false
		win.size = before
	menu.queue_free()
	await get_tree().process_frame
	return true


## Exercises the theme contract and the three net seams + their UI layers
## headless: loopback chat, mock voice handshake, media catalog fields.
func _check_social() -> bool:
	if not _check(UITheme.theme() is Theme, "UITheme.theme() did not return a Theme"):
		return false
	if not _check(UITheme.theme() == UITheme.theme(), "UITheme.theme() is not cached"):
		return false
	if not _check(UITheme.panel_style() is StyleBoxFlat, "panel_style() not a StyleBoxFlat"):
		return false
	for key: String in ["panel", "panel_strong", "border", "border_strong", "text", "body",
			"muted", "gold", "gold_bright", "cream", "coral", "teal_light"]:
		if not _check(UITheme.C.has(key), "UITheme.C missing key %s" % key):
			return false
	for action: String in ["chat_focus", "media_player", "voice_toggle"]:
		if not _check(InputMap.has_action(action), "input action %s missing" % action):
			return false
	if not _check(Game.get("typing") != null, "Game.typing flag missing"):
		return false

	# Chat transport: backlog replays deferred, send loops back with self=true.
	var chat_t := ChatTransportScript.new()
	chat_t.local_handle = "Smoke"
	add_child(chat_t)
	var received: Array = []
	chat_t.message_received.connect(func(msg: Dictionary) -> void: received.append(msg))
	await get_tree().process_frame  # deferred backlog lands
	var backlog := received.size()
	if not _check(backlog >= 2, "chat backlog not replayed"):
		return false
	chat_t.send("world", "hi")
	await get_tree().process_frame
	if not _check(received.size() == backlog + 1, "send('world','hi') emitted nothing"):
		return false
	var last: Dictionary = received.back()
	if not _check(bool(last.get("self", false)), "loopback message not self=true"):
		return false
	if not _check(String(last.get("body", "")) == "hi", "loopback body mangled"):
		return false
	chat_t.send("world", "   ")
	chat_t.send("nowhere", "hi")
	await get_tree().process_frame
	if not _check(received.size() == backlog + 1, "blank/unknown-channel send not dropped"):
		return false

	# Voice transport: off -> connecting -> live within ~1 s of frames.
	var voice_t := VoiceTransportScript.new()
	voice_t.local_handle = "Smoke"
	add_child(voice_t)
	voice_t.connect_voice()
	if not _check(String(voice_t.get_state().status) == "connecting", "voice not connecting"):
		return false
	await get_tree().create_timer(1.0).timeout
	var vstate: Dictionary = voice_t.get_state()
	if not _check(String(vstate.status) == "live", "voice not live after ~1 s"):
		return false
	if not _check((vstate.speakers as Array).has("Smoke"), "live speakers missing self"):
		return false
	voice_t.disconnect_voice()
	if not _check(String(voice_t.get_state().status) == "off", "voice did not disconnect"):
		return false

	# Media catalog: non-empty, every item playable + V4V-addressable.
	var catalog := MediaCatalogScript.new()
	add_child(catalog)
	var items: Array[Dictionary] = catalog.load_items()
	if not _check(not items.is_empty(), "media catalog empty"):
		return false
	for item: Dictionary in items:
		if not _check(String(item.get("audio_url", "")) != "", "media item missing audio_url"):
			return false
		if not _check(String(item.get("value_recipient", "")) != "",
				"media item missing value_recipient"):
			return false

	# UI layers build headless without errors (media skips HTTP when headless).
	var panel := ChatPanelScript.new()
	var dock := VoiceDockScript.new()
	var player := MediaPlayerScript.new()
	add_child(panel)
	add_child(dock)
	dock.attach_transport(voice_t)
	add_child(player)
	await get_tree().process_frame
	await get_tree().process_frame  # chat panel's own transport replays its backlog
	var alive := panel.is_inside_tree() and dock.is_inside_tree() and player.is_inside_tree()
	if not _check(alive, "a social UI layer failed to instantiate"):
		return false
	for node: Node in [panel, dock, player, chat_t, voice_t, catalog]:
		node.queue_free()
	await get_tree().process_frame
	return true


## Records the first failing reason; returns the condition unchanged.
func _check(cond: bool, reason: String) -> bool:
	if not cond and _fail.is_empty():
		_fail = reason
	return cond


## Asserts every contract method/signal exists on the four autoloads.
func _check_apis() -> bool:
	var specs: Array = [
		[Catalog, "Catalog",
			["get_object", "get_recipe", "recipe_ids", "block_ids", "furniture_ids", "make_material"]],
		[Economy, "Economy",
			["get_material", "get_count", "drip_rate", "can_afford", "queue_craft", "get_queue",
			"consume_object", "return_object", "set_specialty_context", "notify_condition"]],
		[Store, "Store",
			["list_homes", "create_home", "load_home", "save_home", "hosted_home", "set_hosted",
			"load_state", "save_state", "load_palace_decor", "save_palace_decor"]],
		[Game, "Game",
			["goto_menu", "goto_home", "goto_palace", "toggle_mode", "magnet_can_build"]],
	]
	for spec: Array in specs:
		var obj: Object = spec[0]
		for m: String in spec[2]:
			if not _check(obj.has_method(m), "%s.%s missing" % [spec[1], m]):
				return false
	for s: String in ["inventory_changed", "craft_completed", "move_in_arrived"]:
		if not _check(Economy.has_signal(s), "Economy signal %s missing" % s):
			return false
	for s: String in ["mode_changed", "space_changed"]:
		if not _check(Game.has_signal(s), "Game signal %s missing" % s):
			return false
	return true
