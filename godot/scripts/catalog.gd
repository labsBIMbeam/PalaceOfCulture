extends Node
## Static content catalog: palette, materials, objects, recipes. No runtime state
## except the material cache. Autoloaded as `Catalog`.

const COLOR_CREAM := Color("efe6d2")
const COLOR_GOLD := Color("e7b23c")
const COLOR_TEAL := Color("23806f")
const COLOR_CORAL := Color("e8735a")
const COLOR_STONEBLOCK := Color("c5beac")  # stone-grey-cream block look
const COLOR_BOARDS := Color("b9814a")  # warm wood look (boards + board blocks)

## Raw materials drip with real time — no farming, no gathering. Refined
## materials (boards) have NO drip entry: they only come from processing recipes.
## Ultra-low time preference (2026-07-04): materials arrive per DAY, not per minute —
## ≈21.6 wood / 10.8 stone a day. Time, never material, is the bottleneck. The unit
## stays per-minute so consumers hold; testing compresses time via --timescale.
const DRIP_PER_MINUTE := {"wood": 0.015, "stone": 0.0075}  # THE balancing knob. Touch nothing else.
const ATTRACTION_SUSTAIN_SEC := 86400.0  # move-in condition hold time (24 h)

const HOUR := 3600.0
const DAY := 86400.0

## MATERIALS: id -> {display: String, color: Color}
## wood + stone = raw (drip); boards = refined (milled from wood, Pokopia
## Small Log -> Lumber analog; the Chop worker becomes our sawbench theme).
const MATERIALS := {
	"wood": {"display": "Wood", "color": COLOR_GOLD},
	"stone": {"display": "Stone", "color": COLOR_TEAL},
	"boards": {"display": "Boards", "color": COLOR_BOARDS},
}

## OBJECTS: id -> {display, kind: "block"|"furniture", color: Color,
## size: Vector3 (metres, furniture only), specialty: {} or {material_id: multiplier},
## attracts: bool (true = arrives via move-in attraction, never bought)}.
## Blocks are 1x1x1 m grid cells. Insertion order = hotbar order (blocks first).
const OBJECTS := {
	"block_stone": {
		"display": "Stone Block", "kind": "block", "color": COLOR_STONEBLOCK,
		"specialty": {}, "attracts": false,
	},
	"block_boards": {
		"display": "Board Block", "kind": "block", "color": COLOR_BOARDS,
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
		"display": "Sawbench (Chop)", "kind": "furniture", "color": COLOR_BOARDS,
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
## output_id may be an OBJECTS id (crafting) or a MATERIALS id (processing).
## mill_boards mirrors Pokopia's Chop hand-over batch: 10 logs -> 50 lumber (1:5),
## request-then-wait, so it runs through the same timed craft queue.
## Craft times are EXTREMELY slow on purpose — ultra-low time preference in the lock
## numerology (2.1 h blocks … 21 DAYS for the stool, 42 for the fountain). A chair that
## took a month is what makes it worthy Palace decor. The queue runs while offline.
const RECIPES := {
	"mill_boards": {
		"display": "Boards x50 (Chop)", "output_id": "boards", "output_count": 50,
		"cost": {"wood": 10}, "seconds": 21.0 * HOUR,
	},
	"craft_block_stone": {
		"display": "Stone Blocks x9", "output_id": "block_stone", "output_count": 9,
		"cost": {"stone": 9}, "seconds": 2.1 * HOUR,
	},
	"craft_block_boards": {
		"display": "Board Blocks x9", "output_id": "block_boards", "output_count": 9,
		"cost": {"boards": 9}, "seconds": 2.1 * HOUR,
	},
	"craft_stool": {
		"display": "Stool", "output_id": "stool", "output_count": 1,
		"cost": {"wood": 5}, "seconds": 21.0 * DAY,
	},
	"craft_lantern": {
		"display": "Lantern", "output_id": "lantern", "output_count": 1,
		"cost": {"boards": 2, "stone": 2}, "seconds": 210.0 * HOUR,
	},
	"craft_sawbench": {
		"display": "Sawbench (Chop)", "output_id": "sawbench", "output_count": 1,
		"cost": {"wood": 8}, "seconds": 2.1 * DAY,
	},
	"craft_kiln": {
		"display": "Kiln", "output_id": "kiln", "output_count": 1,
		"cost": {"stone": 10}, "seconds": 2.1 * DAY,
	},
	"craft_fountain": {
		"display": "Fountain", "output_id": "fountain", "output_count": 1,
		"cost": {"stone": 12, "boards": 6}, "seconds": 42.0 * DAY,
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
