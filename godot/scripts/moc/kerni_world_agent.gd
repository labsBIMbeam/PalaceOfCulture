## Suggestion-only embodied world-agent policy for the offline demo.
## It receives copied state only and has no MocLoop/world mutation reference.
class_name KerniWorldAgent
extends Node

const AUTHORITY := "suggestion_only"
const REQUEST_TTL_MSEC := 10_000
const CANONICAL_KEYS := [
	"authority", "focus", "kind", "phase", "request_id", "source", "text", "tone",
]
const EXTERNAL_KEYS := ["authority", "phase", "request_id", "template_id"]
const ALLOWED_KINDS := ["dialogue", "orientation", "acknowledgement"]
const ALLOWED_FOCUS := [
	"Kerni", "calling_lights", "workbench", "open_socket", "echo_chair",
	"next_trial_rib", "next_chorus_light", "leviathan",
]
const ALLOWED_SOURCES := ["offline_policy", "fail_closed_fallback", "external_template"]
const PHASE_TEMPLATES := {
	0: ["welcome", "least_dangerous_opinion"],
	1: ["observe_calling", "no_correct_class"],
	2: ["suggest_small_start", "anti_masterpiece"],
	3: ["place_choice", "draft_not_destiny"],
	4: ["respect_empty_chair", "ghost_friend_detector"],
	5: ["point_next_rib", "copper_drama"],
	6: ["seek_chorus", "anti_hero_button"],
	7: ["honest_legacy", "chair_audit"],
}

var last_proposal: Dictionary = {}
var _serial := 0
var _ask_count := 0
var _pending_external: Dictionary = {}


## Offline release path. Returns data only; the application independently authorizes presentation.
func request(snapshot: Dictionary) -> Dictionary:
	var phase := _snapshot_phase(snapshot)
	var proposal := _build(phase, _next_request_id(), "offline_policy")
	if not validate(proposal):
		proposal = _safe_fallback(phase, _next_request_id())
	last_proposal = proposal.duplicate(true)
	_ask_count += 1
	return last_proposal.duplicate(true)


## Optional future adapter: opens one short-lived, phase-bound template request.
func open_external_request(snapshot: Dictionary) -> Dictionary:
	var phase := _snapshot_phase(snapshot)
	var request_id := _next_request_id()
	_pending_external = {
		"request_id": request_id,
		"phase": phase,
		"expires_at": Time.get_ticks_msec() + REQUEST_TTL_MSEC,
	}
	return {
		"request_id": request_id,
		"phase": phase,
		"allowed_templates": (PHASE_TEMPLATES[phase] as Array).duplicate(),
	}


## External sources choose a canonical template; arbitrary prose/metadata is never embodied.
func accept_external_proposal(candidate: Dictionary, current_phase: int) -> Dictionary:
	if _pending_external.is_empty():
		return {}
	var pending := _pending_external.duplicate(true)
	_pending_external.clear()  # every response attempt consumes the capability
	if Time.get_ticks_msec() > int(pending.expires_at) or current_phase != int(pending.phase):
		return {}
	if not _keys_exact(candidate, EXTERNAL_KEYS):
		return {}
	if typeof(candidate.request_id) != TYPE_STRING or typeof(candidate.phase) != TYPE_INT \
			or typeof(candidate.template_id) != TYPE_STRING or typeof(candidate.authority) != TYPE_STRING:
		return {}
	if String(candidate.request_id) != String(pending.request_id) \
			or int(candidate.phase) != int(pending.phase) or String(candidate.authority) != AUTHORITY \
			or not (PHASE_TEMPLATES[int(pending.phase)] as Array).has(String(candidate.template_id)):
		return {}
	var proposal := _build(int(pending.phase), String(pending.request_id), "external_template",
			String(candidate.template_id))
	if not validate(proposal):
		return {}
	last_proposal = proposal.duplicate(true)
	return last_proposal.duplicate(true)


func validate(proposal: Dictionary) -> bool:
	if not _keys_exact(proposal, CANONICAL_KEYS):
		return false
	if typeof(proposal.authority) != TYPE_STRING or typeof(proposal.focus) != TYPE_STRING \
			or typeof(proposal.kind) != TYPE_STRING or typeof(proposal.phase) != TYPE_INT \
			or typeof(proposal.request_id) != TYPE_STRING or typeof(proposal.source) != TYPE_STRING \
			or typeof(proposal.text) != TYPE_STRING or typeof(proposal.tone) != TYPE_STRING:
		return false
	var text := String(proposal.text)
	if String(proposal.authority) != AUTHORITY or not ALLOWED_KINDS.has(String(proposal.kind)) \
			or not ALLOWED_FOCUS.has(String(proposal.focus)) \
			or not ALLOWED_SOURCES.has(String(proposal.source)) \
			or String(proposal.tone) != "calm_practical" \
			or int(proposal.phase) < 0 or int(proposal.phase) > 7 \
			or not _valid_request_id(String(proposal.request_id)) \
			or text.is_empty() or text.length() > 240 or _has_control_chars(text):
		return false
	return true


func contract() -> Dictionary:
	return {
		"identity": "Kerni",
		"authority": AUTHORITY,
		"can_suggest": true,
		"can_commit": false,
		"can_transition": false,
		"can_publish": false,
		"can_claim_peer_identity": false,
		"external_text": false,
	}


