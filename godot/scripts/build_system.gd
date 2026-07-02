## Block + decor placement for one world: GridMap with a procedural MeshLibrary
## built from Catalog blocks, plus a decor root of simple furniture boxes.
## Every mutation settles with Economy and re-reports specialty multipliers and
## the move-in condition (>=9 blocks and >=1 lantern placed).
extends Node3D

signal contents_changed

const PLINTH_COLOR := Color("d8cdb4")
const PLINTH_HEIGHT := 0.06
const PLINTH_MARGIN := 0.15

var _allow_blocks := true
var _grid: GridMap
var _decor_root: Node3D
var _item_for_block := {}  # block_id -> MeshLibrary item index
var _block_for_item := {}  # item index -> block_id


## Builds the GridMap and decor root. Palace worlds pass allow_blocks = false.
func setup(allow_blocks: bool) -> void:
	_allow_blocks = allow_blocks
	_grid = GridMap.new()
	_grid.name = "Grid"
	_grid.cell_size = Vector3.ONE
	_grid.mesh_library = _build_mesh_library()
	add_child(_grid)
	_decor_root = Node3D.new()
	_decor_root.name = "Decor"
	add_child(_decor_root)


func _build_mesh_library() -> MeshLibrary:
	var lib := MeshLibrary.new()
	var idx := 0
	for id in Catalog.block_ids():
		var def: Dictionary = Catalog.get_object(id)
		lib.create_item(idx)
		var mesh := BoxMesh.new()
		mesh.size = Vector3.ONE
		mesh.material = Catalog.make_material(def.get("color", Color.WHITE))
		lib.set_item_mesh(idx, mesh)
		var shape := BoxShape3D.new()
		shape.size = Vector3.ONE
		lib.set_item_shapes(idx, [shape, Transform3D()])
		_item_for_block[id] = idx
		_block_for_item[idx] = id
		idx += 1
	return lib


## The magnet's 3x3x1 placement footprint around a center cell.
func footprint_cells(center: Vector3i) -> Array:
	var cells := []
	for dx in range(-1, 2):
		for dz in range(-1, 2):
			cells.append(center + Vector3i(dx, 0, dz))
	return cells


## Places block_id into every free cell, consuming one from Economy per cell.
func place_blocks(cells: Array, block_id: String) -> int:
	if not _allow_blocks or not _item_for_block.has(block_id):
		return 0
	var placed := 0
	for cell: Vector3i in cells:
		if _grid.get_cell_item(cell) != GridMap.INVALID_CELL_ITEM:
			continue
		if not Economy.consume_object(block_id):
			break
		_grid.set_cell_item(cell, _item_for_block[block_id])
		placed += 1
	if placed > 0:
		_after_change()
	return placed


## Clears the cell and returns the block to Economy.
func absorb_block(cell: Vector3i) -> bool:
	if not _allow_blocks:
		return false
	var item := _grid.get_cell_item(cell)
	if item == GridMap.INVALID_CELL_ITEM:
		return false
	_grid.set_cell_item(cell, GridMap.INVALID_CELL_ITEM)
	Economy.return_object(_block_for_item[item])
	_after_change()
	return true


## Atomic absorb+place: swaps existing blocks of another material to block_id.
## New blocks are consumed, displaced blocks return intact. Empty cells stay empty.
func replace_blocks(cells: Array, block_id: String) -> int:
	if not _allow_blocks or not _item_for_block.has(block_id):
		return 0
	var new_item: int = _item_for_block[block_id]
	var swapped := 0
	for cell: Vector3i in cells:
		var item := _grid.get_cell_item(cell)
		if item == GridMap.INVALID_CELL_ITEM or item == new_item:
			continue
		if not Economy.consume_object(block_id):
			break
		Economy.return_object(_block_for_item[item])
		_grid.set_cell_item(cell, new_item)
		swapped += 1
	if swapped > 0:
		_after_change()
	return swapped


## Places one crafted furniture piece, consuming it from Economy.
func place_decor(object_id: String, pos: Vector3, rot_y: float) -> bool:
	var def: Dictionary = Catalog.get_object(object_id)
	if def.get("kind", "") != "furniture":
		return false
	if not Economy.consume_object(object_id):
		return false
	_spawn_decor(object_id, pos, rot_y)
	_after_change()
	return true


