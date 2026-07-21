## Embodied, art-only Kerni avatar. Dialogue/state remain application data.
class_name Kerni3D
extends Node3D

signal spoke(text: String)

const ASSET_PATH := "res://assets/moc/kerni.glb"
const INTERACTION_RADIUS := 4.8

var last_spoken_text := ""
var _visual_anchor: Node3D
var _model: Node3D
var _speech: Label3D
var _nameplate: Label3D
var _player: Node3D
var _base_y := 0.0
var _time := 0.0
var _speech_remaining := 0.0
var _phase := 0


func _init() -> void:
	name = "Kerni3D"


func _ready() -> void:
	_base_y = position.y
	_visual_anchor = Node3D.new()
	_visual_anchor.name = "FloatingVisual"
	add_child(_visual_anchor)

	var packed := load(ASSET_PATH) as PackedScene
	if packed == null:
		push_error("kerni_3d: missing or unimported %s" % ASSET_PATH)
		set_process(false)
		return
	_model = packed.instantiate()
	_model.name = "KerniArt"
	_model.scale = Vector3.ONE * 0.62
	_visual_anchor.add_child(_model)

	_nameplate = Label3D.new()
	_nameplate.name = "KerniNameplate"
	_nameplate.text = "KERNI · WORLD AGENT · SUGGESTION ONLY"
	_nameplate.position = Vector3(0, 2.45, 0)
	_nameplate.font_size = 20
	_nameplate.outline_size = 8
	_nameplate.modulate = Color("ffae42")
	_nameplate.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	add_child(_nameplate)

	_speech = Label3D.new()
	_speech.name = "KerniSpeech"
	_speech.position = Vector3(0, 3.15, 0)
	_speech.font_size = 23
	_speech.outline_size = 11
	_speech.modulate = Color("fff0d2")
	_speech.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	_speech.visible = false
	add_child(_speech)

	var glow := OmniLight3D.new()
	glow.name = "KerniAmberGlow"
	glow.position = Vector3(0, 1.8, -0.8)
	glow.light_color = Color("ff8f32")
	glow.light_energy = 2.4
	glow.omni_range = 5.0
	glow.shadow_enabled = false
	add_child(glow)
	set_process(true)


func attach_player(value: Node3D) -> void:
	_player = value


func set_phase(value: int) -> void:
	_phase = value
	if _nameplate != null:
		_nameplate.modulate = _phase_color(value)


func is_player_near(global_point: Vector3) -> bool:
	return Vector2(global_point.x - global_position.x, global_point.z - global_position.z).length() \
			<= INTERACTION_RADIUS


func speak(text: String, duration := 8.0) -> void:
	if _speech == null:
		return
	last_spoken_text = _clean(text)
	_speech.text = _wrap(last_spoken_text, 43)
	_speech.visible = not last_spoken_text.is_empty()
	_speech_remaining = maxf(duration, 1.0)
	_time = 0.0
	spoke.emit(last_spoken_text)


func validate_contract() -> bool:
	return _model != null and _speech != null and _nameplate != null \
			and _nameplate.text.contains("SUGGESTION ONLY")


func _process(delta: float) -> void:
	_time += delta
	position.y = _base_y + sin(_time * 1.35) * 0.16
	if _speech_remaining > 0.0:
		_speech_remaining -= delta
		var pulse := 1.0 + sin(_time * 5.0) * 0.025
		_speech.scale = Vector3.ONE * pulse
		if _speech_remaining <= 0.0:
			_speech.visible = false
	if _player != null and _visual_anchor != null:
		var target := to_local(_player.global_position)
		var flat := Vector2(target.x - _visual_anchor.position.x, target.z - _visual_anchor.position.z)
		if flat.length_squared() > 0.01:
			var desired := atan2(flat.x, flat.y)
			_visual_anchor.rotation.y = lerp_angle(_visual_anchor.rotation.y, desired, delta * 2.2)


func _phase_color(value: int) -> Color:
	match value:
		1: return Color("ffae42")
		2: return Color("c87845")
		3: return Color("48dcff")
		4: return Color("9d77ff")
		5: return Color("667dff")
		6: return Color("ff4f9d")
		7: return Color("46e7a4")
	return Color("ffae42")


func _clean(value: String) -> String:
	return value.strip_edges().replace("\n", " ").replace("\r", " ").replace("\t", " ").left(240)


func _wrap(value: String, width: int) -> String:
	var words := value.split(" ", false)
	var lines: Array[String] = []
	var current := ""
	for word in words:
		var candidate := String(word) if current.is_empty() else "%s %s" % [current, word]
		if candidate.length() > width and not current.is_empty():
			lines.append(current)
			current = String(word)
		else:
			current = candidate
	if not current.is_empty():
		lines.append(current)
	return "\n".join(lines)
