## Deliberately non-addictive 21-minute HUD: no streaks, score chase, FOMO or feed.
## It shows the current human action, consequence, timebox and open module count.
class_name MocLoopHud
extends CanvasLayer

const UITheme := preload("res://scripts/ui/ui_theme.gd")

var loop: MocLoop
var _root: Control
var _phase: Label
var _timer: Label
var _objective: Label
var _status: Label
var _prompt: Label
var _flash_tween: Tween


func _init() -> void:
	name = "MOC_LoopHUD"
	layer = 25


func _ready() -> void:
	_build()
	visible = false


func attach(value: MocLoop) -> void:
	loop = value
	loop.phase_changed.connect(_on_phase_changed)
	loop.state_changed.connect(_refresh)
	loop.module_committed.connect(_on_module_committed)
	loop.legacy_revealed.connect(_on_legacy)
	visible = true
	_refresh(loop.snapshot())


func set_prompt(value: String) -> void:
	if _prompt != null:
		_prompt.text = value


func flash(value: String, color := Color("62e6ff")) -> void:
	_status.text = value
	_status.add_theme_color_override("font_color", color)
	if _flash_tween != null and _flash_tween.is_valid():
		_flash_tween.kill()
	_status.modulate.a = 1.0
	_flash_tween = create_tween()
	_flash_tween.tween_interval(2.2)
	_flash_tween.tween_property(_status, "modulate:a", 0.35, 0.8)


func _process(_delta: float) -> void:
	if loop != null and visible:
		_refresh(loop.snapshot())


func _build() -> void:
	_root = Control.new()
	_root.name = "Root"
	_root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_root.theme = UITheme.theme()
	add_child(_root)
	_root.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)

	var panel := PanelContainer.new()
	var style := UITheme.flat_style(Color(0.025, 0.032, 0.07, 0.94), Color("b8693f"), 2, 12, 12.0)
	style.shadow_color = Color(0, 0, 0, 0.65)
	style.shadow_size = 14
	panel.add_theme_stylebox_override("panel", style)
	panel.custom_minimum_size = Vector2(620, 0)
	_root.add_child(panel)
	panel.set_anchors_and_offsets_preset(Control.PRESET_CENTER_TOP, Control.PRESET_MODE_MINSIZE, 18)
	panel.grow_horizontal = Control.GROW_DIRECTION_BOTH

	var column := VBoxContainer.new()
	column.add_theme_constant_override("separation", 5)
	panel.add_child(column)
	var title := _label("MEANINGVERSE OF CULTURE  ·  LEVIATHAN", 13, Color("dfb07b"))
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	column.add_child(title)

	var phase_row := HBoxContainer.new()
	phase_row.add_theme_constant_override("separation", 18)
	column.add_child(phase_row)
	_phase = _label("ARRIVAL", 25, Color("f7eedf"))
	_phase.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	phase_row.add_child(_phase)
	_timer = _mono("PATH 00:00", 22, Color("62e6ff"))
	_timer.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	phase_row.add_child(_timer)

	_objective = _label("", 14, Color("d7d8e2"))
	_objective.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_objective.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	column.add_child(_objective)
	_status = _mono("DEVELOPMENT SEED · 24 / 30 assembly modules · 6 future sockets open", 11, Color("9aa2bd"))
	_status.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	column.add_child(_status)
	var authority := _mono("AI MAY SUGGEST · ONLY A PERSON COMMITS", 10, Color("c485ff"))
	authority.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	column.add_child(authority)

	var prompt_panel := PanelContainer.new()
	prompt_panel.add_theme_stylebox_override("panel", UITheme.flat_style(Color(0.02, 0.026, 0.055, 0.9), Color("355879"), 1, 9, 8.0))
	_root.add_child(prompt_panel)
	prompt_panel.set_anchors_and_offsets_preset(Control.PRESET_CENTER_BOTTOM, Control.PRESET_MODE_MINSIZE, 28)
	prompt_panel.grow_horizontal = Control.GROW_DIRECTION_BOTH
	_prompt = _mono("Walk to the Leviathan workshop", 13, Color("f7eedf"))
	_prompt.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	prompt_panel.add_child(_prompt)


func _refresh(snapshot: Dictionary) -> void:
	if _phase == null:
		return
	_phase.text = String(snapshot.phase_name).to_upper()
	_timer.text = "PATH %s · ~21 MIN" % _fmt_time(float(snapshot.elapsed_seconds))
	_objective.text = String(snapshot.objective)
	if _flash_tween == null or not _flash_tween.is_valid():
		_status.modulate.a = 1.0
		_status.text = "DEVELOPMENT SEED · %d / 30 assembly modules · 6 future sockets open" \
				% int(snapshot.visible_modules)


func _on_phase_changed(next: MocLoop.Phase, _previous: MocLoop.Phase) -> void:
	flash("PHASE  ·  %s" % loop.phase_name(next), Color("dfb07b"))


func _on_module_committed(module: Dictionary) -> void:
	flash("VISIBLE NOW  ·  SLOT %02d  ·  %s" % [int(module.slot), String(module.label)], Color("62e6ff"))


func _on_legacy(legacy: Dictionary) -> void:
	flash(String(legacy.line), Color("ff70b7"))


func _label(value: String, size: int, color: Color) -> Label:
	var label := Label.new()
	label.text = value
	label.add_theme_font_size_override("font_size", size)
	label.add_theme_color_override("font_color", color)
	return label


func _mono(value: String, size: int, color: Color) -> Label:
	var label := _label(value, size, color)
	var font := UITheme.font_mono()
	if font != null:
		label.add_theme_font_override("font", font)
	return label


func _fmt_time(seconds: float) -> String:
	var whole := maxi(0, int(ceilf(seconds)))
	return "%02d:%02d" % [whole / 60, whole % 60]
