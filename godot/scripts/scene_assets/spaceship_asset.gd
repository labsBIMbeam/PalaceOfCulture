extends Node3D
## The 21-year Spaceship — 1:1 port of the web hero asset (PlotAssets.tsx
## Spaceship()): coral engine ring, cream two-stage body, accent nose + wings,
## glowing cockpit, three dark nozzles. Accent defaults to brand gold.

const ENGINE_CORAL := Color("e8704f")
const ENGINE_GLOW := Color("f08a55")

var accent := Color("e7b23c")
var scale_factor := 1.0


func _ready() -> void:
	scale = Vector3.ONE * scale_factor

	var engine := MeshInstance3D.new()
	var engine_mesh := TorusMesh.new()
	engine_mesh.inner_radius = 0.5
	engine_mesh.outer_radius = 0.74
	engine.mesh = engine_mesh
	engine.position = Vector3(0, 0.18, 0)
	engine.material_override = _mat(ENGINE_CORAL, 0.0, 0.4, ENGINE_GLOW, 0.9)
	add_child(engine)

	_cylinder(Vector3(0, 1.0, 0), 0.5, 0.78, 1.7, _mat(Color("e9e2d2"), 0.35, 0.4))
	_cylinder(Vector3(0, 2.35, 0), 0.34, 0.5, 1.2, _mat(Color("f4eedd"), 0.35, 0.4))
	_cylinder(Vector3(0, 3.5, 0), 0.0, 0.34, 1.3, _mat(accent, 0.4, 0.35, accent, 0.25))

	var cockpit := MeshInstance3D.new()
	var cockpit_mesh := SphereMesh.new()
	cockpit_mesh.radius = 0.3
	cockpit_mesh.height = 0.6
	cockpit.mesh = cockpit_mesh
	cockpit.position = Vector3(0, 2.55, 0.34)
	cockpit.material_override = _mat(Color("2a3a4a"), 0.6, 0.2, Color("9fd0ff"), 0.35)
	add_child(cockpit)

	for index: int in 3:
		var angle := float(index) * TAU / 3.0
		var wing := MeshInstance3D.new()
		var wing_mesh := BoxMesh.new()
		wing_mesh.size = Vector3(0.09, 1.3, 0.85)
		wing.mesh = wing_mesh
		wing.position = Vector3(sin(angle) * 0.62, 0.85, cos(angle) * 0.62)
		wing.rotation = Vector3(0.35, -angle, 0)
		wing.material_override = _mat(accent, 0.35, 0.45)
		add_child(wing)

	for index: int in 3:
		var angle := float(index) * TAU / 3.0 + PI / 3.0
		_cylinder(
			Vector3(sin(angle) * 0.32, 0.16, cos(angle) * 0.32),
			0.16, 0.0, 0.4, _mat(Color("3a3a40"), 0.6, 0.5)
		)


func _cylinder(pos: Vector3, top: float, bottom: float, height: float,
		material: StandardMaterial3D) -> void:
	var node := MeshInstance3D.new()
	var mesh := CylinderMesh.new()
	mesh.top_radius = top
	mesh.bottom_radius = bottom
	mesh.height = height
	node.mesh = mesh
	node.position = pos
	node.material_override = material
	add_child(node)


func _mat(albedo: Color, metallic: float, roughness: float,
		emission := Color.BLACK, emission_energy := 0.0) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.albedo_color = albedo
	m.metallic = metallic
	m.roughness = roughness
	if emission_energy > 0.0:
		m.emission_enabled = true
		m.emission = emission
		m.emission_energy_multiplier = emission_energy
	return m
