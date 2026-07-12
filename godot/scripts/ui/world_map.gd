extends CanvasLayer
## The world map — port of the OLD web map screen Felix liked (GameFrontend):
## the 600-matrix rain glowing BEHIND a dark map of gold country outlines, the
## HQ marker on Madeira and the world-asset markers clustered around it. Every
## country can one day raise its own palace (direct-democracy canon, §6).
## Countries come from the same Natural Earth GeoJSON the web build ships.
## NOTE: non-imported .geojson is whitelisted in the Web export preset
## (include_filter *.geojson) — keep that when touching export_presets.cfg.

signal closed

const UITheme := preload("res://scripts/ui/ui_theme.gd")

const GEOJSON_PATH := "res://assets/world/countries.geojson"
const HQ_LATLNG := Vector2(32.7583, -16.9419)  # Madeira — Palace of Culture HQ

## World-asset markers around HQ — verbatim from the web `worldAssets` (data.ts):
## [name, lat/lng offset from HQ, personal?]
const WORLD_ASSETS := [
	["Founders' Library", Vector2(0.12, 0.1), false],
	["Atlantic Lighthouse", Vector2(-0.1, 0.15), false],
	["Pico Spaceport", Vector2(0.14, -0.12), false],
	["Your Tree", Vector2(-0.13, -0.08), true],
	["Your Spaceship", Vector2(0.03, 0.19), true],
]

const RAIN_COLUMNS := 36
const RAIN_GLYPHS := 14

var _root: Control
var _map: Control
var _region_label: Label

# Geometry caches — projected once per resize, never per frame.
var _countries: Array = []          # [{name: String, rings: Array[PackedVector2Array] (lon/lat)}]
var _outlines: Array = []           # PackedVector2Array (screen px), parallel to _outline_owner
var _outline_owner: PackedInt32Array = []
var _hover := -1
var _pulse := 0.0
var _rain_offsets: PackedFloat32Array = []
var _rain_speeds: PackedFloat32Array = []
var _rain: Control


func _ready() -> void:
	layer = 32
	visible = false


func open() -> void:
	if _root == null:
		_build()
		_load_countries()
	visible = true
	_reproject()
	_map.queue_redraw()


func close() -> void:
	visible = false
	closed.emit()


func _unhandled_input(event: InputEvent) -> void:
	if visible and event.is_action_pressed("ui_cancel"):
		close()
		get_viewport().set_input_as_handled()


func _process(delta: float) -> void:
	if not visible:
		return
	_pulse += delta
	for i: int in _rain_offsets.size():
		_rain_offsets[i] += _rain_speeds[i] * delta
	if _rain != null:
		_rain.queue_redraw()
	_map.queue_redraw()  # marker pulse; outlines come from caches, this stays cheap


# --- Build ----------------------------------------------------------------------------------------


