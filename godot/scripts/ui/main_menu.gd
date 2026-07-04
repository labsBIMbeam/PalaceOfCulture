extends CanvasLayer
## Title screen: full-bleed title artwork under a dark gradient, Cinzel gold
## title, home list with hosted marker (coral star), Enter Home / Visit Palace
## buttons and a New Home creator. Panels read dark and warm over the art.

const UITheme := preload("res://scripts/ui/ui_theme.gd")
const BACKDROP_PATH := "res://assets/ui/title.png"

var _home_box: VBoxContainer
var _home_group := ButtonGroup.new()
var _selected_home := ""
var _enter_button: Button
var _name_edit: LineEdit
var _root: Control
var _row_normal: StyleBoxFlat
var _row_hover: StyleBoxFlat
var _row_pressed: StyleBoxFlat


func _init() -> void:
	name = "MainMenu"
	layer = 30


func _ready() -> void:
	_row_normal = UITheme.flat_style(Color(0, 0, 0, 0), Color(0, 0, 0, 0), 0, 8, 6.0)
	_row_hover = UITheme.flat_style(Color(UITheme.C.gold, 0.08), Color(0, 0, 0, 0), 0, 8, 6.0)
	_row_pressed = UITheme.flat_style(Color(UITheme.C.gold, 0.16), Color(UITheme.C.gold, 0.55), 1, 8, 6.0)
	_root = Control.new()
	_root.name = "Root"
	_root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_root.theme = UITheme.theme()
	add_child(_root)
	_root.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	_build_backdrop()

	var panel := PanelContainer.new()
	var ps := UITheme.panel_style(true)
	ps.set_content_margin_all(26.0)
	panel.add_theme_stylebox_override("panel", ps)
	panel.custom_minimum_size = Vector2(520, 0)
	_root.add_child(panel)
	panel.set_anchors_and_offsets_preset(Control.PRESET_CENTER, Control.PRESET_MODE_MINSIZE)
	panel.grow_horizontal = Control.GROW_DIRECTION_BOTH
	panel.grow_vertical = Control.GROW_DIRECTION_BOTH
	var vbox := VBoxContainer.new()
	vbox.add_theme_constant_override("separation", 10)
	panel.add_child(vbox)

	var title := _display_label("Palace of Culture — Homebuilder", 32, UITheme.C.gold)
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title.add_theme_color_override("font_shadow_color", Color(0, 0, 0, 0.55))
	title.add_theme_constant_override("shadow_offset_y", 2)
	vbox.add_child(title)
	var tagline := _label("money buys style — time builds legend", 15, UITheme.C.body)
	tagline.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	vbox.add_child(tagline)
	vbox.add_child(HSeparator.new())

	vbox.add_child(_display_label("Homes", 16, UITheme.C.gold))
	var scroll := ScrollContainer.new()
	scroll.custom_minimum_size = Vector2(0, 170)
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	vbox.add_child(scroll)
	_home_box = VBoxContainer.new()
	_home_box.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_home_box.add_theme_constant_override("separation", 2)
	scroll.add_child(_home_box)

	var actions := HBoxContainer.new()
	actions.alignment = BoxContainer.ALIGNMENT_CENTER
	actions.add_theme_constant_override("separation", 12)
	vbox.add_child(actions)
	_enter_button = _menu_button("Enter Home")
	_enter_button.pressed.connect(_on_enter_pressed)
	actions.add_child(_enter_button)
	var palace_button := _menu_button("Visit Palace")
	palace_button.pressed.connect(_on_palace_pressed)
	actions.add_child(palace_button)

	vbox.add_child(_display_label("New Home", 16, UITheme.C.gold))
	var create_row := HBoxContainer.new()
	create_row.add_theme_constant_override("separation", 8)
	vbox.add_child(create_row)
	_name_edit = LineEdit.new()
	_name_edit.placeholder_text = "new home name"
	_name_edit.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_name_edit.text_submitted.connect(_on_name_submitted)
	create_row.add_child(_name_edit)
	var create_button := _menu_button("Create")
	create_button.pressed.connect(_on_create_pressed)
	create_row.add_child(create_button)

	visibility_changed.connect(_on_visibility_changed)
	_refresh_homes()
	Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
	_fade_in()


