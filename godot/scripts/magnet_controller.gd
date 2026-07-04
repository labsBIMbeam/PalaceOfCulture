## Free-fly magnet builder: own camera, translucent grid-snapped ghost, and
## place/absorb through the world's BuildSystem. When Game.magnet_can_build()
## is false the magnet is decorate-only: furniture place/absorb, coral ghost.
extends Node3D

const BuildSystemScript := preload("res://scripts/build_system.gd")

const FLY_SPEED := 12.0
const MOUSE_SENSITIVITY := 0.003
const RAY_LENGTH := 60.0
const PITCH_MIN := -1.4
const PITCH_MAX := 1.4
const GOLD := Color("e7b23c")
const CORAL := Color("e8735a")
const GHOST_ALPHA := 0.35

## Set by the owning world after both nodes exist.
var build_system: BuildSystemScript = null

var _camera: Camera3D
var _ghost: MeshInstance3D
var _ghost_material: StandardMaterial3D
var _selected := ""
var _active := false
var _aim_valid := false
var _aim_cell := Vector3i.ZERO  # cell the 3x3x1 block footprint centers on
var _aim_point := Vector3.ZERO  # exact surface point for furniture
var _absorb_cell := Vector3i.ZERO  # cell to clear when absorbing from the GridMap
var _absorb_target: Object = null  # collider under the crosshair


func _ready() -> void:
	_camera = Camera3D.new()
	add_child(_camera)

	_ghost_material = StandardMaterial3D.new()
	_ghost_material.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	_ghost_material.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	_ghost = MeshInstance3D.new()
	_ghost.top_level = true
	_ghost.visible = false
	add_child(_ghost)

	_refresh_ghost()
	_apply_active()


## HUD hotbar selection. Block ids are rejected in decorate-only worlds.
func set_selected(object_id: String) -> void:
	if object_id != "" and _is_block(object_id) and not Game.magnet_can_build():
		return
	_selected = object_id
	_refresh_ghost()


## Enables/disables input, physics and the camera; worlds call this on mode switches.
func set_active(on: bool) -> void:
	_active = on
	if _camera != null:
		_apply_active()


func _apply_active() -> void:
	set_physics_process(_active)
	set_process_unhandled_input(_active)
	_camera.current = _active
	if _active:
		Input.mouse_mode = Input.MOUSE_MODE_CAPTURED
		_refresh_ghost()
	else:
		_ghost.visible = false


func _unhandled_input(event: InputEvent) -> void:
	if Game.typing:  # chat owns the keyboard/mouse
		return
	if Input.mouse_mode != Input.MOUSE_MODE_CAPTURED:
		return
	if event is InputEventMouseMotion:
		rotation.y -= event.relative.x * MOUSE_SENSITIVITY
		_camera.rotation.x = clampf(
			_camera.rotation.x - event.relative.y * MOUSE_SENSITIVITY, PITCH_MIN, PITCH_MAX
		)
	elif event.is_action_pressed("place"):
		_place()
	elif event.is_action_pressed("absorb"):
		_absorb()


func _physics_process(delta: float) -> void:
	if Game.typing:  # freeze fly + aim while the chat input owns the keys
		return
	var input := Vector2.ZERO
	var lift := 0.0
	if Input.mouse_mode == Input.MOUSE_MODE_CAPTURED:
		input = Input.get_vector("move_left", "move_right", "move_forward", "move_back")
		lift = Input.get_action_strength("hover_up") - Input.get_action_strength("hover_down")
	var motion := Vector3(input.x, 0.0, input.y).rotated(Vector3.UP, rotation.y)
	motion.y = lift
	if motion.length_squared() > 1.0:
		motion = motion.normalized()
	global_position += motion * FLY_SPEED * delta
	_update_aim()


## Camera-ray aim: hit surface -> adjacent cell (blocks) / hit point (furniture);
## no hit -> fall back to the y=0 ground plane.
func _update_aim() -> void:
	_aim_valid = false
	_absorb_target = null
	var from := _camera.global_position
	var dir := -_camera.global_transform.basis.z
	var query := PhysicsRayQueryParameters3D.create(from, from + dir * RAY_LENGTH)
	var hit := get_world_3d().direct_space_state.intersect_ray(query)
	if hit:
		var p: Vector3 = hit.position + hit.normal * 0.5
		_aim_cell = Vector3i(floori(p.x), floori(p.y), floori(p.z))
		var q: Vector3 = hit.position - hit.normal * 0.5
		_absorb_cell = Vector3i(floori(q.x), floori(q.y), floori(q.z))
		_aim_point = hit.position
		_absorb_target = hit.collider
		_aim_valid = true
	elif dir.y < -0.001:
		var t := -from.y / dir.y
		if t > 0.0 and t < RAY_LENGTH:
			_aim_point = from + dir * t
			_aim_cell = Vector3i(floori(_aim_point.x), 0, floori(_aim_point.z))
			_aim_valid = true
	_aim_cell.y = maxi(_aim_cell.y, 0)
	_update_ghost()


func _update_ghost() -> void:
	var show := _active and _aim_valid and _selected != ""
	_ghost.visible = show
	if not show:
		return
	if _is_block(_selected):
		_ghost.global_position = Vector3(_aim_cell) + Vector3(0.5, 0.5, 0.5)
		_ghost.global_rotation = Vector3.ZERO
	else:
		var size := _selected_size()
		_ghost.global_position = _aim_point + Vector3(0.0, size.y * 0.5, 0.0)
		_ghost.global_rotation = Vector3(0.0, global_rotation.y, 0.0)


## Rebuilds the ghost mesh for the current selection; gold when building is
## allowed, coral in decorate-only worlds.
func _refresh_ghost() -> void:
	if _ghost == null:
		return
	var box := BoxMesh.new()
	box.size = Vector3(3, 1, 3) if _is_block(_selected) else _selected_size()
	box.material = _ghost_material
	var tint := GOLD if Game.magnet_can_build() else CORAL
	_ghost_material.albedo_color = Color(tint, GHOST_ALPHA)
	_ghost.mesh = box


func _place() -> void:
	if not _aim_valid or _selected == "" or build_system == null:
		return
	if _is_block(_selected):
		if Game.magnet_can_build():
			build_system.place_blocks(build_system.footprint_cells(_aim_cell), _selected)
	else:
		build_system.place_decor(_selected, _aim_point, global_rotation.y)


func _absorb() -> void:
	if build_system == null or _absorb_target == null:
		return
	if _absorb_target is GridMap:
		if Game.magnet_can_build():
			build_system.absorb_block(_absorb_cell)
	elif _absorb_target is Node3D and (_absorb_target as Node3D).has_meta("object_id"):
		build_system.absorb_decor(_absorb_target as Node3D)


func _is_block(object_id: String) -> bool:
	if object_id == "":
		return false
	return Catalog.get_object(object_id).get("kind", "") == "block"


func _selected_size() -> Vector3:
	return Catalog.get_object(_selected).get("size", Vector3.ONE)
