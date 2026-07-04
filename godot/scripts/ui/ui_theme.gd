extends RefCounted
## Shared UI theme factory: dark warm panels, gold borders, Cinzel display /
## Spectral copy / JetBrains Mono numbers (ported from the web design tokens).
## Consume via `const UITheme := preload("res://scripts/ui/ui_theme.gd")`, set
## `control.theme = UITheme.theme()` on your root Control and use the helpers —
## do not hand-roll styleboxes that duplicate these tokens.

## Named palette tokens. Keys: panel, panel_strong, border, border_strong,
## text, body, muted, gold, gold_bright, cream, coral, teal_light.
const C := {
	"panel": Color(0.11, 0.075, 0.043, 0.88),
	"panel_strong": Color(0.07, 0.047, 0.027, 0.95),
	"border": Color(0.906, 0.698, 0.235, 0.30),
	"border_strong": Color(0.906, 0.698, 0.235, 0.55),
	"text": Color("#f3e6c2"),
	"body": Color("#e6d6b4"),
	"muted": Color("#9c8a64"),
	"gold": Color("#e7b23c"),
	"gold_bright": Color("#f3d27a"),
	"cream": Color("#f6ecd2"),
	"coral": Color("#e8704f"),
	"teal_light": Color("#2b9079"),
}

const RADIUS := 10

static var _theme: Theme
static var _fonts := {}


## The global cached Theme; build once, share across every UI layer.
static func theme() -> Theme:
	if _theme == null:
		_theme = _build_theme()
	return _theme


## Fresh warm-dark panel stylebox (callers may tweak margins safely).
static func panel_style(strong: bool = false) -> StyleBoxFlat:
	return flat_style(
		C.panel_strong if strong else C.panel,
		C.border_strong if strong else C.border,
		1, RADIUS, 14.0)


## General flat stylebox builder for module accents (chips, dots, hotbar slots).
static func flat_style(bg: Color, border: Color = Color(0, 0, 0, 0), border_w: int = 0,
		radius: int = RADIUS, margin: float = 8.0) -> StyleBoxFlat:
	var sb := StyleBoxFlat.new()
	sb.bg_color = bg
	sb.border_color = border
	sb.set_border_width_all(border_w)
	sb.set_corner_radius_all(radius)
	sb.set_content_margin_all(margin)
	return sb


## Cinzel — display face for titles and section headers.
static func font_display() -> Font:
	return _font("res://assets/fonts/Cinzel.ttf")


## Spectral Regular — body copy, the control default.
static func font_copy() -> Font:
	return _font("res://assets/fonts/Spectral-Regular.ttf")


## Spectral SemiBold — emphasised copy (row names, primary buttons).
static func font_copy_bold() -> Font:
	return _font("res://assets/fonts/Spectral-SemiBold.ttf")


## JetBrains Mono — numbers, timestamps, counts, key hints.
static func font_mono() -> Font:
	return _font("res://assets/fonts/JetBrainsMono.ttf")


static func _font(path: String) -> Font:
	if not _fonts.has(path):
		_fonts[path] = load(path) as Font
	return _fonts[path]


static func _button_margins(sb: StyleBoxFlat) -> void:
	sb.content_margin_left = 14.0
	sb.content_margin_right = 14.0
	sb.content_margin_top = 6.0
	sb.content_margin_bottom = 6.0


