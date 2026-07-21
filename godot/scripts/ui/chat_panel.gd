extends CanvasLayer
## WoW-style chat dock (bottom-left, ~380x300): tabbed channels (All/World/Plaza/
## Whisper), BBCode scrollback, slash commands and press-Enter-to-talk — but quiet:
## it fades to 55% after 6 s of silence so the world stays the hero. Talks only to
## the ChatTransport seam (scripts/net/chat_transport.gd), so the Nostr swap
## (NIP-29 groups + NIP-17 whispers) never touches this file.
## Ported from apps/web/src/ui/ChatPanel.tsx.

const UITheme := preload("res://scripts/ui/ui_theme.gd")
const ChatTransportScript := preload("res://scripts/net/chat_transport.gd")

const TABS: Array[Dictionary] = [
	{"id": "all", "label": "All"},
	{"id": "world", "label": "World"},
	{"id": "plaza", "label": "Plaza"},
	{"id": "whisper", "label": "Whisper"},
]
const CHANNEL_LABEL := {"world": "World", "plaza": "Plaza", "whisper": "Whisper"}

# 380 wide so the dock clears the bottom-center hotbar (9x48 + gaps = 480 px,
# starting at x=400 on the 1280-wide logical canvas) at every window size.
const DOCK_SIZE := Vector2(380, 300)
const MAX_LINES := 200
const IDLE_AFTER_SEC := 6.0
const IDLE_ALPHA := 0.55
const FADE_SEC := 0.9

## Display handle for our own lines; the integrator sets this before add_child
## (later: the per-seal npub profile name).
var local_handle: String = "Builder"

var _transport: ChatTransportScript
var _messages: Array[Dictionary] = []
var _active := "all"
var _unread := {"world": false, "plaza": false, "whisper": false}
var _log_empty := true

var _root: PanelContainer
var _log: RichTextLabel
var _input: LineEdit
var _channel_tag: Label
var _tab_buttons := {}  # tab id -> Button
var _idle_timer: Timer
var _fade_tween: Tween
var _prev_mouse := Input.MOUSE_MODE_VISIBLE
var _hex := {}  # named color -> BBCode hex (muted/body/cream/gold_bright)
var _channel_hex := {}  # channel id -> BBCode hex for the [Tag]


func _init() -> void:
	name = "ChatPanel"
	layer = 12  # above the HUD (10), below modal menus (20)


func _ready() -> void:
	_register_chat_focus_action()
	_hex = {
		"muted": _c("muted").to_html(false),
		"body": _c("body").to_html(false),
		"cream": _c("cream").to_html(false),
		"gold_bright": _c("gold_bright").to_html(false),
	}
	_channel_hex = {
		"world": _c("gold_bright").to_html(false),
		"plaza": _c("teal_light").to_html(false),
		"whisper": _c("coral").to_html(false),
	}
	_build_dock()
	_idle_timer = Timer.new()
	_idle_timer.one_shot = true
	_idle_timer.timeout.connect(_on_idle_timeout)
	add_child(_idle_timer)
	_refresh_tabs()
	_refresh_channel_tag()
	_rebuild_log()
	# The transport is our child so it lives and dies with the panel; swapping the
	# mock for Nostr happens inside chat_transport.gd, never here.
	_transport = ChatTransportScript.new()
	_transport.local_handle = local_handle
	_transport.message_received.connect(_on_message)
	add_child(_transport)
	_wake()


func _unhandled_input(event: InputEvent) -> void:
	if not visible or Game.space == Game.Space.MENU:
		return
	if event.is_action_pressed("chat_focus") and not _input.has_focus():
		_input.grab_focus()
		get_viewport().set_input_as_handled()


## True while the input owns the keyboard — movement must ignore keys then.
## (Game.typing mirrors this; see _on_input_focus_entered.)
func is_typing() -> bool:
	return _input != null and _input.has_focus()


## Enter focuses the chat, WoW-style. Guarded add so game.gd can own the action later.
func _register_chat_focus_action() -> void:
	if InputMap.has_action("chat_focus"):
		return
	InputMap.add_action("chat_focus")
	for key: int in [KEY_ENTER, KEY_KP_ENTER]:
		var ev := InputEventKey.new()
		ev.physical_keycode = key as Key
		InputMap.action_add_event("chat_focus", ev)


