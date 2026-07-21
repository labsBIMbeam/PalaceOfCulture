## Playable MoC vertical slice mounted in the public Palace.
## One workshop, one ship, one explicit action per phase; consequences alter module visibility.
class_name MocDemo
extends Node3D

const LoopScript := preload("res://scripts/moc/moc_loop.gd")
const AssemblyScript := preload("res://scripts/moc/leviathan_assembly.gd")
const HudScript := preload("res://scripts/ui/moc_loop_hud.gd")
const SessionStore := preload("res://scripts/moc/moc_session_store.gd")
const KerniScript := preload("res://scripts/moc/kerni_3d.gd")
const KerniAgentScript := preload("res://scripts/moc/kerni_world_agent.gd")
const KerniLiveClientScript := preload("res://scripts/moc/kerni_live_client.gd")
const SESSION_PATH := "user://moc_session.json"

const INTERACTION_RADIUS := 4.6
const WORKSHOP_RADIUS := 34.0
const CALLING_POINTS := {
	&"hearth": Vector3(-11, 0, 8),
	&"signal": Vector3(-4, 0, 13),
	&"garden": Vector3(4, 0, 13),
	&"nonsense": Vector3(11, 0, 8),
}
const CALLING_COLORS := {
	&"hearth": Color("ffae42"),
	&"signal": Color("48dcff"),
	&"garden": Color("46e7a4"),
	&"nonsense": Color("ff4f9d"),
}
const WORKBENCH_POINT := Vector3(-8, 0, 18)
const SOCKET_POINT := Vector3(0, 0, 18)
const ECHO_POINT := Vector3(8, 0, 18)
const KERNI_POINT := Vector3(-14, 1.2, 16)
const KERNI_PRESENT_KEYS := [
	"authority", "focus", "kind", "phase", "request_id", "source", "text", "tone",
]
const TRIAL_POINTS := [Vector3(-12, 0, 2), Vector3(0, 0, -3), Vector3(12, 0, 2)]
const CHORUS_POINTS := [Vector3(-7, 0, 10), Vector3(0, 0, 14), Vector3(7, 0, 10)]

var loop: MocLoop
var assembly: MocLeviathanAssembly
var hud: MocLoopHud
var kerni: Kerni3D
var world_agent: KerniWorldAgent
var kerni_live_client: KerniLiveClient
var player: CharacterBody3D
var _calling_nodes: Dictionary = {}
var _trial_lights: Array[OmniLight3D] = []
var _chorus_lights: Array[OmniLight3D] = []
var _storm_ribbons: Array[MeshInstance3D] = []
var _last_prompt := ""
var _persist_enabled := false
var _restored_session := false
var _pending_kerni_request := ""


func _init() -> void:
	name = "MeaningverseWorkshop"


func _ready() -> void:
	_build_stage()
	world_agent = KerniAgentScript.new()
	world_agent.name = "KerniWorldAgent"
	add_child(world_agent)
	if OS.get_cmdline_user_args().has("--kerni-live"):
		kerni_live_client = KerniLiveClientScript.new()
		kerni_live_client.name = "KerniLiveClient"
		kerni_live_client.response_received.connect(_on_live_kerni_response)
		add_child(kerni_live_client)
	kerni = KerniScript.new()
	kerni.position = KERNI_POINT
	add_child(kerni)
	assembly = AssemblyScript.new()
	assembly.position = Vector3(0, 7.2, 0)
	assembly.scale = Vector3.ONE * 0.52
	add_child(assembly)

	loop = LoopScript.new()
	add_child(loop)
	_persist_enabled = not OS.get_cmdline_user_args().has("--moc-capture") \
			and not OS.get_cmdline_user_args().has("--moc-kerni-capture") \
			and not OS.get_cmdline_user_args().has("--moc-fresh") \
			and not OS.get_cmdline_user_args().has("--smoke")
	if _persist_enabled:
		var saved := SessionStore.load_data(SESSION_PATH)
		if not saved.is_empty():
			_restored_session = loop.restore(saved)
	loop.phase_changed.connect(_on_phase_changed)
	loop.state_changed.connect(_on_state_changed)
	loop.module_committed.connect(_on_module_committed)

	hud = HudScript.new()
	add_child(hud)
	hud.attach(loop)

	var scale := 60.0 if "--moc-fast" in OS.get_cmdline_user_args() else 1.0
	if loop.phase != MocLoop.Phase.LEGACY:
		loop.start(scale)
	_on_state_changed(loop.snapshot())
	if _restored_session:
		_sync_visuals(loop.snapshot(), true)