func _build() -> void:
	_root = Control.new()
	_root.name = "WorldMapRoot"
	_root.set_anchors_preset(Control.PRESET_FULL_RECT)
	_root.theme = UITheme.theme()
	add_child(_root)

	var ink := ColorRect.new()
	ink.color = UITheme.C.ink
	ink.set_anchors_preset(Control.PRESET_FULL_RECT)
	_root.add_child(ink)

	# The 600-rain behind the map — same metaphor as the menu, dimmer (old web map
	# rendered its MatrixField behind the leaflet canvas).
	_rain = Control.new()
	_rain.set_anchors_preset(Control.PRESET_FULL_RECT)
	_rain.mouse_filter = Control.MOUSE_FILTER_IGNORE
	for i: int in RAIN_COLUMNS:
		_rain_offsets.append(randf() * 400.0)
		_rain_speeds.append(14.0 + randf() * 22.0)
	_rain.draw.connect(_draw_rain)
	_root.add_child(_rain)

	_map = Control.new()
	_map.name = "Map"
	_map.set_anchors_preset(Control.PRESET_FULL_RECT)
	_map.draw.connect(_draw_map)
	_map.gui_input.connect(_on_map_input)
	_map.resized.connect(_reproject)
	_root.add_child(_map)

	var header := VBoxContainer.new()
	header.set_anchors_preset(Control.PRESET_CENTER_TOP)
	header.offset_top = 26.0
	header.offset_left = -300.0
	header.offset_right = 300.0
	header.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_root.add_child(header)
	var title := Label.new()
	title.text = "THE WORLD"
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title.add_theme_font_override("font", UITheme.font_display())
	title.add_theme_font_size_override("font_size", 34)
	title.add_theme_color_override("font_color", UITheme.C.gold)
	header.add_child(title)
	var sub := UITheme.mono_label("every country can raise its own palace", 12, UITheme.C.muted)
	sub.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	header.add_child(sub)

	_region_label = UITheme.mono_label("REGION: —", 13, UITheme.C.gold)
	_region_label.set_anchors_preset(Control.PRESET_BOTTOM_LEFT)
	_region_label.offset_left = 18.0
	_region_label.offset_top = -54.0
	_root.add_child(_region_label)

	var hint := UITheme.mono_label(
		"[ ESC ] back  ·  [ CLICK HQ ] visit palace  ·  [ CLICK YOUR TREE ] go home", 12,
		UITheme.C.muted)
	hint.set_anchors_preset(Control.PRESET_BOTTOM_LEFT)
	hint.offset_left = 18.0
	hint.offset_top = -30.0
	_root.add_child(hint)


func _load_countries() -> void:
	var text := FileAccess.get_file_as_string(GEOJSON_PATH)
	if text.is_empty():
		push_warning("world_map: %s missing" % GEOJSON_PATH)
		return
	var data: Variant = JSON.parse_string(text)
	if not (data is Dictionary):
		return
	for feature: Dictionary in (data as Dictionary).get("features", []):
		var props: Dictionary = feature.get("properties", {})
		var geometry: Dictionary = feature.get("geometry", {})
		var kind := String(geometry.get("type", ""))
		var rings: Array = []
		if kind == "Polygon":
			rings.append(_ring(geometry.get("coordinates", [[]])[0]))
		elif kind == "MultiPolygon":
			for poly: Array in geometry.get("coordinates", []):
				rings.append(_ring(poly[0]))
		if rings.is_empty():
			continue
		_countries.append({
			"name": String(props.get("ADMIN", props.get("NAME", "?"))),
			"rings": rings,
		})


func _ring(coords: Array) -> PackedVector2Array:
	var out := PackedVector2Array()
	for pt: Array in coords:
		out.append(Vector2(float(pt[0]), float(pt[1])))  # lon, lat
	return out


# --- Projection -----------------------------------------------------------------------------------


func _map_rect() -> Rect2:
	## Equirectangular 2:1, fitted and centered inside the control.
	var size := _map.size
	var w := minf(size.x - 60.0, (size.y - 140.0) * 2.0)
	var h := w / 2.0
	return Rect2((size.x - w) / 2.0, (size.y - h) / 2.0 + 14.0, w, h)


func _project(lonlat: Vector2, rect: Rect2) -> Vector2:
	return Vector2(
		rect.position.x + (lonlat.x + 180.0) / 360.0 * rect.size.x,
		rect.position.y + (90.0 - lonlat.y) / 180.0 * rect.size.y
	)


func _project_latlng(latlng: Vector2, rect: Rect2) -> Vector2:
	return _project(Vector2(latlng.y, latlng.x), rect)


func _reproject() -> void:
	_outlines.clear()
	_outline_owner.clear()
	if _map == null or _countries.is_empty():
		return
	var rect := _map_rect()
	for index: int in _countries.size():
		for ring: PackedVector2Array in _countries[index]["rings"]:
			var screen := PackedVector2Array()
			screen.resize(ring.size())
			for i: int in ring.size():
				screen[i] = _project(ring[i], rect)
			_outlines.append(screen)
			_outline_owner.append(index)


# --- Drawing --------------------------------------------------------------------------------------


