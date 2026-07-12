extends CanvasLayer
## Voice dock (ADR-0002 seam): slim pill sitting directly above the chat dock,
## bottom-left. Central room voice — status dot, Join Voice/Leave, mic mute toggle
## and the current speakers as gold chips. Talks only to the transport handed in via
## attach_transport(); it never knows which backend (mock / LiveKit / MoQ) is behind it.

const UITheme := preload("res://scripts/ui/ui_theme.gd")

const BOTTOM_OFFSET_PX := 322  # chat dock spans 14..314 px from the bottom; 8 px breathing room
const MARGIN_PX := 14          # left-aligned with the chat dock margin
const DOT_OFF := Color("#6b5a3a")     # web token .voice-dot
const DOT_LIVE := Color("#2bd07a")    # web token .voice-dot--live
const SPEAKERS_MIN_WIDTH := 170.0     # reserved chip area — pill width stays calm
const IDLE_LINE := "central voice · room-scoped"

var _transport: Node
var _state := {"status": "off", "muted": false, "speakers": []}

var _panel: PanelContainer
var _dot: Panel
var _dot_style: StyleBoxFlat
var _join_button: Button
var _mute_button: Button
var _mute_slash: Control
var _chips_box: HBoxContainer
var _idle_label: Label
var _chip_style: StyleBoxFlat
var _chips: Array[Control] = []
var _shown_speakers: Array = []
var _dot_tween: Tween
var _chip_tweens: Array[Tween] = []


func _init() -> void:
	name = "VoiceDock"
	layer = 10


func _enter_tree() -> void:
	# Defensive, idempotent registration — game.gd may take ownership of this later.
	if not InputMap.has_action("voice_toggle"):
		InputMap.add_action("voice_toggle")
		var ev := InputEventKey.new()
		ev.physical_keycode = KEY_V
		InputMap.action_add_event("voice_toggle", ev)


func _ready() -> void:
	_build_panel()
	_refresh()
	_panel.modulate.a = 0.0  # calm fade-in, nothing snappy
	var tween := create_tween()
	tween.tween_property(_panel, "modulate:a", 1.0, 0.4) \
		.set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_OUT)


func _unhandled_input(event: InputEvent) -> void:
	if not visible or _transport == null or Game.space == Game.Space.MENU:
		return
	if event.is_action_pressed("voice_toggle"):
		get_viewport().set_input_as_handled()
		_toggle_voice()


## Wires the dock to a voice transport node (scripts/net/voice_transport.gd contract:
## signal state_changed(state), connect_voice/disconnect_voice/set_muted/get_state).
func attach_transport(t: Node) -> void:
	if _transport != null and _transport.state_changed.is_connected(_on_state_changed):
		_transport.state_changed.disconnect(_on_state_changed)
	_transport = t
	t.state_changed.connect(_on_state_changed)
	if t.has_method("get_state"):
		_on_state_changed(t.get_state())


func _toggle_voice() -> void:
	if String(_state.status) == "off":
		_transport.connect_voice()
	else:
		_transport.disconnect_voice()


func _on_state_changed(state: Dictionary) -> void:
	_state = state
	if _panel != null:  # transport may attach before _ready; _ready refreshes then
		_refresh()


# --- build ---------------------------------------------------------------------------


func _build_panel() -> void:
	_panel = PanelContainer.new()
	_panel.theme = UITheme.theme()
	var pill: StyleBoxFlat = UITheme.panel_style().duplicate()
	pill.set_corner_radius_all(999)
	pill.content_margin_left = 14.0
	pill.content_margin_right = 14.0
	pill.content_margin_top = 7.0
	pill.content_margin_bottom = 7.0
	_panel.add_theme_stylebox_override("panel", pill)
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 9)
	_panel.add_child(row)
	_dot = _build_dot()
	row.add_child(_dot)
	_join_button = _build_pill_button("Join Voice")
	_join_button.custom_minimum_size = Vector2(96, 0)  # fits "Join Voice" and "Leave"
	_join_button.tooltip_text = "Join/leave the room voice (V)"
	_join_button.pressed.connect(_on_join_pressed)
	row.add_child(_join_button)
	_mute_button = _build_pill_button("Mic")
	_mute_button.pressed.connect(_on_mute_pressed)
	row.add_child(_mute_button)
	_mute_slash = Control.new()
	_mute_slash.set_anchors_preset(Control.PRESET_FULL_RECT)
	_mute_slash.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_mute_slash.draw.connect(_draw_mute_slash)
	_mute_button.add_child(_mute_slash)
	_chips_box = HBoxContainer.new()
	_chips_box.custom_minimum_size = Vector2(SPEAKERS_MIN_WIDTH, 0)
	_chips_box.add_theme_constant_override("separation", 6)
	row.add_child(_chips_box)
	_idle_label = Label.new()
	_idle_label.text = IDLE_LINE
	_idle_label.add_theme_font_override("font", UITheme.font_mono())
	_idle_label.add_theme_font_size_override("font_size", 10)
	_idle_label.add_theme_color_override("font_color", UITheme.C.muted)
	_idle_label.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	_chips_box.add_child(_idle_label)
	_chip_style = UITheme.panel_style().duplicate()
	_chip_style.set_corner_radius_all(999)
	_chip_style.bg_color = Color(UITheme.C.gold, 0.16)
	_chip_style.border_color = UITheme.C.border_strong
	_chip_style.content_margin_left = 9.0
	_chip_style.content_margin_right = 9.0
	_chip_style.content_margin_top = 2.0
	_chip_style.content_margin_bottom = 2.0
	add_child(_panel)
	_panel.set_anchors_and_offsets_preset(
		Control.PRESET_BOTTOM_LEFT, Control.PRESET_MODE_MINSIZE, MARGIN_PX)
	_panel.grow_horizontal = Control.GROW_DIRECTION_END
	_panel.grow_vertical = Control.GROW_DIRECTION_BEGIN
	var raise := float(BOTTOM_OFFSET_PX - MARGIN_PX)
	_panel.offset_top -= raise
	_panel.offset_bottom -= raise


