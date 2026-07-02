extends CanvasLayer
## Title screen: home list with hosted marker (coral star), Enter Home /
## Visit Palace buttons and a New Home creator. Cream panel, gold headings.

const CREAM := Color("#efe6d2")
const PANEL_CREAM := Color("#f7f0e0")
const GOLD := Color("#e7b23c")
const TEAL := Color("#23806f")
const CORAL := Color("#e8735a")
const INK := Color("#3b3428")

var _home_box: VBoxContainer
var _home_group := ButtonGroup.new()
var _selected_home := ""
var _enter_button: Button
var _name_edit: LineEdit


func _init() -> void:
	name = "MainMenu"
	layer = 30


func _ready() -> void:
	var bg := ColorRect.new()
	bg.color = CREAM
	bg.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(bg)
	var panel := PanelContainer.new()
	panel.add_theme_stylebox_override("panel", _flat(PANEL_CREAM, GOLD, 2, 24.0))
	panel.custom_minimum_size = Vector2(520, 0)
	add_child(panel)
	panel.set_anchors_and_offsets_preset(Control.PRESET_CENTER, Control.PRESET_MODE_MINSIZE)
	panel.grow_horizontal = Control.GROW_DIRECTION_BOTH
	panel.grow_vertical = Control.GROW_DIRECTION_BOTH
	var vbox := VBoxContainer.new()
	vbox.add_theme_constant_override("separation", 10)
	panel.add_child(vbox)

	var title := _label("Palace of Culture — Homebuilder", 30, GOLD)
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	vbox.add_child(title)
	var tagline := _label("money buys style — time builds legend", 16, Color(INK, 0.8))
	tagline.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	vbox.add_child(tagline)
	vbox.add_child(HSeparator.new())

	vbox.add_child(_label("Homes", 18, GOLD))
	var scroll := ScrollContainer.new()
	scroll.custom_minimum_size = Vector2(0, 160)
	vbox.add_child(scroll)
	_home_box = VBoxContainer.new()
	_home_box.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_home_box.add_theme_constant_override("separation", 2)
	scroll.add_child(_home_box)

	var actions := HBoxContainer.new()
	actions.alignment = BoxContainer.ALIGNMENT_CENTER
	actions.add_theme_constant_override("separation", 12)
	vbox.add_child(actions)
	_enter_button = _teal_button("Enter Home")
	_enter_button.pressed.connect(_on_enter_pressed)
	actions.add_child(_enter_button)
	var palace_button := _teal_button("Visit Palace")
	palace_button.pressed.connect(_on_palace_pressed)
	actions.add_child(palace_button)

	vbox.add_child(_label("New Home", 18, GOLD))
	var create_row := HBoxContainer.new()
	create_row.add_theme_constant_override("separation", 8)
	vbox.add_child(create_row)
	_name_edit = LineEdit.new()
	_name_edit.placeholder_text = "new home name"
	_name_edit.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_name_edit.add_theme_font_size_override("font_size", 15)
	_name_edit.add_theme_color_override("font_color", INK)
	_name_edit.add_theme_stylebox_override("normal", _flat(Color("#fbf7ec"), Color(INK, 0.3), 1, 6.0))
	_name_edit.text_submitted.connect(_on_name_submitted)
	create_row.add_child(_name_edit)
	var create_button := _teal_button("Create")
	create_button.pressed.connect(_on_create_pressed)
	create_row.add_child(create_button)

	visibility_changed.connect(_on_visibility_changed)
	_refresh_homes()
	Input.mouse_mode = Input.MOUSE_MODE_VISIBLE


func _on_visibility_changed() -> void:
	if visible:
		Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
		_refresh_homes()


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
		var star := _label("★" if home_name == hosted else "", 16, CORAL)
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
		btn.add_theme_color_override("font_color", INK)
		btn.add_theme_color_override("font_hover_color", INK)
		btn.add_theme_color_override("font_pressed_color", INK)
		btn.add_theme_stylebox_override("normal", _flat(Color(INK, 0.04), Color.TRANSPARENT, 0, 6.0))
		btn.add_theme_stylebox_override("hover", _flat(Color(INK, 0.1), Color.TRANSPARENT, 0, 6.0))
		btn.add_theme_stylebox_override("pressed", _flat(Color(GOLD, 0.35), GOLD, 1, 6.0))
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


func _teal_button(value: String) -> Button:
	var btn := Button.new()
	btn.text = value
	btn.focus_mode = Control.FOCUS_NONE
	btn.add_theme_font_size_override("font_size", 16)
	btn.add_theme_color_override("font_color", Color.WHITE)
	btn.add_theme_color_override("font_hover_color", Color.WHITE)
	btn.add_theme_color_override("font_pressed_color", Color.WHITE)
	btn.add_theme_color_override("font_disabled_color", Color(1, 1, 1, 0.5))
	btn.add_theme_stylebox_override("normal", _flat(TEAL, Color.TRANSPARENT, 0, 8.0))
	btn.add_theme_stylebox_override("hover", _flat(TEAL.lightened(0.1), Color.TRANSPARENT, 0, 8.0))
	btn.add_theme_stylebox_override("pressed", _flat(TEAL.darkened(0.15), Color.TRANSPARENT, 0, 8.0))
	btn.add_theme_stylebox_override("disabled", _flat(Color(TEAL, 0.4), Color.TRANSPARENT, 0, 8.0))
	return btn


func _label(value: String, font_size: int, color: Color) -> Label:
	var l := Label.new()
	l.text = value
	l.add_theme_font_size_override("font_size", font_size)
	l.add_theme_color_override("font_color", color)
	return l


func _flat(bg: Color, border: Color, border_w: int, margin: float) -> StyleBoxFlat:
	var sb := StyleBoxFlat.new()
	sb.bg_color = bg
	sb.border_color = border
	sb.set_border_width_all(border_w)
	sb.set_corner_radius_all(6)
	sb.set_content_margin_all(margin)
	return sb
