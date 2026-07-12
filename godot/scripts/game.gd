extends Node
## App flow: current space (menu/home/palace), walk vs magnet mode, and all
## input actions registered in code — project.godot has no [input] section.
## Autoloaded as `Game`. main.gd listens to the signals and swaps worlds.

enum Space { MENU, HOME, PALACE }
enum Mode { WALK, MAGNET }

signal space_changed(space: int)
signal mode_changed(mode: int)

var space: int = Space.MENU
var mode: int = Mode.WALK
var current_home: String = ""

## True while a UI text field owns the keyboard (chat panel sets this on focus
## enter/exit). Gameplay input (player, magnet) early-returns while it is set so
## WASD/Space never leak into the world mid-sentence.
var typing := false


func _enter_tree() -> void:
	_register_actions()


func goto_menu() -> void:
	current_home = ""
	_reset_mode()
	_set_space(Space.MENU)


func goto_home(home_name: String) -> void:
	current_home = home_name
	_reset_mode()
	_set_space(Space.HOME)


func goto_palace() -> void:
	_reset_mode()
	_set_space(Space.PALACE)


func toggle_mode() -> void:
	## Walk <-> Magnet. Ignored in the menu; in the Palace the magnet is
	## decorate-only (see magnet_can_build).
	if space == Space.MENU:
		return
	mode = Mode.MAGNET if mode == Mode.WALK else Mode.WALK
	mode_changed.emit(mode)


func magnet_can_build() -> bool:
	## Block tools exist only in the private Home — design law, not a tech limit.
	return space == Space.HOME


func _set_space(new_space: int) -> void:
	space = new_space
	space_changed.emit(space)


func _reset_mode() -> void:
	if mode != Mode.WALK:
		mode = Mode.WALK
		mode_changed.emit(mode)


func _register_actions() -> void:
	# ui_cancel (Esc) stays built-in; everything else lives here.
	_add_key_action("move_forward", [KEY_W, KEY_UP])
	_add_key_action("move_back", [KEY_S, KEY_DOWN])
	_add_key_action("move_left", [KEY_A, KEY_LEFT])
	_add_key_action("move_right", [KEY_D, KEY_RIGHT])
	_add_key_action("jump", [KEY_SPACE])
	_add_key_action("sprint", [KEY_SHIFT])
	_add_key_action("toggle_magnet", [KEY_B])
	_add_key_action("interact", [KEY_E])
	_add_key_action("craft_menu", [KEY_C])
	_add_key_action("hover_up", [KEY_SPACE])
	_add_key_action("hover_down", [KEY_CTRL])
	_add_mouse_action("place", MOUSE_BUTTON_LEFT)
	_add_mouse_action("absorb", MOUSE_BUTTON_RIGHT)
	for i: int in range(1, 10):
		_add_key_action("hotbar_%d" % i, [KEY_0 + i])
	# Social layers (the UI modules also register these defensively — same guard).
	_add_key_action("chat_focus", [KEY_ENTER, KEY_KP_ENTER])
	_add_key_action("media_player", [KEY_M])
	_add_key_action("voice_toggle", [KEY_V])


func _add_key_action(action: String, keys: Array[int]) -> void:
	if InputMap.has_action(action):
		return
	InputMap.add_action(action)
	for key: int in keys:
		var ev := InputEventKey.new()
		ev.physical_keycode = key as Key
		InputMap.action_add_event(action, ev)


func _add_mouse_action(action: String, button: MouseButton) -> void:
	if InputMap.has_action(action):
		return
	InputMap.add_action(action)
	var ev := InputEventMouseButton.new()
	ev.button_index = button
	InputMap.action_add_event(action, ev)
