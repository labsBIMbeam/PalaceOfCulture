## Portable 21-minute Meaningverse contract. No rendering, networking or engine-world authority lives here.
## Humans explicitly choose, draft, place, invite and remix; assistants may suggest strings only.
class_name MocLoop
extends Node

signal phase_changed(phase: Phase, previous: Phase)
signal state_changed(snapshot: Dictionary)
signal module_committed(module: Dictionary)
signal legacy_revealed(legacy: Dictionary)

enum Phase { ARRIVAL, CALLING, CREATE, PLACE, CO_CREATE, TRIAL, LAUNCH, LEGACY }

const TOTAL_SECONDS := 21.0 * 60.0
const PHASE_DURATIONS := {
	Phase.ARRIVAL: 2.0 * 60.0,
	Phase.CALLING: 2.0 * 60.0,
	Phase.CREATE: 4.0 * 60.0,
	Phase.PLACE: 2.0 * 60.0,
	Phase.CO_CREATE: 5.0 * 60.0,
	Phase.TRIAL: 3.0 * 60.0,
	Phase.LAUNCH: 3.0 * 60.0,
}
const CALLINGS := [&"hearth", &"signal", &"garden", &"nonsense"]
const ROLES := [&"structure", &"energy", &"habitat", &"signal"]
const CALLING_LABELS := {
	&"hearth": "HEARTH — make a place worth returning to",
	&"signal": "SIGNAL — send something unmistakably yours",
	&"garden": "GARDEN — leave life where there was only structure",
	&"nonsense": "NONSENSE — break the adult idea before it becomes a rule",
}
const BASELINE_MODULES := 24
const TUESDAY_MODULE_TARGET := 30
const SAVE_KEYS := [
	"calling", "chorus_actions", "draft", "elapsed_seconds", "invitation", "modules",
	"omissions", "phase", "phase_elapsed_seconds", "trial_actions",
]
const DRAFT_KEYS := ["author", "calling", "human_confirmed", "label", "role"]
const MODULE_KEYS := ["author", "calling", "human_confirmed", "label", "origin", "role", "slot"]

var phase := Phase.ARRIVAL
var elapsed_seconds := 0.0
var phase_elapsed_seconds := 0.0
var time_scale := 1.0
var running := false
var calling: StringName = &""
var draft: Dictionary = {}
var _committed_modules: Array[Dictionary] = []
var invitation := ""
var trial_actions := 0
var chorus_actions := 0
var omissions: Array[String] = []
var _legacy: Dictionary = {}


func _process(delta: float) -> void:
	if running:
		advance(delta * time_scale)


func start(scale: float = 1.0) -> void:
	time_scale = maxf(scale, 0.001)
	running = true
	state_changed.emit(snapshot())


## Records session pace only. Time never grants, blocks or skips a cultural action.
func advance(seconds: float) -> void:
	var step := maxf(seconds, 0.0)
	phase_elapsed_seconds += step
	elapsed_seconds += step


## Arrival is the only free acknowledgement. Every later transition is owned by its guarded action.
func acknowledge_arrival() -> bool:
	if phase != Phase.ARRIVAL:
		return false
	_advance_after_action()
	return true


func debug_skip_current_phase() -> bool:
	if not OS.is_debug_build() or phase == Phase.LEGACY:
		return false
	_close_phase()
	_advance_after_action()
	return true


func choose_calling(value: StringName) -> bool:
	if phase != Phase.CALLING or not CALLINGS.has(value):
		return false
	calling = value
	_advance_after_action()
	return true


func create_draft(label: String, role: StringName) -> bool:
	if phase != Phase.CREATE or calling == &"" or not ROLES.has(role):
		return false
	var clean := _clean_label(label)
	if clean.is_empty():
		return false
	draft = {
		"label": clean,
		"role": role,
		"calling": calling,
		"author": "local-contributor",
		"human_confirmed": false,
	}
	_advance_after_action()
	return true


func place_draft() -> bool:
	if phase != Phase.PLACE or draft.is_empty() or not _committed_modules.is_empty():
		return false
	var placed := draft.duplicate(true)
	placed["slot"] = BASELINE_MODULES + 1
	placed["human_confirmed"] = true
	placed["origin"] = "created"
	_committed_modules.append(placed)
	draft.clear()
	module_committed.emit(placed.duplicate(true))
	_advance_after_action()
	return true


func committed_modules_snapshot() -> Array[Dictionary]:
	return _confirmed_local_modules()


