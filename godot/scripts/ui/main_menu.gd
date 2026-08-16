extends CanvasLayer
## Title screen, cypherpunk-dark: approved Zapburg keyart under a calm
## "600" matrix rain (port of the web MatrixField — column groups of 6-0-0 sweep
## on, hold, then fade), a typography-led center column (massive Cinzel wordmark,
## mono terminal home rows, gold hover, glow only on focus) and a
## mempool-style mono data strip along the bottom (approx block height, drip
## rates, home count, RADIO [M] hint). The text IS the button — no boxed
## panels. Coral marks ONLY the hosted-home star.

signal world_map_requested

const UITheme := preload("res://scripts/ui/ui_theme.gd")
const TITLE_KEYART := preload("res://assets/ui/title.webp")

const CENTER_WIDTH := 560.0
const STRIP_HEIGHT := 34.0
const RAIN_FONT_SIZE := 13
const RAIN_CELL_H := 18.0
## Approximate chain height from wall time (600 s blocks since the 2009-01-03
## genesis) — real-enough live data as the menu's only ornament, mempool-style.
const BTC_GENESIS_UNIX := 1231006505.0
const BTC_BLOCK_SEC := 600.0
const BLOCK_REFRESH_SEC := 5.0

## Static scanlines: 2 px on / 2 px off at 5 % black (research ceiling: 8 %).
## Plain canvas_item shader — no screen read, no curvature, no mesh; safe on
## GL Compatibility and web. FRAGCOORD keeps the lines pixel-crisp at any
## window scale.
const SCANLINE_SHADER := """
shader_type canvas_item;

void fragment() {
	float band = step(mod(FRAGCOORD.y, 4.0), 2.0);
	COLOR = vec4(0.0, 0.0, 0.0, band * 0.05);
}
"""

var _home_box: VBoxContainer
var _home_group := ButtonGroup.new()
var _selected_home := ""
var _enter_button: Button
var _palace_button: Button
var _name_edit: LineEdit
var _root: Control
var _sweeps: Control
var _block_value: Label
var _homes_value: Label
var _tick_accum := BLOCK_REFRESH_SEC  # refresh on the first frame
var _row_normal: StyleBoxFlat
var _row_hover: StyleBoxFlat
var _row_pressed: StyleBoxFlat
var _row_focus: StyleBoxFlat


func _init() -> void:
	name = "MainMenu"
	layer = 30


func _ready() -> void:
	_build_row_styles()
	_root = Control.new()
	_root.name = "Root"
	_root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_root.theme = UITheme.theme()
	add_child(_root)
	_root.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	_build_backdrop()
	_build_center()
	_build_data_strip()
	_build_scanlines()
	visibility_changed.connect(_on_visibility_changed)
	_refresh_homes()
	Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
	_fade_in()
	_grab_default_focus()


func _process(delta: float) -> void:
	if not visible:
		return
	_tick_accum += delta
	if _tick_accum >= BLOCK_REFRESH_SEC:
		_tick_accum = 0.0
		_refresh_block_height()


# --- Backdrop layers ------------------------------------------------------------------------------