func _exit_tree() -> void:
	if _persist_enabled and loop != null:
		SessionStore.save(SESSION_PATH, loop.to_data())


func attach_player(value: CharacterBody3D) -> void:
	player = value
	if kerni != null:
		kerni.attach_player(value)


func _process(_delta: float) -> void:
	if loop == null or hud == null:
		return
	var local_player := _player_local_position()
	var inside := player != null and Vector2(local_player.x, local_player.z).length() <= WORKSHOP_RADIUS
	var gameplay_input := DisplayServer.get_name() == "headless" \
			or Input.mouse_mode == Input.MOUSE_MODE_CAPTURED
	if not inside or not gameplay_input or Game.mode != Game.Mode.WALK or Game.world_input_blocked():
		_set_prompt("Walk to Leviathan · target: 30 assembly modules · real authors replace seeds")
		return
	_set_prompt(_context_prompt(local_player))
	if Input.is_action_just_pressed("interact"):
		if kerni != null and kerni.is_player_near(player.global_position):
			_ask_kerni()
			return
		_interact(local_player)
	if Input.is_action_just_pressed("moc_invite"):
		_invite()
	if Input.is_action_just_pressed("moc_remix"):
		_remix(local_player)
	if Input.is_action_just_pressed("moc_debug_advance") and OS.is_debug_build():
		loop.debug_skip_current_phase()


func _interact(local_player: Vector3) -> void:
	match loop.phase:
		MocLoop.Phase.ARRIVAL:
			loop.acknowledge_arrival()
			hud.flash("YOU ARRIVED AS A CONTRIBUTOR, NOT A USER.")
		MocLoop.Phase.CALLING:
			var chosen := _nearest_calling(local_player)
			if chosen == &"":
				hud.flash("Stand inside one calling light. There is no correct one.", Color("ffae42"))
			elif loop.choose_calling(chosen):
				hud.flash(String(MocLoop.CALLING_LABELS[chosen]), CALLING_COLORS[chosen])
		MocLoop.Phase.CREATE:
			if _near(local_player, WORKBENCH_POINT):
				var role: StringName = {
					&"hearth": &"habitat", &"signal": &"signal", &"garden": &"habitat", &"nonsense": &"structure",
				}.get(loop.calling, &"structure")
				var label := "%s / FIRST HANDMADE MODULE" % String(loop.calling).to_upper()
				if loop.create_draft(label, role):
					hud.flash("DRAFT EXISTS. IT IS NOT CULTURE UNTIL YOU PLACE IT.")
			else:
				hud.flash("Move to the copper workbench.", Color("ffae42"))
		MocLoop.Phase.PLACE:
			if _near(local_player, SOCKET_POINT) and loop.place_draft():
				hud.flash("THE WORLD CHANGED. SLOT 25 NOW CARRIES YOUR HAND.")
			else:
				hud.flash("Move to the open cyan socket.", Color("ffae42"))
		MocLoop.Phase.TRIAL:
			var trial_index := _nearest_unused(local_player, TRIAL_POINTS, loop.trial_actions)
			if trial_index >= 0 and loop.register_trial_action():
				_trial_lights[loop.trial_actions - 1].visible = true
				hud.flash("RIB %d HOLDS — BECAUSE SOMEONE STAYED." % loop.trial_actions)
			else:
				hud.flash("Reach the next failing rib.", Color("ffae42"))
		MocLoop.Phase.LAUNCH:
			var chorus_index := _nearest_unused(local_player, CHORUS_POINTS, loop.chorus_actions)
			if chorus_index >= 0 and loop.register_chorus_action():
				_chorus_lights[loop.chorus_actions - 1].visible = true
				if loop.chorus_actions == 3:
					assembly.animate_launch()
				hud.flash("VOICE %d / 3 — A LAUNCH IS A CHORUS." % loop.chorus_actions)
			else:
				hud.flash("Reach the next chorus point.", Color("ffae42"))