func _build(phase: int, request_id: String, source: String, template_id := "") -> Dictionary:
	var line := _line_for_template(phase, template_id) if not template_id.is_empty() else _line_for_phase(phase)
	if source == "offline_policy" and phase == 0 and _ask_count > 0:
		line = {
			"kind": "orientation",
			"text": "Still no rush. Look around before choosing. I will not turn your attention into a task list.",
			"focus": "calling_lights",
		}
	return {
		"kind": String(line.kind),
		"text": String(line.text),
		"focus": String(line.focus),
		"tone": "calm_practical",
		"phase": phase,
		"authority": AUTHORITY,
		"source": source,
		"request_id": request_id,
	}


func _line_for_phase(phase: int) -> Dictionary:
	match phase:
		0: return {"kind": "orientation", "text": "Welcome. No rush — the Palace gets better when people leave something useful behind. Start with one small thing.", "focus": "calling_lights"}
		1: return {"kind": "dialogue", "text": "Four lights, no correct class. I can explain them; I cannot choose for you.", "focus": "calling_lights"}
		2: return {"kind": "dialogue", "text": "Make the smallest form that still feels like yours. I can suggest; your hand decides.", "focus": "workbench"}
		3: return {"kind": "dialogue", "text": "A draft is still private. Place it only when you want the world to remember it.", "focus": "open_socket"}
		4: return {"kind": "dialogue", "text": "I can carry an invitation. I cannot invent who answered it. An empty chair stays honestly empty.", "focus": "echo_chair"}
		5: return {"kind": "acknowledgement", "text": "The next copper rib is failing. I can point to it; only someone present can hold it.", "focus": "next_trial_rib"}
		6: return {"kind": "dialogue", "text": "A launch is three voices, not one heroic button. Find the next chorus light.", "focus": "next_chorus_light"}
		7: return {"kind": "acknowledgement", "text": "The ship keeps one honest empty chair. That is better than a ghost.", "focus": "leviathan"}
	return {"kind": "dialogue", "text": "I can offer context, not permission. The next action is still yours.", "focus": "Kerni"}


func _line_for_template(phase: int, template_id: String) -> Dictionary:
	match template_id:
		"welcome": return _line_for_phase(0)
		"least_dangerous_opinion": return {"kind": "orientation", "text": "I am Kerni: the workshop's least dangerous floating opinion. Ask for context; keep your own steering wheel.", "focus": "Kerni"}
		"observe_calling": return _line_for_phase(1)
		"no_correct_class": return {"kind": "dialogue", "text": "Four callings. Zero personality tests. Pick the light that bothers you productively.", "focus": "calling_lights"}
		"suggest_small_start": return _line_for_phase(2)
		"anti_masterpiece": return {"kind": "dialogue", "text": "Please do not begin with a masterpiece. Begin with a part someone can actually touch.", "focus": "workbench"}
		"place_choice": return _line_for_phase(3)
		"draft_not_destiny": return {"kind": "dialogue", "text": "A draft is not destiny. The cyan socket only remembers what you deliberately place.", "focus": "open_socket"}
		"respect_empty_chair": return _line_for_phase(4)
		"ghost_friend_detector": return {"kind": "dialogue", "text": "Ghost-friend detector reports zero humans. Excellent: the empty chair remains honest.", "focus": "echo_chair"}
		"point_next_rib": return _line_for_phase(5)
		"copper_drama": return {"kind": "acknowledgement", "text": "That copper rib is performing structural drama. I can point; present hands do the holding.", "focus": "next_trial_rib"}
		"seek_chorus": return _line_for_phase(6)
		"anti_hero_button": return {"kind": "dialogue", "text": "Hero button not found. Good. This ship launches when three voices make the button unnecessary.", "focus": "next_chorus_light"}
		"honest_legacy": return _line_for_phase(7)
		"chair_audit": return {"kind": "acknowledgement", "text": "Final chair audit: one empty, zero imaginary colleagues, dignity intact.", "focus": "leviathan"}
	return _line_for_phase(phase)


func _safe_fallback(phase: int, request_id: String) -> Dictionary:
	return {
		"kind": "dialogue",
		"text": "I can offer context, not permission. The next action is still yours.",
		"focus": "Kerni",
		"tone": "calm_practical",
		"phase": clampi(phase, 0, 7),
		"authority": AUTHORITY,
		"source": "fail_closed_fallback",
		"request_id": request_id,
	}


func _snapshot_phase(snapshot: Dictionary) -> int:
	if snapshot.has("phase") and typeof(snapshot.phase) == TYPE_INT:
		return clampi(int(snapshot.phase), 0, 7)
	return 0


func _next_request_id() -> String:
	_serial += 1
	return "kerni-%d-%d" % [Time.get_ticks_msec(), _serial]


func _keys_exact(value: Dictionary, expected: Array) -> bool:
	if value.size() != expected.size():
		return false
	for key in expected:
		if not value.has(key):
			return false
	return true


func _valid_request_id(value: String) -> bool:
	if value.is_empty() or value.length() > 64:
		return false
	for character in value:
		if not (character.is_valid_int() or character.to_lower() != character.to_upper() or character == "-"):
			return false
	return true


func _has_control_chars(value: String) -> bool:
	for character in value:
		if character.unicode_at(0) < 32 or character.unicode_at(0) == 127:
			return true
	return false
