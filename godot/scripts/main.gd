extends Node
## App root (the only .tscn): owns the three UI layers, swaps the world child on
## Game.space_changed and routes HUD hotbar selection into the active world's
## magnet. With `--smoke` in the user args it runs tests/smoke.gd headless instead.

const HudScript := preload("res://scripts/ui/hud.gd")
const CraftMenuScript := preload("res://scripts/ui/craft_menu.gd")
const MainMenuScript := preload("res://scripts/ui/main_menu.gd")
const HomeWorldScript := preload("res://scripts/world/home_world.gd")
const PalaceWorldScript := preload("res://scripts/world/palace_world.gd")

var _hud: HudScript
var _craft_menu: CraftMenuScript
var _main_menu: MainMenuScript
var _world: Node3D


func _ready() -> void:
	if OS.get_cmdline_user_args().has("--smoke"):
		_run_smoke()
		return
	_hud = HudScript.new()
	_craft_menu = CraftMenuScript.new()
	_main_menu = MainMenuScript.new()
	add_child(_hud)
	add_child(_craft_menu)
	add_child(_main_menu)
	Game.space_changed.connect(_on_space_changed)
	_on_space_changed(Game.space)  # boot to the menu


## Headless test entry: run after autoloads are fully up, quit with its code.
func _run_smoke() -> void:
	var smoke: Node = load("res://tests/smoke.gd").new()
	add_child(smoke)
	var code: int = await smoke.run()
	get_tree().quit(code)


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
	_main_menu.visible = space == Game.Space.MENU
	_hud.visible = space != Game.Space.MENU
	if space == Game.Space.MENU:
		_craft_menu.visible = false