## Removes a placed furniture node and returns the object to Economy.
func absorb_decor(node: Node3D) -> bool:
	if node == null or not node.has_meta("object_id") or not _decor_root.is_ancestor_of(node):
		return false
	Economy.return_object(node.get_meta("object_id"))
	_decor_root.remove_child(node)
	node.queue_free()
	_after_change()
	return true


func block_count() -> int:
	return _grid.get_used_cells().size()


func decor_count(object_id: String) -> int:
	var n := 0
	for node in _decor_root.get_children():
		if node.get_meta("object_id") == object_id:
			n += 1
	return n


## Serializes to plain Arrays/Dictionaries (JSON-safe, contract data shape).
func to_data() -> Dictionary:
	var blocks := []
	for cell in _grid.get_used_cells():
		blocks.append({
			"id": _block_for_item[_grid.get_cell_item(cell)],
			"cell": [cell.x, cell.y, cell.z],
		})
	var decor := []
	for node in _decor_root.get_children():
		decor.append({
			"id": node.get_meta("object_id"),
			"pos": [node.position.x, node.position.y, node.position.z],
			"rot_y": node.rotation.y,
		})
	return {"blocks": blocks, "decor": decor}


## Restores placed state without touching Economy (placed objects are not inventory).
func from_data(data: Dictionary) -> void:
	_grid.clear()
	for node in _decor_root.get_children():
		_decor_root.remove_child(node)
		node.queue_free()
	for entry in data.get("blocks", []):
		var id: String = entry.get("id", "")
		if not _item_for_block.has(id):
			continue
		var c: Array = entry.get("cell", [0, 0, 0])
		_grid.set_cell_item(Vector3i(int(c[0]), int(c[1]), int(c[2])), _item_for_block[id])
	for entry in data.get("decor", []):
		var p: Array = entry.get("pos", [0, 0, 0])
		_spawn_decor(entry.get("id", ""), Vector3(p[0], p[1], p[2]), float(entry.get("rot_y", 0.0)))
	_after_change()


## Furniture visual: colored box of the object's size on a small label-free plinth.
func _spawn_decor(object_id: String, pos: Vector3, rot_y: float) -> StaticBody3D:
	var def: Dictionary = Catalog.get_object(object_id)
	if def.is_empty():
		return null
	var size: Vector3 = def.get("size", Vector3.ONE)
	var body := StaticBody3D.new()
	body.set_meta("object_id", object_id)
	body.position = pos
	body.rotation.y = rot_y

	var mesh := MeshInstance3D.new()
	var box := BoxMesh.new()
	box.size = size
	box.material = Catalog.make_material(def.get("color", Color.WHITE))
	mesh.mesh = box
	mesh.position = Vector3(0, PLINTH_HEIGHT + size.y * 0.5, 0)
	body.add_child(mesh)

	var plinth := MeshInstance3D.new()
	var plinth_box := BoxMesh.new()
	plinth_box.size = Vector3(size.x + PLINTH_MARGIN, PLINTH_HEIGHT, size.z + PLINTH_MARGIN)
	plinth_box.material = Catalog.make_material(PLINTH_COLOR)
	plinth.mesh = plinth_box
	plinth.position = Vector3(0, PLINTH_HEIGHT * 0.5, 0)
	body.add_child(plinth)

	var col := CollisionShape3D.new()
	var shape := BoxShape3D.new()
	shape.size = Vector3(size.x, size.y + PLINTH_HEIGHT, size.z)
	col.shape = shape
	col.position = Vector3(0, (size.y + PLINTH_HEIGHT) * 0.5, 0)
	body.add_child(col)

	_decor_root.add_child(body)
	return body


## Specialty multipliers = product per material over placed specialty objects.
## Only the Home (allow_blocks) pushes to Economy: specialty and move-in are
## Home concepts, so a palace visit must not clobber the persisted context.
func _after_change() -> void:
	if _allow_blocks:
		var mults := {}
		for node in _decor_root.get_children():
			var def: Dictionary = Catalog.get_object(node.get_meta("object_id"))
			var specialty: Dictionary = def.get("specialty", {})
			for mat_id in specialty:
				mults[mat_id] = mults.get(mat_id, 1.0) * specialty[mat_id]
		Economy.set_specialty_context(mults)
		Economy.notify_condition(block_count() >= 9 and decor_count("lantern") >= 1)
	contents_changed.emit()
