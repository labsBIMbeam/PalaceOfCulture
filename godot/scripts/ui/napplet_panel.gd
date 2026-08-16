extends CanvasLayer
## Napplet panel — the in-world surface a napplet is shown on.
##
## The napplet itself is a DOM iframe the host places over the Godot canvas, so
## this panel does not draw it: it reserves the rectangle, tells the runtime
## where that rectangle is, and owns everything around it (frame, title, status,
## close). Godot draws the chrome; the browser draws the napplet inside it.
##
## Why not a screen inside the Palace: a sandboxed cross-origin iframe cannot be
## rendered to a texture, so it cannot be mapped onto a 3D surface. The panel is
## therefore a full-pane overlay, and world input is blocked while it is open.

const UITheme := preload("res://scripts/ui/ui_theme.gd")

const INPUT_OWNER := &"napplet_panel"
const ACTION := &"napplet_panel"
const MARGIN := 48
const HEADER_H := 44

var runtime: Node

var _root: Control
var _header: HBoxContainer
var _title: Label
var _status: Label
var _slot: Control
var _viewport_rect := Rect2i()


func _init() -> void:
	name = "NappletPanel"
	layer = 18  # above chat (12), below craft menu (20)
	visible = false


func _ready() -> void:
	if not InputMap.has_action(ACTION):
		InputMap.add_action(ACTION)
		var key := InputEventKey.new()
		key.physical_keycode = KEY_N
		InputMap.action_add_event(ACTION, key)
	_build()
	get_viewport().size_changed.connect(_sync_rect)


## Wire the panel to a runtime seam. Kept explicit (main.gd owns the runtime)
## so the panel never constructs transport of its own.
func attach_runtime(node: Node) -> void:
	runtime = node
	if runtime != null and not runtime.state_changed.is_connected(_on_state_changed):
		runtime.state_changed.connect(_on_state_changed)


## Open a pinned napplet by id. Blocks world input while visible.
func open_napplet(napplet_id: String) -> void:
	if runtime == null:
		return
	visible = true
	Game.set_world_input_blocked(INPUT_OWNER, true)
	_title.text = String(runtime.catalog.get_entry(napplet_id).get("title", napplet_id))
	_sync_theme()
	_sync_rect()
	runtime.open(napplet_id, _frame_rect())


## Close the panel and tear the napplet down.
func close_napplet() -> void:
	visible = false
	Game.set_world_input_blocked(INPUT_OWNER, false)
	if runtime != null:
		runtime.close()


func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed(ACTION):
		if visible:
			close_napplet()
		else:
			var items: Array[Dictionary] = runtime.catalog.load_items() if runtime != null else []
			if not items.is_empty():
				open_napplet(String(items[0].get("id", "")))
		get_viewport().set_input_as_handled()
		return
	if visible and event.is_action_pressed("ui_cancel"):
		close_napplet()
		get_viewport().set_input_as_handled()


func _build() -> void:
	_root = Control.new()
	_root.set_anchors_preset(Control.PRESET_FULL_RECT)
	_root.theme = UITheme.theme()
	_root.mouse_filter = Control.MOUSE_FILTER_STOP
	add_child(_root)

	var backdrop := ColorRect.new()
	backdrop.set_anchors_preset(Control.PRESET_FULL_RECT)
	backdrop.color = UITheme.C.ink
	backdrop.color.a = 0.86
	_root.add_child(backdrop)

	var shell := PanelContainer.new()
	shell.set_anchors_preset(Control.PRESET_FULL_RECT)
	shell.offset_left = MARGIN
	shell.offset_top = MARGIN
	shell.offset_right = -MARGIN
	shell.offset_bottom = -MARGIN
	shell.add_theme_stylebox_override("panel", UITheme.panel_style(true))
	_root.add_child(shell)

	var column := VBoxContainer.new()
	column.add_theme_constant_override("separation", 6)
	shell.add_child(column)

	_header = HBoxContainer.new()
	_header.custom_minimum_size.y = HEADER_H
	_header.add_theme_constant_override("separation", 12)
	column.add_child(_header)

	_title = Label.new()
	_title.text = "Napplet"
	_title.add_theme_font_override("font", UITheme.font_display())
	_title.add_theme_font_size_override("font_size", 20)
	_title.add_theme_color_override("font_color", UITheme.C.gold)
	_title.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_header.add_child(_title)

	_status = UITheme.mono_label("idle", 12, UITheme.C.muted)
	_header.add_child(_status)

	var close_button := Button.new()
	close_button.text = "Close  [Esc]"
	close_button.add_theme_font_override("font", UITheme.font_mono())
	close_button.pressed.connect(close_napplet)
	_header.add_child(close_button)

	# The hole the browser draws the napplet into. Nothing is rendered here by
	# Godot — it only reserves and reports the rectangle.
	_slot = Control.new()
	_slot.size_flags_vertical = Control.SIZE_EXPAND_FILL
	_slot.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_slot.name = "Slot"
	column.add_child(_slot)


## Rectangle the iframe should occupy, in physical screen pixels: the panel
## interior below the header, converted out of the stretched logical canvas.
func _frame_rect() -> Rect2i:
	var logical: Rect2 = _slot.get_global_rect() if _slot != null else _root.get_global_rect()
	var scale: Vector2 = get_viewport().get_screen_transform().get_scale()
	var origin: Vector2 = get_viewport().get_screen_transform().get_origin()
	return Rect2i(
		Vector2i(logical.position * scale + origin),
		Vector2i(logical.size * scale)
	)


func _sync_rect() -> void:
	if not visible or runtime == null:
		return
	var rect := _frame_rect()
	if rect == _viewport_rect:
		return
	_viewport_rect = rect
	runtime.set_rect(rect)


## Hands the Palace palette to the napplet so it does not paint a foreign theme
## inside the panel (NAP-THEME, whole surface).
func _sync_theme() -> void:
	if runtime == null:
		return
	runtime.set_theme(UITheme.C.panel_ink, UITheme.C.text, UITheme.C.gold)


func _on_state_changed(state: Dictionary) -> void:
	var status := String(state.get("status", "idle"))
	var error := String(state.get("error", ""))
	_status.text = status if error.is_empty() else "%s — %s" % [status, error]
	_status.add_theme_color_override(
		"font_color", UITheme.C.coral if status == "error" else UITheme.C.muted
	)


func _process(_delta: float) -> void:
	if visible:
		_sync_rect()
