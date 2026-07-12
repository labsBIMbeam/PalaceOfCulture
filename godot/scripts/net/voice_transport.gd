extends Node
## Voice transport — central (non-positional) voice for the in-world voice dock.
##
## Decision (ADR 0002): characters don't collide and voice is room-scoped, so there is NO
## spatial-audio math — by design the simplest possible voice. Plug-and-play first (this
## node is a mock with no audio), then migrate the implementation behind this same
## interface:
##   1) LiveKit (Apache-2.0) — self-hosted SFU room; "everyone in the palace hears
##      everyone". The boring, ships-today pick: room.connect(url, token) + publish the
##      mic track.
##   2) MoQ (Media over QUIC, @kixelated/moq) — room-scoped `audio.pcm` + `speaking.json`
##      tracks keyed by npub, the same transport that will carry presence (the innpub
##      pattern).
## Real SFU backends (ADR 0005: LiveKit default, HiveTalk as separate self-hosted
## SERVICE — never linked into this MIT client) drop in behind this same node: same
## signal, same methods, the dock never changes.
##
## State dictionary shape (mirrors the web `VoiceState`):
##   {status: "off"|"connecting"|"live", muted: bool, speakers: Array[String]}

signal state_changed(state: Dictionary)

const CONNECT_DELAY_SEC := 0.7
const CHATTER_INTERVAL_SEC := 3.0
const NEIGHBOUR_CHANCE := 0.4
const NEIGHBOUR_HANDLE := "Wren"

## Handle shown for ourselves in the speakers list (later: npub → profile).
var local_handle := "You"

var _state := {"status": "off", "muted": false, "speakers": []}
var _connect_timer: Timer
var _chatter_timer: Timer


func _init() -> void:
	name = "VoiceTransport"


## Snapshot of the current state; safe to keep (deep copy).
func get_state() -> Dictionary:
	return _state.duplicate(true)


## Join the room voice: "connecting" now, "live" after a simulated handshake.
func connect_voice() -> void:
	if String(_state.status) != "off":
		return
	_ensure_timers()
	_patch({"status": "connecting"})
	_connect_timer.start(CONNECT_DELAY_SEC)


## Leave the room voice (also cancels a pending connect).
func disconnect_voice() -> void:
	_stop_timers()
	_patch({"status": "off", "speakers": []})


## Mute/unmute the (simulated) mic. Muting drops us from the speakers list at once;
## unmuting waits for the next chatter tick to re-add us (web-mock parity).
func set_muted(muted: bool) -> void:
	var speakers: Array = (_state.speakers as Array).duplicate()
	if muted:
		speakers.erase(local_handle)
	_patch({"muted": muted, "speakers": speakers})


func _on_connected() -> void:
	# LiveKit: await room.connect(url, token); publish the mic track here.
	# MoQ: subscribe("<ns>/audio.pcm") and publish our own PCM track here.
	var own: Array = [] if bool(_state.muted) else [local_handle]
	_patch({"status": "live", "speakers": own})
	_chatter_timer.start(CHATTER_INTERVAL_SEC)


## Simulated room chatter: our own handle (unless muted) + a 40% chance neighbour.
func _on_chatter_tick() -> void:
	var speakers: Array = [] if bool(_state.muted) else [local_handle]
	if randf() < NEIGHBOUR_CHANCE:
		speakers.append(NEIGHBOUR_HANDLE)
	_patch({"speakers": speakers})


## Timers are plain scene-tree Timers, created lazily on first connect — nothing runs
## during _ready, so headless smoke boots stay clean.
func _ensure_timers() -> void:
	if _connect_timer != null:
		return
	_connect_timer = Timer.new()
	_connect_timer.one_shot = true
	_connect_timer.timeout.connect(_on_connected)
	add_child(_connect_timer)
	_chatter_timer = Timer.new()
	_chatter_timer.one_shot = false
	_chatter_timer.timeout.connect(_on_chatter_tick)
	add_child(_chatter_timer)


func _stop_timers() -> void:
	if _connect_timer != null:
		_connect_timer.stop()
	if _chatter_timer != null:
		_chatter_timer.stop()


func _patch(next: Dictionary) -> void:
	for key: String in next:
		_state[key] = next[key]
	state_changed.emit(get_state())
