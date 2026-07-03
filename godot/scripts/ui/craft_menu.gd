extends CanvasLayer
## Craft menu: every Catalog recipe with cost/duration and a Queue button, plus
## live progress bars for the running craft queue. Toggled by the `craft_menu`
## action; closes with the same key or Esc. Swallows game input while open.

const CREAM := Color("#efe6d2")
const GOLD := Color("#e7b23c")
const TEAL := Color("#23806f")
const INK := Color("#3b3428")
const RED := Color("#c0392b")

var _recipe_rows: Array[Dictionary] = []  # {id, cost: Label, button: Button}
var _queue_box: VBoxContainer
var _queue_rows: Array[Dictionary] = []   # {root, label: Label, bar: ProgressBar}
var _empty_label: Label
var _prev_mouse := Input.MOUSE_MODE_VISIBLE


func _init() -> void:
	name = "CraftMenu"
	layer = 20
	visible = false


func _ready() -> void:
	var dim := ColorRect.new()
	dim.color = Color(0, 0, 0, 0.35)
	dim.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(dim)
	var panel := PanelContainer.new()
	panel.add_theme_stylebox_override("panel", _flat(CREAM, GOLD, 2, 16.0))
	panel.custom_minimum_size = Vector2(460, 0)
	add_child(panel)
	panel.set_anchors_and_offsets_preset(Control.PRESET_CENTER, Control.PRESET_MODE_MINSIZE)
	panel.grow_horizontal = Control.GROW_DIRECTION_BOTH
	panel.grow_vertical = Control.GROW_DIRECTION_BOTH
	var vbox := VBoxContainer.new()
	vbox.add_theme_constant_override("separation", 8)
	panel.add_child(vbox)
	vbox.add_child(_label("Crafting", 24, GOLD))
	for id: String in Catalog.recipe_ids():
		vbox.add_child(_make_recipe_row(id))
	vbox.add_child(HSeparator.new())
	vbox.add_child(_label("Queue", 18, GOLD))
	_empty_label = _label("queue empty", 14, Color(INK, 0.6))
	vbox.add_child(_empty_label)
	_queue_box = VBoxContainer.new()
	_queue_box.add_theme_constant_override("separation", 6)
	vbox.add_child(_queue_box)
	vbox.add_child(_label("C / Esc — close", 12, Color(INK, 0.5)))
	Economy.inventory_changed.connect(_on_inventory_changed)


func _process(_delta: float) -> void:
	if not visible:
		return
	_refresh_afford()
	_refresh_queue()


func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed("craft_menu"):
		if visible:
			_close()
		elif Game.space != Game.Space.MENU:
			_open()
		get_viewport().set_input_as_handled()
		return
	if not visible:
		return
	if event.is_action_pressed("ui_cancel"):
		_close()
	get_viewport().set_input_as_handled()  # pause gameplay input while open


func _on_inventory_changed() -> void:
	if visible:
		_refresh_afford()


func _open() -> void:
	visible = true
	_prev_mouse = Input.mouse_mode
	Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
	_refresh_afford()
	_refresh_queue()


func _close() -> void:
	visible = false
	if Game.space != Game.Space.MENU:
		Input.mouse_mode = _prev_mouse


func _make_recipe_row(recipe_id: String) -> Control:
	var recipe: Dictionary = Catalog.get_recipe(recipe_id)
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 10)
	var name_label := _label(String(recipe.display), 16, INK)
	name_label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_child(name_label)
	var cost_label := _label(_cost_text(recipe.cost), 14, INK)
	row.add_child(cost_label)
	row.add_child(_label(_fmt_mmss(float(recipe.seconds)), 14, Color(INK, 0.7)))
	var btn := Button.new()
	btn.text = "Queue"
	btn.focus_mode = Control.FOCUS_NONE
	btn.add_theme_font_size_override("font_size", 14)
	btn.add_theme_color_override("font_color", Color.WHITE)
	btn.add_theme_color_override("font_hover_color", Color.WHITE)
	btn.add_theme_color_override("font_pressed_color", Color.WHITE)
	btn.add_theme_color_override("font_disabled_color", Color(1, 1, 1, 0.5))
	btn.add_theme_stylebox_override("normal", _flat(TEAL, Color.TRANSPARENT, 0, 6.0))
	btn.add_theme_stylebox_override("hover", _flat(TEAL.lightened(0.1), Color.TRANSPARENT, 0, 6.0))
	btn.add_theme_stylebox_override("pressed", _flat(TEAL.darkened(0.15), Color.TRANSPARENT, 0, 6.0))
	btn.add_theme_stylebox_override("disabled", _flat(Color(TEAL, 0.4), Color.TRANSPARENT, 0, 6.0))
	btn.pressed.connect(func() -> void: Economy.queue_craft(recipe_id))
	row.add_child(btn)
	_recipe_rows.append({"id": recipe_id, "cost": cost_label, "button": btn})
	return row


func _cost_text(cost: Dictionary) -> String:
	var parts: Array[String] = []
	for mid: String in cost:
		parts.append("%d %s" % [int(cost[mid]), Catalog.MATERIALS[mid].display])
	return " + ".join(parts)


func _refresh_afford() -> void:
	for row in _recipe_rows:
		var affordable: bool = Economy.can_afford(String(row.id))
		var cost_label: Label = row.cost
		cost_label.add_theme_color_override("font_color", INK if affordable else RED)
		var button: Button = row.button
		button.disabled = not affordable


## Reconciles progress-bar rows against Economy.get_queue() every frame.
func _refresh_queue() -> void:
	var queue: Array = Economy.get_queue()
	_empty_label.visible = queue.is_empty()
	while _queue_rows.size() < queue.size():
		_queue_rows.append(_make_queue_row())
	while _queue_rows.size() > queue.size():
		var row: Dictionary = _queue_rows.pop_back()
		(row.root as Node).queue_free()
	for i in queue.size():
		var entry: Dictionary = queue[i]
		var row: Dictionary = _queue_rows[i]
		var recipe: Dictionary = Catalog.get_recipe(String(entry.recipe_id))
		var total := maxf(0.001, float(entry.total))
		var label: Label = row.label
		var display := String(recipe.get("display", entry.recipe_id))  # stale save: id fallback
		label.text = "%s — %s" % [display, _fmt_mmss(float(entry.remaining))]
		var bar: ProgressBar = row.bar
		bar.value = clampf(100.0 * (1.0 - float(entry.remaining) / total), 0.0, 100.0)


func _make_queue_row() -> Dictionary:
	var root := VBoxContainer.new()
	root.add_theme_constant_override("separation", 2)
	var label := _label("", 14, INK)
	root.add_child(label)
	var bar := ProgressBar.new()
	bar.show_percentage = false
	bar.custom_minimum_size = Vector2(0, 10)
	bar.add_theme_stylebox_override("background", _flat(Color(INK, 0.15), Color.TRANSPARENT, 0, 0.0))
	bar.add_theme_stylebox_override("fill", _flat(TEAL, Color.TRANSPARENT, 0, 0.0))
	root.add_child(bar)
	_queue_box.add_child(root)
	return {"root": root, "label": label, "bar": bar}


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