func _build_dot() -> Panel:
	var dot := Panel.new()
	dot.custom_minimum_size = Vector2(10, 10)
	dot.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	dot.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_dot_style = StyleBoxFlat.new()
	_dot_style.bg_color = DOT_OFF
	_dot_style.set_corner_radius_all(99)
	dot.add_theme_stylebox_override("panel", _dot_style)
	return dot


func _build_pill_button(text: String) -> Button:
	var button := Button.new()
	button.text = text
	button.focus_mode = Control.FOCUS_NONE
	button.add_theme_font_override("font", UITheme.font_display())
	button.add_theme_font_size_override("font_size", 12)
	button.add_theme_color_override("font_color", UITheme.C.body)
	button.add_theme_color_override("font_hover_color", UITheme.C.gold_bright)
	button.add_theme_color_override("font_pressed_color", UITheme.C.gold_bright)
	var normal: StyleBoxFlat = UITheme.panel_style().duplicate()
	normal.set_corner_radius_all(999)
	normal.set_content_margin_all(0.0)
	normal.content_margin_left = 11.0
	normal.content_margin_right = 11.0
	normal.content_margin_top = 4.0
	normal.content_margin_bottom = 4.0
	var hover: StyleBoxFlat = normal.duplicate()
	hover.border_color = UITheme.C.border_strong
	button.add_theme_stylebox_override("normal", normal)
	button.add_theme_stylebox_override("hover", hover)
	button.add_theme_stylebox_override("pressed", hover)
	return button


# --- refresh -------------------------------------------------------------------------


func _refresh() -> void:
	var status := String(_state.status)
	var muted := bool(_state.muted)
	_refresh_dot(status)
	match status:
		"connecting":
			_join_button.text = "Connecting..."
		"live":
			_join_button.text = "Leave"
		_:
			_join_button.text = "Join Voice"
	_mute_button.tooltip_text = "Unmute mic" if muted else "Mute mic"
	_mute_button.add_theme_color_override(
		"font_color", UITheme.C.coral if muted else UITheme.C.body)
	_mute_slash.queue_redraw()
	var speakers: Array = _state.speakers if status == "live" else []
	if speakers != _shown_speakers:  # keep pulses running when the roster is unchanged
		_shown_speakers = speakers.duplicate()
		_rebuild_chips(speakers)


func _refresh_dot(status: String) -> void:
	if _dot_tween != null:
		_dot_tween.kill()
		_dot_tween = null
	_dot.modulate.a = 1.0
	match status:
		"connecting":  # amber pulse while the (simulated) handshake runs
			_dot_style.bg_color = UITheme.C.gold
			_dot_tween = _pulse(_dot, 0.35, 0.6)
		"live":  # green with a gentle breathe
			_dot_style.bg_color = DOT_LIVE
			_dot_tween = _pulse(_dot, 0.8, 1.2)
		_:
			_dot_style.bg_color = DOT_OFF


func _rebuild_chips(speakers: Array) -> void:
	for tween: Tween in _chip_tweens:
		tween.kill()
	_chip_tweens.clear()
	for chip: Control in _chips:
		_chips_box.remove_child(chip)
		chip.queue_free()
	_chips.clear()
	_idle_label.visible = speakers.is_empty()
	for handle: Variant in speakers:
		var chip := _make_chip(String(handle))
		_chips_box.add_child(chip)
		_chips.append(chip)
		_chip_tweens.append(_pulse(chip, 0.72, 0.8))  # gentle speaking pulse


func _make_chip(handle: String) -> Control:
	var chip := PanelContainer.new()
	chip.add_theme_stylebox_override("panel", _chip_style)
	chip.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	chip.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var label := Label.new()
	label.text = handle
	label.add_theme_font_override("font", UITheme.font_mono())
	label.add_theme_font_size_override("font_size", 11)
	label.add_theme_color_override("font_color", UITheme.C.gold_bright)
	chip.add_child(label)
	return chip


## Looping sine fade on `node.modulate:a` between `low` and 1.0, `half_sec` per leg.
func _pulse(node: CanvasItem, low: float, half_sec: float) -> Tween:
	var tween := node.create_tween().set_loops()
	tween.tween_property(node, "modulate:a", low, half_sec) \
		.set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)
	tween.tween_property(node, "modulate:a", 1.0, half_sec) \
		.set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)
	return tween


func _draw_mute_slash() -> void:
	if not bool(_state.muted):
		return
	var size := _mute_slash.size
	_mute_slash.draw_line(
		Vector2(7.0, size.y - 7.0), Vector2(size.x - 7.0, 7.0), UITheme.C.coral, 2.0, true)


func _on_join_pressed() -> void:
	if _transport != null:
		_toggle_voice()


func _on_mute_pressed() -> void:
	if _transport != null:
		_transport.set_muted(not bool(_state.muted))
