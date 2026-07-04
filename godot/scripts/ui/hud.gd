extends CanvasLayer
## In-game HUD: live material rows, craft-queue status line, 9-slot hotbar and
## the Walk/Magnet mode toggle. All controls are built in code (scene policy);
## styling comes from the shared UITheme (dark warm panels, gold accents).

const UITheme := preload("res://scripts/ui/ui_theme.gd")

const SLOT_COUNT := 9
const SLOT_SIZE := 48.0
const REFRESH_SEC := 0.2

var _material_rows := {}  # material_id -> {count: Label, rate: Label}
var _queue_label: Label
var _mode_button: Button
var _mode_tween: Tween
var _slots: Array[Button] = []
var _swatches: Array[Panel] = []
var _counts: Array[Label] = []
var _slot_ids: Array[String] = []  # object id per slot, "" = empty
var _selected_id := ""
var _on_select := Callable()
var _can_build := false
var _accum := 0.0
var _root: Control
var _style_slot: StyleBoxFlat
var _style_slot_hover: StyleBoxFlat
var _style_slot_selected: StyleBoxFlat
var _style_slot_empty: StyleBoxFlat


func _init() -> void:
	name = "HUD"
	layer = 10


func _ready() -> void:
	_root = Control.new()
	_root.name = "Root"
	_root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_root.theme = UITheme.theme()
	add_child(_root)
	_root.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	_build_slot_styles()
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


## Hotbar slot styleboxes; the selected one carries a slow-pulsing gold glow.
func _build_slot_styles() -> void:
	_style_slot = UITheme.flat_style(UITheme.C.panel, UITheme.C.border, 1, 10, 4.0)
	_style_slot_hover = UITheme.flat_style(Color(0.16, 0.11, 0.064, 0.92), UITheme.C.border_strong, 1, 10, 4.0)
	_style_slot_selected = UITheme.flat_style(Color(0.18, 0.126, 0.072, 0.95), UITheme.C.gold, 2, 10, 4.0)
	_style_slot_selected.shadow_color = Color(UITheme.C.gold, 0.35)
	_style_slot_selected.shadow_size = 6
	_style_slot_empty = UITheme.flat_style(Color(UITheme.C.panel, 0.45), Color(UITheme.C.border, 0.1), 1, 10, 4.0)
	var pulse := create_tween().set_loops()
	pulse.tween_property(_style_slot_selected, "shadow_color:a", 0.5, 1.4) \
			.set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)
	pulse.tween_property(_style_slot_selected, "shadow_color:a", 0.18, 1.4) \
			.set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)


## Compact dark panel: colored material dot, name, mono count, muted drip rate.
func _build_materials_panel() -> void:
	var panel := PanelContainer.new()
	var ps := UITheme.panel_style()
	ps.set_content_margin_all(10.0)
	panel.add_theme_stylebox_override("panel", ps)
	_root.add_child(panel)
	panel.set_anchors_and_offsets_preset(Control.PRESET_TOP_LEFT, Control.PRESET_MODE_MINSIZE, 12)
	var rows := VBoxContainer.new()
	rows.add_theme_constant_override("separation", 5)
	panel.add_child(rows)
	for id: String in Catalog.MATERIALS:
		var row := HBoxContainer.new()
		row.add_theme_constant_override("separation", 8)
		var dot := Panel.new()
		dot.custom_minimum_size = Vector2(10, 10)
		dot.size_flags_vertical = Control.SIZE_SHRINK_CENTER
		dot.mouse_filter = Control.MOUSE_FILTER_IGNORE
		dot.add_theme_stylebox_override("panel",
				UITheme.flat_style(Catalog.MATERIALS[id].color, Color(0, 0, 0, 0.25), 1, 5, 0.0))
		row.add_child(dot)
		var name_label := _label(String(Catalog.MATERIALS[id].display), 13, UITheme.C.body)
		name_label.custom_minimum_size = Vector2(52, 0)
		row.add_child(name_label)
		var count := _mono_label("0", 14, UITheme.C.text)
		count.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
		count.custom_minimum_size = Vector2(44, 0)
		row.add_child(count)
		var rate := _mono_label("", 11, UITheme.C.muted)
		rate.size_flags_vertical = Control.SIZE_SHRINK_CENTER
		row.add_child(rate)
		rows.add_child(row)
		_material_rows[id] = {"count": count, "rate": rate}
	_queue_label = _mono_label("", 11, UITheme.C.muted)
	rows.add_child(_queue_label)


