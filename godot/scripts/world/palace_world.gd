## Public palace: Felix's glb shell with trimesh collisions, decorate-only
## BuildSystem fed from Store's palace decor and saved back on every change.
## No block tools here — design law, enforced by allow_blocks = false.
extends Node3D

const BuildSystemScript := preload("res://scripts/build_system.gd")
const PlayerScript := preload("res://scripts/player.gd")
const MagnetScript := preload("res://scripts/magnet_controller.gd")
const TreeAssetScript := preload("res://scripts/scene_assets/tree_asset.gd")
const MocDemoScript := preload("res://scripts/moc/moc_demo.gd")

const PALACE_SCENE_PATH := "res://assets/palace.glb"
const FLOOR_SIZE := 600.0

var build_system: BuildSystemScript
var magnet: MagnetScript
var moc_demo: MocDemo

var _player: CharacterBody3D


func _init() -> void:
	name = "PalaceWorld"


func _ready() -> void:
	_add_environment()
	_add_palace()
	_add_floor()
	_add_landmarks()

	build_system = BuildSystemScript.new()
	add_child(build_system)
	build_system.setup(false)

	_player = PlayerScript.new()
	_player.position = Vector3(6, 2, 44)
	add_child(_player)
	if moc_demo != null:
		moc_demo.attach_player(_player)

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


## Baumgarten (west) + Raketenbauplatz (east): the already-built hero assets get
## their public places. Pure world dressing — no colliders, no BuildSystem data,
## plain primitive meshes (mobile 30 fps budget), visible from the spawn plaza.
func _add_landmarks() -> void:
	# --- Baumgarten at (-30, 0, 62): cream gravel circle, three trees, shrubs ---
	var garden := Node3D.new()
	garden.name = "Baumgarten"
	garden.position = Vector3(-30, 0, 62)
	add_child(garden)
	garden.add_child(_disc(8.0, 0.15, Color("efe6d2")))
	for spot: Array in [
		[Vector3(-2.5, 0, 1.5), 1.3], [Vector3(2.0, 0, -1.0), 1.0], [Vector3(0.5, 0, 3.2), 0.8],
	]:
		var tree: Node3D = TreeAssetScript.new()
		tree.scale_factor = spot[1]
		tree.position = spot[0]
		garden.add_child(tree)
	for shrub_spot: Array in [
		[Vector3(-5.5, 0, -2.0), 0.7, Color("2b9079")],
		[Vector3(4.8, 0, 2.8), 0.55, Color("23806f")],
		[Vector3(-1.0, 0, -5.2), 0.6, Color("2bd07a")],
	]:
		var shrub := MeshInstance3D.new()
		var shrub_mesh := SphereMesh.new()
		shrub_mesh.radius = shrub_spot[1]
		shrub_mesh.height = shrub_spot[1] * 2.0
		shrub_mesh.radial_segments = 8
		shrub_mesh.rings = 4
		shrub.mesh = shrub_mesh
		shrub.position = shrub_spot[0] + Vector3(0, shrub_spot[1] * 0.8, 0)
		shrub.material_override = Catalog.make_material(shrub_spot[2])
		garden.add_child(shrub)

	# --- Meaningverse workshop at (30, 0, 62): the complete 21-minute vertical slice. ---
	moc_demo = MocDemoScript.new()
	moc_demo.name = "Raketenbauplatz"  # stable landmark contract for saves/tests
	moc_demo.position = Vector3(30, 0, 62)
	add_child(moc_demo)


func _disc(radius: float, height: float, color: Color) -> MeshInstance3D:
	var disc := MeshInstance3D.new()
	var mesh := CylinderMesh.new()
	mesh.top_radius = radius
	mesh.bottom_radius = radius
	mesh.height = height
	disc.mesh = mesh
	disc.position = Vector3(0, height / 2.0, 0)
	disc.material_override = Catalog.make_material(color)
	return disc


func _add_environment() -> void:
	var env := Environment.new()
	env.background_mode = Environment.BG_COLOR
	env.background_color = Color("050714")
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color = Color("43547d")
	env.ambient_light_energy = 0.42
	env.fog_enabled = true
	env.fog_light_color = Color("101a35")
	env.fog_density = 0.007
	var world_env := WorldEnvironment.new()
	world_env.environment = env
	add_child(world_env)

	var light := DirectionalLight3D.new()
	light.rotation_degrees = Vector3(-50, -30, 0)
	light.light_color = Color("ffbf8a")
	light.shadow_enabled = true
	light.light_energy = 1.35
	add_child(light)
