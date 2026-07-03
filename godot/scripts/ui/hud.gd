extends CanvasLayer
## In-game HUD: live material rows, craft-queue status line, 9-slot hotbar and
## the Walk/Magnet mode toggle. All controls are built in code (scene policy).

const CREAM := Color("#efe6d2")
const GOLD := Color("#e7b23c")
const TEAL := Color("#23806f")
const INK := Color("#3b3428")

const SLOT_COUNT := 9
const REFRESH_SEC := 0.2

var _material_labels := {}  # material_id -> Label
var _queue_label: Label
var _mode_button: Button
var _slots: Array[Button] = []
var _swatches: Array[ColorRect] = []
var _counts: Array[Label] = []
var _slot_ids: Array[String] = []  # object id per slot, "" = empty
var _selected_id := ""
var _on_select := Callable()
var _can_build := false
var _accum := 0.0
var _style_slot: StyleBoxFlat
var _style_slot_selected: StyleBoxFlat
var _style_slot_empty: StyleBoxFlat


func _init() -> void:
	name = "HUD"
	layer = 10


func _ready() -> void:
	_style_slot = _flat(Color(CREAM, 0.8), Color(INK, 0.25), 2, 2.0)
	_style_slot_selected = _flat(Color(CREAM, 0.95), GOLD, 3, 2.0)
	_style_slot_empty = _flat(Color(CREAM, 0.35), Color(INK, 0.12), 1, 2.0)
	_build_materials_panel()
	_build_hotbar()
	_build_mode_toggle()
	Economy.inventory_changed.connect(_on_inventory_changed)
	Game.mode_changed.connect(_on_mode_changed)
	_can_build = Game.magnet_can_build()
	_rebuild_hotbar()
	_refresh_materials()
	_refresh_mode_button()


func _process(delta: float) -> void:
	if not visible:
		return
	var can_build := Game.magnet_can_build()
	if can_build != _can_build:  # space changes have no signal; poll cheaply
		_can_build = can_build
		_rebuild_hotbar()
	_accum += delta
	if _accum >= REFRESH_SEC:
		_accum = 0.0
		_refresh_materials()


func _unhandled_input(event: InputEvent) -> void:
	if not visible or Game.space == Game.Space.MENU:
		return
	var craft := get_parent().find_child("CraftMenu", false, false) as CanvasLayer
	if craft != null and craft.visible:
		return  # craft menu owns input while open
	for i in SLOT_COUNT:
		if event.is_action_pressed("hotbar_%d" % (i + 1)):
			_select_slot(i)
			get_viewport().set_input_as_handled()
			return
	if event.is_action_pressed("ui_cancel"):
		get_viewport().set_input_as_handled()
		Game.goto_menu()


## Registers the hotbar callback; it receives the selected object id (String).
## Fires immediately with the current selection so the caller starts in sync.
func set_on_select(cb: Callable) -> void:
	_on_select = cb
	if _selected_id != "" and _on_select.is_valid():
		_on_select.call(_selected_id)


func _on_inventory_changed() -> void:
	_rebuild_hotbar()
	_refresh_materials()


func _on_mode_changed(_mode: int) -> void:
	_refresh_mode_button()


func _build_materials_panel() -> void:
	var panel := PanelContainer.new()
	panel.add_theme_stylebox_override("panel", _flat(Color(CREAM, 0.85), Color(INK, 0.15), 1, 10.0))
	add_child(panel)
	panel.set_anchors_and_offsets_preset(Control.PRESET_TOP_LEFT, Control.PRESET_MODE_MINSIZE, 12)
	var rows := VBoxContainer.new()
	rows.add_theme_constant_override("separation", 4)
	panel.add_child(rows)
	for id: String in Catalog.MATERIALS:
		var row := HBoxContainer.new()
		row.add_theme_constant_override("separation", 6)
		var swatch := ColorRect.new()
		swatch.color = Catalog.MATERIALS[id].color
		swatch.custom_minimum_size = Vector2(14, 14)
		swatch.size_flags_vertical = Control.SIZE_SHRINK_CENTER
		swatch.mouse_filter = Control.MOUSE_FILTER_IGNORE
		row.add_child(swatch)
		var label := _label("", 16, INK)
		row.add_child(label)
		rows.add_child(row)
		_material_labels[id] = label
	_queue_label = _label("", 13, Color(INK, 0.75))
	rows.add_child(_queue_label)


func _refresh_materials() -> void:
	for id: String in _material_labels:
		var label: Label = _material_labels[id]
		var display := String(Catalog.MATERIALS[id].display)
		var rate := Economy.drip_rate(id)
		if rate > 0.0:
			label.text = "%s %d (+%.1f/min)" % [display, Economy.get_material(id), rate]
		else:  # refined material (no drip entry): count only
			label.text = "%s %d" % [display, Economy.get_material(id)]
	var queue: Array = Economy.get_queue()
	if queue.is_empty():
		_queue_label.text = "craft queue idle"
	else:
		var head: Dictionary = queue[0]
		var recipe: Dictionary = Catalog.get_recipe(String(head.recipe_id))
		var display := String(recipe.get("display", head.recipe_id))  # stale save: id fallback
		var line := "crafting %s %s" % [display, _fmt_mmss(float(head.remaining))]
		if queue.size() > 1:
			line += " · +%d queued" % (queue.size() - 1)
		_queue_label.text = line