func create_invitation() -> String:
	if phase < Phase.CO_CREATE or _committed_modules.is_empty():
		return ""
	if invitation.is_empty():
		invitation = _expected_invitation(String(_committed_modules[0].label))
		state_changed.emit(snapshot())
	return invitation


## Slot 26 is intentionally unreachable until a real receive-side peer transport supplies provenance.
## Do not reintroduce a caller-supplied `transport_confirmed` boolean here.


## Solo may continue, but it never fabricates a friend or awards the co-created module.
func continue_solo_without_peer() -> bool:
	if phase != Phase.CO_CREATE or invitation.is_empty() or _committed_modules.size() != 1:
		return false
	omissions.append("The second chair stayed honestly empty; no ghost contributor was invented.")
	_advance_after_action()
	return true


func register_trial_action() -> bool:
	if phase != Phase.TRIAL or trial_actions >= 3:
		return false
	trial_actions += 1
	state_changed.emit(snapshot())
	if trial_actions == 3:
		_advance_after_action()
	return true


func register_chorus_action() -> bool:
	if phase != Phase.LAUNCH or chorus_actions >= 3:
		return false
	chorus_actions += 1
	state_changed.emit(snapshot())
	if chorus_actions == 3:
		_advance_after_action()
	return true


func to_data() -> Dictionary:
	return {
		"phase": phase,
		"elapsed_seconds": elapsed_seconds,
		"phase_elapsed_seconds": phase_elapsed_seconds,
		"calling": String(calling),
		"draft": draft.duplicate(true),
		"modules": _confirmed_local_modules(),
		"invitation": invitation,
		"trial_actions": trial_actions,
		"chorus_actions": chorus_actions,
		"omissions": omissions.duplicate(),
	}


func restore(data: Dictionary) -> bool:
	if not _keys_exact(data, SAVE_KEYS) \
			or not _is_json_int(data.phase) or not _is_number(data.elapsed_seconds) \
			or not _is_number(data.phase_elapsed_seconds) or typeof(data.calling) != TYPE_STRING \
			or typeof(data.draft) != TYPE_DICTIONARY or typeof(data.modules) != TYPE_ARRAY \
			or typeof(data.invitation) != TYPE_STRING or not _is_json_int(data.trial_actions) \
			or not _is_json_int(data.chorus_actions) or typeof(data.omissions) != TYPE_ARRAY:
		return false
	var restored_phase := int(data.phase)
	if not Phase.values().has(restored_phase):
		return false
	var restored_calling := StringName(String(data.calling))
	if restored_calling != &"" and not CALLINGS.has(restored_calling):
		return false
	var raw_draft: Dictionary = data.draft
	var raw_modules: Array = data.modules
	var raw_omissions: Array = data.omissions
	var restored_invitation := String(data.invitation)
	if restored_invitation.length() > 512 or raw_modules.size() > 1:
		return false
	var restored_draft := raw_draft.duplicate(true)
	if not restored_draft.is_empty() and not _valid_draft(restored_draft, restored_calling):
		return false
	var restored_modules: Array[Dictionary] = []
	for raw: Variant in raw_modules:
		if typeof(raw) != TYPE_DICTIONARY:
			return false
		var module := raw as Dictionary
		if not _valid_local_module(module, restored_calling):
			return false
		restored_modules.append(module.duplicate(true))
	var restored_trial := int(data.trial_actions)
	var restored_chorus := int(data.chorus_actions)
	if restored_trial < 0 or restored_trial > 3 or restored_chorus < 0 or restored_chorus > 3:
		return false
	if not restored_invitation.is_empty() and (restored_modules.is_empty() \
			or restored_invitation != _expected_invitation(String(restored_modules[0].label))):
		return false
	if float(data.elapsed_seconds) < 0.0 or float(data.phase_elapsed_seconds) < 0.0:
		return false
	var restored_omissions: Array[String] = []
	for raw_omission: Variant in raw_omissions:
		if typeof(raw_omission) != TYPE_STRING:
			return false
		var clean_omission := _clean_note(String(raw_omission))
		if clean_omission.is_empty() or clean_omission != String(raw_omission):
			return false
		restored_omissions.append(clean_omission)
	if not _restored_state_valid(
		restored_phase as Phase, restored_calling, restored_draft, restored_modules,
		restored_invitation, restored_trial, restored_chorus,
	):
		return false
	phase = restored_phase as Phase
	elapsed_seconds = float(data.elapsed_seconds)
	phase_elapsed_seconds = float(data.phase_elapsed_seconds)
	calling = restored_calling
	draft = restored_draft
	_committed_modules = restored_modules
	invitation = restored_invitation
	trial_actions = restored_trial
	chorus_actions = restored_chorus
	omissions = restored_omissions
	running = phase != Phase.LEGACY
	_legacy = _build_legacy() if phase == Phase.LEGACY else {}
	state_changed.emit(snapshot())
	return true


