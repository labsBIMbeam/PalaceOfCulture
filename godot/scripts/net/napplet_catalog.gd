extends Node
## Napplet catalog — the pinned allowlist of napplets the Palace may host.
##
## A napplet is a sandboxed Nostr iframe app (NIP-5D). This runtime does NOT
## discover them from relays: it runs exactly what is listed here, and the host
## refuses to mount an artifact whose SHA-256 does not match `sha256`. That keeps
## ADR 0008's "arcade games are untrusted adapters" promise enforceable rather
## than aspirational — an updated artifact needs a deliberate hash change here.
##
## Open discovery of kind-35129 manifests is a separate decision: it needs a
## consent and moderation layer first, and would supersede this file.
##
## Entry shape (mirrors what web/napplet-host.js expects):
##   {id: String, title: String, artifact_url: String, sha256: String,
##    relays: Array[String], accept_relay_hints: bool, summary: String}

## Serve the artifact from the same origin as the Palace build. A napplet is one
## self-contained index.html, so this is a single static file per napplet.
const ARTIFACT_ROOT := "napplets/"

const ENTRIES: Array[Dictionary] = [
	{
		"id": "plebeian-storefront",
		"title": "Plebeian Market",
		"summary": "Browse the market, inspect a listing, check out on plebeian.market.",
		"artifact_url": ARTIFACT_ROOT + "plebeian-storefront/index.html",
		# Empty until the artifact is published; the host only enforces a
		# non-empty hash, so leaving it blank is a deliberate dev-mode escape.
		"sha256": "",
		"relays": [
			"wss://relay.plebeian.market",
			"wss://nos.lol",
			"wss://relay.damus.io",
		],
		# The napplet may hint relays; policy still decides. Off = pinned list only.
		"accept_relay_hints": false,
	},
]


func _init() -> void:
	name = "NappletCatalog"


## Every pinned napplet, newest-first is meaningless here — declaration order wins.
func load_items() -> Array[Dictionary]:
	var items: Array[Dictionary] = []
	for entry: Dictionary in ENTRIES:
		items.append(entry.duplicate(true))
	return items


## One entry by id, or an empty dictionary when it is not on the allowlist.
func get_entry(id: String) -> Dictionary:
	for entry: Dictionary in ENTRIES:
		if String(entry.get("id", "")) == id:
			return entry.duplicate(true)
	return {}


## True when the id is allowed to run at all.
func allows(id: String) -> bool:
	return not get_entry(id).is_empty()
