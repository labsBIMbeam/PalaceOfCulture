extends Node
## Local-first JSON persistence under user://: home blueprints, economy state,
## palace decor and the hosted-home marker. Autoloaded as `Store`.
##
## Home data shape: {"blocks": [{"id": String, "cell": [x,y,z]}],
##                   "decor": [{"id": String, "pos": [x,y,z], "rot_y": float}]}

const HOMES_DIR := "user://homes"
const STATE_PATH := "user://state.json"
const PALACE_PATH := "user://palace.json"
const HOSTED_PATH := "user://hosted.json"


func _init() -> void:
	# In _init (not _ready) so earlier autoloads (Economy) can already call us in their _ready.
	DirAccess.make_dir_recursive_absolute(HOMES_DIR)


func list_homes() -> Array[String]:
	## Names of all saved homes, sorted.
	var out: Array[String] = []
	var dir := DirAccess.open(HOMES_DIR)
	if dir == null:
		return out
	for file: String in dir.get_files():
		if file.ends_with(".json"):
			out.append(file.trim_suffix(".json"))
	out.sort()
	return out


func create_home(name: String) -> void:
	## Creates an empty home. The first home ever created becomes the hosted one.
	if name.strip_edges().is_empty():
		return
	if not list_homes().has(name.validate_filename()):
		save_home(name, {"blocks": [], "decor": []})
	if hosted_home().is_empty():
		set_hosted(name.validate_filename())


func load_home(name: String) -> Dictionary:
	## Home data, or {} if missing.
	return _read_json(_home_path(name))


func save_home(name: String, data: Dictionary) -> void:
	_write_json(_home_path(name), data)


func hosted_home() -> String:
	## The single hosted home name, or "" if none exists yet.
	return String(_read_json(HOSTED_PATH).get("hosted", ""))


func set_hosted(name: String) -> void:
	_write_json(HOSTED_PATH, {"hosted": name})


func load_state() -> Dictionary:
	## Economy state: {materials, inventory, queue, last_tick, condition_since, ...}.
	return _read_json(STATE_PATH)


func save_state(data: Dictionary) -> void:
	_write_json(STATE_PATH, data)


func load_palace_decor() -> Array:
	## Palace decoration list: [{id, pos: [x,y,z], rot_y}].
	var items: Array = _read_json(PALACE_PATH).get("items", [])
	return items


func save_palace_decor(items: Array) -> void:
	_write_json(PALACE_PATH, {"items": items})


func _home_path(name: String) -> String:
	return HOMES_DIR + "/" + name.validate_filename() + ".json"


func _read_json(path: String) -> Dictionary:
	if not FileAccess.file_exists(path):
		return {}
	var file := FileAccess.open(path, FileAccess.READ)
	if file == null:
		return {}
	var parsed: Variant = JSON.parse_string(file.get_as_text())
	return parsed if parsed is Dictionary else {}


func _write_json(path: String, data: Dictionary) -> void:
	var file := FileAccess.open(path, FileAccess.WRITE)
	if file == null:
		push_error("Store: cannot write %s (%s)" % [path, error_string(FileAccess.get_open_error())])
		return
	file.store_string(JSON.stringify(data))
