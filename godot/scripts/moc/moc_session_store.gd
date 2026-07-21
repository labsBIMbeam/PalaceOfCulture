## Versioned local-only MoC session persistence. This is recoverability, not canonical authority.
class_name MocSessionStore
extends RefCounted

const SCHEMA_VERSION := 1


static func save(path: String, data: Dictionary) -> bool:
	if path.is_empty():
		return false
	var payload := data.duplicate(true)
	payload["schema_version"] = SCHEMA_VERSION
	var absolute := ProjectSettings.globalize_path(path)
	var temp_absolute := "%s.tmp" % absolute
	var backup_absolute := "%s.bak" % absolute
	var file := FileAccess.open(temp_absolute, FileAccess.WRITE)
	if file == null:
		return false
	file.store_string(JSON.stringify(payload, "\t"))
	file.flush()
	file.close()

	# Recover a prior interrupted swap before starting another one.
	if not FileAccess.file_exists(absolute) and FileAccess.file_exists(backup_absolute):
		DirAccess.rename_absolute(backup_absolute, absolute)
	if FileAccess.file_exists(backup_absolute):
		DirAccess.remove_absolute(backup_absolute)
	var had_previous := FileAccess.file_exists(absolute)
	if had_previous and DirAccess.rename_absolute(absolute, backup_absolute) != OK:
		DirAccess.remove_absolute(temp_absolute)
		return false
	if DirAccess.rename_absolute(temp_absolute, absolute) != OK:
		if had_previous:
			DirAccess.rename_absolute(backup_absolute, absolute)
		return false
	if had_previous:
		DirAccess.remove_absolute(backup_absolute)
	return true


static func load_data(path: String) -> Dictionary:
	var absolute := ProjectSettings.globalize_path(path)
	var data := _read_absolute(absolute)
	if not data.is_empty():
		return data
	return _read_absolute("%s.bak" % absolute)


static func _read_absolute(absolute: String) -> Dictionary:
	if not FileAccess.file_exists(absolute):
		return {}
	var file := FileAccess.open(absolute, FileAccess.READ)
	if file == null:
		return {}
	var parsed: Variant = JSON.parse_string(file.get_as_text())
	if not parsed is Dictionary:
		return {}
	var data := parsed as Dictionary
	if not data.has("schema_version"):
		return {}
	var raw_version: Variant = data.schema_version
	if not [TYPE_INT, TYPE_FLOAT].has(typeof(raw_version)) or not is_finite(float(raw_version)) \
			or not is_equal_approx(float(raw_version), roundf(float(raw_version))) \
			or int(raw_version) != SCHEMA_VERSION:
		return {}
	data.erase("schema_version")
	return data
