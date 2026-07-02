## Public palace: Felix's glb shell with trimesh collisions, decorate-only
## BuildSystem fed from Store's palace decor and saved back on every change.
## No block tools here — design law, enforced by allow_blocks = false.
extends Node3D

const BuildSystemScript := preload("res://scripts/build_system.gd")
const PlayerScript := preload("res://scripts/player.gd")
const MagnetScript := preload("res://scripts/magnet_controller.gd")

const PALACE_SCENE_PATH := "res://assets/palace.glb"
const FLOOR_SIZE := 600.0

var build_system: BuildSystemScript
var magnet: MagnetScript

var _player: CharacterBody3D


func _init() -> void:
	name = "PalaceWorld"


func _ready() -> void:
	_add_environment()
	_add_palace()
	_add_floor()

	build_system = BuildSystemScript.new()
	add_child(build_system)
	build_system.setup(false)

	_player = PlayerScript.new()
	_player.position = Vector3(6, 2, 44)
	add_child(_player)

	magnet = MagnetScript.new()
	magnet.position = Vector3(6, 8, 44)
	add_child(magnet)
	magnet.build_system = build_system

	Game.mode_changed.connect(_apply_mode)
	_apply_mode(Game.mode)

	build_system.from_data({"blocks": [], "decor": Store.load_palace_decor()})
	# Connected after from_data so loading does not immediately re-save.
	build_system.contents_changed.connect(_save)


func _exit_tree() -> void:
	_save()


func _unhandled_input(event: InputEvent) -> void:
	# B toggles walk/magnet (decorate-only here), only while mouse is captured.
	if event.is_action_pressed("toggle_magnet") and Input.mouse_mode == Input.MOUSE_MODE_CAPTURED:
		Game.toggle_mode()
		get_viewport().set_input_as_handled()


func _apply_mode(mode: int) -> void:
	if mode == Game.Mode.MAGNET:
		magnet.global_position = _player.global_position + Vector3(0, 4, 0)
		_player.set_active(false)
		magnet.set_active(true)
	else:
		magnet.set_active(false)
		_player.set_active(true)


func _save() -> void:
	if build_system != null:
		Store.save_palace_decor(build_system.to_data().get("decor", []))


func _add_palace() -> void:
	var scene := load(PALACE_SCENE_PATH) as PackedScene
	if scene == null:
		push_warning("palace_world: %s missing or not imported" % PALACE_SCENE_PATH)
		return
	var palace := scene.instantiate()
	add_child(palace)
	_add_trimesh_collisions(palace)


## Walks the imported scene and gives every MeshInstance3D a trimesh collider.
func _add_trimesh_collisions(node: Node) -> void:
	if node is MeshInstance3D:
		(node as MeshInstance3D).create_trimesh_collision()
	for child in node.get_children():
		_add_trimesh_collisions(child)


## Invisible safety floor so player/magnet rays always have a ground plane.
func _add_floor() -> void:
	var body := StaticBody3D.new()
	var col := CollisionShape3D.new()
	var shape := BoxShape3D.new()
	shape.size = Vector3(FLOOR_SIZE, 1.0, FLOOR_SIZE)
	col.shape = shape
	col.position = Vector3(0, -0.5, 0)
	body.add_child(col)
	add_child(body)


func _add_environment() -> void:
	var env := Environment.new()
	env.background_mode = Environment.BG_COLOR
	env.background_color = Catalog.COLOR_CREAM
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color = Catalog.COLOR_CREAM
	env.ambient_light_energy = 0.7
	env.fog_enabled = true
	env.fog_light_color = Catalog.COLOR_CREAM
	env.fog_density = 0.004
	var world_env := WorldEnvironment.new()
	world_env.environment = env
	add_child(world_env)

	var light := DirectionalLight3D.new()
	light.rotation_degrees = Vector3(-50, -30, 0)
	light.shadow_enabled = true
	light.light_energy = 1.1
	add_child(light)