func _build_hotbar() -> void:
	var bar := HBoxContainer.new()
	bar.add_theme_constant_override("separation", 6)
	add_child(bar)
	bar.set_anchors_and_offsets_preset(Control.PRESET_CENTER_BOTTOM, Control.PRESET_MODE_MINSIZE, 16)
	bar.grow_horizontal = Control.GROW_DIRECTION_BOTH
	bar.grow_vertical = Control.GROW_DIRECTION_BEGIN
	for i in SLOT_COUNT:
		var slot := Button.new()
		slot.custom_minimum_size = Vector2(64, 64)
		slot.focus_mode = Control.FOCUS_NONE
		slot.pressed.connect(_select_slot.bind(i))
		var num := _label(str(i + 1), 11, Color(INK, 0.55))
		num.position = Vector2(5, 2)
		slot.add_child(num)
		var swatch := ColorRect.new()
		swatch.mouse_filter = Control.MOUSE_FILTER_IGNORE
		swatch.set_anchors_preset(Control.PRESET_CENTER)
		swatch.offset_left = -13.0
		swatch.offset_top = -16.0
		swatch.offset_right = 13.0
		swatch.offset_bottom = 10.0
		slot.add_child(swatch)
		var count := _label("", 13, INK)
		count.set_anchors_preset(Control.PRESET_BOTTOM_RIGHT)
		count.offset_left = -34.0
		count.offset_top = -22.0
		count.offset_right = -5.0
		count.offset_bottom = -3.0
		count.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
		slot.add_child(count)
		bar.add_child(slot)
		_slots.append(slot)
		_swatches.append(swatch)
		_counts.append(count)


## Slot layout: blocks first (only when building is allowed here), then owned furniture.
func _rebuild_hotbar() -> void:
	_slot_ids.clear()
	if _can_build:
		for id: String in Catalog.block_ids():
			if _slot_ids.size() < SLOT_COUNT:
				_slot_ids.append(id)
	for id: String in Catalog.furniture_ids():
		if Economy.get_count(id) > 0 and _slot_ids.size() < SLOT_COUNT:
			_slot_ids.append(id)
	while _slot_ids.size() < SLOT_COUNT:
		_slot_ids.append("")
	for i in SLOT_COUNT:
		var id := _slot_ids[i]
		var empty := id == ""
		_slots[i].disabled = empty
		_slots[i].tooltip_text = "" if empty else String(Catalog.get_object(id).display)
		_swatches[i].visible = not empty
		_counts[i].text = "" if empty else str(Economy.get_count(id))
		if not empty:
			_swatches[i].color = Catalog.get_object(id).color
	if _selected_id != "" and _slot_ids.has(_selected_id):
		_update_slot_styles()
	elif _slot_ids[0] != "":
		_select_slot(0)
	else:
		_selected_id = ""
		_update_slot_styles()
		if _on_select.is_valid():
			_on_select.call("")


func _select_slot(index: int) -> void:
	if index < 0 or index >= _slot_ids.size():
		return
	var id := _slot_ids[index]
	if id == "":
		return
	_selected_id = id
	_update_slot_styles()
	if _on_select.is_valid():
		_on_select.call(id)


func _update_slot_styles() -> void:
	for i in SLOT_COUNT:
		var id := _slot_ids[i]
		var sb := _style_slot_empty if id == "" else (_style_slot_selected if id == _selected_id else _style_slot)
		for state in ["normal", "hover", "pressed", "disabled"]:
			_slots[i].add_theme_stylebox_override(state, sb)


func _build_mode_toggle() -> void:
	var box := VBoxContainer.new()
	box.add_theme_constant_override("separation", 4)
	add_child(box)
	box.set_anchors_and_offsets_preset(Control.PRESET_TOP_RIGHT, Control.PRESET_MODE_MINSIZE, 12)
	box.grow_horizontal = Control.GROW_DIRECTION_BEGIN
	_mode_button = Button.new()
	_mode_button.focus_mode = Control.FOCUS_NONE
	_mode_button.add_theme_font_size_override("font_size", 16)
	_mode_button.add_theme_color_override("font_color", Color.WHITE)
	_mode_button.add_theme_color_override("font_hover_color", Color.WHITE)
	_mode_button.add_theme_color_override("font_pressed_color", Color.WHITE)
	_mode_button.add_theme_stylebox_override("normal", _flat(TEAL, Color.TRANSPARENT, 0, 8.0))
	_mode_button.add_theme_stylebox_override("hover", _flat(TEAL.lightened(0.1), Color.TRANSPARENT, 0, 8.0))
	_mode_button.add_theme_stylebox_override("pressed", _flat(TEAL.darkened(0.15), Color.TRANSPARENT, 0, 8.0))
	_mode_button.pressed.connect(func() -> void: Game.toggle_mode())
	box.add_child(_mode_button)
	var hint := _label("B mode · C craft · Esc menu", 12, Color(INK, 0.7))
	hint.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	hint.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	box.add_child(hint)


func _refresh_mode_button() -> void:
	_mode_button.text = "Mode: Walk" if Game.mode == Game.Mode.WALK else "Mode: Magnet"


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


func _fmt_mmss(seconds: float) -> String:
	var s := maxi(0, int(ceilf(seconds)))
	return "%02d:%02d" % [int(s / 60.0), s % 60]
