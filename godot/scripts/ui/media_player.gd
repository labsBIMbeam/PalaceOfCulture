extends CanvasLayer
## In-game V4V media player (ADR 0004), modelled on Podverse: a right-side
## browse panel (Music / Podcasts / Live, fed by scripts/net/media_catalog.gd)
## plus a bottom-right now-playing card floating above the hotbar row (the
## hotbar is bottom-center, the chat dock bottom-left — the card avoids both).
## Toggled by the `media_player` action (M — self-registered in _enter_tree)
## and available in EVERY space, the main menu included (main.gd keeps this
## layer visible everywhere and lifts it above the menu backdrop there).
## Audio downloads once via HTTPRequest to
## user://media_cache/<id>.mp3 and plays from cache; failures show a muted
## "offline" state and never crash. All network is skipped when headless.

const UITheme := preload("res://scripts/ui/ui_theme.gd")
const MediaCatalogScript := preload("res://scripts/net/media_catalog.gd")

const PANEL_WIDTH := 380.0
const BAR_HEIGHT := 68.0
const BAR_WIDTH := 620.0
const BAR_MARGIN := 14.0
## Hotbar zone = 14 px margin + 48 px slots (hud.gd); the card floats above it.
const BAR_BOTTOM_OFFSET := 76.0
const CACHE_DIR := "user://media_cache"
const BOOST_SATS := 100
const DOWNLOAD_TIMEOUT_SEC := 60.0
const LIVE_RED := Color("#e04f4f")
const GLYPH_PLAY := "▶"
const GLYPH_PAUSE := "❚❚"
const GLYPH_NEXT := "»"
const SPIN_FRAMES: Array[String] = ["·", "··", "···"]
const SPIN_STEP_SEC := 0.28
const SECTIONS: Array[Array] = [["music", "Music"], ["podcast", "Podcasts"], ["live", "Live"]]

var _catalog: MediaCatalogScript
var _items: Array[Dictionary] = []
var _row_titles := {}  # item id -> title Label (now-playing highlight)
var _playlist: Array[String] = []  # ids of the section the current item came from
var _current := {}  # now-playing item, {} = none
var _playing := false
var _offline := false
var _pending_id := ""  # id of the mp3 currently downloading, "" = idle
var _session_sats := 0
var _spin_accum := 0.0
var _spin_frame := 0
var _prev_mouse := Input.MOUSE_MODE_VISIBLE
var _panel_tween: Tween

var _audio: AudioStreamPlayer
var _http: HTTPRequest
var _panel: PanelContainer
var _bar: PanelContainer
var _bar_art: ColorRect
var _bar_title: Label
var _bar_status: Label
var _play_button: Button
var _progress_zone: Control
var _progress_fill: ColorRect
var _time_label: Label
var _sats_label: Label


func _init() -> void:
	name = "MediaPlayer"
	layer = 15  # above the HUD (10), below the craft menu (20)


func _enter_tree() -> void:
	# Self-registers its toggle key; Game._register_actions owns the rest.
	if not InputMap.has_action("media_player"):
		InputMap.add_action("media_player")
		var ev := InputEventKey.new()
		ev.physical_keycode = KEY_M
		InputMap.action_add_event("media_player", ev)


func _ready() -> void:
	_catalog = MediaCatalogScript.new()
	add_child(_catalog)
	_items = _catalog.load_items()
	_audio = AudioStreamPlayer.new()
	_audio.finished.connect(_on_track_finished)
	add_child(_audio)
	if not _headless():  # headless smoke runs must never touch the network
		_http = HTTPRequest.new()
		_http.timeout = DOWNLOAD_TIMEOUT_SEC
		_http.request_completed.connect(_on_download_done)
		add_child(_http)
	_build_panel()
	_build_bar()


func _process(delta: float) -> void:
	if _pending_id != "":
		_spin_accum += delta
		if _spin_accum >= SPIN_STEP_SEC:
			_spin_accum = 0.0
			_spin_frame = (_spin_frame + 1) % SPIN_FRAMES.size()
			_update_status()
	if not _bar.visible:
		return
	var total := 0.0
	if _audio.stream != null:
		total = _audio.stream.get_length()
	var pos := _audio.get_playback_position()
	var ratio := 0.0 if total <= 0.0 else clampf(pos / total, 0.0, 1.0)
	_progress_fill.offset_right = _progress_zone.size.x * ratio
	_time_label.text = "%s / %s" % [_fmt_time(pos), _fmt_time(total)]