func _invite() -> void:
	var link := loop.create_invitation()
	if link.is_empty():
		hud.flash("Place your own work before asking someone else to continue it.", Color("ffae42"))
		return
	DisplayServer.clipboard_set(link)
	hud.flash("INVITE COPIED · NOSTR IS THE ROAD, NOT THE REASON TO WALK IT.")


func _remix(local_player: Vector3) -> void:
	if not _near(local_player, ECHO_POINT):
		hud.flash("Move to the violet echo chair.", Color("ffae42"))
		return
	if loop.continue_solo_without_peer():
		hud.flash("NO GHOST FRIEND INVENTED · SHIP CONTINUES VISIBLY INCOMPLETE.")
	else:
		hud.flash("Press I first. A real peer transport will fill the second chair.", Color("ffae42"))


func _on_module_committed(module: Dictionary) -> void:
	assembly.apply_occupied_slots(loop.occupied_slots())


func _ask_kerni() -> void:
	if world_agent == null or loop == null:
		return
	if kerni_live_client != null:
		var request := _open_external_kerni_request()
		if kerni_live_client.request_template(request):
			hud.flash("KERNI CONSULTS A ZERO-TOOL LOCAL SELECTOR…", Color("48dcff"))
			return
		world_agent.accept_external_proposal({}, int(loop.phase))
		_pending_kerni_request = ""
	var proposal := world_agent.request(loop.snapshot())
	_pending_kerni_request = String(proposal.get("request_id", ""))
	_present_kerni_proposal(proposal)


func _on_live_kerni_response(candidate: Dictionary) -> void:
	if candidate.is_empty():
		world_agent.accept_external_proposal({}, int(loop.phase))
		_pending_kerni_request = ""
		hud.flash("KERNI'S LOCAL LINE IS QUIET · PRESS E FOR AN OFFLINE THOUGHT", Color("ffae42"))
		return
	if not _accept_external_kerni_response(candidate):
		_pending_kerni_request = ""
		hud.flash("STALE OR INVALID KERNI REPLY DISCARDED", Color("ffae42"))


func _present_kerni_proposal(proposal: Dictionary) -> bool:
	if not _app_allows_kerni(proposal):
		_pending_kerni_request = ""
		return false
	_pending_kerni_request = ""  # consume before presentation; a proposal can speak once
	kerni.speak(String(proposal.text))
	hud.flash("KERNI SUGGESTS · YOU DECIDE", Color("ffae42"))
	return true


func _app_allows_kerni(proposal: Dictionary) -> bool:
	if kerni == null or loop == null or proposal.size() != KERNI_PRESENT_KEYS.size():
		return false
	for key in KERNI_PRESENT_KEYS:
		if not proposal.has(key):
			return false
	if typeof(proposal.authority) != TYPE_STRING or typeof(proposal.focus) != TYPE_STRING \
			or typeof(proposal.kind) != TYPE_STRING or typeof(proposal.phase) != TYPE_INT \
			or typeof(proposal.request_id) != TYPE_STRING or typeof(proposal.source) != TYPE_STRING \
			or typeof(proposal.text) != TYPE_STRING or typeof(proposal.tone) != TYPE_STRING:
		return false
	var text := String(proposal.text)
	return String(proposal.authority) == "suggestion_only" \
			and String(proposal.request_id) == _pending_kerni_request \
			and int(proposal.phase) == int(loop.phase) \
			and ["offline_policy", "fail_closed_fallback", "external_template"].has(String(proposal.source)) \
			and ["dialogue", "orientation", "acknowledgement"].has(String(proposal.kind)) \
			and String(proposal.tone) == "calm_practical" \
			and not text.is_empty() and text.length() <= 240


func _open_external_kerni_request() -> Dictionary:
	var request := world_agent.open_external_request(loop.snapshot())
	_pending_kerni_request = String(request.get("request_id", ""))
	return request


