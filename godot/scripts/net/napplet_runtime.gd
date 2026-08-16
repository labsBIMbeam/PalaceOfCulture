extends Node
## Napplet runtime seam — the Palace side of NIP-5D.
##
## A napplet is one self-contained index.html that a runtime loads into an
## `iframe sandbox="allow-scripts"` with no `allow-same-origin`. It gets an
## opaque origin and no ambient browser authority: no fetch, no socket, no
## storage, and no signer. Everything privileged is proxied to the host over
## postMessage. Godot has no HTML engine, so the host lives in the web-export
## page (`web/napplet-host.js`) and this node is the seam the UI talks to.
##
## Authority split:
##   napplet → asks and renders, holds nothing
##   host    → relay sockets, external bytes, scoped storage, policy, theme
##   NIP-07  → the key. Signing is delegated to the browser extension, which
##             prompts the user. Neither this node nor the host ever holds one.
##
## Off the web export (desktop, headless smoke) there is no browser to host an
## iframe, so `available()` is false and `open()` reports `unavailable` instead
## of failing: the Palace keeps running, the panel explains itself. A desktop
## runtime would need an embedded webview and is a separate decision.
##
## State dictionary shape (mirrors web/napplet-host.js `status()`):
##   {status: "idle"|"loading"|"running"|"error"|"unavailable",
##    napplet: String, error: String, signer: bool}

signal state_changed(state: Dictionary)

const CatalogScript := preload("res://scripts/net/napplet_catalog.gd")

const HOST_JS_PATH := "res://web/napplet-host.js"
const POLL_INTERVAL_SEC := 0.25

var catalog: Node

var _state := {"status": "idle", "napplet": "", "error": "", "signer": false}
var _bridge: Variant = null
var _installed := false
var _poll_timer: Timer


func _init() -> void:
	name = "NappletRuntime"
	catalog = CatalogScript.new()
	add_child(catalog)


## Snapshot of the current runtime state; safe to keep (deep copy).
func get_state() -> Dictionary:
	return _state.duplicate(true)


## True when this build can host a napplet at all: web export, browser present.
func available() -> bool:
	if not OS.has_feature("web"):
		return false
	if not _install_host():
		return false
	return bool(_bridge.supported())


## True when a NIP-07 extension is present to sign with. Read-only napplets do
## not need it; anything that publishes does.
func signer_available() -> bool:
	if not available():
		return false
	return bool(_bridge.signerAvailable())


## Mount a pinned napplet into the page, positioned at `rect` (screen pixels).
## Returns false when the id is not allowlisted or the build cannot host it.
func open(napplet_id: String, rect: Rect2i) -> bool:
	var entry: Dictionary = catalog.get_entry(napplet_id)
	if entry.is_empty():
		_patch({"status": "error", "napplet": napplet_id, "error": "not on the allowlist"})
		return false
	if not available():
		_patch({
			"status": "unavailable",
			"napplet": napplet_id,
			"error": "napplets need the web build; this export has no browser to sandbox them",
		})
		return false

	_bridge.mount(JSON.stringify(_to_host_entry(entry)), JSON.stringify(_to_host_rect(rect)))
	_patch({"status": "loading", "napplet": napplet_id, "error": ""})
	_start_polling()
	return true


## Tear the napplet down: iframe removed, relay sockets closed, streams dropped.
func close() -> void:
	_stop_polling()
	if available():
		_bridge.unmount()
	_patch({"status": "idle", "napplet": "", "error": ""})


## Reposition the hosted iframe (the panel calls this on resize).
func set_rect(rect: Rect2i) -> void:
	if not available():
		return
	_bridge.setRect(JSON.stringify(_to_host_rect(rect)))


## Push the Palace palette into the napplet (NAP-THEME). Colours are the three
## the theme payload guarantees; the napplet derives the rest.
func set_theme(background: Color, text: Color, primary: Color) -> void:
	if not available():
		return
	var payload := {
		"colors": {
			"background": "#" + background.to_html(false),
			"text": "#" + text.to_html(false),
			"primary": "#" + primary.to_html(false),
		}
	}
	_bridge.setTheme(JSON.stringify(payload))


func _to_host_entry(entry: Dictionary) -> Dictionary:
	return {
		"id": entry.get("id", ""),
		"title": entry.get("title", ""),
		"artifactUrl": entry.get("artifact_url", ""),
		"sha256": entry.get("sha256", ""),
		"relays": entry.get("relays", []),
		"acceptRelayHints": entry.get("accept_relay_hints", false),
	}


func _to_host_rect(rect: Rect2i) -> Dictionary:
	return {"x": rect.position.x, "y": rect.position.y, "width": rect.size.x, "height": rect.size.y}


## Installs web/napplet-host.js into the page once, then caches the interface.
## Returns false off-web or when the source is missing from the export.
func _install_host() -> bool:
	if _installed:
		return _bridge != null
	_installed = true
	if not OS.has_feature("web"):
		return false
	var source := FileAccess.get_file_as_string(HOST_JS_PATH)
	if source.is_empty():
		push_warning("napplet host source missing: %s" % HOST_JS_PATH)
		return false
	JavaScriptBridge.eval(source, true)
	_bridge = JavaScriptBridge.get_interface("PalaceNapplet")
	return _bridge != null


## The host owns the truth about the iframe; Godot polls it while one is open
## rather than plumbing callbacks back across the bridge.
func _start_polling() -> void:
	if _poll_timer == null:
		_poll_timer = Timer.new()
		_poll_timer.one_shot = false
		_poll_timer.timeout.connect(_on_poll)
		add_child(_poll_timer)
	_poll_timer.start(POLL_INTERVAL_SEC)


func _stop_polling() -> void:
	if _poll_timer != null:
		_poll_timer.stop()


func _on_poll() -> void:
	if not available():
		return
	var raw := String(_bridge.status())
	var parsed: Variant = JSON.parse_string(raw)
	if typeof(parsed) != TYPE_DICTIONARY:
		return
	var status: Dictionary = parsed
	_patch({
		"status": status.get("state", "idle"),
		"napplet": status.get("napplet", ""),
		"error": status.get("error", ""),
		"signer": signer_available(),
	})


func _patch(next: Dictionary) -> void:
	var changed := false
	for key: String in next:
		if _state.get(key) != next[key]:
			_state[key] = next[key]
			changed = true
	if changed:
		state_changed.emit(get_state())
