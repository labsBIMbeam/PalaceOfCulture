extends CanvasLayer
## Full-screen intro video before the menu — port of the web IntroScreen (apps/web
## frontend): sound on by default, mute toggle, skip button, any click/cancel skips,
## advances when the video ends or errors. Shown once per launch by main.gd.
## Headless-safe: with no display the intro resolves immediately.

signal intro_done

const VIDEO_PATH := "res://assets/intro.ogv"
const UITheme := preload("res://scripts/ui/ui_theme.gd")

var _player: VideoStreamPlayer
var _mute_button: Button
var _done := false


func _ready() -> void:
	layer = 40
	visible = false


func open() -> void:
	## Builds the UI lazily and starts playback; resolves at once when headless.
	if DisplayServer.get_name() == "headless":
		_finish.call_deferred()
		return
	if _player == null:
		_build()
	visible = true
	_player.play()


func _build() -> void:
	var backdrop := ColorRect.new()
	backdrop.color = Color.BLACK
	backdrop.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(backdrop)

	var ratio := AspectRatioContainer.new()
	ratio.ratio = 16.0 / 9.0
	ratio.set_anchors_preset(Control.PRESET_FULL_RECT)
	backdrop.add_child(ratio)

	_player = VideoStreamPlayer.new()
	_player.stream = load(VIDEO_PATH)
	_player.expand = true
	_player.finished.connect(_finish)
	ratio.add_child(_player)

	# Click anywhere = skip (the web version resumes on click; here playback is
	# already running, so the whole surface doubles as the skip gesture).
	backdrop.gui_input.connect(_on_gui_input)

	var controls := HBoxContainer.new()
	controls.set_anchors_preset(Control.PRESET_BOTTOM_RIGHT)
	controls.offset_left = -260.0
	controls.offset_top = -56.0
	controls.offset_right = -18.0
	controls.offset_bottom = -18.0
	controls.add_theme_constant_override("separation", 14)
	backdrop.add_child(controls)

	_mute_button = _text_button("[ MUTE ]")
	_mute_button.pressed.connect(_toggle_mute)
	controls.add_child(_mute_button)
	var skip := _text_button("[ SKIP ]")
	skip.pressed.connect(_finish)
	controls.add_child(skip)


func _text_button(label: String) -> Button:
	var b := Button.new()
	b.text = label
	b.flat = true
	b.focus_mode = Control.FOCUS_ALL
	b.add_theme_font_override("font", UITheme.font_mono())
	b.add_theme_font_size_override("font_size", 14)
	b.add_theme_color_override("font_color", UITheme.C.cream)
	b.add_theme_color_override("font_hover_color", UITheme.C.gold)
	return b


func _toggle_mute() -> void:
	if _player == null:
		return
	_player.paused = false
	var muted := _player.volume_db <= -60.0
	_player.volume_db = 0.0 if muted else -80.0
	_mute_button.text = "[ MUTE ]" if muted else "[ SOUND ON ]"


func _on_gui_input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.pressed:
		_finish()


func _unhandled_input(event: InputEvent) -> void:
	if not visible or _done:
		return
	if event.is_action_pressed("ui_cancel") or event.is_action_pressed("ui_accept"):
		_finish()


func _finish() -> void:
	if _done:
		return
	_done = true
	if _player != null:
		_player.stop()
	visible = false
	intro_done.emit()
