extends Node
## Headless smoke test (run via `-- --smoke`): asserts the autoload contract
## APIs exist, then exercises home building, crafting, blueprint persistence
## and palace decoration end to end. Prints SMOKE OK / SMOKE FAIL: <reason>.

const HomeWorldScript := preload("res://scripts/world/home_world.gd")
const PalaceWorldScript := preload("res://scripts/world/palace_world.gd")

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
		Economy.return_object("block_teal")  # public grant path for objects
	var owned := Economy.get_count("block_teal")
	var cells: Array = home.build_system.footprint_cells(Vector3i(2, 0, 2))
	if not _check(cells.size() == 9, "footprint_cells is not 3x3x1"):
		return false
	if not _check(home.build_system.place_blocks(cells, "block_teal") == 9, "place_blocks did not place 9"):
		return false
	if not _check(home.build_system.block_count() == 9, "block_count != 9 after place"):
		return false
	if not _check(Economy.get_count("block_teal") == owned - 9, "blocks not consumed from Economy"):
		return false
	if not _check(home.build_system.absorb_block(Vector3i(2, 0, 2)), "absorb_block refused"):
		return false
	if not _check(Economy.get_count("block_teal") == owned - 8, "absorbed block not returned"):
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

	# --- Save + reload the home blueprint ---
	Store.save_home(HOME_NAME, home.build_system.to_data())
	var loaded: Dictionary = Store.load_home(HOME_NAME)
	if not _check((loaded.get("blocks", []) as Array).size() == 8, "reloaded home has wrong block count"):
		return false
	home.build_system.from_data(loaded)
	if not _check(home.build_system.block_count() == 8, "from_data lost blocks"):
		return false
	home.queue_free()
	await get_tree().process_frame

	# --- Palace: decorate-only ---
	Store.save_palace_decor([])  # deterministic reruns
	var palace := PalaceWorldScript.new()
	add_child(palace)
	await get_tree().process_frame

	if not _check(palace.build_system.place_blocks([Vector3i.ZERO], "block_teal") == 0, "palace accepted blocks"):
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