func phase_name(value: Phase = phase) -> String:
	return Phase.keys()[value].capitalize()


func objective() -> String:
	match phase:
		Phase.ARRIVAL: return "Reach the Leviathan workshop. E acknowledges arrival."
		Phase.CALLING: return "Stand by a calling marker and press E. No class. No correct answer."
		Phase.CREATE: return "Press E at the workbench. Make one module unmistakably yours."
		Phase.PLACE: return "Press E at the open socket. The world must visibly change."
		Phase.CO_CREATE: return "Press I to invite. A real peer may remix; R continues solo without fake presence."
		Phase.TRIAL: return "Press E three times to hold the ship together through the storm."
		Phase.LAUNCH: return "Press E three times. A launch is a chorus, not a button."
		Phase.LEGACY: return String(_legacy.get("line", "The world remembers what happened here."))
	return ""


func total_remaining_seconds() -> float:
	return maxf(0.0, TOTAL_SECONDS - elapsed_seconds)


func visible_module_count() -> int:
	return occupied_slots().size()


func occupied_slots() -> Array[int]:
	var slots: Array[int] = []
	for slot in range(1, BASELINE_MODULES + 1):
		slots.append(slot)
	if not _confirmed_local_modules().is_empty():
		slots.append(25)
	for index in trial_actions:
		slots.append(27 + index)
	if chorus_actions >= 3:
		slots.append(30)
	return slots


func snapshot() -> Dictionary:
	return {
		"phase": phase,
		"phase_name": phase_name(),
		"elapsed_seconds": elapsed_seconds,
		"remaining_seconds": total_remaining_seconds(),
		"objective": objective(),
		"calling": calling,
		"draft": draft.duplicate(true),
		"modules": _confirmed_local_modules(),
		"visible_modules": visible_module_count(),
		"occupied_slots": occupied_slots(),
		"invited": not invitation.is_empty(),
		"co_created": false,
		"trial_actions": trial_actions,
		"chorus_actions": chorus_actions,
		"omissions": omissions.duplicate(),
		"legacy": _legacy.duplicate(true),
	}


func _close_phase() -> void:
	match phase:
		Phase.ARRIVAL:
			pass  # arriving late is not moral failure
		Phase.CALLING:
			if calling == &"": omissions.append("You let the adults choose the tone by default.")
		Phase.CREATE:
			if draft.is_empty() and _committed_modules.is_empty(): omissions.append("The workbench stayed clean.")
		Phase.PLACE:
			if _committed_modules.is_empty(): omissions.append("Nothing of yours became visible.")
		Phase.CO_CREATE:
			if _committed_modules.size() < 2: omissions.append("The empty second chair remained empty.")
		Phase.TRIAL:
			if trial_actions < 3: omissions.append("Some hands never reached the failing ribs.")
		Phase.LAUNCH:
			if chorus_actions < 3: omissions.append("The launch heard fewer voices than it needed.")


func _advance_after_action() -> void:
	if phase != Phase.LEGACY:
		_transition_to((phase + 1) as Phase)


func _transition_to(next: Phase) -> void:
	var previous := phase
	phase = next
	phase_elapsed_seconds = 0.0
	if phase == Phase.LEGACY:
		running = false
		_legacy = _build_legacy()
		legacy_revealed.emit(_legacy.duplicate(true))
	phase_changed.emit(phase, previous)
	state_changed.emit(snapshot())


func _build_legacy() -> Dictionary:
	var score := _confirmed_local_modules().size() * 2 + trial_actions + chorus_actions
	var line: String
	if score >= 10:
		line = "THE ARK LIFTS — NOT COMPLETE, BUT ALIVE WITH OTHER PEOPLE'S HANDS."
	elif score >= 5:
		line = "THE ARK HOLDS. SIX OPEN SOCKETS WAIT FOR PEOPLE YOU DO NOT CONTROL."
	else:
		line = "THE ARK REMAINS. THE EMPTY PLACES ARE ALSO YOUR STORY."
	return {
		"line": line,
		"score": score,
		"calling": calling,
		"modules": visible_module_count(),
		"omissions": omissions.duplicate(),
	}


func _confirmed_local_modules() -> Array[Dictionary]:
	var confirmed: Array[Dictionary] = []
	if not _committed_modules.is_empty() and _valid_local_module(_committed_modules[0], calling):
		confirmed.append(_committed_modules[0].duplicate(true))
	return confirmed


