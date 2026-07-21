extends Node
## App root (the only .tscn): owns every UI layer (HUD, craft menu, main menu,
## chat dock, voice dock, media player), swaps the world child on
## Game.space_changed and routes HUD hotbar selection into the active world's
## magnet. With `--smoke` in the user args it runs tests/smoke.gd headless instead.

const HudScript := preload("res://scripts/ui/hud.gd")
const CraftMenuScript := preload("res://scripts/ui/craft_menu.gd")
const MainMenuScript := preload("res://scripts/ui/main_menu.gd")
const ChatPanelScript := preload("res://scripts/ui/chat_panel.gd")
const VoiceDockScript := preload("res://scripts/ui/voice_dock.gd")
const VoiceTransportScript := preload("res://scripts/net/voice_transport.gd")
const MediaPlayerScript := preload("res://scripts/ui/media_player.gd")
const WorldMapScript := preload("res://scripts/ui/world_map.gd")
const IntroScreenScript := preload("res://scripts/ui/intro_screen.gd")
const HomeWorldScript := preload("res://scripts/world/home_world.gd")
const PalaceWorldScript := preload("res://scripts/world/palace_world.gd")

## Display handle for chat/voice loopback (later: the per-seal npub profile name).
const PLAYER_HANDLE := "Builder"

var _hud: HudScript
var _craft_menu: CraftMenuScript
var _main_menu: MainMenuScript
var _chat: ChatPanelScript
var _voice_transport: VoiceTransportScript
var _voice_dock: VoiceDockScript
var _media: MediaPlayerScript
var _map: WorldMapScript
var _intro: IntroScreenScript
var _world: Node3D


func _ready() -> void:
	if OS.get_cmdline_user_args().has("--smoke"):
		_run_smoke()
		return
	if OS.get_cmdline_user_args().has("--moc-kerni-capture"):
		_run_moc_kerni_capture()
		return
	if OS.get_cmdline_user_args().has("--moc-intro-capture"):
		_run_moc_intro_capture()
		return
	if OS.get_cmdline_user_args().has("--moc-menu-capture"):
		_run_moc_menu_capture()
		return
	if OS.get_cmdline_user_args().has("--moc-capture"):
		_run_moc_capture()
		return
	if OS.has_feature("moc_release") or OS.get_cmdline_user_args().has("--moc-demo") \
			or OS.get_cmdline_user_args().has("--moc-route-smoke"):
		_run_moc_release()
		return
	# Responsive floor: layouts are audited down to 960x540. There is no project
	# setting for a minimum window size — the docs say set it in code.
	if DisplayServer.get_name() != "headless":
		get_window().min_size = Vector2i(960, 540)
	_main_menu = MainMenuScript.new()
	_hud = HudScript.new()
	_craft_menu = CraftMenuScript.new()
	_chat = ChatPanelScript.new()
	_chat.local_handle = PLAYER_HANDLE
	# Voice transport lives OUTSIDE the dock so one room transport can serve
	# multiple UIs later (the chat panel, by contrast, owns its transport).
	_voice_transport = VoiceTransportScript.new()
	_voice_transport.local_handle = PLAYER_HANDLE
	_voice_dock = VoiceDockScript.new()
	_media = MediaPlayerScript.new()
	# Add order sets _unhandled_input priority (reverse tree order): the craft
	# menu swallows first while open, then the media browse panel, then chat —
	# so the HUD only acts on Esc/hotbar keys when no overlay owns the input.
	_map = WorldMapScript.new()
	_intro = IntroScreenScript.new()
	add_child(_main_menu)
	add_child(_hud)
	add_child(_voice_transport)
	add_child(_voice_dock)
	add_child(_chat)
	add_child(_media)
	add_child(_craft_menu)
	add_child(_map)
	add_child(_intro)
	_voice_dock.attach_transport(_voice_transport)
	_main_menu.world_map_requested.connect(_open_map)
	_map.closed.connect(_on_map_closed)
	Game.space_changed.connect(_on_space_changed)
	_on_space_changed(Game.space)  # boot to the menu
	# Intro video over the menu, once per launch (web parity: skip/mute, resolves
	# instantly headless). The menu hides underneath so its rain sleeps.
	_main_menu.visible = false
	_intro.intro_done.connect(func() -> void:
		_main_menu.visible = Game.space == Game.Space.MENU)
	_intro.open()


