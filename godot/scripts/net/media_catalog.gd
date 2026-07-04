extends Node
## Media catalog — the seam between the in-game player and Podcasting 2.0 feeds
## + Nostr live (ADR 0004). One-to-one port of apps/web/src/net/media.ts.
##
## Plug-and-play first: a mock catalog with real, CORS-friendly audio so the
## player actually plays. Real sources swap in behind load_items() without
## touching the UI:
##   - music + podcasts -> Podcasting 2.0 RSS parsing (<podcast:medium>,
##     <enclosure>, artwork, <podcast:value> for the V4V splits) — the same
##     open catalog Fountain uses. Music can also come off Nostr audio tracks
##     (kind 31337 Zapstr tags / kind 32123 Wavlake JSON content).
##   - live -> a Nostr NIP-53 (kind:30311) subscription -> live events; the
##     streaming URL is usually HLS and current_participants = listeners.
##   Each kind falls back to its mock when its source is empty, so the player
##   always has content. UI modelled on Podverse (FOSS PC2.0 + V4V player).
##
## Every item Dictionary mirrors the web MediaItem fields (snake_case):
##   id: String                # stable row/cache key, e.g. "mus-1"
##   title: String
##   author: String
##   kind: String              # "music" | "podcast" | "live"
##   audio_url: String
##   tone: String              # "gold" | "coral" | "teal" — placeholder artwork tint
##   value_recipient: String   # V4V Lightning split (<podcast:value> / NIP-57)
##   listeners: int            # live only — NIP-53 current_participants

## Placeholder audio (SoundHelix, freely usable, CORS-open) so play/skip work
## end-to-end today.
const MOCK: Array[Dictionary] = [
	# --- Music ---
	{
		"id": "mus-1",
		"title": "Golden Hour",
		"author": "The Builder",
		"kind": "music",
		"audio_url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
		"tone": "gold",
		"value_recipient": "builder@getalby.com",
	},
	{
		"id": "mus-2",
		"title": "Patience (Annual Rings)",
		"author": "Wren",
		"kind": "music",
		"audio_url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
		"tone": "teal",
		"value_recipient": "wren@getalby.com",
	},
	{
		"id": "mus-3",
		"title": "Coral Festival",
		"author": "Bríd",
		"kind": "music",
		"audio_url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3",
		"tone": "coral",
		"value_recipient": "brid@getalby.com",
	},
	# --- Podcasts ---
	{
		"id": "pod-1",
		"title": "The Signal — ep. 21",
		"author": "600 Billion",
		"kind": "podcast",
		"audio_url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
		"tone": "gold",
		"value_recipient": "signal@getalby.com",
	},
	{
		"id": "pod-2",
		"title": "Time Builds Legend",
		"author": "racooDNI",
		"kind": "podcast",
		"audio_url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3",
		"tone": "teal",
		"value_recipient": "dni@getalby.com",
	},
	# --- Live (mock NIP-53 events; a real stream would be HLS) ---
	{
		"id": "live-1",
		"title": "Strings of the Atlantic",
		"author": "Plaza Main Stage",
		"kind": "live",
		"audio_url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
		"tone": "coral",
		"value_recipient": "stage@getalby.com",
		"listeners": 142,
	},
	{
		"id": "live-2",
		"title": "Builder's Workshop (live)",
		"author": "The Builder",
		"kind": "live",
		"audio_url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3",
		"tone": "gold",
		"value_recipient": "builder@getalby.com",
		"listeners": 38,
	},
]


func load_items() -> Array[Dictionary]:
	## The plug-and-play catalog: on-brand mock items with real playable audio
	## across all three kinds. Swap to PC2.0 feed parsing (music/podcasts) + a
	## NIP-53 live subscription behind this same call. See ADR 0004.
	var items: Array[Dictionary] = []
	for item: Dictionary in MOCK:
		items.append(item.duplicate(true))
	return items