## Near-black ink field, approved keyart, the ported 600-rain (static faint bed
## + sweeping column groups on top) and a soft radial vignette. Keyart stays
## subordinate to the terminal typography.
func _build_backdrop() -> void:
	var ink := ColorRect.new()
	ink.name = "Ink"
	ink.color = UITheme.C.ink
	ink.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_root.add_child(ink)
	ink.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)

	var keyart := TextureRect.new()
	keyart.name = "TitleKeyart"
	keyart.texture = TITLE_KEYART
	keyart.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	keyart.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_COVERED
	keyart.modulate = Color(1.0, 1.0, 1.0, 0.34)
	keyart.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_root.add_child(keyart)
	keyart.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)

	var rain := Control.new()
	rain.name = "MatrixRain"
	rain.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_root.add_child(rain)
	rain.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	var mono := UITheme.font_mono()
	if mono != null:
		var cell := Vector2(
			maxf(8.0, mono.get_string_size("0 ", HORIZONTAL_ALIGNMENT_LEFT, -1, RAIN_FONT_SIZE).x),
			RAIN_CELL_H)
		var grid := RainGrid.new(mono, RAIN_FONT_SIZE, cell, Color(UITheme.C.gold, 0.05))
		rain.add_child(grid)
		grid.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
		_sweeps = RainSweeps.new(mono, RAIN_FONT_SIZE, cell, UITheme.C.gold as Color)
		rain.add_child(_sweeps)
		_sweeps.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)

	var vignette := TextureRect.new()
	vignette.name = "Vignette"
	var grad := Gradient.new()
	grad.offsets = PackedFloat32Array([0.0, 0.62, 1.0])
	grad.colors = PackedColorArray([
		Color(0, 0, 0, 0.0), Color(0, 0, 0, 0.10), Color(0, 0, 0, 0.45)])
	var grad_tex := GradientTexture2D.new()
	grad_tex.gradient = grad
	grad_tex.fill = GradientTexture2D.FILL_RADIAL
	grad_tex.fill_from = Vector2(0.5, 0.5)
	grad_tex.fill_to = Vector2(0.5, 1.0)
	vignette.texture = grad_tex
	vignette.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	vignette.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_root.add_child(vignette)
	vignette.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)


## Fullscreen scanline overlay on top of everything (mouse-transparent).
func _build_scanlines() -> void:
	var scan := ColorRect.new()
	scan.name = "Scanlines"
	scan.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var shader := Shader.new()
	shader.code = SCANLINE_SHADER
	var mat := ShaderMaterial.new()
	mat.shader = shader
	scan.material = mat
	_root.add_child(scan)
	scan.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)


# --- Center column --------------------------------------------------------------------------------


func _build_center() -> void:
	var margin := MarginContainer.new()
	margin.mouse_filter = Control.MOUSE_FILTER_IGNORE
	margin.add_theme_constant_override("margin_left", 24)
	margin.add_theme_constant_override("margin_right", 24)
	margin.add_theme_constant_override("margin_top", 24)
	margin.add_theme_constant_override("margin_bottom", int(STRIP_HEIGHT) + 16)
	_root.add_child(margin)
	margin.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	var center := CenterContainer.new()
	margin.add_child(center)
	var column := VBoxContainer.new()
	column.name = "CenterColumn"
	column.custom_minimum_size = Vector2(CENTER_WIDTH, 0)
	column.add_theme_constant_override("separation", 8)
	center.add_child(column)

	var title := _display_label("600 BILLION", 72, UITheme.C.gold)
	title.name = "Title"
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title.add_theme_color_override("font_shadow_color", Color(0, 0, 0, 0.6))
	title.add_theme_constant_override("shadow_offset_y", 3)
	column.add_child(title)
	var subtitle := _display_label("PALACE OF CULTURE · HOMEBUILDER", 14, UITheme.C.muted)
	subtitle.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	column.add_child(subtitle)
	var tagline := _label("money buys style — time builds legend", 15, UITheme.C.body)
	tagline.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	column.add_child(tagline)

	column.add_child(_spacer(18))
	column.add_child(UITheme.mono_label("» HOMES", 12, UITheme.C.muted))
	var scroll := ScrollContainer.new()
	scroll.custom_minimum_size = Vector2(0, 150)
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	column.add_child(scroll)
	_home_box = VBoxContainer.new()
	_home_box.name = "HomeList"
	_home_box.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_home_box.add_theme_constant_override("separation", 2)
	scroll.add_child(_home_box)

	column.add_child(_spacer(8))
	var actions := HBoxContainer.new()
	actions.alignment = BoxContainer.ALIGNMENT_CENTER
	actions.add_theme_constant_override("separation", 18)
	column.add_child(actions)
	_enter_button = _terminal_button("[ ENTER HOME ]")
	_enter_button.name = "EnterButton"
	_enter_button.pressed.connect(_on_enter_pressed)
	actions.add_child(_enter_button)
	_palace_button = _terminal_button("[ VISIT PALACE ]")
	_palace_button.name = "PalaceButton"
	_palace_button.pressed.connect(_on_palace_pressed)
	actions.add_child(_palace_button)
	var map_button := _terminal_button("[ WORLD MAP ]")
	map_button.name = "MapButton"
	map_button.pressed.connect(func() -> void: world_map_requested.emit())
	actions.add_child(map_button)

	column.add_child(_spacer(6))
	var create_row := HBoxContainer.new()
	create_row.add_theme_constant_override("separation", 8)
	column.add_child(create_row)
	var prompt := UITheme.mono_label(">", 14, UITheme.C.gold)
	prompt.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	create_row.add_child(prompt)
	_name_edit = LineEdit.new()
	_name_edit.placeholder_text = "new home name"
	_name_edit.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var mono := UITheme.font_mono()
	if mono != null:
		_name_edit.add_theme_font_override("font", mono)
	_name_edit.add_theme_font_size_override("font_size", 14)
	_name_edit.text_submitted.connect(_on_name_submitted)
	create_row.add_child(_name_edit)
	var create_button := _terminal_button("[ CREATE ]")
	create_button.pressed.connect(_on_create_pressed)
	create_row.add_child(create_button)


