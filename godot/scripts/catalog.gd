extends Node
## Static content catalog: palette, materials, objects, recipes. No runtime state
## except the material cache. Autoloaded as `Catalog`.

const COLOR_CREAM := Color("efe6d2")
const COLOR_GOLD := Color("e7b23c")
const COLOR_TEAL := Color("23806f")
const COLOR_CORAL := Color("e8735a")

const DRIP_PER_MINUTE := {"wood": 2.0, "stone": 1.0}  # THE balancing knob. Touch nothing else.
const ATTRACTION_SUSTAIN_SEC := 86400.0  # move-in condition hold time (24 h)

## MATERIALS: id -> {display: String, color: Color}
const MATERIALS := {
	"wood": {"display": "Wood", "color": COLOR_GOLD},
	"stone": {"display": "Stone", "color": COLOR_TEAL},
}

## OBJECTS: id -> {display, kind: "block"|"furniture", color: Color,
## size: Vector3 (metres, furniture only), specialty: {} or {material_id: multiplier},
## attracts: bool (true = arrives via move-in attraction, never bought)}.
## Blocks are 1x1x1 m grid cells. Insertion order = hotbar order (blocks first).
const OBJECTS := {
	"block_cream": {
		"display": "Cream Block", "kind": "block", "color": COLOR_CREAM,
		"specialty": {}, "attracts": false,
	},
	"block_gold": {
		"display": "Gold Block", "kind": "block", "color": COLOR_GOLD,
		"specialty": {}, "attracts": false,
	},
	"block_teal": {
		"display": "Teal Block", "kind": "block", "color": COLOR_TEAL,
		"specialty": {}, "attracts": false,
	},
	"stool": {
		"display": "Stool", "kind": "furniture", "color": COLOR_GOLD,
		"size": Vector3(0.6, 0.5, 0.6), "specialty": {}, "attracts": false,
	},
	"lantern": {
		"display": "Lantern", "kind": "furniture", "color": COLOR_CORAL,
		"size": Vector3(0.4, 1.4, 0.4), "specialty": {}, "attracts": false,
	},
	"sawbench": {
		"display": "Sawbench", "kind": "furniture", "color": COLOR_GOLD,
		"size": Vector3(1.6, 1.0, 0.8), "specialty": {"wood": 1.5}, "attracts": false,
	},
	"kiln": {
		"display": "Kiln", "kind": "furniture", "color": COLOR_TEAL,
		"size": Vector3(1.2, 1.5, 1.2), "specialty": {"stone": 1.5}, "attracts": false,
	},
	"fountain": {
		"display": "Fountain", "kind": "furniture", "color": COLOR_TEAL,
		"size": Vector3(2.4, 1.6, 2.4), "specialty": {}, "attracts": true,
	},
}

## RECIPES: id -> {display, output_id, output_count, cost: {material_id: int}, seconds: float}
const RECIPES := {
	"craft_block_cream": {
		"display": "Cream Blocks x9", "output_id": "block_cream", "output_count": 9,
		"cost": {"wood": 9}, "seconds": 60.0,
	},
	"craft_block_gold": {
		"display": "Gold Blocks x9", "output_id": "block_gold", "output_count": 9,
		"cost": {"stone": 9}, "seconds": 60.0,
	},
	"craft_block_teal": {
		"display": "Teal Blocks x9", "output_id": "block_teal", "output_count": 9,
		"cost": {"stone": 9}, "seconds": 60.0,
	},
	"craft_stool": {
		"display": "Stool", "output_id": "stool", "output_count": 1,
		"cost": {"wood": 5}, "seconds": 120.0,
	},
	"craft_lantern": {
		"display": "Lantern", "output_id": "lantern", "output_count": 1,
		"cost": {"wood": 3, "stone": 2}, "seconds": 300.0,
	},
	"craft_sawbench": {
		"display": "Sawbench", "output_id": "sawbench", "output_count": 1,
		"cost": {"wood": 8}, "seconds": 600.0,
	},
	"craft_kiln": {
		"display": "Kiln", "output_id": "kiln", "output_count": 1,
		"cost": {"stone": 10}, "seconds": 600.0,
	},
	"craft_fountain": {
		"display": "Fountain", "output_id": "fountain", "output_count": 1,
		"cost": {"stone": 12, "wood": 4}, "seconds": 1200.0,
	},
}

var _material_cache: Dictionary = {}  # Color -> StandardMaterial3D


func get_object(id: String) -> Dictionary:
	## Object definition, or {} if unknown.
	return OBJECTS.get(id, {})


func get_recipe(id: String) -> Dictionary:
	## Recipe definition, or {} if unknown.
	return RECIPES.get(id, {})


func recipe_ids() -> Array[String]:
	## All recipe ids in catalog order.
	var out: Array[String] = []
	for id: String in RECIPES:
		out.append(id)
	return out


func block_ids() -> Array[String]:
	## Object ids with kind == "block".
	return _ids_of_kind("block")


func furniture_ids() -> Array[String]:
	## Object ids with kind == "furniture".
	return _ids_of_kind("furniture")


func make_material(color: Color) -> StandardMaterial3D:
	## Toon-flat StandardMaterial3D for the given color, cached per color.
	if _material_cache.has(color):
		return _material_cache[color]
	var mat := StandardMaterial3D.new()
	mat.albedo_color = color
	mat.roughness = 0.9
	mat.metallic = 0.0
	_material_cache[color] = mat
	return mat


func _ids_of_kind(kind: String) -> Array[String]:
	var out: Array[String] = []
	for id: String in OBJECTS:
		if OBJECTS[id]["kind"] == kind:
			out.append(id)
	return out
