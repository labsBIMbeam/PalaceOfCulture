extends Node3D
## The Tree — 1:1 port of the web hero asset (apps/web scene/PlotAssets.tsx Tree()):
## gold annual-ring base (the Ringed Oak motif), brown trunk with two branches,
## six-clump teal canopy. Positions, radii and hex colors match the web original.

const RING_GOLD := Color("e7b23c")
const TRUNK_BROWN := Color("5a3d22")

## Canopy clumps: position, radius, color — verbatim from the web CANOPY array.
const CANOPY := [
	[Vector3(0, 3.3, 0), 1.55, Color("23806f")],
	[Vector3(-1.05, 2.85, 0.4), 1.15, Color("1f6b62")],
	[Vector3(1.0, 2.95, -0.35), 1.2, Color("2b9079")],
	[Vector3(0.25, 4.25, 0.15), 1.05, Color("2bd07a")],
	[Vector3(-0.45, 3.95, -0.55), 0.9, Color("23806f")],
	[Vector3(0.6, 3.55, 0.7), 0.85, Color("2b9079")],
]

var scale_factor := 1.0


func _ready() -> void:
	scale = Vector3.ONE * scale_factor

	# Gold annual-ring base (Godot's TorusMesh already lies flat in XZ).
	var ring := MeshInstance3D.new()
	var ring_mesh := TorusMesh.new()
	ring_mesh.inner_radius = 0.84
	ring_mesh.outer_radius = 1.06
	ring.mesh = ring_mesh
	ring.position = Vector3(0, 0.08, 0)
	var ring_mat := StandardMaterial3D.new()
	ring_mat.albedo_color = RING_GOLD
	ring_mat.emission_enabled = true
	ring_mat.emission = RING_GOLD
	ring_mat.emission_energy_multiplier = 0.3
	ring_mat.metallic = 0.5
	ring_mat.roughness = 0.35
	ring.material_override = ring_mat
	add_child(ring)

	var trunk_mat := StandardMaterial3D.new()
	trunk_mat.albedo_color = TRUNK_BROWN
	trunk_mat.roughness = 0.95

	var trunk := MeshInstance3D.new()
	var trunk_mesh := CylinderMesh.new()
	trunk_mesh.top_radius = 0.18
	trunk_mesh.bottom_radius = 0.34
	trunk_mesh.height = 2.4
	trunk.mesh = trunk_mesh
	trunk.position = Vector3(0, 1.2, 0)
	trunk.material_override = trunk_mat
	add_child(trunk)

	for dir: float in [1.0, -1.0]:
		var branch := MeshInstance3D.new()
		var branch_mesh := CylinderMesh.new()
		branch_mesh.top_radius = 0.08
		branch_mesh.bottom_radius = 0.14
		branch_mesh.height = 1.1
		branch.mesh = branch_mesh
		branch.position = Vector3(dir * 0.45, 2.1, 0)
		branch.rotation = Vector3(0, 0, dir * 0.7)
		branch.material_override = trunk_mat
		add_child(branch)

	for clump: Array in CANOPY:
		var leaf := MeshInstance3D.new()
		var leaf_mesh := SphereMesh.new()
		leaf_mesh.radius = clump[1]
		leaf_mesh.height = clump[1] * 2.0
		leaf_mesh.radial_segments = 10  # chunky low-poly read, like the web icosahedron
		leaf_mesh.rings = 5
		leaf.mesh = leaf_mesh
		leaf.position = clump[0]
		var leaf_mat := StandardMaterial3D.new()
		leaf_mat.albedo_color = clump[2]
		leaf_mat.roughness = 0.8
		leaf.material_override = leaf_mat
		add_child(leaf)