# --- Data strip -----------------------------------------------------------------------------------


## mempool-style status strip: information is the only ornament. Mono owns all
## of it; live values read teal, the RADIO hint gold.
func _build_data_strip() -> void:
	var strip := PanelContainer.new()
	strip.name = "DataStrip"
	var sb := UITheme.flat_style(Color(UITheme.C.ink, 0.92), Color(UITheme.C.gold, 0.14), 0, 0, 6.0)
	sb.border_width_top = 1
	strip.add_theme_stylebox_override("panel", sb)
	_root.add_child(strip)
	strip.set_anchors_and_offsets_preset(Control.PRESET_BOTTOM_WIDE)
	strip.offset_top = -STRIP_HEIGHT
	strip.grow_vertical = Control.GROW_DIRECTION_BEGIN
	var center := CenterContainer.new()
	strip.add_child(center)
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 8)
	center.add_child(row)
	row.add_child(UITheme.mono_label("BLOCK", 12, UITheme.C.muted))
	_block_value = UITheme.mono_label("—", 12, UITheme.C.teal_light)
	_block_value.name = "BlockValue"
	row.add_child(_block_value)
	row.add_child(UITheme.mono_label("·", 12, UITheme.C.muted))
	row.add_child(UITheme.mono_label("DRIP", 12, UITheme.C.muted))
	row.add_child(UITheme.mono_label(_drip_text(), 12, UITheme.C.teal_light))
	row.add_child(UITheme.mono_label("·", 12, UITheme.C.muted))
	row.add_child(UITheme.mono_label("HOMES", 12, UITheme.C.muted))
	_homes_value = UITheme.mono_label("0", 12, UITheme.C.teal_light)
	row.add_child(_homes_value)
	row.add_child(UITheme.mono_label("·", 12, UITheme.C.muted))
	row.add_child(UITheme.mono_label("RADIO [M]", 12, UITheme.C.gold))
	row.add_child(UITheme.mono_label("·", 12, UITheme.C.muted))
	row.add_child(UITheme.mono_label("v0.5", 12, UITheme.C.muted))
	_refresh_block_height()


func _refresh_block_height() -> void:
	if _block_value == null:
		return
	var height := int((Time.get_unix_time_from_system() - BTC_GENESIS_UNIX) / BTC_BLOCK_SEC)
	_block_value.text = _fmt_group(height)