func _refresh_materials() -> void:
	for id: String in _material_rows:
		var row: Dictionary = _material_rows[id]
		(row.count as Label).text = str(Economy.get_material(id))
		var rate := Economy.drip_rate(id)
		# Refined materials (no drip entry) show the count only.
		(row.rate as Label).text = ("+%.1f/min" % rate) if rate > 0.0 else ""
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
	_root.add_child(bar)
	bar.set_anchors_and_offsets_preset(Control.PRESET_CENTER_BOTTOM, Control.PRESET_MODE_MINSIZE, 14)
	bar.grow_horizontal = Control.GROW_DIRECTION_BOTH
	bar.grow_vertical = Control.GROW_DIRECTION_BEGIN
	for i in SLOT_COUNT:
		var slot := Button.new()
		slot.custom_minimum_size = Vector2(SLOT_SIZE, SLOT_SIZE)
		slot.focus_mode = Control.FOCUS_NONE
		slot.pressed.connect(_select_slot.bind(i))
		var num := _mono_label(str(i + 1), 9, Color(UITheme.C.muted, 0.9))
		num.position = Vector2(4, 2)
		slot.add_child(num)
		var swatch := Panel.new()
		swatch.mouse_filter = Control.MOUSE_FILTER_IGNORE
		swatch.set_anchors_preset(Control.PRESET_CENTER)
		swatch.offset_left = -9.0
		swatch.offset_top = -11.0
		swatch.offset_right = 9.0
		swatch.offset_bottom = 7.0
		slot.add_child(swatch)
		var count := _mono_label("", 10, UITheme.C.gold_bright)
		count.set_anchors_preset(Control.PRESET_BOTTOM_RIGHT)
		count.offset_left = -30.0
		count.offset_top = -17.0
		count.offset_right = -3.0
		count.offset_bottom = -2.0
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
			_swatches[i].add_theme_stylebox_override("panel",
					UITheme.flat_style(Catalog.get_object(id).color, Color(0, 0, 0, 0.25), 1, 6, 0.0))
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
		var normal := _style_slot_empty if id == "" else \
				(_style_slot_selected if id == _selected_id else _style_slot)
		var hover := _style_slot_hover if id != "" and id != _selected_id else normal
		_slots[i].add_theme_stylebox_override("normal", normal)
		_slots[i].add_theme_stylebox_override("hover", hover)
		_slots[i].add_theme_stylebox_override("pressed", hover)
		_slots[i].add_theme_stylebox_override("disabled", normal)


func _build_mode_toggle() -> void:
	var box := VBoxContainer.new()
	box.add_theme_constant_override("separation", 4)
	_root.add_child(box)
	box.set_anchors_and_offsets_preset(Control.PRESET_TOP_RIGHT, Control.PRESET_MODE_MINSIZE, 12)
	box.grow_horizontal = Control.GROW_DIRECTION_BEGIN
	_mode_button = Button.new()
	_mode_button.focus_mode = Control.FOCUS_NONE
	var bold := UITheme.font_copy_bold()
	if bold != null:
		_mode_button.add_theme_font_override("font", bold)
	_mode_button.add_theme_font_size_override("font_size", 14)
	_mode_button.pressed.connect(func() -> void: Game.toggle_mode())
	box.add_child(_mode_button)
	var hint := _mono_label("B mode · C craft · Esc menu", 10, UITheme.C.muted)
	hint.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	hint.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	box.add_child(hint)
	var social_hint := _mono_label("Enter chat · V voice · M radio", 10, UITheme.C.muted)
	social_hint.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	social_hint.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	box.add_child(social_hint)


## Updates the label and breathes the button back in — calm, not snappy.
func _refresh_mode_button() -> void:
	_mode_button.text = "Mode: Walk" if Game.mode == Game.Mode.WALK else "Mode: Magnet"
	if _mode_tween != null and _mode_tween.is_valid():
		_mode_tween.kill()
	_mode_button.modulate.a = 0.6
	_mode_tween = create_tween()
	_mode_tween.tween_property(_mode_button, "modulate:a", 1.0, 0.3) \
			.set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_OUT)


func _label(value: String, font_size: int, color: Color) -> Label:
	var l := Label.new()
	l.text = value
	l.add_theme_font_size_override("font_size", font_size)
	l.add_theme_color_override("font_color", color)
	return l


func _mono_label(value: String, font_size: int, color: Color) -> Label:
	var l := _label(value, font_size, color)
	var mono := UITheme.font_mono()
	if mono != null:
		l.add_theme_font_override("font", mono)
	return l


func _fmt_mmss(seconds: float) -> String:
	var s := maxi(0, int(ceilf(seconds)))
	return "%02d:%02d" % [int(s / 60.0), s % 60]
