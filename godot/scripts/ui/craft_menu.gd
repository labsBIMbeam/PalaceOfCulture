extends CanvasLayer
## Craft menu, two-pane: recipes on the left (per-material cost chips colored
## by affordability + Queue button), the running craft queue on the right (gold
## progress bars, mm:ss mono countdowns). Toggled by the `craft_menu` action;
## closes with the same key or Esc. Swallows game input while open.

const UITheme := preload("res://scripts/ui/ui_theme.gd")

var _recipe_rows: Array[Dictionary] = []  # {id, chips: Array of {label, mid, need, ok}, button}
var _queue_box: VBoxContainer
var _queue_rows: Array[Dictionary] = []   # {root, label: Label, time: Label, bar: ProgressBar}
var _empty_label: Label
var _prev_mouse := Input.MOUSE_MODE_VISIBLE
var _root: Control
var _chip_ok: StyleBoxFlat
var _chip_bad: StyleBoxFlat
var _chip_ok_color: Color
var _chip_bad_color: Color


func _init() -> void:
	name = "CraftMenu"
	layer = 20
	visible = false


func _ready() -> void:
	_chip_ok = _chip_style(UITheme.C.teal_light)
	_chip_bad = _chip_style(UITheme.C.coral)
	_chip_ok_color = Color(UITheme.C.teal_light).lightened(0.35)
	_chip_bad_color = Color(UITheme.C.coral).lightened(0.1)
	_root = Control.new()
	_root.name = "Root"
	_root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_root.theme = UITheme.theme()
	add_child(_root)
	_root.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	var dim := ColorRect.new()
	dim.color = Color(0, 0, 0, 0.45)
	_root.add_child(dim)
	dim.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	var panel := PanelContainer.new()
	var ps := UITheme.panel_style(true)
	ps.set_content_margin_all(18.0)
	panel.add_theme_stylebox_override("panel", ps)
	panel.custom_minimum_size = Vector2(720, 420)
	_root.add_child(panel)
	panel.set_anchors_and_offsets_preset(Control.PRESET_CENTER, Control.PRESET_MODE_MINSIZE)
	panel.grow_horizontal = Control.GROW_DIRECTION_BOTH
	panel.grow_vertical = Control.GROW_DIRECTION_BOTH
	var vbox := VBoxContainer.new()
	vbox.add_theme_constant_override("separation", 10)
	panel.add_child(vbox)
	vbox.add_child(_header("Crafting", 24))

	var panes := HBoxContainer.new()
	panes.add_theme_constant_override("separation", 16)
	panes.size_flags_vertical = Control.SIZE_EXPAND_FILL
	vbox.add_child(panes)

	var left := VBoxContainer.new()
	left.add_theme_constant_override("separation", 8)
	left.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	left.size_flags_stretch_ratio = 1.7
	panes.add_child(left)
	left.add_child(_header("Recipes", 15))
	var scroll := ScrollContainer.new()
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	left.add_child(scroll)
	var recipe_box := VBoxContainer.new()
	recipe_box.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	recipe_box.add_theme_constant_override("separation", 6)
	scroll.add_child(recipe_box)
	for id: String in Catalog.recipe_ids():
		recipe_box.add_child(_make_recipe_row(id))

	panes.add_child(VSeparator.new())

	var right := VBoxContainer.new()
	right.add_theme_constant_override("separation", 8)
	right.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	panes.add_child(right)
	right.add_child(_header("Queue", 15))
	_empty_label = _label("queue empty", 13, UITheme.C.muted)
	right.add_child(_empty_label)
	_queue_box = VBoxContainer.new()
	_queue_box.add_theme_constant_override("separation", 8)
	right.add_child(_queue_box)

	var hint := _mono_label("C / Esc — close", 11, UITheme.C.muted)
	hint.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	vbox.add_child(hint)
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
	_root.modulate.a = 0.0
	var tw := create_tween()
	tw.tween_property(_root, "modulate:a", 1.0, 0.18) \
			.set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_OUT)


func _close() -> void:
	visible = false
	if Game.space != Game.Space.MENU:
		Input.mouse_mode = _prev_mouse