func _drip_text() -> String:
	var parts: Array[String] = []
	for id: String in Catalog.DRIP_PER_MINUTE:
		parts.append("%s +%.1f" % [id, float(Catalog.DRIP_PER_MINUTE[id]) * 1440.0])
	return " ".join(parts) + " /day"


# --- Visibility / focus ---------------------------------------------------------------------------


func _on_visibility_changed() -> void:
	if _sweeps != null:
		_sweeps.set_process(visible)  # the rain sleeps while a world is up
	if visible:
		Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
		_refresh_homes()
		_fade_in()
		_grab_default_focus()


## Something must HAVE focus when the menu opens (keyboard/gamepad first-class).
func _grab_default_focus() -> void:
	if _enter_button == null:
		return
	if _enter_button.disabled:
		_palace_button.grab_focus()
	else:
		_enter_button.grab_focus()


## Calm fade-in whenever the menu becomes the active space.
func _fade_in() -> void:
	_root.modulate.a = 0.0
	var tw := create_tween()
	tw.tween_property(_root, "modulate:a", 1.0, 0.3) \
			.set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_OUT)


# --- Home list ------------------------------------------------------------------------------------


## Rebuilds the home rows from Store; the hosted home carries the coral star —
## the single coral accent on this screen.
func _refresh_homes() -> void:
	for child in _home_box.get_children():
		_home_box.remove_child(child)
		child.queue_free()
	var homes: Array = Store.list_homes()
	var hosted: String = Store.hosted_home()
	if _selected_home == "" or not homes.has(_selected_home):
		if homes.has(hosted):
			_selected_home = hosted
		elif not homes.is_empty():
			_selected_home = String(homes[0])
		else:
			_selected_home = ""
	if homes.is_empty():
		_home_box.add_child(
				UITheme.mono_label("  no homes yet — create one below", 13, UITheme.C.muted))
	for home_name: String in homes:
		var row := HBoxContainer.new()
		row.add_theme_constant_override("separation", 0)
		var star := UITheme.mono_label("★" if home_name == hosted else "", 14, UITheme.C.coral)
		star.custom_minimum_size = Vector2(24, 0)
		star.size_flags_vertical = Control.SIZE_SHRINK_CENTER
		row.add_child(star)
		row.add_child(_home_row_button(home_name))
		_home_box.add_child(row)
	_enter_button.disabled = _selected_home == ""
	if _homes_value != null:
		_homes_value.text = str(homes.size())


## Terminal row: transparent, mono, gold wash on hover, gold left rail when
## selected or focused (position cue, never color alone).
func _home_row_button(home_name: String) -> Button:
	var btn := Button.new()
	btn.text = home_name
	btn.toggle_mode = true
	btn.button_group = _home_group
	btn.focus_mode = Control.FOCUS_ALL
	btn.alignment = HORIZONTAL_ALIGNMENT_LEFT
	btn.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var mono := UITheme.font_mono()
	if mono != null:
		btn.add_theme_font_override("font", mono)
	btn.add_theme_font_size_override("font_size", 15)
	btn.add_theme_color_override("font_color", UITheme.C.body)
	btn.add_theme_color_override("font_hover_color", UITheme.C.gold_bright)
	btn.add_theme_color_override("font_pressed_color", UITheme.C.gold_bright)
	btn.add_theme_color_override("font_hover_pressed_color", UITheme.C.gold_bright)
	btn.add_theme_color_override("font_focus_color", UITheme.C.gold_bright)
	btn.add_theme_stylebox_override("normal", _row_normal)
	btn.add_theme_stylebox_override("hover", _row_hover)
	btn.add_theme_stylebox_override("pressed", _row_pressed)
	btn.add_theme_stylebox_override("focus", _row_focus)
	btn.toggled.connect(_on_home_toggled.bind(home_name))
	btn.button_pressed = home_name == _selected_home
	return btn