func _unhandled_input(event: InputEvent) -> void:
	if not visible:
		return  # Palace Radio works everywhere, the main menu included (M key)
	if event.is_action_pressed("media_player"):
		_toggle_panel()
		get_viewport().set_input_as_handled()
		return
	if not _panel.visible:
		return
	if event.is_action_pressed("ui_cancel"):
		_close_panel()
	get_viewport().set_input_as_handled()  # browsing owns input, like the craft menu


# --- Panel & bar construction --------------------------------------------------------------------


func _build_panel() -> void:
	_panel = PanelContainer.new()
	_panel.name = "BrowsePanel"
	_panel.theme = UITheme.theme()
	_panel.add_theme_stylebox_override("panel", UITheme.panel_style())
	_panel.visible = false
	_panel.modulate.a = 0.0
	add_child(_panel)
	_panel.anchor_left = 1.0
	_panel.anchor_right = 1.0
	_panel.anchor_bottom = 1.0
	_panel.offset_left = -PANEL_WIDTH
	var margin := MarginContainer.new()
	margin.add_theme_constant_override("margin_left", 14)
	margin.add_theme_constant_override("margin_top", 14)
	margin.add_theme_constant_override("margin_right", 14)
	margin.add_theme_constant_override("margin_bottom", 10)
	_panel.add_child(margin)
	var vbox := VBoxContainer.new()
	vbox.add_theme_constant_override("separation", 8)
	margin.add_child(vbox)
	vbox.add_child(_label("Palace Radio", UITheme.font_display(), 26, UITheme.C.gold as Color))
	vbox.add_child(_label("music · podcasts · live — value for value", UITheme.font_copy(), 11,
			UITheme.C.muted as Color))
	var scroll := ScrollContainer.new()
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	vbox.add_child(scroll)
	var list := VBoxContainer.new()
	list.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	list.add_theme_constant_override("separation", 4)
	scroll.add_child(list)
	_build_sections(list)
	vbox.add_child(_label("M / Esc — close", UITheme.font_copy(), 11, UITheme.C.muted as Color))


func _build_sections(list: VBoxContainer) -> void:
	for i in SECTIONS.size():
		var kind := String(SECTIONS[i][0])
		var ids: Array[String] = []
		var section_items: Array[Dictionary] = []
		for item: Dictionary in _items:
			if String(item.get("kind", "")) == kind:
				section_items.append(item)
				ids.append(String(item.get("id", "")))
		if section_items.is_empty():
			continue
		if i > 0:
			var spacer := Control.new()
			spacer.custom_minimum_size = Vector2(0, 10)
			list.add_child(spacer)
		list.add_child(_label(String(SECTIONS[i][1]), UITheme.font_display(), 15,
				UITheme.C.gold as Color))
		for item: Dictionary in section_items:
			list.add_child(_make_row(item, ids))


func _make_row(item: Dictionary, section_ids: Array[String]) -> Button:
	var btn := Button.new()
	btn.focus_mode = Control.FOCUS_NONE
	btn.custom_minimum_size = Vector2(0, 58)
	btn.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	btn.pressed.connect(_on_row_pressed.bind(item, section_ids))
	var row := HBoxContainer.new()
	row.mouse_filter = Control.MOUSE_FILTER_IGNORE
	row.add_theme_constant_override("separation", 10)
	btn.add_child(row)
	row.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	row.offset_left = 8.0
	row.offset_right = -8.0
	var art := ColorRect.new()
	art.color = _tone_color(String(item.get("tone", "gold")))
	art.custom_minimum_size = Vector2(36, 36)
	art.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	art.mouse_filter = Control.MOUSE_FILTER_IGNORE
	row.add_child(art)
	var meta := VBoxContainer.new()
	meta.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	meta.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	meta.add_theme_constant_override("separation", 0)
	meta.mouse_filter = Control.MOUSE_FILTER_IGNORE
	row.add_child(meta)
	var title := _label(String(item.get("title", "?")), UITheme.font_copy_bold(), 14,
			UITheme.C.text as Color)
	title.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
	meta.add_child(title)
	_row_titles[String(item.get("id", ""))] = title
	var author := _label(String(item.get("author", "")), UITheme.font_copy(), 12,
			UITheme.C.muted as Color)
	author.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
	meta.add_child(author)
	var recipient := String(item.get("value_recipient", ""))
	if recipient != "":
		# V4V split target — boosts flow here (NIP-57 zap later).
		var v4v := _label("⚡ %s" % recipient, UITheme.font_copy(), 10, UITheme.C.gold as Color)
		v4v.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
		meta.add_child(v4v)
	if String(item.get("kind", "")) == "live":
		var live := VBoxContainer.new()
		live.size_flags_vertical = Control.SIZE_SHRINK_CENTER
		live.add_theme_constant_override("separation", 0)
		live.mouse_filter = Control.MOUSE_FILTER_IGNORE
		row.add_child(live)
		var chip := _label("● LIVE", UITheme.font_copy_bold(), 10, LIVE_RED)
		chip.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
		live.add_child(chip)
		var count := _label("%d listening" % int(item.get("listeners", 0)), UITheme.font_mono(),
				11, UITheme.C.body as Color)
		count.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
		live.add_child(count)
	return btn


