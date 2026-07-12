extends Node
## Chat transport — the seam between the in-world chat UI and whatever carries the
## messages. Plug-and-play first (this node is a local mock), then swap the
## implementation for Nostr without touching a line of UI:
##   - public channels (world/plaza) -> NIP-29 relay-based groups (kind-9 chat); the
##     relay is the policy engine for admins/roles/bans. One group per channel;
##     per-plaza groups later.
##   - whispers (DMs) -> NIP-17 private DMs over NIP-59 gift-wrap + NIP-44 encryption.
##   - identity -> the player's per-seal Nostr key signs every send; `author` becomes
##     the npub's profile name, exactly the innpub pattern.
## The UI only ever sees `message_received` + `send()`, so the migration is a
## one-file change here. Mirrors apps/web/src/net/chat.ts
## (see docs/adr/0002-chat-and-voice-transport.md).

## msg: {id: String, channel: String, author: String, body: String, at_ms: int,
##       self: bool, system: bool} — backlog is replayed first (deferred from _ready).
signal message_received(msg: Dictionary)

const CHANNELS: Array[String] = ["world", "plaza", "whisper"]

## Ambient drip cadence in seconds (uniform random in range) — slower than the web
## mock's fixed 12 s: the dock sits inside a calm 3D world, not a busy browser tab.
const AMBIENT_MIN_SEC := 25.0
const AMBIENT_MAX_SEC := 45.0

## Calm, on-brand ambient chatter so a fresh channel feels lived-in (the world is
## dignified, not spam). Same townsfolk lines as the web mock.
const AMBIENT: Array[Dictionary] = [
	{
		"channel": "plaza",
		"author": "Wren",
		"body": "the first hall went up by the garden — go look before dusk",
	},
	{
		"channel": "world",
		"author": "Tomas",
		"body": "another day given. patience builds the palace.",
	},
	{"channel": "plaza", "author": "Isa", "body": "my sapling just hit its third ring 🌱"},
	{
		"channel": "world",
		"author": "Pelle",
		"body": "welcome the new builders — and mind the raccoon",
	},
	{
		"channel": "plaza",
		"author": "Bríd",
		"body": "string quartet tuning on the main stage at the top of the hour",
	},
]

## Display handle for loopback sends (later: derived from the sender's npub profile).
var local_handle: String = "Builder"

var _id_counter := 0
var _ambient_timer: Timer
var _rng := RandomNumberGenerator.new()


func _init() -> void:
	name = "ChatTransport"


func _ready() -> void:
	_rng.randomize()
	_ambient_timer = Timer.new()
	_ambient_timer.one_shot = true
	_ambient_timer.timeout.connect(_on_ambient_timeout)
	add_child(_ambient_timer)
	_schedule_ambient()
	# Deferred so a listener that connects right after add_child still gets the backlog.
	_emit_backlog.call_deferred()


## Send a message to a channel. The mock echoes locally with self=true; Nostr will
## sign + publish a kind-9 (NIP-29) event for world/plaza, or a NIP-17 wrap for whispers.
func send(channel: String, body: String) -> void:
	var text := body.strip_edges()
	if text.is_empty() or not CHANNELS.has(channel):
		return
	message_received.emit(_make(channel, local_handle, text, _now_ms(), true, false))


## The valid channel ids, in display order.
func channel_ids() -> Array[String]:
	return CHANNELS.duplicate()


## Welcome system line + a short backlog so the panel never opens empty.
func _emit_backlog() -> void:
	var now := _now_ms()
	message_received.emit(
		_make("world", "Palace", "You enter the Palace of Culture.", now - 8000, false, true)
	)
	message_received.emit(_make("plaza", "Wren", "welcome home, builder", now - 5000, false, false))


func _on_ambient_timeout() -> void:
	var pick: Dictionary = AMBIENT[_rng.randi_range(0, AMBIENT.size() - 1)]
	message_received.emit(
		_make(String(pick.channel), String(pick.author), String(pick.body), _now_ms(), false, false)
	)
	_schedule_ambient()


func _schedule_ambient() -> void:
	_ambient_timer.start(_rng.randf_range(AMBIENT_MIN_SEC, AMBIENT_MAX_SEC))


func _make(
	channel: String, author: String, body: String, at_ms: int, is_self: bool, system: bool
) -> Dictionary:
	_id_counter += 1
	return {
		"id": "m%d-%d" % [at_ms, _id_counter],
		"channel": channel,
		"author": author,
		"body": body,
		"at_ms": at_ms,
		"self": is_self,
		"system": system,
	}


func _now_ms() -> int:
	return int(Time.get_unix_time_from_system() * 1000.0)