static func _build_theme() -> Theme:
	var t := Theme.new()
	var copy := font_copy()
	if copy != null:
		t.default_font = copy
	t.default_font_size = 15

	# Panels
	t.set_stylebox("panel", "Panel", panel_style())
	t.set_stylebox("panel", "PanelContainer", panel_style())

	# Button — soot base, gold-bright text + strong border on hover; all subtle.
	var btn := flat_style(Color(0.16, 0.112, 0.065, 0.92), C.border, 1, RADIUS)
	var btn_hover := flat_style(Color(0.2, 0.142, 0.082, 0.95), C.border_strong, 1, RADIUS)
	var btn_pressed := flat_style(Color(0.09, 0.061, 0.035, 0.95), C.border_strong, 1, RADIUS)
	var btn_disabled := flat_style(Color(0.11, 0.075, 0.043, 0.5), Color(0.906, 0.698, 0.235, 0.12), 1, RADIUS)
	var btn_focus := flat_style(Color(0, 0, 0, 0), C.border_strong, 1, RADIUS)
	btn_focus.draw_center = false
	for sb: StyleBoxFlat in [btn, btn_hover, btn_pressed, btn_disabled, btn_focus]:
		_button_margins(sb)
	t.set_stylebox("normal", "Button", btn)
	t.set_stylebox("hover", "Button", btn_hover)
	t.set_stylebox("pressed", "Button", btn_pressed)
	t.set_stylebox("disabled", "Button", btn_disabled)
	t.set_stylebox("focus", "Button", btn_focus)
	t.set_color("font_color", "Button", C.text)
	t.set_color("font_hover_color", "Button", C.gold_bright)
	t.set_color("font_pressed_color", "Button", C.gold_bright)
	t.set_color("font_hover_pressed_color", "Button", C.gold_bright)
	t.set_color("font_focus_color", "Button", C.text)
	t.set_color("font_disabled_color", "Button", Color(C.muted, 0.7))
	t.set_font_size("font_size", "Button", 15)

	# Label
	t.set_color("font_color", "Label", C.body)
	t.set_font_size("font_size", "Label", 15)

	# LineEdit — dark inset with a gold caret.
	var edit := flat_style(Color(0.05, 0.034, 0.02, 0.95), C.border, 1, RADIUS)
	edit.content_margin_left = 10.0
	edit.content_margin_right = 10.0
	edit.content_margin_top = 5.0
	edit.content_margin_bottom = 5.0
	var edit_focus := flat_style(Color(0, 0, 0, 0), C.border_strong, 1, RADIUS)
	edit_focus.draw_center = false
	var edit_ro: StyleBoxFlat = edit.duplicate()
	edit_ro.bg_color = Color(0.05, 0.034, 0.02, 0.6)
	t.set_stylebox("normal", "LineEdit", edit)
	t.set_stylebox("focus", "LineEdit", edit_focus)
	t.set_stylebox("read_only", "LineEdit", edit_ro)
	t.set_color("font_color", "LineEdit", C.text)
	t.set_color("font_uneditable_color", "LineEdit", C.muted)
	t.set_color("font_placeholder_color", "LineEdit", C.muted)
	t.set_color("caret_color", "LineEdit", C.gold)
	t.set_color("selection_color", "LineEdit", Color(C.gold, 0.3))
	t.set_font_size("font_size", "LineEdit", 15)

	# TabBar / TabContainer — gold underline for the active tab.
	var tab_sel := flat_style(Color(0.16, 0.112, 0.065, 0.95), C.gold, 0, 8, 6.0)
	tab_sel.border_width_bottom = 2
	var tab_un := flat_style(Color(0, 0, 0, 0), Color(0, 0, 0, 0), 0, 8, 6.0)
	var tab_hov := flat_style(Color(0.906, 0.698, 0.235, 0.08), Color(0, 0, 0, 0), 0, 8, 6.0)
	for sb: StyleBoxFlat in [tab_sel, tab_un, tab_hov]:
		sb.content_margin_left = 12.0
		sb.content_margin_right = 12.0
		sb.content_margin_top = 5.0
		sb.content_margin_bottom = 5.0
	var bold := font_copy_bold()
	for kind: String in ["TabBar", "TabContainer"]:
		t.set_stylebox("tab_selected", kind, tab_sel)
		t.set_stylebox("tab_unselected", kind, tab_un)
		t.set_stylebox("tab_hovered", kind, tab_hov)
		t.set_color("font_selected_color", kind, C.gold_bright)
		t.set_color("font_unselected_color", kind, C.muted)
		t.set_color("font_hovered_color", kind, C.text)
		t.set_font_size("font_size", kind, 13)
		if bold != null:
			t.set_font("font", kind, bold)
	t.set_stylebox("panel", "TabContainer", panel_style())

	# ProgressBar — gold fill on a soot track, mono percentage if shown.
	var track := flat_style(Color(0.05, 0.034, 0.02, 0.9), Color(0.906, 0.698, 0.235, 0.12), 1, 5, 1.0)
	var fill := flat_style(C.gold, Color(0, 0, 0, 0), 0, 5, 1.0)
	t.set_stylebox("background", "ProgressBar", track)
	t.set_stylebox("fill", "ProgressBar", fill)
	t.set_color("font_color", "ProgressBar", C.text)
	t.set_font_size("font_size", "ProgressBar", 12)
	var mono := font_mono()
	if mono != null:
		t.set_font("font", "ProgressBar", mono)

	# ScrollContainer + scrollbars — invisible frame, faint gold grabbers.
	t.set_stylebox("panel", "ScrollContainer", StyleBoxEmpty.new())
	var scroll_bg := flat_style(Color(0.07, 0.047, 0.027, 0.5), Color(0, 0, 0, 0), 0, 4, 0.0)
	var grabber := flat_style(Color(0.906, 0.698, 0.235, 0.25), Color(0, 0, 0, 0), 0, 4, 0.0)
	var grabber_hi := flat_style(Color(0.906, 0.698, 0.235, 0.45), Color(0, 0, 0, 0), 0, 4, 0.0)
	var grabber_pr := flat_style(Color(0.906, 0.698, 0.235, 0.6), Color(0, 0, 0, 0), 0, 4, 0.0)
	for kind: String in ["VScrollBar", "HScrollBar"]:
		t.set_stylebox("scroll", kind, scroll_bg)
		t.set_stylebox("grabber", kind, grabber)
		t.set_stylebox("grabber_highlight", kind, grabber_hi)
		t.set_stylebox("grabber_pressed", kind, grabber_pr)

	# CheckBox — default icons, themed text.
	var check_pad := StyleBoxEmpty.new()
	check_pad.set_content_margin_all(4.0)
	for state: String in ["normal", "hover", "pressed", "disabled", "focus"]:
		t.set_stylebox(state, "CheckBox", check_pad)
	t.set_color("font_color", "CheckBox", C.text)
	t.set_color("font_hover_color", "CheckBox", C.gold_bright)
	t.set_color("font_pressed_color", "CheckBox", C.gold_bright)
	t.set_color("font_disabled_color", "CheckBox", Color(C.muted, 0.7))
	t.set_font_size("font_size", "CheckBox", 15)

	# Separators — hairline gold at border alpha.
	var hline := StyleBoxLine.new()
	hline.color = C.border
	hline.thickness = 1
	t.set_stylebox("separator", "HSeparator", hline)
	var vline := StyleBoxLine.new()
	vline.color = C.border
	vline.thickness = 1
	vline.vertical = true
	t.set_stylebox("separator", "VSeparator", vline)

	# Tooltips
	var tip := panel_style(true)
	tip.set_content_margin_all(8.0)
	t.set_stylebox("panel", "TooltipPanel", tip)
	t.set_color("font_color", "TooltipLabel", C.text)
	t.set_font_size("font_size", "TooltipLabel", 13)
	return t