func _build_bar() -> void:
	_bar = PanelContainer.new()
	_bar.name = "NowPlayingBar"
	_bar.theme = UITheme.theme()
	_bar.add_theme_stylebox_override("panel", UITheme.panel_style(true))
	_bar.visible = false
	add_child(_bar)
	# Bottom-right mini-player card, raised above the hotbar zone so the two
	# never overlap (hotbar is bottom-center; chat dock owns the bottom-left).
	_bar.anchor_left = 1.0
	_bar.anchor_right = 1.0
	_bar.anchor_top = 1.0
	_bar.anchor_bottom = 1.0
	_bar.offset_left = -(BAR_WIDTH + BAR_MARGIN)
	_bar.offset_right = -BAR_MARGIN
	_bar.offset_top = -(BAR_BOTTOM_OFFSET + BAR_HEIGHT)
	_bar.offset_bottom = -BAR_BOTTOM_OFFSET
	var margin := MarginContainer.new()
	margin.add_theme_constant_override("margin_left", 14)
	margin.add_theme_constant_override("margin_top", 8)
	margin.add_theme_constant_override("margin_right", 14)
	margin.add_theme_constant_override("margin_bottom", 8)
	_bar.add_child(margin)
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 12)
	margin.add_child(row)
	_bar_art = ColorRect.new()
	_bar_art.custom_minimum_size = Vector2(44, 44)
	_bar_art.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	_bar_art.mouse_filter = Control.MOUSE_FILTER_IGNORE
	row.add_child(_bar_art)
	var meta := VBoxContainer.new()
	meta.custom_minimum_size = Vector2(120, 0)  # card is 620 wide; titles ellipsize
	meta.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	meta.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	meta.add_theme_constant_override("separation", 1)
	row.add_child(meta)
	_bar_title = _label("—", UITheme.font_copy_bold(), 15, UITheme.C.text as Color)
	_bar_title.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
	meta.add_child(_bar_title)
	_bar_status = _label("", UITheme.font_copy(), 11, UITheme.C.muted as Color)
	_bar_status.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
	meta.add_child(_bar_status)
	_play_button = _bar_button(GLYPH_PLAY)
	_play_button.pressed.connect(_toggle_play)
	row.add_child(_play_button)
	var next_button := _bar_button(GLYPH_NEXT)
	next_button.pressed.connect(_step.bind(1))
	row.add_child(next_button)
	_progress_zone = Control.new()
	_progress_zone.custom_minimum_size = Vector2(80, 6)
	_progress_zone.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_progress_zone.size_flags_stretch_ratio = 1.4
	_progress_zone.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	_progress_zone.mouse_filter = Control.MOUSE_FILTER_IGNORE
	row.add_child(_progress_zone)
	var track := ColorRect.new()
	track.color = UITheme.C.border as Color  # gold @ 30 % — quiet track
	track.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_progress_zone.add_child(track)
	track.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	_progress_fill = ColorRect.new()
	_progress_fill.color = UITheme.C.gold as Color
	_progress_fill.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_progress_zone.add_child(_progress_fill)
	_progress_fill.anchor_bottom = 1.0
	_progress_fill.offset_right = 0.0
	_time_label = _label("0:00 / 0:00", UITheme.font_mono(), 12, UITheme.C.body as Color)
	_time_label.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	row.add_child(_time_label)
	var boost := Button.new()
	boost.text = "⚡ Boost"
	boost.focus_mode = Control.FOCUS_NONE
	boost.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	boost.add_theme_color_override("font_color", UITheme.C.coral as Color)
	boost.add_theme_color_override("font_hover_color", UITheme.C.coral as Color)
	boost.add_theme_color_override("font_pressed_color", UITheme.C.coral as Color)
	boost.pressed.connect(_boost)
	row.add_child(boost)
	_sats_label = _label("", UITheme.font_mono(), 13, UITheme.C.gold_bright as Color)
	_sats_label.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	row.add_child(_sats_label)