func _build_dock() -> void:
	_root = PanelContainer.new()
	_root.theme = UITheme.theme()
	_root.add_theme_stylebox_override("panel", UITheme.panel_style())
	_root.custom_minimum_size = DOCK_SIZE
	_root.mouse_entered.connect(_wake)
	add_child(_root)
	_root.set_anchors_and_offsets_preset(Control.PRESET_BOTTOM_LEFT, Control.PRESET_MODE_MINSIZE, 14)
	_root.grow_horizontal = Control.GROW_DIRECTION_END
	_root.grow_vertical = Control.GROW_DIRECTION_BEGIN

	var vbox := VBoxContainer.new()
	vbox.add_theme_constant_override("separation", 6)
	_root.add_child(vbox)

	var tabs := HBoxContainer.new()
	tabs.add_theme_constant_override("separation", 2)
	vbox.add_child(tabs)
	for tab: Dictionary in TABS:
		var button := Button.new()
		button.flat = true
		button.focus_mode = Control.FOCUS_NONE
		button.add_theme_font_override("font", UITheme.font_copy_bold())
		button.add_theme_font_size_override("font_size", 13)
		button.mouse_entered.connect(_wake)
		button.pressed.connect(_select_tab.bind(String(tab.id)))
		tabs.add_child(button)
		_tab_buttons[String(tab.id)] = button

	_log = RichTextLabel.new()
	_log.bbcode_enabled = true
	_log.scroll_following = true
	_log.selection_enabled = true
	_log.size_flags_vertical = Control.SIZE_EXPAND_FILL
	_log.add_theme_font_override("normal_font", UITheme.font_copy())
	_log.add_theme_font_override("bold_font", UITheme.font_copy_bold())
	_log.add_theme_font_override("italics_font", _italic_font())
	_log.add_theme_font_override("mono_font", UITheme.font_mono())
	_log.add_theme_font_size_override("normal_font_size", 14)
	_log.add_theme_font_size_override("bold_font_size", 14)
	_log.add_theme_font_size_override("italics_font_size", 14)
	_log.add_theme_font_size_override("mono_font_size", 12)
	_log.add_theme_color_override("default_color", _c("body"))
	vbox.add_child(_log)
	_log.mouse_entered.connect(_wake)
	_log.get_v_scroll_bar().value_changed.connect(_on_log_scrolled)

	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 8)
	vbox.add_child(row)
	_channel_tag = Label.new()
	_channel_tag.add_theme_font_override("font", UITheme.font_mono())
	_channel_tag.add_theme_font_size_override("font_size", 12)
	row.add_child(_channel_tag)
	_input = LineEdit.new()
	_input.placeholder_text = "press enter to chat…"
	_input.max_length = 240
	_input.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_input.add_theme_font_override("font", UITheme.font_copy())
	_input.add_theme_font_size_override("font_size", 14)
	_input.text_submitted.connect(_submit)
	_input.focus_entered.connect(_on_input_focus_entered)
	_input.focus_exited.connect(_on_input_focus_exited)
	_input.gui_input.connect(_on_input_gui)
	_input.mouse_entered.connect(_wake)
	row.add_child(_input)


## Spectral ships no italic cut; fake the slant for system lines.
func _italic_font() -> FontVariation:
	var font := FontVariation.new()
	font.base_font = UITheme.font_copy()
	font.variation_transform = Transform2D(Vector2(1.0, 0.0), Vector2(0.22, 1.0), Vector2.ZERO)
	return font


func _on_message(msg: Dictionary) -> void:
	_messages.append(msg)
	while _messages.size() > MAX_LINES:
		_messages.pop_front()
	var channel := String(msg.get("channel", ""))
	if _active == "all" or channel == _active:
		if _log_empty:
			_rebuild_log()
		else:
			_log.append_text(_format_line(msg) + "\n")
	elif not bool(msg.get("self", false)) and _unread.has(channel):
		_unread[channel] = true
		_refresh_tabs()
	_wake()


## Autoscroll only while the reader sits at the bottom; scrolling up pauses it and
## touching bottom again re-arms it (scroll_following only fires on new content).
func _on_log_scrolled(_value: float) -> void:
	var bar := _log.get_v_scroll_bar()
	_log.scroll_following = bar.value + bar.page >= bar.max_value - 4.0


func _select_tab(id: String) -> void:
	_active = id
	if id == "all":  # everything is visible now
		for key: String in _unread:
			_unread[key] = false
	elif _unread.has(id):
		_unread[id] = false
	_refresh_tabs()
	_rebuild_log()
	_refresh_channel_tag()
	_wake()


func _refresh_tabs() -> void:
	for tab: Dictionary in TABS:
		var id := String(tab.id)
		var button: Button = _tab_buttons[id]
		var unread := bool(_unread.get(id, false))
		button.text = String(tab.label) + (" •" if unread else "")
		var color := _c("gold_bright") if id == _active else (_c("cream") if unread else _c("muted"))
		button.add_theme_color_override("font_color", color)
		button.add_theme_color_override("font_pressed_color", color)
		button.add_theme_color_override("font_focus_color", color)
		var hover := _c("gold_bright") if id == _active else _c("cream")
		button.add_theme_color_override("font_hover_color", hover)


## The input row tag shows where Enter will talk to (All talks to World).
func _refresh_channel_tag() -> void:
	var target := "world" if _active == "all" else _active
	_channel_tag.text = "[%s]" % CHANNEL_LABEL[target]
	_channel_tag.add_theme_color_override("font_color", _channel_color(target))


func _rebuild_log() -> void:
	_log.clear()
	_log.scroll_following = true
	_log_empty = true
	for msg: Dictionary in _messages:
		if _active == "all" or String(msg.get("channel", "")) == _active:
			_log.append_text(_format_line(msg) + "\n")
			_log_empty = false
	if _log_empty:
		var quiet := "the plaza is quiet. press enter and say something."
		_log.append_text("[i][color=#%s]%s[/color][/i]" % [_hex.muted, quiet])