## Full-screen artwork (keep-aspect cover) under a dark vertical gradient so
## the centre panel stays readable; flat soot fallback if the art is missing.
func _build_backdrop() -> void:
	var tex := load(BACKDROP_PATH) as Texture2D
	if tex != null:
		var backdrop := TextureRect.new()
		backdrop.texture = tex
		backdrop.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
		backdrop.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_COVERED
		backdrop.mouse_filter = Control.MOUSE_FILTER_IGNORE
		_root.add_child(backdrop)
		backdrop.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	else:
		var fallback := ColorRect.new()
		fallback.color = Color(0.07, 0.047, 0.027)
		fallback.mouse_filter = Control.MOUSE_FILTER_IGNORE
		_root.add_child(fallback)
		fallback.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	var overlay := TextureRect.new()
	var grad := Gradient.new()
	grad.offsets = PackedFloat32Array([0.0, 0.55, 1.0])
	grad.colors = PackedColorArray([Color(0, 0, 0, 0.55), Color(0, 0, 0, 0.3), Color(0, 0, 0, 0.68)])
	var grad_tex := GradientTexture2D.new()
	grad_tex.gradient = grad
	grad_tex.fill_from = Vector2(0.0, 0.0)
	grad_tex.fill_to = Vector2(0.0, 1.0)
	overlay.texture = grad_tex
	overlay.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	overlay.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_root.add_child(overlay)
	overlay.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)


func _on_visibility_changed() -> void:
	if visible:
		Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
		_refresh_homes()
		_fade_in()


## Calm fade-in whenever the menu becomes the active space.
func _fade_in() -> void:
	_root.modulate.a = 0.0
	var tw := create_tween()
	tw.tween_property(_root, "modulate:a", 1.0, 0.3) \
			.set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_OUT)


## Rebuilds the home rows from Store; the hosted home carries a coral star.
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
	for home_name: String in homes:
		var row := HBoxContainer.new()
		var star := _label("★" if home_name == hosted else "", 15, UITheme.C.coral)
		star.custom_minimum_size = Vector2(22, 0)
		row.add_child(star)
		var btn := Button.new()
		btn.text = home_name
		btn.toggle_mode = true
		btn.button_group = _home_group
		btn.focus_mode = Control.FOCUS_NONE
		btn.alignment = HORIZONTAL_ALIGNMENT_LEFT
		btn.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		btn.add_theme_font_size_override("font_size", 15)
		btn.add_theme_color_override("font_color", UITheme.C.body)
		btn.add_theme_color_override("font_hover_color", UITheme.C.gold_bright)
		btn.add_theme_color_override("font_pressed_color", UITheme.C.gold_bright)
		btn.add_theme_stylebox_override("normal", _row_normal)
		btn.add_theme_stylebox_override("hover", _row_hover)
		btn.add_theme_stylebox_override("pressed", _row_pressed)
		btn.toggled.connect(_on_home_toggled.bind(home_name))
		row.add_child(btn)
		_home_box.add_child(row)
		btn.button_pressed = home_name == _selected_home
	_enter_button.disabled = _selected_home == ""


func _on_home_toggled(on: bool, home_name: String) -> void:
	if on:
		_selected_home = home_name
		_enter_button.disabled = false


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


func _menu_button(value: String) -> Button:
	var btn := Button.new()
	btn.text = value
	btn.focus_mode = Control.FOCUS_NONE
	var bold := UITheme.font_copy_bold()
	if bold != null:
		btn.add_theme_font_override("font", bold)
	btn.add_theme_font_size_override("font_size", 15)
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