func _open_map() -> void:
	_main_menu.visible = false
	_map.open()


func _on_map_closed() -> void:
	if Game.space == Game.Space.MENU:
		_main_menu.visible = true


## Headless test entry: run after autoloads are fully up, quit with its code.
func _run_smoke() -> void:
	var smoke: Node = load("res://tests/smoke.gd").new()
	add_child(smoke)
	var code: int = await smoke.run()
	get_tree().quit(code)


## Desktop/Steam slice: one workshop, no legacy Home/Craft/Feed/Radio route.
func _run_moc_release() -> void:
	if DisplayServer.get_name() != "headless":
		get_window().min_size = Vector2i(960, 540)
		if not OS.get_cmdline_user_args().has("--moc-skip-intro"):
			_intro = IntroScreenScript.new()
			add_child(_intro)
			_intro.open()
			await _intro.intro_done
			_intro.queue_free()
			_intro = null
	Game.goto_palace()
	_world = PalaceWorldScript.new()
	add_child(_world)
	print("MOC_RELEASE_READY route=workshop legacy_ui=false")
	if OS.get_cmdline_user_args().has("--moc-route-smoke"):
		await get_tree().process_frame
		await get_tree().process_frame
		var demo := _world.get("moc_demo") as MocDemo
		var ready := demo != null and demo.kerni != null and demo.world_agent != null
		print("MOC_ROUTE_SMOKE ready=%s kerni=%s authority=%s" % [
			ready, demo != null and demo.kerni != null,
			String(demo.world_agent.contract().authority) if ready else "missing",
		])
		get_tree().quit(0 if ready else 1)


## Deterministic native-render QA for the embodied Kerni world-agent in the real workshop.
func _run_moc_kerni_capture() -> void:
	get_window().size = Vector2i(1200, 900)
	var palace: Node3D = PalaceWorldScript.new()
	add_child(palace)
	await get_tree().process_frame
	await get_tree().process_frame
	var demo := palace.get("moc_demo") as MocDemo
	if demo == null or demo.kerni == null:
		push_error("Kerni capture could not find workshop companion")
		get_tree().quit(1)
		return
	demo._ask_kerni()
	var camera := Camera3D.new()
	camera.name = "KERNI_QA_Camera"
	camera.position = Vector3(20.5, 4.6, 84.5)
	camera.fov = 44.0
	camera.look_at_from_position(camera.position, Vector3(16.5, 2.65, 77.5), Vector3.UP)
	add_child(camera)
	camera.current = true
	var capture_player := palace.get("_player") as Node3D
	if capture_player != null:
		capture_player.global_position = camera.position
		capture_player.visible = false
	DisplayServer.window_set_vsync_mode(DisplayServer.VSYNC_DISABLED)
	var frame_start := Time.get_ticks_usec()
	for _frame in 100:
		await RenderingServer.frame_post_draw
	var frame_seconds := float(Time.get_ticks_usec() - frame_start) / 1_000_000.0
	var image := get_viewport().get_texture().get_image()
	var output := ProjectSettings.globalize_path("user://kerni_world_agent_capture.png")
	var error := image.save_png(output)
	print("KERNI_CAPTURE path=%s size=%dx%d error=%d avg_fps=%.1f authority=%s" % [
		output, image.get_width(), image.get_height(), error, 100.0 / maxf(frame_seconds, 0.001),
		String(demo.world_agent.last_proposal.get("authority", "missing")),
	])
	get_tree().quit(0 if error == OK else 1)