## One recipe line: bold name, per-material cost chips, mono duration, Queue.
func _make_recipe_row(recipe_id: String) -> Control:
	var recipe: Dictionary = Catalog.get_recipe(recipe_id)
	var wrap := PanelContainer.new()
	wrap.add_theme_stylebox_override("panel",
			UITheme.flat_style(Color(0.16, 0.11, 0.064, 0.55), Color(0, 0, 0, 0), 0, 8, 7.0))
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 8)
	wrap.add_child(row)
	var name_label := _label(String(recipe.display), 15, UITheme.C.text)
	var bold := UITheme.font_copy_bold()
	if bold != null:
		name_label.add_theme_font_override("font", bold)
	name_label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	name_label.clip_text = true
	row.add_child(name_label)
	var chips: Array = []
	for mid: String in recipe.cost:
		var need := int(recipe.cost[mid])
		var chip := _mono_label("%d %s" % [need, Catalog.MATERIALS[mid].display], 11, _chip_ok_color)
		chip.add_theme_stylebox_override("normal", _chip_ok)
		chip.size_flags_vertical = Control.SIZE_SHRINK_CENTER
		row.add_child(chip)
		chips.append({"label": chip, "mid": mid, "need": need, "ok": true})
	var dur := _mono_label(_fmt_mmss(float(recipe.seconds)), 12, UITheme.C.muted)
	dur.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	row.add_child(dur)
	var btn := Button.new()
	btn.text = "Queue"
	btn.focus_mode = Control.FOCUS_NONE
	btn.add_theme_font_size_override("font_size", 13)
	btn.pressed.connect(func() -> void: Economy.queue_craft(recipe_id))
	row.add_child(btn)
	_recipe_rows.append({"id": recipe_id, "chips": chips, "button": btn})
	return wrap


## Queue buttons follow whole-recipe affordability; each cost chip follows its
## own material so the missing ingredient is visible at a glance.
func _refresh_afford() -> void:
	for row in _recipe_rows:
		var button: Button = row.button
		button.disabled = not Economy.can_afford(String(row.id))
		for chip: Dictionary in row.chips:
			var ok: bool = Economy.get_material(String(chip.mid)) >= int(chip.need)
			if ok == bool(chip.ok):
				continue
			chip.ok = ok
			var label: Label = chip.label
			label.add_theme_stylebox_override("normal", _chip_ok if ok else _chip_bad)
			label.add_theme_color_override("font_color", _chip_ok_color if ok else _chip_bad_color)


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
		var display := String(recipe.get("display", entry.recipe_id))  # stale save: id fallback
		(row.label as Label).text = display
		(row.time as Label).text = _fmt_mmss(float(entry.remaining))
		(row.bar as ProgressBar).value = clampf(100.0 * (1.0 - float(entry.remaining) / total), 0.0, 100.0)


func _make_queue_row() -> Dictionary:
	var root := VBoxContainer.new()
	root.add_theme_constant_override("separation", 3)
	var head := HBoxContainer.new()
	head.add_theme_constant_override("separation", 8)
	root.add_child(head)
	var label := _label("", 14, UITheme.C.body)
	label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	label.clip_text = true
	head.add_child(label)
	var time := _mono_label("", 13, UITheme.C.gold_bright)
	head.add_child(time)
	var bar := ProgressBar.new()
	bar.show_percentage = false
	bar.custom_minimum_size = Vector2(0, 8)
	root.add_child(bar)
	_queue_box.add_child(root)
	return {"root": root, "label": label, "time": time, "bar": bar}


func _chip_style(accent: Color) -> StyleBoxFlat:
	var sb := UITheme.flat_style(Color(accent, 0.14), Color(accent, 0.45), 1, 8, 3.0)
	sb.content_margin_left = 7.0
	sb.content_margin_right = 7.0
	sb.content_margin_top = 1.0
	sb.content_margin_bottom = 1.0
	return sb


func _header(value: String, font_size: int) -> Label:
	var l := _label(value, font_size, UITheme.C.gold)
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


func _mono_label(value: String, font_size: int, color: Color) -> Label:
	var l := _label(value, font_size, color)
	var mono := UITheme.font_mono()
	if mono != null:
		l.add_theme_font_override("font", mono)
	return l


func _fmt_mmss(seconds: float) -> String:
	var s := maxi(0, int(ceilf(seconds)))
	return "%02d:%02d" % [int(s / 60.0), s % 60]