func _draw_rain() -> void:
	var font := UITheme.font_mono()
	var size := _rain.size
	var col_w := size.x / float(RAIN_COLUMNS)
	for i: int in RAIN_COLUMNS:
		var x := col_w * (float(i) + 0.35)
		var base_y := fmod(_rain_offsets[i], size.y + 260.0) - 260.0
		for g: int in RAIN_GLYPHS:
			var y := base_y + float(g) * 18.0
			if y < -20.0 or y > size.y + 20.0:
				continue
			var fade := 1.0 - float(g) / float(RAIN_GLYPHS)
			_rain.draw_string(font, Vector2(x, y), "600"[g % 3],
				HORIZONTAL_ALIGNMENT_LEFT, -1, 13,
				Color(UITheme.C.gold, 0.05 + 0.07 * fade))


func _draw_map() -> void:
	var rect := _map_rect()
	# Faint frame like the old leaflet tile bounds.
	_map.draw_rect(rect, Color(UITheme.C.gold, 0.10), false, 1.0)
	for i: int in _outlines.size():
		var hovered := _outline_owner[i] == _hover
		if hovered:
			_map.draw_colored_polygon(_outlines[i], Color(UITheme.C.gold, 0.08))
		_map.draw_polyline(_outlines[i],
			Color(UITheme.C.gold, 0.85 if hovered else 0.32), 1.4 if hovered else 1.0)

	# World-asset markers around HQ (cream = community, teal = personal).
	var font := UITheme.font_mono()
	for asset: Array in WORLD_ASSETS:
		var pos := _project_latlng(HQ_LATLNG + (asset[1] as Vector2) * 14.0, rect)
		var color: Color = UITheme.C.teal_light if asset[2] else UITheme.C.cream
		_map.draw_circle(pos, 3.0, Color(color, 0.9))
		_map.draw_string(font, pos + Vector2(6, 4), asset[0],
			HORIZONTAL_ALIGNMENT_LEFT, -1, 10, Color(color, 0.75))

	# HQ — gold pulsing beacon, the old map's hero marker.
	var hq := _project_latlng(HQ_LATLNG, rect)
	var pulse := 5.0 + sin(_pulse * 2.4) * 2.0
	_map.draw_circle(hq, pulse + 4.0, Color(UITheme.C.gold, 0.18))
	_map.draw_circle(hq, 4.5, UITheme.C.gold)
	_map.draw_string(font, hq + Vector2(10, -8), "PALACE OF CULTURE — HQ",
		HORIZONTAL_ALIGNMENT_LEFT, -1, 12, UITheme.C.gold)


# --- Interaction ----------------------------------------------------------------------------------


func _on_map_input(event: InputEvent) -> void:
	var rect := _map_rect()
	if event is InputEventMouseMotion:
		var hover := _country_at((event as InputEventMouseMotion).position)
		if hover != _hover:
			_hover = hover
			_region_label.text = "REGION: %s" % (
				String(_countries[_hover]["name"]).to_upper() if _hover >= 0 else "—")
			_map.queue_redraw()
	elif event is InputEventMouseButton and event.pressed \
			and (event as InputEventMouseButton).button_index == MOUSE_BUTTON_LEFT:
		var pos := (event as InputEventMouseButton).position
		if pos.distance_to(_project_latlng(HQ_LATLNG, rect)) < 14.0:
			visible = false
			closed.emit()
			Game.goto_palace()
			return
		var tree_pos := _project_latlng(HQ_LATLNG + Vector2(-0.13, -0.08) * 14.0, rect)
		if pos.distance_to(tree_pos) < 12.0 and not Store.list_homes().is_empty():
			visible = false
			closed.emit()
			Game.goto_home(Store.hosted_home())


func _country_at(point: Vector2) -> int:
	for i: int in _outlines.size():
		if _outlines[i].size() > 2 and Geometry2D.is_point_in_polygon(point, _outlines[i]):
			return _outline_owner[i]
	return -1