# --- Panel toggle ---------------------------------------------------------------------------------


func _toggle_panel() -> void:
	if _panel.visible:
		_close_panel()
	else:
		_open_panel()


func _open_panel() -> void:
	_prev_mouse = Input.mouse_mode
	Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
	_panel.visible = true
	_fade_panel(1.0)


func _close_panel() -> void:
	Input.mouse_mode = _prev_mouse
	_fade_panel(0.0)


## Instantly hides the browse panel WITHOUT touching the mouse mode; main.gd
## calls this on space changes (the menu/world own the mouse mode there).
func hide_panel() -> void:
	if _panel_tween != null and _panel_tween.is_valid():
		_panel_tween.kill()
	_panel.visible = false
	_panel.modulate.a = 0.0


func _fade_panel(target: float) -> void:
	if _panel_tween != null and _panel_tween.is_valid():
		_panel_tween.kill()
	_panel_tween = create_tween()
	_panel_tween.tween_property(_panel, "modulate:a", target, 0.18)
	if target == 0.0:
		_panel_tween.tween_callback(func() -> void: _panel.visible = false)


# --- Playback -------------------------------------------------------------------------------------


func _on_row_pressed(item: Dictionary, section_ids: Array[String]) -> void:
	_playlist = section_ids
	var id := String(item.get("id", ""))
	if id == String(_current.get("id", "")) and _audio.stream != null:
		if not _playing:
			_resume()
		return
	_play_item(item)


func _play_item(item: Dictionary) -> void:
	_current = item
	_offline = false
	_audio.stop()
	_audio.stream_paused = false
	_audio.stream = null
	_playing = false
	_play_button.text = GLYPH_PLAY
	_update_bar_meta()
	_set_bar_visible(true)
	_refresh_row_highlight()
	var path := _cache_path(String(item.get("id", "")))
	if FileAccess.file_exists(path) and _load_cached(path):
		return
	if _http == null:  # headless: no network — quiet offline state, never crash
		_fail_offline()
		return
	_start_download(item)


func _load_cached(path: String) -> bool:
	## Returns true when the cached mp3 decoded and playback started.
	var bytes := FileAccess.get_file_as_bytes(path)
	if bytes.is_empty():
		return false
	var stream := AudioStreamMP3.new()
	stream.data = bytes
	if stream.get_length() <= 0.0:
		return false
	_audio.stream = stream
	_audio.stream_paused = false
	_audio.play()
	_playing = true
	_offline = false
	_play_button.text = GLYPH_PAUSE
	_update_status()
	return true


func _start_download(item: Dictionary) -> void:
	_http.cancel_request()
	if _pending_id != "":  # drop the canceled request's partial file
		DirAccess.remove_absolute(_cache_path(_pending_id))
	DirAccess.make_dir_recursive_absolute(CACHE_DIR)
	_pending_id = String(item.get("id", ""))
	_spin_accum = 0.0
	_spin_frame = 0
	_http.download_file = _cache_path(_pending_id)
	var err := _http.request(String(item.get("audio_url", "")))
	if err != OK:
		_pending_id = ""
		_fail_offline()
		return
	_update_status()


func _on_download_done(result: int, response_code: int, _headers: PackedStringArray,
		_body: PackedByteArray) -> void:
	var id := _pending_id
	_pending_id = ""
	if id == "":
		return
	var path := _cache_path(id)
	var mine := String(_current.get("id", "")) == id
	if result != HTTPRequest.RESULT_SUCCESS or response_code != 200:
		if FileAccess.file_exists(path):
			DirAccess.remove_absolute(path)
		if mine:
			_fail_offline()
		return
	if not mine:
		_update_status()  # download landed for a track the user moved on from; keep the cache
		return
	if not _load_cached(path):
		DirAccess.remove_absolute(path)  # corrupt download
		_fail_offline()


func _fail_offline() -> void:
	_offline = true
	_playing = false
	_play_button.text = GLYPH_PLAY
	_update_status()


func _toggle_play() -> void:
	if _audio.stream == null:
		return
	if _playing:
		_audio.stream_paused = true
		_playing = false
		_play_button.text = GLYPH_PLAY
	else:
		_resume()


func _resume() -> void:
	if _audio.stream == null:
		return
	if _audio.stream_paused:
		_audio.stream_paused = false
	elif not _audio.playing:
		_audio.play()
	_playing = true
	_play_button.text = GLYPH_PAUSE


