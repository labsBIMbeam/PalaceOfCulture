extends Node
## Player economy: real-time material drip, sequential craft queue, crafted-object
## inventory and the move-in sustain timer. Autoloaded as `Economy`.
## Persists via Store; offline time is caught up from the saved last_tick on boot.

signal inventory_changed
signal craft_completed(recipe_id: String)
signal move_in_arrived(object_id: String)

const AUTOSAVE_INTERVAL := 3.0
const MOVE_IN_REWARD_ID := "fountain"  # v0: the single attractable object

const STARTER_MATERIALS := {"wood": 60.0, "stone": 40.0, "boards": 0.0}
const STARTER_INVENTORY := {"block_stone": 18}

var _materials: Dictionary = {}    # material_id -> float accumulator
var _inventory: Dictionary = {}    # object_id -> int (crafted, not placed)
var _queue: Array = []             # [{recipe_id, remaining, total}]; head is crafting
var _specialty: Dictionary = {}    # material_id -> multiplier, reported by BuildSystem
var _condition_since: float = 0.0  # unix time the move-in condition became met; 0 = not met
var _dirty := false
var _save_cooldown := 0.0


func _ready() -> void:
	var state: Dictionary = Store.load_state()
	if state.is_empty():
		_materials = STARTER_MATERIALS.duplicate()
		_inventory = STARTER_INVENTORY.duplicate()
	else:
		_load_state(state)
		var elapsed := Time.get_unix_time_from_system() \
			- float(state.get("last_tick", Time.get_unix_time_from_system()))
		if elapsed > 0.0:
			_advance(elapsed)
			_check_move_in()
	inventory_changed.emit()
	_save_state()


func _process(delta: float) -> void:
	_advance(delta)
	_check_move_in()
	_save_cooldown -= delta
	if _dirty and _save_cooldown <= 0.0:
		_save_state()


func _notification(what: int) -> void:
	if what == NOTIFICATION_WM_CLOSE_REQUEST or what == NOTIFICATION_APPLICATION_PAUSED:
		_save_state()


func get_material(id: String) -> int:
	## Whole units owned; the fractional drip remainder stays hidden.
	return floori(float(_materials.get(id, 0.0)))


func get_count(object_id: String) -> int:
	## Crafted objects owned (not placed).
	return int(_inventory.get(object_id, 0))


func drip_rate(id: String) -> float:
	## Units per minute: base rate times the placed-specialty multiplier.
	return float(Catalog.DRIP_PER_MINUTE.get(id, 0.0)) * float(_specialty.get(id, 1.0))


func can_afford(recipe_id: String) -> bool:
	var recipe: Dictionary = Catalog.get_recipe(recipe_id)
	if recipe.is_empty():
		return false
	var cost: Dictionary = recipe["cost"]
	for mat: String in cost:
		if get_material(mat) < int(cost[mat]):
			return false
	return true


func queue_craft(recipe_id: String) -> bool:
	## Appends to the craft queue, consuming materials up-front.
	if not can_afford(recipe_id):
		return false
	var recipe: Dictionary = Catalog.get_recipe(recipe_id)
	var cost: Dictionary = recipe["cost"]
	for mat: String in cost:
		_materials[mat] = float(_materials.get(mat, 0.0)) - float(int(cost[mat]))
	var seconds := float(recipe["seconds"])
	_queue.append({"recipe_id": recipe_id, "remaining": seconds, "total": seconds})
	inventory_changed.emit()
	_save_state()
	return true


func get_queue() -> Array:
	## Display copy of the queue: [{recipe_id, remaining, total}] in craft order.
	return _queue.duplicate(true)


func consume_object(object_id: String) -> bool:
	## Placement takes one object from inventory.
	if get_count(object_id) <= 0:
		return false
	_inventory[object_id] = get_count(object_id) - 1
	inventory_changed.emit()
	_dirty = true
	return true


func return_object(object_id: String) -> void:
	## Absorb gives the whole object back — never raw materials.
	_inventory[object_id] = get_count(object_id) + 1
	inventory_changed.emit()
	_dirty = true


