## Runtime seam for the deterministic 36-module Blender asset.
## Slot visibility is name-addressed so the contract survives GLB importer metadata differences.
class_name MocLeviathanAssembly
extends Node3D

signal contract_ready(module_count: int)
signal contract_failed(reason: String)

const ASSET_PATH := "res://assets/moc/leviathan.glb"
const MODULE_COUNT := 36
const TUESDAY_TARGET := 30
const RESERVED_PEER_SLOT := 26

var visible_modules := 24
var _model: Node3D
var _slot_nodes: Dictionary = {}
var _base_scales: Dictionary = {}
var _occupied_slots: Dictionary = {}
var _launching := false
var _launch_origin := Vector3.ZERO
var _pulse_time := 0.0


func _init() -> void:
	name = "MOC_Leviathan"


func _ready() -> void:
	var packed := load(ASSET_PATH) as PackedScene
	if packed == null:
		_fail("missing or unimported %s" % ASSET_PATH)
		return
	_model = packed.instantiate()
	_model.name = "RuntimeModel"
	add_child(_model)
	_collect_modules(_model)
	if not validate_contract():
		return
	var baseline: Array[int] = []
	for slot in range(1, 25):
		baseline.append(slot)
	apply_occupied_slots(baseline, false)
	_launch_origin = position
	set_process(true)
	contract_ready.emit(_slot_nodes.size())


func validate_contract() -> bool:
	if _slot_nodes.size() != MODULE_COUNT:
		_fail("expected %d modules, found %d" % [MODULE_COUNT, _slot_nodes.size()])
		return false
	for slot in range(1, MODULE_COUNT + 1):
		if not _slot_nodes.has(slot):
			_fail("missing module slot %02d" % slot)
			return false
	return true


func reveal_to(count: int, animate := true) -> void:
	var contiguous: Array[int] = []
	for slot in range(1, clampi(count, 0, TUESDAY_TARGET) + 1):
		if slot != RESERVED_PEER_SLOT:
			contiguous.append(slot)
	apply_occupied_slots(contiguous, animate)


func apply_occupied_slots(slots: Array[int], animate := true) -> void:
	var next: Dictionary = {}
	for slot in slots:
		if slot >= 1 and slot <= TUESDAY_TARGET and slot != RESERVED_PEER_SLOT:
			next[slot] = true
	if next == _occupied_slots:
		return
	_occupied_slots = next
	visible_modules = _occupied_slots.size()
	_apply_visibility(animate)


func is_slot_visible(slot: int) -> bool:
	return _slot_nodes.has(slot) and (_slot_nodes[slot] as Node3D).visible


func animate_launch() -> void:
	if _launching:
		return
	_launching = true
	var tween := create_tween().set_parallel(true)
	tween.set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)
	tween.tween_property(self, "position:y", _launch_origin.y + 8.0, 18.0)
	tween.tween_property(self, "rotation:y", rotation.y + deg_to_rad(8.0), 18.0)


func set_launched_immediate() -> void:
	_launching = true
	position.y = _launch_origin.y + 8.0
	rotation.y = deg_to_rad(8.0)


func pulse_commit(slot: int) -> void:
	if slot < 1 or slot > TUESDAY_TARGET or slot == RESERVED_PEER_SLOT or not _slot_nodes.has(slot):
		return
	var node := _slot_nodes[slot] as Node3D
	node.visible = true
	node.scale = _base_scales[slot] * 0.04
	var tween := create_tween()
	tween.set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
	tween.tween_property(node, "scale", _base_scales[slot] * 1.18, 0.7)
	tween.tween_property(node, "scale", _base_scales[slot], 0.35)


func _process(delta: float) -> void:
	_pulse_time += delta
	if _model != null and not _launching:
		_model.position.y = sin(_pulse_time * 0.55) * 0.08


func _collect_modules(node: Node) -> void:
	if node is MeshInstance3D:
		var slot := _slot_from_name(String(node.name))
		if slot > 0:
			if _slot_nodes.has(slot):
				_fail("duplicate module slot %02d" % slot)
			else:
				_slot_nodes[slot] = node
				_base_scales[slot] = (node as Node3D).scale
	for child in node.get_children():
		_collect_modules(child)


func _slot_from_name(value: String) -> int:
	if not value.begins_with("MOC_") or value.length() < 6:
		return -1
	var digits := value.substr(4, 2)
	if not digits.is_valid_int():
		return -1
	var slot := digits.to_int()
	return slot if slot >= 1 and slot <= MODULE_COUNT else -1


func _apply_visibility(animate: bool) -> void:
	# Final sink is fail-closed even if an in-process caller poisons the conventional-private map.
	for occupied_slot: int in _occupied_slots.keys():
		if occupied_slot < 1 or occupied_slot > TUESDAY_TARGET or occupied_slot == RESERVED_PEER_SLOT:
			_occupied_slots.erase(occupied_slot)
	visible_modules = _occupied_slots.size()
	for slot: int in _slot_nodes:
		var node := _slot_nodes[slot] as Node3D
		var should_show := slot <= TUESDAY_TARGET and slot != RESERVED_PEER_SLOT \
				and _occupied_slots.has(slot)
		if should_show and not node.visible and animate:
			node.visible = true
			pulse_commit(slot)
		else:
			node.visible = should_show
			node.scale = _base_scales[slot]


func _fail(reason: String) -> void:
	push_error("moc_leviathan: %s" % reason)
	contract_failed.emit(reason)