func _build_row_styles() -> void:
	_row_normal = UITheme.flat_style(Color(0, 0, 0, 0), Color(0, 0, 0, 0), 0, 0, 6.0)
	_row_normal.content_margin_left = 12.0
	_row_hover = UITheme.flat_style(Color(UITheme.C.gold, 0.06), Color(0, 0, 0, 0), 0, 0, 6.0)
	_row_hover.content_margin_left = 12.0
	_row_pressed = UITheme.flat_style(Color(UITheme.C.gold, 0.10), UITheme.C.gold as Color, 0, 0, 6.0)
	_row_pressed.border_width_left = 2
	_row_pressed.content_margin_left = 10.0
	_row_focus = UITheme.flat_style(Color(0, 0, 0, 0), UITheme.C.gold_bright as Color, 0, 0, 6.0)
	_row_focus.draw_center = false
	_row_focus.border_width_left = 2
	_row_focus.content_margin_left = 10.0


func _on_home_toggled(on: bool, home_name: String) -> void:
	if on:
		_selected_home = home_name
		_enter_button.disabled = false


# --- Actions --------------------------------------------------------------------------------------


func _on_enter_pressed() -> void:
	if _selected_home == "":
		return
	hide()
	Game.goto_home(_selected_home)


func _on_palace_pressed() -> void:
	hide()
	Game.goto_palace()


func _on_name_submitted(_text: String) -> void:
	_on_create_pressed()


func _on_create_pressed() -> void:
	var new_name := _name_edit.text.strip_edges()
	if new_name == "" or Store.list_homes().has(new_name):
		return
	Store.create_home(new_name)
	_selected_home = new_name
	_name_edit.text = ""
	_refresh_homes()


# --- Widget helpers -------------------------------------------------------------------------------


## Text-is-the-button: mono bracket glyphs, gold on hover, glow ONLY on focus.
func _terminal_button(value: String) -> Button:
	var btn := Button.new()
	btn.text = value
	btn.focus_mode = Control.FOCUS_ALL
	var mono := UITheme.font_mono()
	if mono != null:
		btn.add_theme_font_override("font", mono)
	btn.add_theme_font_size_override("font_size", 16)
	var empty := StyleBoxEmpty.new()
	empty.set_content_margin_all(8.0)
	for state: String in ["normal", "hover", "pressed", "disabled"]:
		btn.add_theme_stylebox_override(state, empty)
	btn.add_theme_stylebox_override("focus", UITheme.glow_border(UITheme.C.gold as Color))
	btn.add_theme_color_override("font_color", UITheme.C.text)
	btn.add_theme_color_override("font_hover_color", UITheme.C.gold_bright)
	btn.add_theme_color_override("font_pressed_color", UITheme.C.gold_bright)
	btn.add_theme_color_override("font_hover_pressed_color", UITheme.C.gold_bright)
	btn.add_theme_color_override("font_focus_color", UITheme.C.gold_bright)
	btn.add_theme_color_override("font_disabled_color", Color(UITheme.C.muted, 0.6))
	return btn


func _display_label(value: String, font_size: int, color: Color) -> Label:
	var l := _label(value, font_size, color)
	var display := UITheme.font_display()
	if display != null:
		l.add_theme_font_override("font", display)
	return l


func _label(value: String, font_size: int, color: Color) -> Label:
	var l := Label.new()
	l.text = value
	l.add_theme_font_size_override("font_size", font_size)
	l.add_theme_color_override("font_color", color)
	return l


func _spacer(height: float) -> Control:
	var c := Control.new()
	c.custom_minimum_size = Vector2(0, height)
	c.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return c


func _fmt_group(n: int) -> String:
	var s := str(n)
	var out := ""
	while s.length() > 3:
		out = "," + s.substr(s.length() - 3, 3) + out
		s = s.substr(0, s.length() - 3)
	return s + out


