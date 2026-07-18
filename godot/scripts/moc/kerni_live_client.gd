## Opt-in loopback client for Kerni template selection.
## No arbitrary URL, free text, player identity, or world object crosses this seam.
class_name KerniLiveClient
extends Node

signal response_received(candidate: Dictionary)

const ENDPOINT := "http://127.0.0.1:8791/v1/kerni/template"
const REQUEST_KEYS := ["allowed_templates", "phase", "request_id"]
const RESPONSE_KEYS := ["authority", "phase", "request_id", "template_id"]
const MAX_RESPONSE_BYTES := 2048

var _http: HTTPRequest
var _busy := false


func _ready() -> void:
	_http = HTTPRequest.new()
	_http.timeout = 4.0
	_http.max_redirects = 0
	_http.accept_gzip = false
	_http.request_completed.connect(_on_request_completed)
	add_child(_http)


func request_template(payload: Dictionary) -> bool:
	if _busy or not _valid_request(payload):
		return false
	var body := JSON.stringify(payload)
	if body.to_utf8_buffer().size() > MAX_RESPONSE_BYTES:
		return false
	var error := _http.request(
		ENDPOINT,
		PackedStringArray(["Content-Type: application/json", "Accept: application/json"]),
		HTTPClient.METHOD_POST,
		body,
	)
	_busy = error == OK
	return _busy


func cancel() -> void:
	if _busy:
		_http.cancel_request()
	_busy = false


func _on_request_completed(
		result: int, response_code: int, _headers: PackedStringArray, body: PackedByteArray,
) -> void:
	_busy = false
	if result != HTTPRequest.RESULT_SUCCESS or response_code != 200 \
			or body.is_empty() or body.size() > MAX_RESPONSE_BYTES:
		response_received.emit({})
		return
	var parsed: Variant = JSON.parse_string(body.get_string_from_utf8())
	if typeof(parsed) != TYPE_DICTIONARY or not _valid_response(parsed as Dictionary):
		response_received.emit({})
		return
	var canonical := (parsed as Dictionary).duplicate(true)
	canonical["phase"] = int(canonical.phase)
	response_received.emit(canonical)


func _valid_request(payload: Dictionary) -> bool:
	if not _keys_exact(payload, REQUEST_KEYS) \
			or typeof(payload.request_id) != TYPE_STRING or typeof(payload.phase) != TYPE_INT \
			or typeof(payload.allowed_templates) != TYPE_ARRAY:
		return false
	var templates := payload.allowed_templates as Array
	if templates.size() != 2:
		return false
	for template: Variant in templates:
		if typeof(template) != TYPE_STRING or String(template).is_empty() or String(template).length() > 48:
			return false
	return not String(payload.request_id).is_empty() and String(payload.request_id).length() <= 64 \
			and int(payload.phase) >= 0 and int(payload.phase) <= 7


func _valid_response(payload: Dictionary) -> bool:
	return _keys_exact(payload, RESPONSE_KEYS) \
			and typeof(payload.authority) == TYPE_STRING and String(payload.authority) == "suggestion_only" \
			and _is_json_int(payload.phase) and int(payload.phase) >= 0 and int(payload.phase) <= 7 \
			and typeof(payload.request_id) == TYPE_STRING and not String(payload.request_id).is_empty() \
			and typeof(payload.template_id) == TYPE_STRING and not String(payload.template_id).is_empty()


func _keys_exact(payload: Dictionary, expected: Array) -> bool:
	if payload.size() != expected.size():
		return false
	for key in expected:
		if not payload.has(key):
			return false
	return true


func _is_json_int(value: Variant) -> bool:
	return [TYPE_INT, TYPE_FLOAT].has(typeof(value)) and is_finite(float(value)) \
			and is_equal_approx(float(value), roundf(float(value)))
