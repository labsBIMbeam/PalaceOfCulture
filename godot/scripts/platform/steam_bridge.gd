## Optional Steamworks adapter. Gameplay never depends on it and no App ID is fabricated.
## When a vetted GodotSteam GDExtension is present, this seam may expose overlay/lobby affordances.
class_name SteamBridge
extends Node

signal status_changed(status: String)

var status := "uninitialized"
var _steam: Object


func initialize() -> bool:
	if not Engine.has_singleton("Steam"):
		_set_status("disabled")
		return false
	_steam = Engine.get_singleton("Steam")
	if _steam == null:
		_set_status("unavailable")
		return false
	if not _steam.has_method("steamInitEx"):
		_set_status("unavailable")
		return false
	var result: Variant = _steam.call("steamInitEx")
	if not result is Dictionary or not result.has("status") or int(result.status) != 0:
		_set_status("init_failed")
		return false
	_set_status("ready")
	return true


func is_ready() -> bool:
	return status == "ready" and _steam != null


func open_invite_overlay(connect_string: String) -> bool:
	if not is_ready() or connect_string.strip_edges().is_empty():
		return false
	if not _steam.has_method("activateGameOverlayInviteDialogConnectString"):
		return false
	_steam.call("activateGameOverlayInviteDialogConnectString", connect_string.left(255))
	return true


func run_callbacks() -> void:
	if is_ready() and _steam.has_method("run_callbacks"):
		_steam.call("run_callbacks")


func _set_status(value: String) -> void:
	status = value
	status_changed.emit(status)