func set_specialty_context(multipliers: Dictionary) -> void:
	## BuildSystem reports combined placed-specialty multipliers, e.g. {"wood": 1.5}.
	## Persisted so the bonus also applies to offline catch-up drip.
	_specialty = multipliers.duplicate()
	_dirty = true


func notify_condition(met: bool) -> void:
	## BuildSystem reports whether the move-in condition currently holds.
	## The sustain timer survives sessions: only an explicit "not met" resets it.
	if met and _condition_since <= 0.0:
		_condition_since = Time.get_unix_time_from_system()
		_save_state()
	elif not met and _condition_since > 0.0:
		_condition_since = 0.0
		_save_state()


func _advance(seconds: float) -> void:
	## Applies elapsed real time to the drip and the (sequential) craft queue.
	var changed := false
	for id: String in Catalog.DRIP_PER_MINUTE:
		var before := floori(float(_materials.get(id, 0.0)))
		_materials[id] = float(_materials.get(id, 0.0)) + drip_rate(id) * seconds / 60.0
		if floori(float(_materials[id])) != before:
			changed = true
			_dirty = true
	var budget := seconds
	while budget > 0.0 and not _queue.is_empty():
		var head: Dictionary = _queue[0]
		var step := minf(budget, float(head["remaining"]))
		head["remaining"] = float(head["remaining"]) - step
		budget -= step
		if float(head["remaining"]) <= 0.0:
			_queue.pop_front()
			_complete_craft(String(head["recipe_id"]))
			changed = true
	if changed:
		inventory_changed.emit()


func _complete_craft(recipe_id: String) -> void:
	## Output lands in _materials for processing recipes (output_id is a
	## material, e.g. mill_boards) and in _inventory for object recipes.
	var recipe: Dictionary = Catalog.get_recipe(recipe_id)
	if recipe.is_empty():
		return  # recipe removed from Catalog since save — drop silently
	var out_id := String(recipe["output_id"])
	var count := int(recipe["output_count"])
	if Catalog.MATERIALS.has(out_id):
		_materials[out_id] = float(_materials.get(out_id, 0.0)) + float(count)
	else:
		_inventory[out_id] = get_count(out_id) + count
	craft_completed.emit(recipe_id)
	_save_state()


func _check_move_in() -> void:
	## A condition sustained for ATTRACTION_SUSTAIN_SEC grants the reward; the
	## timer then restarts, so a long absence can deliver several arrivals.
	var now := Time.get_unix_time_from_system()
	while _condition_since > 0.0 and now - _condition_since >= Catalog.ATTRACTION_SUSTAIN_SEC:
		_condition_since += Catalog.ATTRACTION_SUSTAIN_SEC
		_inventory[MOVE_IN_REWARD_ID] = get_count(MOVE_IN_REWARD_ID) + 1
		move_in_arrived.emit(MOVE_IN_REWARD_ID)
		inventory_changed.emit()
		_save_state()


func _load_state(state: Dictionary) -> void:
	var materials: Dictionary = state.get("materials", {})
	for id: String in materials:
		_materials[id] = float(materials[id])
	var inventory: Dictionary = state.get("inventory", {})
	for id: String in inventory:
		_inventory[id] = int(inventory[id])
	var queue: Array = state.get("queue", [])
	for entry: Dictionary in queue:
		_queue.append({
			"recipe_id": String(entry.get("recipe_id", "")),
			"remaining": float(entry.get("remaining", 0.0)),
			"total": float(entry.get("total", 0.0)),
		})
	var specialty: Dictionary = state.get("specialty", {})
	for id: String in specialty:
		_specialty[id] = float(specialty[id])
	_condition_since = float(state.get("condition_since", 0.0))


func _save_state() -> void:
	_dirty = false
	_save_cooldown = AUTOSAVE_INTERVAL
	Store.save_state({
		"materials": _materials,
		"inventory": _inventory,
		"queue": _queue,
		"last_tick": Time.get_unix_time_from_system(),
		"condition_since": _condition_since,
		"specialty": _specialty,
	})