func _format_line(msg: Dictionary) -> String:
	var stamp := (
		"[code][color=#%s]%s[/color][/code] " % [_hex.muted, _fmt_time(int(msg.get("at_ms", 0)))]
	)
	var body_text := _escape(String(msg.get("body", "")))
	if bool(msg.get("system", false)):
		return stamp + "[i][color=#%s]%s[/color][/i]" % [_hex.muted, body_text]
	var channel := String(msg.get("channel", "world"))
	var tag := "[color=#%s][lb]%s[rb][/color] " % [
		_channel_hex.get(channel, _hex.cream),
		CHANNEL_LABEL.get(channel, channel),
	]
	var author_hex: String = _hex.gold_bright if bool(msg.get("self", false)) else _hex.cream
	var author := "[b][color=#%s]%s[/color][/b]" % [
		author_hex,
		_escape(String(msg.get("author", ""))),
	]
	return stamp + tag + author + "[color=#%s]: %s[/color]" % [_hex.body, body_text]


func _submit(text: String) -> void:
	var line := text.strip_edges()
	_input.clear()
	if line.is_empty():
		_input.release_focus()
		return
	var channel := "world" if _active == "all" else _active  # All talks to World
	if line.begins_with("/"):
		var parts := line.substr(1).split(" ", true, 1)
		var command := String(parts[0]).to_lower()
		var remainder := String(parts[1]).strip_edges() if parts.size() > 1 else ""
		if command == "me":  # emote into the current channel, WoW-style
			_transport.send(channel, ("%s %s" % [local_handle, remainder]).strip_edges())
			_input.release_focus()
			return
		var target := _command_channel(command)
		if target.is_empty():
			_local_notice("unknown command: /%s" % command)
			return  # keep focus so the line can be retyped
		_select_tab(target)
		if remainder.is_empty():
			return  # switched channel, keep typing
		channel = target
		line = remainder
	_transport.send(channel, line)
	_input.release_focus()


## WoW slash commands: /w -> whisper, /p -> plaza, /world -> world (+ web aliases).
func _command_channel(command: String) -> String:
	match command:
		"w", "whisper":
			return "whisper"
		"p", "plaza", "2":
			return "plaza"
		"world", "1":
			return "world"
	return ""


## Client-side system line (never sent anywhere) for command feedback.
func _local_notice(text: String) -> void:
	_on_message({
		"id": "local-%d" % Time.get_ticks_msec(),
		"channel": "world" if _active == "all" else _active,
		"author": "",
		"body": text,
		"at_ms": int(Time.get_unix_time_from_system() * 1000.0),
		"self": false,
		"system": true,
	})


func _on_input_focus_entered() -> void:
	# Integrator adds `var typing := false` to game.gd so movement ignores keys while
	# chatting; Node.set() stays a safe no-op until that flag lands.
	Game.set("typing", true)
	Game.set_world_input_blocked(&"chat_input", true)
	_prev_mouse = Input.mouse_mode
	Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
	_wake()


func _on_input_focus_exited() -> void:
	Game.set("typing", false)
	Game.set_world_input_blocked(&"chat_input", false)
	Input.mouse_mode = _prev_mouse
	_wake()


func _exit_tree() -> void:
	Game.set("typing", false)
	Game.set_world_input_blocked(&"chat_input", false)


func _on_input_gui(event: InputEvent) -> void:
	if event.is_action_pressed("ui_cancel"):
		_input.release_focus()
		_input.accept_event()  # keep Esc from also reaching the HUD's menu handler


func _wake() -> void:
	if _idle_timer != null and _idle_timer.is_inside_tree():
		_idle_timer.start(IDLE_AFTER_SEC)
	_fade_to(1.0)


func _on_idle_timeout() -> void:
	if is_typing():
		_wake()  # never fade mid-sentence
		return
	_fade_to(IDLE_ALPHA)


func _fade_to(alpha: float) -> void:
	if _root == null or is_equal_approx(_root.modulate.a, alpha):
		return
	if _fade_tween != null and _fade_tween.is_valid():
		_fade_tween.kill()
	_fade_tween = create_tween()
	var step := _fade_tween.tween_property(_root, "modulate:a", alpha, FADE_SEC)
	step.set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_OUT)


func _channel_color(channel: String) -> Color:
	match channel:
		"plaza":
			return _c("teal_light")
		"whisper":
			return _c("coral")
	return _c("gold_bright")


func _c(key: String) -> Color:
	return UITheme.C[key] as Color


## Only "[" opens a BBCode tag; a bare "]" already renders literally.
func _escape(text: String) -> String:
	return text.replace("[", "[lb]")


func _fmt_time(at_ms: int) -> String:
	var bias_min := int(Time.get_time_zone_from_system().get("bias", 0))
	var local := Time.get_datetime_dict_from_unix_time(int(at_ms / 1000.0) + bias_min * 60)
	return "[lb]%02d:%02d[rb]" % [local.hour, local.minute]