# --- Matrix rain (web MatrixField port) -----------------------------------------------------------


## Static bed of faint zeros — one draw_string per row, redrawn only on
## resize; zero per-frame cost, GL-compat/web safe (no particles, no nodes).
class RainGrid extends Control:
	var _font: Font
	var _font_size: int
	var _cell: Vector2
	var _color: Color

	func _init(font: Font, font_size: int, cell: Vector2, color: Color) -> void:
		_font = font
		_font_size = font_size
		_cell = cell
		_color = color
		mouse_filter = Control.MOUSE_FILTER_IGNORE
		resized.connect(queue_redraw)

	func _draw() -> void:
		var cols := int(ceilf(size.x / _cell.x))
		var rows := int(ceilf(size.y / _cell.y))
		if cols <= 0 or rows <= 0:
			return
		var line := "0 ".repeat(cols)
		var ascent := _font.get_ascent(_font_size)
		for r in rows:
			draw_string(_font, Vector2(2.0, r * _cell.y + ascent), line,
					HORIZONTAL_ALIGNMENT_LEFT, -1, _font_size, _color)


## The sweep layer: column groups of 6-0-0 light up row by row (bottom-up),
## hold, then fade — the web MatrixField timings, spawned a touch slower so
## the menu stays calm. Redraws only the lit glyphs each frame.
class RainSweeps extends Control:
	const ROWS_600: Array[String] = ["600", "000", "000", "000"]
	const SWEEP_PER_ROW := 0.22
	const HOLD := 1.1
	const FADE := 0.8
	const MAX_REGIONS := 8
	const MAX_ALPHA := 0.55

	var _font: Font
	var _font_size: int
	var _cell: Vector2
	var _color: Color
	var _regions: Array[Dictionary] = []
	var _clock := 0.0
	var _next_spawn := 0.6

	func _init(font: Font, font_size: int, cell: Vector2, color: Color) -> void:
		_font = font
		_font_size = font_size
		_cell = cell
		_color = color
		mouse_filter = Control.MOUSE_FILTER_IGNORE

	func _process(delta: float) -> void:
		_clock += delta
		if _clock >= _next_spawn and _regions.size() < MAX_REGIONS:
			_spawn()
			_next_spawn = _clock + 1.0 + randf() * 1.4
		var total := ROWS_600.size() * SWEEP_PER_ROW + HOLD + FADE
		var alive: Array[Dictionary] = []
		for region: Dictionary in _regions:
			if _clock - float(region.born) < total:
				alive.append(region)
		_regions = alive
		queue_redraw()

	func _draw() -> void:
		var sweep := ROWS_600.size() * SWEEP_PER_ROW
		var ascent := _font.get_ascent(_font_size)
		for region: Dictionary in _regions:
			var age := _clock - float(region.born)
			for row in ROWS_600.size():
				var light_at := (ROWS_600.size() - 1 - row) * SWEEP_PER_ROW
				var alpha := 0.0
				if age >= light_at and age < sweep + HOLD:
					alpha = minf(1.0, (age - light_at) / SWEEP_PER_ROW)
				elif age >= sweep + HOLD:
					alpha = maxf(0.0, 1.0 - (age - (sweep + HOLD)) / FADE)
				if alpha <= 0.0:
					continue
				var digits := ROWS_600[row]
				var y := (int(region.row) + row) * _cell.y + ascent
				for c in digits.length():
					draw_char(_font, Vector2((int(region.col) + c) * _cell.x + 2.0, y),
							digits[c], _font_size, Color(_color, alpha * MAX_ALPHA))

	func _spawn() -> void:
		var cols := int(size.x / _cell.x)
		var rows := int(size.y / _cell.y)
		if cols < 3 or rows < ROWS_600.size():
			return
		_regions.append({
			"col": randi_range(0, cols - 3),
			"row": randi_range(0, rows - ROWS_600.size()),
			"born": _clock,
		})
