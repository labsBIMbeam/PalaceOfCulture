extends CanvasLayer
## Full-screen intro video followed by the canonical raccoon/Kaiserwarte/Locktard cards.
## Skip always exits; missing media falls through to the same cards. Shown once per launch.
## Headless-safe: with no display the intro resolves immediately.

signal intro_done

const VIDEO_PATH := "res://assets/intro.ogv"
const UITheme := preload("res://scripts/ui/ui_theme.gd")
const STORY_CARDS := [
	{
		"kicker": "BEFORE",
		"caption": "A raccoon bit you. You don't remember agreeing to this.",
		"line": "Rude. Effective.",
	},
	{
		"kicker": "MORNING",
		"caption": "You wake somewhere high and quiet. A sign says Kaiserwarte. Probably.",
		"line": "Nobody official has named it yet.",
	},
	{
		"kicker": "DOWNHILL",
		"caption": "Below: lamps, and a spaceship nobody finished on purpose.",
		"line": "The raccoon is gone. A copper lantern floats where it stood. Kerni, apparently. Welcome to Locktard Street: thirty-six sockets, no owner.",
	},
]

var _player: VideoStreamPlayer
var _mute_button: Button
var _card_panel: PanelContainer
var _card_kicker: Label
var _card_caption: Label
var _card_line: Label
var _card_button: Button
var _card_index := -1
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
	if _player.stream == null:
		_show_cards()
	else:
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
	_player.finished.connect(_show_cards)
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

	_card_panel = PanelContainer.new()
	_card_panel.visible = false
	_card_panel.set_anchors_preset(Control.PRESET_CENTER)
	_card_panel.offset_left = -430.0
	_card_panel.offset_top = -220.0
	_card_panel.offset_right = 430.0
	_card_panel.offset_bottom = 220.0
	backdrop.add_child(_card_panel)
	var card_box := VBoxContainer.new()
	card_box.alignment = BoxContainer.ALIGNMENT_CENTER
	card_box.add_theme_constant_override("separation", 22)
	_card_panel.add_child(card_box)
	_card_kicker = Label.new()
	_card_kicker.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_card_kicker.add_theme_font_override("font", UITheme.font_mono())
	_card_kicker.add_theme_font_size_override("font_size", 13)
	_card_kicker.add_theme_color_override("font_color", UITheme.C.gold)
	card_box.add_child(_card_kicker)
	_card_caption = Label.new()
	_card_caption.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_card_caption.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_card_caption.add_theme_font_override("font", UITheme.font_display())
	_card_caption.add_theme_font_size_override("font_size", 34)
	_card_caption.add_theme_color_override("font_color", UITheme.C.cream)
	card_box.add_child(_card_caption)
	_card_line = Label.new()
	_card_line.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_card_line.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_card_line.add_theme_font_override("font", UITheme.font_copy())
	_card_line.add_theme_font_size_override("font_size", 18)
	_card_line.add_theme_color_override("font_color", UITheme.C.body)
	card_box.add_child(_card_line)
	_card_button = _text_button("[ CONTINUE ]")
	_card_button.pressed.connect(_advance_card)
	card_box.add_child(_card_button)


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
		if _card_index >= 0:
			_advance_card()
		else:
			_finish()


func _unhandled_input(event: InputEvent) -> void:
	if not visible or _done:
		return
	if event.is_action_pressed("ui_cancel"):
		_finish()
	elif event.is_action_pressed("ui_accept") and _card_index >= 0:
		_advance_card()


func _show_cards() -> void:
	if _done or STORY_CARDS.is_empty():
		_finish()
		return
	_player.stop()
	_player.visible = false
	_mute_button.visible = false
	_card_index = 0
	_card_panel.visible = true
	_render_card()


func _render_card() -> void:
	var card: Dictionary = STORY_CARDS[_card_index]
	_card_kicker.text = String(card.kicker)
	_card_caption.text = String(card.caption)
	_card_line.text = String(card.line)
	_card_button.text = "[ WALK IN ]" if _card_index == STORY_CARDS.size() - 1 else "[ CONTINUE ]"
	_card_button.grab_focus()


func _advance_card() -> void:
	if _card_index < 0:
		return
	if _card_index >= STORY_CARDS.size() - 1:
		_finish()
		return
	_card_index += 1
	_render_card()


func _finish() -> void:
	if _done:
		return
	_done = true
	if _player != null:
		_player.stop()
	visible = false
	intro_done.emit()