func _step(direction: int) -> void:
	if _current.is_empty() or _playlist.is_empty():
		return
	var at := _playlist.find(String(_current.get("id", "")))
	var next := _item_by_id(_playlist[wrapi(at + direction, 0, _playlist.size())])
	if not next.is_empty():
		_play_item(next)


func _on_track_finished() -> void:
	_playing = false
	_play_button.text = GLYPH_PLAY
	_step(1)


func _boost() -> void:
	## V4V (ADR 0004): later this sends a NIP-57 zap / boostagram of BOOST_SATS
	## to _current.value_recipient over LNbits/NWC. Session-local mock for now.
	if _current.is_empty():
		return
	_session_sats += BOOST_SATS
	_sats_label.text = "%d sats" % _session_sats
	var tween := create_tween()
	tween.tween_property(_sats_label, "modulate:a", 1.0, 0.6).from(0.25)


# --- Display refresh ------------------------------------------------------------------------------


func _update_bar_meta() -> void:
	if _current.is_empty():
		return
	_bar_art.color = _tone_color(String(_current.get("tone", "gold")))
	_bar_title.text = "%s — %s" % [String(_current.get("title", "?")),
			String(_current.get("author", ""))]
	_update_status()


func _update_status() -> void:
	if _current.is_empty():
		_bar_status.text = ""
		return
	if _pending_id != "" and _pending_id == String(_current.get("id", "")):
		_bar_status.text = "fetching %s" % SPIN_FRAMES[_spin_frame]
		_bar_status.add_theme_color_override("font_color", UITheme.C.muted as Color)
	elif _offline:
		_bar_status.text = "offline"
		_bar_status.add_theme_color_override("font_color", UITheme.C.muted as Color)
	elif String(_current.get("kind", "")) == "live":
		_bar_status.text = "● live · %d listening" % int(_current.get("listeners", 0))
		_bar_status.add_theme_color_override("font_color", LIVE_RED)
	else:
		var recipient := String(_current.get("value_recipient", ""))
		if recipient != "":
			_bar_status.text = "⚡ %s" % recipient
			_bar_status.add_theme_color_override("font_color", UITheme.C.gold as Color)
		else:
			_bar_status.text = String(_current.get("author", ""))
			_bar_status.add_theme_color_override("font_color", UITheme.C.muted as Color)


func _refresh_row_highlight() -> void:
	var current_id := String(_current.get("id", ""))
	for id: String in _row_titles:
		var label: Label = _row_titles[id]
		var color := (UITheme.C.gold_bright as Color) if id == current_id else (UITheme.C.text as Color)
		label.add_theme_color_override("font_color", color)


func _set_bar_visible(value: bool) -> void:
	if _bar.visible == value:
		return
	_bar.visible = value
	# Browse panel ends above the floating card so they never overlap.
	_panel.offset_bottom = -(BAR_BOTTOM_OFFSET + BAR_HEIGHT + 8.0) if value else 0.0
	if value:
		var tween := create_tween()
		tween.tween_property(_bar, "modulate:a", 1.0, 0.25).from(0.0)


# --- Helpers --------------------------------------------------------------------------------------


func _item_by_id(id: String) -> Dictionary:
	for item: Dictionary in _items:
		if String(item.get("id", "")) == id:
			return item
	return {}


func _cache_path(id: String) -> String:
	return "%s/%s.mp3" % [CACHE_DIR, id.validate_filename()]


func _tone_color(tone: String) -> Color:
	match tone:
		"coral":
			return UITheme.C.coral as Color
		"teal":
			return UITheme.C.teal_light as Color
		_:
			return UITheme.C.gold as Color


func _label(value: String, font: Font, font_size: int, color: Color) -> Label:
	var l := Label.new()
	l.text = value
	if font != null:
		l.add_theme_font_override("font", font)
	l.add_theme_font_size_override("font_size", font_size)
	l.add_theme_color_override("font_color", color)
	return l


func _bar_button(glyph: String) -> Button:
	var b := Button.new()
	b.text = glyph
	b.focus_mode = Control.FOCUS_NONE
	b.custom_minimum_size = Vector2(42, 38)
	b.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	return b


func _fmt_time(seconds: float) -> String:
	var s := maxi(0, int(seconds))
	return "%d:%02d" % [int(s / 60.0), s % 60]


func _headless() -> bool:
	return DisplayServer.get_name() == "headless"
