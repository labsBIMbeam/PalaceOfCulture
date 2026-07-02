## Private home world: cream ground and fog, full magnet building. Loads the
## blueprint for Game.current_home from Store and autosaves it on every
## contents_changed and once more on exit.
extends Node3D

const BuildSystemScript := preload("res://scripts/build_system.gd")
const PlayerScript := preload("res://scripts/player.gd")
const MagnetScript := preload("res://scripts/magnet_controller.gd")

const GROUND_SIZE := 64.0

var build_system: BuildSystemScript
var magnet: MagnetScript

var _player: CharacterBody3D
var _home_name := ""


func _init() -> void:
	name = "HomeWorld"


func _ready() -> void:
	_home_name = Game.current_home
	_add_environment()
	_add_ground()

	build_system = BuildSystemScript.new()
	add_child(build_system)
	build_system.setup(true)

	_player = PlayerScript.new()
	_player.position = Vector3(6, 2, 24)
	add_child(_player)

	magnet = MagnetScript.new()
	magnet.position = Vector3(6, 8, 24)
	add_child(magnet)
	magnet.build_system = build_system

	Game.mode_changed.connect(_apply_mode)
	_apply_mode(Game.mode)

	if _home_name != "":
		build_system.from_data(Store.load_home(_home_name))
	# Connected after from_data so loading does not immediately re-save.
	build_system.contents_changed.connect(_save)


func _exit_tree() -> void:
	_save()


func _unhandled_input(event: InputEvent) -> void:
	# B toggles walk/magnet, but only while play input is live (mouse captured).
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
	if _home_name != "" and build_system != null:
		Store.save_home(_home_name, build_system.to_data())


func _add_environment() -> void:
	var env := Environment.new()
	env.background_mode = Environment.BG_COLOR
	env.background_color = Catalog.COLOR_CREAM
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color = Catalog.COLOR_CREAM
	env.ambient_light_energy = 0.7
	env.fog_enabled = true
	env.fog_light_color = Catalog.COLOR_CREAM
	env.fog_density = 0.012
	var world_env := WorldEnvironment.new()
	world_env.environment = env
	add_child(world_env)

	var light := DirectionalLight3D.new()
	light.rotation_degrees = Vector3(-50, -30, 0)
	light.shadow_enabled = true
	light.light_energy = 1.1
	add_child(light)


func _add_ground() -> void:
	var body := StaticBody3D.new()
	var col := CollisionShape3D.new()
	var shape := BoxShape3D.new()
	shape.size = Vector3(GROUND_SIZE, 1.0, GROUND_SIZE)
	col.shape = shape
	col.position = Vector3(0, -0.5, 0)
	body.add_child(col)
	var mesh := MeshInstance3D.new()
	var box := BoxMesh.new()
	box.size = Vector3(GROUND_SIZE, 1.0, GROUND_SIZE)
	box.material = Catalog.make_material(Catalog.COLOR_CREAM)
	mesh.mesh = box
	mesh.position = Vector3(0, -0.5, 0)
	body.add_child(mesh)
	add_child(body)