func _accept_external_kerni_response(candidate: Dictionary) -> bool:
	var proposal := world_agent.accept_external_proposal(candidate, int(loop.phase))
	return _present_kerni_proposal(proposal) if not proposal.is_empty() else false


func _on_state_changed(snapshot: Dictionary) -> void:
	if assembly != null:
		assembly.apply_occupied_slots(loop.occupied_slots())
	if kerni != null:
		kerni.set_phase(int(snapshot.phase))
	_sync_visuals(snapshot)
	if _persist_enabled:
		SessionStore.save(SESSION_PATH, loop.to_data())


func _on_phase_changed(next: MocLoop.Phase, _previous: MocLoop.Phase) -> void:
	_sync_visuals(loop.snapshot())
	if next == MocLoop.Phase.LAUNCH:
		hud.flash("TARGET 18–21 MIN · NO HERO BUTTON. FIND THREE VOICES.", Color("ff4f9d"))


func _sync_visuals(snapshot: Dictionary, restore_pose := false) -> void:
	var storm := int(snapshot.phase) == MocLoop.Phase.TRIAL
	for ribbon in _storm_ribbons:
		ribbon.visible = storm
	for index in _trial_lights.size():
		_trial_lights[index].visible = index < int(snapshot.trial_actions)
	for index in _chorus_lights.size():
		_chorus_lights[index].visible = index < int(snapshot.chorus_actions)
	if restore_pose and int(snapshot.phase) == MocLoop.Phase.LEGACY \
			and int(snapshot.chorus_actions) >= 3:
		assembly.set_launched_immediate()


func _context_prompt(local_player: Vector3) -> String:
	if kerni != null and player != null and kerni.is_player_near(player.global_position):
		return "E · ASK KERNI · SUGGESTION ONLY"
	match loop.phase:
		MocLoop.Phase.ARRIVAL: return "E · ENTER THE WORKSHOP"
		MocLoop.Phase.CALLING:
			var chosen := _nearest_calling(local_player)
			return "E · CHOOSE %s" % String(chosen).to_upper() if chosen != &"" else "Find one of four calling lights"
		MocLoop.Phase.CREATE: return "E · SHAPE MODULE" if _near(local_player, WORKBENCH_POINT) else "Copper workbench · CREATE"
		MocLoop.Phase.PLACE: return "E · PLACE VISIBLY" if _near(local_player, SOCKET_POINT) else "Cyan socket · PLACE"
		MocLoop.Phase.CO_CREATE: return "I · COPY INVITE   |   R · CONTINUE SOLO WITHOUT A GHOST FRIEND"
		MocLoop.Phase.TRIAL: return "E · HOLD NEXT FAILING RIB"
		MocLoop.Phase.LAUNCH: return "E · ADD YOUR VOICE TO THE CHORUS"
		MocLoop.Phase.LEGACY: return "Six sockets remain open. Bring people you do not control."
	return ""