func _valid_draft(value: Dictionary, expected_calling: StringName) -> bool:
	if not _keys_exact(value, DRAFT_KEYS) \
			or typeof(value.author) != TYPE_STRING or typeof(value.label) != TYPE_STRING \
			or not [TYPE_STRING, TYPE_STRING_NAME].has(typeof(value.role)) \
			or not [TYPE_STRING, TYPE_STRING_NAME].has(typeof(value.calling)) \
			or typeof(value.human_confirmed) != TYPE_BOOL:
		return false
	var label := String(value.label)
	return String(value.author) == "local-contributor" and not bool(value.human_confirmed) \
			and not label.is_empty() and label == _clean_label(label) \
			and ROLES.has(StringName(String(value.role))) \
			and StringName(String(value.calling)) == expected_calling


func _valid_local_module(value: Dictionary, expected_calling: StringName) -> bool:
	if not _keys_exact(value, MODULE_KEYS) \
			or typeof(value.author) != TYPE_STRING or typeof(value.label) != TYPE_STRING \
			or not [TYPE_STRING, TYPE_STRING_NAME].has(typeof(value.role)) \
			or not [TYPE_STRING, TYPE_STRING_NAME].has(typeof(value.calling)) \
			or typeof(value.human_confirmed) != TYPE_BOOL or not _is_json_int(value.slot) \
			or typeof(value.origin) != TYPE_STRING:
		return false
	var label := String(value.label)
	return String(value.author) == "local-contributor" and bool(value.human_confirmed) \
			and not label.is_empty() and label == _clean_label(label) \
			and ROLES.has(StringName(String(value.role))) \
			and StringName(String(value.calling)) == expected_calling \
			and int(value.slot) == BASELINE_MODULES + 1 and String(value.origin) == "created"


func _keys_exact(value: Dictionary, expected: Array) -> bool:
	if value.size() != expected.size():
		return false
	for key in expected:
		if not value.has(key):
			return false
	return true


func _is_number(value: Variant) -> bool:
	return [TYPE_INT, TYPE_FLOAT].has(typeof(value)) and is_finite(float(value))


func _is_json_int(value: Variant) -> bool:
	return _is_number(value) and is_equal_approx(float(value), roundf(float(value)))


func _restored_state_valid(
		restored_phase: Phase,
		restored_calling: StringName,
		restored_draft: Dictionary,
		restored_modules: Array[Dictionary],
		restored_invitation: String,
		restored_trial: int,
		restored_chorus: int,
) -> bool:
	var no_actions := restored_trial == 0 and restored_chorus == 0
	match restored_phase:
		Phase.ARRIVAL, Phase.CALLING:
			return restored_calling == &"" and restored_draft.is_empty() \
					and restored_modules.is_empty() and restored_invitation.is_empty() and no_actions
		Phase.CREATE:
			return restored_calling != &"" and restored_draft.is_empty() \
					and restored_modules.is_empty() and restored_invitation.is_empty() and no_actions
		Phase.PLACE:
			return restored_calling != &"" and not restored_draft.is_empty() \
					and restored_modules.is_empty() and restored_invitation.is_empty() and no_actions
		Phase.CO_CREATE:
			return restored_calling != &"" and restored_draft.is_empty() \
					and restored_modules.size() == 1 and no_actions
		Phase.TRIAL:
			return restored_calling != &"" and restored_draft.is_empty() \
					and restored_modules.size() == 1 and not restored_invitation.is_empty() \
					and restored_trial < 3 and restored_chorus == 0
		Phase.LAUNCH:
			return restored_calling != &"" and restored_draft.is_empty() \
					and restored_modules.size() == 1 and not restored_invitation.is_empty() \
					and restored_trial == 3 and restored_chorus < 3
		Phase.LEGACY:
			return restored_calling != &"" and restored_draft.is_empty() \
					and restored_modules.size() == 1 and not restored_invitation.is_empty() \
					and restored_trial == 3 and restored_chorus == 3
	return false


func _expected_invitation(label: String) -> String:
	return "nostr:meaningverse?world=street&work=%s&action=remix" % label.uri_encode()


func _clean_label(value: String) -> String:
	var clean := value.strip_edges().replace("\n", " ").replace("\r", " ").replace("	", " ")
	while "  " in clean:
		clean = clean.replace("  ", " ")
	return clean.left(48)


func _clean_note(value: String) -> String:
	var clean := value.strip_edges().replace("\n", " ").replace("\r", " ").replace("	", " ")
	while "  " in clean:
		clean = clean.replace("  ", " ")
	return clean.left(240)