## Deterministic native-render QA for the longest canonical intro card.
func _run_moc_intro_capture() -> void:
	get_window().size = Vector2i(1280, 720)
	_intro = IntroScreenScript.new()
	add_child(_intro)
	# Capture is intentionally headless, so bypass open(): open() correctly resolves immediately when
	# there is no display and therefore does not build the card controls needed for this QA image.
	_intro._build()
	_intro.visible = true
	_intro._show_cards()
	_intro._card_index = _intro.STORY_CARDS.size() - 1
	_intro._render_card()
	await get_tree().process_frame
	await RenderingServer.frame_post_draw
	var image := get_viewport().get_texture().get_image()
	var output := ProjectSettings.globalize_path("user://moc_intro_story_capture.png")
	var error := image.save_png(output)
	print("MOC_INTRO_CAPTURE path=%s size=%dx%d error=%d card=%d" % [
		output, image.get_width(), image.get_height(), error, _intro._card_index + 1,
	])
	get_tree().quit(0 if error == OK else 1)


## Deterministic native-render QA for menu keyart, terminal typography and focus state.
func _run_moc_menu_capture() -> void:
	get_window().size = Vector2i(1280, 720)
	_main_menu = MainMenuScript.new()
	add_child(_main_menu)
	await get_tree().process_frame
	await RenderingServer.frame_post_draw
	var image := get_viewport().get_texture().get_image()
	var output := ProjectSettings.globalize_path("user://moc_menu_keyart_capture.png")
	var error := image.save_png(output)
	print("MOC_MENU_CAPTURE path=%s size=%dx%d error=%d keyart=%s" % [
		output, image.get_width(), image.get_height(), error,
		str(_main_menu.find_child("TitleKeyart", true, false) != null),
	])
	get_tree().quit(0 if error == OK else 1)


## Deterministic native-render QA: direct Palace boot, authored camera, PNG, clean exit.
func _run_moc_capture() -> void:
	get_window().size = Vector2i(1600, 900)
	var palace: Node3D = PalaceWorldScript.new()
	add_child(palace)
	await get_tree().process_frame
	await get_tree().process_frame
	var camera := Camera3D.new()
	camera.name = "MOC_QA_Camera"
	camera.position = Vector3(57, 20, 97)
	camera.fov = 48.0
	camera.look_at_from_position(camera.position, Vector3(30, 7, 62), Vector3.UP)
	add_child(camera)
	camera.current = true
	DisplayServer.window_set_vsync_mode(DisplayServer.VSYNC_DISABLED)
	var frame_start := Time.get_ticks_usec()
	for _frame in 120:
		await RenderingServer.frame_post_draw
	var frame_seconds := float(Time.get_ticks_usec() - frame_start) / 1_000_000.0
	var image := get_viewport().get_texture().get_image()
	var output := ProjectSettings.globalize_path("user://moc_godot_capture.png")
	var error := image.save_png(output)
	print("MOC_CAPTURE path=%s size=%dx%d error=%d avg_fps=%.1f" % [
		output, image.get_width(), image.get_height(), error, 120.0 / maxf(frame_seconds, 0.001),
	])
	get_tree().quit(0 if error == OK else 1)


## Swaps the world child and matches UI layer visibility to the new space.
func _on_space_changed(space: int) -> void:
	if _world != null:
		_world.queue_free()  # freed at frame end; its _exit_tree autosaves
		_world = null
	match space:
		Game.Space.HOME:
			_world = HomeWorldScript.new()
		Game.Space.PALACE:
			_world = PalaceWorldScript.new()
	if _world != null:
		add_child(_world)
		var mag: Object = _world.get("magnet")
		if mag != null:
			_hud.set_on_select(Callable(mag, "set_selected"))
	var in_world := space != Game.Space.MENU
	_main_menu.visible = not in_world \
		and (_intro == null or not _intro.visible) and (_map == null or not _map.visible)
	if in_world and _map != null:
		_map.visible = false
	_hud.visible = in_world
	# Chat + voice are world-social and stay hidden in the menu. Palace Radio is
	# available EVERYWHERE (the menu shows a RADIO [M] hint and music keeps
	# playing across space swaps); its browse panel closes on every swap so each
	# screen starts clean. On the title screen the radio hops above the menu's
	# fullscreen backdrop (layer 30), back under the craft menu (20) in worlds.
	_chat.visible = in_world
	_voice_dock.visible = in_world
	_media.visible = true
	_media.layer = 15 if in_world else 31
	_media.hide_panel()
	if not in_world:
		_craft_menu.close(false)