func _build_stage() -> void:
	add_child(_disc(24.0, 0.35, Color("0b1020")))
	for radius: float in [18.0, 22.0]:
		var ring := _ring(radius, Color("48dcff"))
		ring.position.y = 0.24
		add_child(ring)

	for calling: StringName in CALLING_POINTS:
		var node := _station(String(calling).to_upper(), CALLING_POINTS[calling], CALLING_COLORS[calling], 1.5)
		_calling_nodes[calling] = node
		add_child(node)
	add_child(_station("CREATE", WORKBENCH_POINT, Color("c87845"), 1.8))
	add_child(_station("PLACE", SOCKET_POINT, Color("48dcff"), 1.8))
	add_child(_station("REMIX", ECHO_POINT, Color("9d77ff"), 1.8))

	for point in TRIAL_POINTS:
		var light := _beacon(point, Color("ffae42"), "HOLD")
		light.visible = false
		_trial_lights.append(light)
	for point in CHORUS_POINTS:
		var light := _beacon(point, Color("ff4f9d"), "VOICE")
		light.visible = false
		_chorus_lights.append(light)

	var storm_mat := StandardMaterial3D.new()
	storm_mat.albedo_color = Color("3d4f87")
	storm_mat.emission_enabled = true
	storm_mat.emission = Color("667dff")
	storm_mat.emission_energy_multiplier = 1.8
	for index in 12:
		var ribbon := MeshInstance3D.new()
		var mesh := BoxMesh.new()
		mesh.size = Vector3(0.08, 14.0, 0.18)
		ribbon.mesh = mesh
		var angle := TAU * float(index) / 12.0
		ribbon.position = Vector3(cos(angle) * 20.0, 7.0, sin(angle) * 20.0)
		ribbon.rotation.z = angle * 0.16
		ribbon.material_override = storm_mat
		ribbon.visible = false
		add_child(ribbon)
		_storm_ribbons.append(ribbon)

	var key := OmniLight3D.new()
	key.position = Vector3(-10, 17, 12)
	key.light_color = Color("ff9b63")
	key.light_energy = 10.0
	key.omni_range = 45.0
	add_child(key)
	var rim := OmniLight3D.new()
	rim.position = Vector3(12, 13, -10)
	rim.light_color = Color("48dcff")
	rim.light_energy = 14.0
	rim.omni_range = 45.0
	add_child(rim)


func _station(label_text: String, point: Vector3, color: Color, radius: float) -> Node3D:
	var station := Node3D.new()
	station.name = "%sStation" % label_text.capitalize()
	station.position = point
	station.add_child(_disc(radius, 0.22, color.darkened(0.55)))
	var halo := _ring(radius * 0.82, color)
	halo.position.y = 0.18
	station.add_child(halo)
	var label := Label3D.new()
	label.text = label_text
	label.position.y = 2.0
	label.font_size = 32
	label.outline_size = 8
	label.modulate = color
	label.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	station.add_child(label)
	return station


func _beacon(point: Vector3, color: Color, label_text: String) -> OmniLight3D:
	var station := _station(label_text, point, color, 1.0)
	add_child(station)
	var light := OmniLight3D.new()
	light.position = point + Vector3(0, 1.0, 0)
	light.light_color = color
	light.light_energy = 8.0
	light.omni_range = 8.0
	add_child(light)
	return light


func _disc(radius: float, height: float, color: Color) -> MeshInstance3D:
	var mesh := CylinderMesh.new()
	mesh.top_radius = radius
	mesh.bottom_radius = radius
	mesh.height = height
	mesh.radial_segments = 48
	var node := MeshInstance3D.new()
	node.mesh = mesh
	node.position.y = height / 2.0
	node.material_override = Catalog.make_material(color)
	return node


func _ring(radius: float, color: Color) -> MeshInstance3D:
	var mesh := TorusMesh.new()
	mesh.inner_radius = radius - 0.08
	mesh.outer_radius = radius + 0.08
	mesh.rings = 64
	mesh.ring_segments = 8
	var mat := StandardMaterial3D.new()
	mat.albedo_color = color
	mat.emission_enabled = true
	mat.emission = color
	mat.emission_energy_multiplier = 3.0
	var node := MeshInstance3D.new()
	node.mesh = mesh
	node.material_override = mat
	return node


func _player_local_position() -> Vector3:
	return to_local(player.global_position) if player != null else Vector3(9999, 0, 9999)


func _near(value: Vector3, point: Vector3) -> bool:
	return Vector2(value.x - point.x, value.z - point.z).length() <= INTERACTION_RADIUS


func _nearest_calling(value: Vector3) -> StringName:
	var nearest: StringName = &""
	var distance := INTERACTION_RADIUS
	for calling: StringName in CALLING_POINTS:
		var point: Vector3 = CALLING_POINTS[calling]
		var current := Vector2(value.x - point.x, value.z - point.z).length()
		if current <= distance:
			distance = current
			nearest = calling
	return nearest


func _nearest_unused(value: Vector3, points: Array, completed: int) -> int:
	if completed < 0 or completed >= points.size():
		return -1
	return completed if _near(value, points[completed]) else -1


func _set_prompt(value: String) -> void:
	if value == _last_prompt:
		return
	_last_prompt = value
	hud.set_prompt(value)
