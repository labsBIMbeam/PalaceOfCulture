extends Node
## Headless smoke test (run via `-- --smoke`): asserts the autoload contract
## APIs exist, then exercises home building, crafting, blueprint persistence,
## palace decoration, the social seams (theme, chat, voice, media) and a main
## menu layout pass (build + window resize 960x540 / 1920x1080) end to end.
## Prints SMOKE OK / SMOKE FAIL: <reason>.

const HomeWorldScript := preload("res://scripts/world/home_world.gd")
const PalaceWorldScript := preload("res://scripts/world/palace_world.gd")
const UITheme := preload("res://scripts/ui/ui_theme.gd")
const ChatTransportScript := preload("res://scripts/net/chat_transport.gd")
const ChatPanelScript := preload("res://scripts/ui/chat_panel.gd")
const VoiceTransportScript := preload("res://scripts/net/voice_transport.gd")
const VoiceDockScript := preload("res://scripts/ui/voice_dock.gd")
const MediaCatalogScript := preload("res://scripts/net/media_catalog.gd")
const MediaPlayerScript := preload("res://scripts/ui/media_player.gd")
const NappletRuntimeScript := preload("res://scripts/net/napplet_runtime.gd")
const NappletPanelScript := preload("res://scripts/ui/napplet_panel.gd")
const CraftMenuScript := preload("res://scripts/ui/craft_menu.gd")
const PlayerScript := preload("res://scripts/player.gd")
const MagnetScript := preload("res://scripts/magnet_controller.gd")
const MainMenuScript := preload("res://scripts/ui/main_menu.gd")
const MocLoopScript := preload("res://scripts/moc/moc_loop.gd")
const MocAssemblyScript := preload("res://scripts/moc/leviathan_assembly.gd")
const MocSessionStore := preload("res://scripts/moc/moc_session_store.gd")
const SteamBridgeScript := preload("res://scripts/platform/steam_bridge.gd")
const KerniScript := preload("res://scripts/moc/kerni_3d.gd")
const KerniAgentScript := preload("res://scripts/moc/kerni_world_agent.gd")

const HOME_NAME := "smoke"

var _fail := ""


func run() -> int:
	var ok: bool = await _run_all()
	if ok:
		print("SMOKE OK")
		return 0
	print("SMOKE FAIL: %s" % _fail)
	return 1


func _run_all() -> bool:
	if not _check_apis():
		return false
	if not await _check_moc_contract():
		return false

	# --- Home: fresh blueprint, block place/absorb settling with Economy ---
	Store.create_home(HOME_NAME)
	Store.save_home(HOME_NAME, {"blocks": [], "decor": []})  # deterministic reruns
	if not _check(Store.list_homes().has(HOME_NAME), "home '%s' missing after create" % HOME_NAME):
		return false
	if not _check(Store.hosted_home() != "", "no hosted home after create"):
		return false

	Game.current_home = HOME_NAME
	var home := HomeWorldScript.new()
	add_child(home)
	await get_tree().process_frame

	for i in 9:
		Economy.return_object("block_stone")  # public grant path for objects
	var owned := Economy.get_count("block_stone")
	var cells: Array = home.build_system.footprint_cells(Vector3i(2, 0, 2))
	if not _check(cells.size() == 9, "footprint_cells is not 3x3x1"):
		return false
	if not _check(home.build_system.place_blocks(cells, "block_stone") == 9, "place_blocks did not place 9"):
		return false
	if not _check(home.build_system.block_count() == 9, "block_count != 9 after place"):
		return false
	if not _check(Economy.get_count("block_stone") == owned - 9, "blocks not consumed from Economy"):
		return false
	if not _check(home.build_system.absorb_block(Vector3i(2, 0, 2)), "absorb_block refused"):
		return false
	if not _check(Economy.get_count("block_stone") == owned - 8, "absorbed block not returned"):
		return false
	Economy.return_object("block_boards")
	if not _check(home.build_system.place_blocks([Vector3i(5, 0, 5)], "block_boards") == 1,
			"place_blocks refused block_boards"):
		return false

	# --- Craft queue ---
	if not Economy.can_afford("craft_stool"):
		Economy._materials["wood"] = 20.0  # test-only top-up; there is no public grant API
	var queued_before := Economy.get_queue().size()
	if not _check(Economy.queue_craft("craft_stool"), "queue_craft refused"):
		return false
	var queue: Array = Economy.get_queue()
	if not _check(queue.size() == queued_before + 1, "craft queue did not grow"):
		return false
	var tail: Dictionary = queue.back()
	if not _check(String(tail.get("recipe_id", "")) == "craft_stool", "queue tail is not craft_stool"):
		return false

	# --- Mill boards: processing recipe outputs a MATERIAL, never drips ---
	if not _check(Economy.drip_rate("boards") == 0.0, "boards must not drip"):
		return false
	if not Economy.can_afford("mill_boards"):
		Economy._materials["wood"] = 20.0  # test-only top-up; there is no public grant API
	var boards_before := Economy.get_material("boards")
	if not _check(Economy.queue_craft("mill_boards"), "queue mill_boards refused"):
		return false
	for entry: Dictionary in Economy._queue:  # test-only reach-in: expire all timers
		entry["remaining"] = 0.0
	Economy._advance(0.01)  # drains the whole queue (incl. the stool above)
	if not _check(Economy.get_queue().is_empty(), "queue not drained after expiring timers"):
		return false
	if not _check(Economy.get_material("boards") == boards_before + 50,
			"mill_boards did not add 50 boards"):
		return false

	# --- Save + reload the home blueprint (8 stone + 1 boards) ---
	Store.save_home(HOME_NAME, home.build_system.to_data())
	var loaded: Dictionary = Store.load_home(HOME_NAME)
	if not _check((loaded.get("blocks", []) as Array).size() == 9, "reloaded home has wrong block count"):
		return false
	home.build_system.from_data(loaded)
	if not _check(home.build_system.block_count() == 9, "from_data lost blocks"):
		return false

	# --- Stale-save robustness: unknown object ids are skipped, never crash ---
	home.build_system.from_data({
		"blocks": [{"id": "block_teal", "cell": [9, 0, 9]}],
		"decor": [{"id": "block_cream", "pos": [1.0, 0.0, 1.0], "rot_y": 0.0}],
	})
	if not _check(home.build_system.block_count() == 0, "stale block id not skipped"):
		return false
	home.queue_free()
	await get_tree().process_frame

	# --- Palace: decorate-only ---
	Store.save_palace_decor([])  # deterministic reruns
	var palace := PalaceWorldScript.new()
	add_child(palace)
	await get_tree().process_frame

	if not _check(palace.build_system.place_blocks([Vector3i.ZERO], "block_stone") == 0, "palace accepted blocks"):
		return false
	Economy.return_object("stool")
	if not _check(palace.build_system.place_decor("stool", Vector3(10, 0, 10), 0.0), "palace place_decor refused"):
		return false
	if not _check(palace.build_system.decor_count("stool") == 1, "palace decor_count != 1"):
		return false
	if not _check(Store.load_palace_decor().size() == 1, "palace decor not autosaved"):
		return false
	palace.queue_free()
	await get_tree().process_frame

	# --- Game flow signals: what main.gd's world swapping hangs on ---
	var spaces: Array = []
	var on_space := func(s: int) -> void: spaces.append(s)
	Game.space_changed.connect(on_space)
	Game.goto_home(HOME_NAME)
	if not _check(Game.space == Game.Space.HOME and Game.current_home == HOME_NAME, "goto_home state wrong"):
		return false
	Game.toggle_mode()
	if not _check(Game.mode == Game.Mode.MAGNET, "toggle_mode did not switch to magnet"):
		return false
	Game.goto_palace()
	if not _check(Game.mode == Game.Mode.WALK, "goto_palace did not reset mode to walk"):
		return false
	Game.goto_menu()
	if not _check(Game.space == Game.Space.MENU and Game.current_home == "", "goto_menu state wrong"):
		return false
	var want: Array = [Game.Space.HOME, Game.Space.PALACE, Game.Space.MENU]
	if not _check(spaces == want, "space_changed sequence wrong: %s" % [spaces]):
		return false
	Game.space_changed.disconnect(on_space)

	# --- Social seams: shared theme, chat, voice, media ---
	if not await _check_social():
		return false

	# --- World map, intro, palace landmarks ---
	if not await _check_world_screens():
		return false

	# --- Main menu: headless build + window-resize layout sanity ---
	return await _check_menu_layout()


## Exercises the portable 21-minute state machine and the 36-slot Blender/Godot seam.
func _check_moc_contract() -> bool:
	var loop: MocLoop = MocLoopScript.new()
	if not _check(loop.TOTAL_SECONDS == 1260.0, "MoC loop is not exactly 21 minutes"):
		return false
	if not _check(loop.visible_module_count() == 24, "MoC baseline must expose 24 modules"):
		return false
	var agent: KerniWorldAgent = KerniAgentScript.new()
	var phase_before_agent := loop.phase
	var proposal := agent.request(loop.snapshot())
	if not _check(agent.validate(proposal) and String(proposal.authority) == "suggestion_only",
			"Kerni world-agent emitted an invalid authority contract"):
		return false
	if not _check(loop.phase == phase_before_agent and loop.committed_modules_snapshot().is_empty(),
			"Kerni world-agent mutated cultural state"):
		return false
	var raccoon_reveal := agent.request(loop.snapshot())
	if not _check(String(raccoon_reveal.text).contains("The raccoon was me") \
			and String(raccoon_reveal.text).contains("same Kerni") \
			and loop.phase == phase_before_agent,
			"asked-only Kerni reveal lost the raccoon identity or mutated state"):
		return false
	var oversized := proposal.duplicate(true)
	oversized["text"] = "x".repeat(241)
	if not _check(not agent.validate(oversized), "Kerni accepted oversized embodied text"):
		return false
	if not _check(agent.accept_external_proposal({
		"authority": "suggestion_only", "phase": 0, "request_id": "unsolicited",
		"template_id": "welcome",
	}, 0).is_empty(), "Kerni accepted an unsolicited external response"):
		return false
	var opened := agent.open_external_request(loop.snapshot())
	var injected := {
		"authority": "suggestion_only", "phase": int(opened.phase),
		"request_id": String(opened.request_id), "template_id": String((opened.allowed_templates as Array)[0]),
		"action": {"commit": true}, "peer_identity": "invented-peer",
	}
	if not _check(agent.accept_external_proposal(injected, int(loop.phase)).is_empty(),
			"Kerni accepted unknown or nested authority fields"):
		return false
	opened = agent.open_external_request(loop.snapshot())
	var safe_external := {
		"authority": "suggestion_only", "phase": int(opened.phase),
		"request_id": String(opened.request_id), "template_id": String((opened.allowed_templates as Array)[0]),
	}
	var materialized := agent.accept_external_proposal(safe_external, int(loop.phase))
	if not _check(agent.validate(materialized) and String(materialized.source) == "external_template",
			"Kerni rejected the exact phase-bound template capability"):
		return false
	if not _check(agent.accept_external_proposal(safe_external, int(loop.phase)).is_empty(),
			"Kerni replayed a consumed external capability"):
		return false
	opened = agent.open_external_request(loop.snapshot())
	var stale := {
		"authority": "suggestion_only", "phase": int(opened.phase),
		"request_id": String(opened.request_id), "template_id": String((opened.allowed_templates as Array)[0]),
	}
	if not _check(agent.accept_external_proposal(stale, MocLoop.Phase.CALLING).is_empty(),
			"Kerni accepted a response after phase drift"):
		return false
	var forged_claim := agent.request({"phase": MocLoop.Phase.LEGACY, "co_created": true})
	if not _check(not String(forged_claim.text).contains("Two real hands") \
			and not String(forged_claim.text).contains("author"),
			"Kerni asserted peer presence from a caller-forged snapshot"):
		return false
	agent.free()
	loop.advance(1260.0)
	if not _check(loop.phase == MocLoop.Phase.ARRIVAL, "elapsed time changed culture without a human action"):
		return false
	if not _check(loop.acknowledge_arrival(), "arrival acknowledgement refused"):
		return false
	if not _check(loop.phase == MocLoop.Phase.CALLING, "arrival acknowledgement did not reach CALLING"):
		return false
	if not _check(not loop.create_draft("unauthorised", &"structure"), "draft bypassed human calling"):
		return false
	if not _check(loop.choose_calling(&"garden"), "garden calling refused"):
		return false
	if not _check(loop.phase == MocLoop.Phase.CREATE, "acknowledged calling did not reach CREATE"):
		return false
	if not _check(loop.create_draft("Night Garden Module", &"habitat"), "valid human draft refused"):
		return false
	if not _check(loop.phase == MocLoop.Phase.PLACE, "acknowledged draft did not reach PLACE"):
		return false
	if not _check(loop.place_draft(), "human-confirmed place refused"):
		return false
	var exposed_modules := loop.committed_modules_snapshot()
	if not _check(exposed_modules.size() == 1 and bool(exposed_modules[0].human_confirmed),
			"placed module lacks human confirmation"):
		return false
	var copied_fake: Dictionary = exposed_modules[0].duplicate(true)
	copied_fake["author"] = "invented-peer"
	copied_fake["slot"] = 26
	exposed_modules.append(copied_fake)
	if not _check(loop.committed_modules_snapshot().size() == 1 \
			and not loop.occupied_slots().has(26) and not bool(loop.snapshot().co_created),
			"mutating a returned module copy forged peer presence"):
		return false
	if not _check(loop.phase == MocLoop.Phase.CO_CREATE, "placed work did not reach CO_CREATE"):
		return false
	if not _check(loop.create_invitation().begins_with("nostr:meaningverse?"), "invite is not Nostr-addressable"):
		return false
	if not _check(not loop.has_method("commit_peer_remix") and not loop.has_method("commit_remix"),
			"caller-forgeable peer remix entry point still exists"):
		return false
	if not _check(loop.continue_solo_without_peer(), "honest solo continuation refused"):
		return false
	if not _check(not bool(loop.snapshot().co_created), "solo path claimed co-creation"):
		return false
	if not _check(loop.phase == MocLoop.Phase.TRIAL, "solo continuation did not reach TRIAL"):
		return false
	for _i in 3:
		if not _check(loop.register_trial_action(), "trial action refused"):
			return false
	if not _check(loop.phase == MocLoop.Phase.LAUNCH, "trial did not reach LAUNCH"):
		return false
	for _i in 3:
		if not _check(loop.register_chorus_action(), "chorus action refused"):
			return false
	var exact_solo_slots: Array[int] = []
	for slot in range(1, 26):
		exact_solo_slots.append(slot)
	for slot in range(27, 31):
		exact_solo_slots.append(slot)
	if not _check(loop.occupied_slots() == exact_solo_slots,
			"solo slots are not exactly 1-25 + 27-30: %s" % [loop.occupied_slots()]):
		return false
	if not _check(loop.visible_module_count() == 29, "honest solo path is not 29 modules"):
		return false
	if not _check(loop.phase == MocLoop.Phase.LEGACY, "action-complete path did not end in LEGACY"):
		return false
	if not _check(int(loop.snapshot().legacy.modules) == 29, "legacy lost the honest module count"):
		return false
	var save_path := "user://moc_smoke_session.json"
	if not _check(MocSessionStore.save(save_path, loop.to_data()), "MoC atomic session save failed"):
		return false
	var restored: MocLoop = MocLoopScript.new()
	if not _check(restored.restore(MocSessionStore.load_data(save_path)), "MoC session restore failed"):
		return false
	if not _check(restored.phase == MocLoop.Phase.LEGACY and restored.visible_module_count() == 29,
			"MoC save/restart changed the completed solo ship"):
		return false
	var save_absolute := ProjectSettings.globalize_path(save_path)
	var backup_absolute := "%s.bak" % save_absolute
	if not _check(DirAccess.rename_absolute(save_absolute, backup_absolute) == OK,
			"MoC test could not stage interrupted-save recovery"):
		return false
	if not _check(not MocSessionStore.load_data(save_path).is_empty(),
			"MoC loader did not recover the last valid backup"):
		return false
	DirAccess.rename_absolute(backup_absolute, save_absolute)
	var fabricated_peer := loop.to_data()
	var fake_module: Dictionary = (fabricated_peer.modules as Array)[0].duplicate(true)
	fake_module["author"] = "invented-peer"
	fake_module["origin"] = "peer-remix"
	fake_module["slot"] = 26
	fake_module["transport_confirmed"] = true
	fake_module["peer_session"] = "caller-supplied"
	(fabricated_peer.modules as Array).append(fake_module)
	if not _check(not restored.restore(fabricated_peer), "restore accepted a fabricated peer module"):
		return false
	var unconfirmed := loop.to_data()
	(unconfirmed.modules as Array)[0]["human_confirmed"] = false
	if not _check(not restored.restore(unconfirmed), "restore accepted an unconfirmed local module"):
		return false
	var string_confirmed := loop.to_data()
	(string_confirmed.modules as Array)[0]["human_confirmed"] = "true"
	if not _check(not restored.restore(string_confirmed), "restore coerced string human confirmation"):
		return false
	var unknown_provenance := loop.to_data()
	(unknown_provenance.modules as Array)[0]["peer_identity"] = "invented-peer"
	if not _check(not restored.restore(unknown_provenance), "restore preserved unknown peer metadata"):
		return false
	var string_slot := loop.to_data()
	(string_slot.modules as Array)[0]["slot"] = "25"
	if not _check(not restored.restore(string_slot), "restore coerced a string slot"):
		return false
	var string_phase := loop.to_data()
	string_phase["phase"] = "7"
	if not _check(not restored.restore(string_phase), "restore coerced a string phase"):
		return false
	var string_actions := loop.to_data()
	string_actions["trial_actions"] = "3"
	if not _check(not restored.restore(string_actions), "restore coerced string action counts"):
		return false
	var unknown_top_level := loop.to_data()
	unknown_top_level["peer_transport"] = {"confirmed": true}
	if not _check(not restored.restore(unknown_top_level), "restore accepted unknown top-level authority metadata"):
		return false
	var malformed_omission := loop.to_data()
	malformed_omission["omissions"] = [1]
	if not _check(not restored.restore(malformed_omission), "restore coerced a non-string omission"):
		return false
	var over_capacity := loop.to_data()
	(over_capacity.modules as Array).append((over_capacity.modules as Array)[0].duplicate(true))
	if not _check(not restored.restore(over_capacity), "restore accepted a second module without transport"):
		return false
	var phase_jump := loop.to_data()
	phase_jump["phase"] = MocLoop.Phase.TRIAL
	if not _check(not restored.restore(phase_jump), "restore accepted a phase/action mismatch"):
		return false
	var wrong_invitation := loop.to_data()
	wrong_invitation["invitation"] = "nostr:meaningverse?world=street&work=transplanted&action=remix"
	if not _check(not restored.restore(wrong_invitation), "restore accepted a transplanted invitation"):
		return false
	if not _check(restored.phase == MocLoop.Phase.LEGACY and restored.visible_module_count() == 29,
			"rejected restore mutated the last valid session"):
		return false
	restored.free()
	DirAccess.remove_absolute(ProjectSettings.globalize_path(save_path))
	loop.free()

	var assembly: MocLeviathanAssembly = MocAssemblyScript.new()
	add_child(assembly)
	await get_tree().process_frame
	await get_tree().process_frame
	if not _check(assembly.validate_contract(), "Leviathan GLB contract invalid"):
		return false
	if not _check(assembly._slot_nodes.size() == 36, "Leviathan does not expose 36 slots"):
		return false
	assembly.apply_occupied_slots([26], false)
	if not _check(not assembly.is_slot_visible(26) and assembly.visible_modules == 0,
			"apply_occupied_slots exposed reserved peer slot 26"):
		return false
	assembly.reveal_to(26, false)
	if not _check(not assembly.is_slot_visible(26) and assembly.is_slot_visible(25) \
			and assembly.visible_modules == 25,
			"reveal_to exposed or counted reserved peer slot 26"):
		return false
	assembly.apply_occupied_slots([], false)
	assembly.pulse_commit(26)
	if not _check(not assembly.is_slot_visible(26) and assembly.visible_modules == 0,
			"pulse_commit exposed reserved peer slot 26"):
		return false
	assembly.pulse_commit(31)
	if not _check(not assembly.is_slot_visible(31), "pulse_commit exposed future slot 31"):
		return false
	assembly._occupied_slots[26] = true
	assembly._occupied_slots[31] = true
	assembly._apply_visibility(false)
	if not _check(not assembly.is_slot_visible(26) and not assembly.is_slot_visible(31) \
			and assembly.visible_modules == 0 and not assembly._occupied_slots.has(26) \
			and not assembly._occupied_slots.has(31),
			"final renderer sink trusted poisoned occupied slots"):
		return false
	var solo_slots: Array[int] = []
	for slot in range(1, 26):
		solo_slots.append(slot)
	for slot in range(27, 31):
		solo_slots.append(slot)
	assembly.apply_occupied_slots(solo_slots, false)
	if not _check(not assembly.is_slot_visible(26), "solo assembly fabricated peer slot 26"):
		return false
	if not _check(assembly.is_slot_visible(27) and assembly.is_slot_visible(30),
			"solo assembly lost trial or chorus slots"):
		return false
	if not _check(not assembly.is_slot_visible(31), "future slot 31 closed too early"):
		return false
	var kerni_asset: Kerni3D = KerniScript.new()
	add_child(kerni_asset)
	await get_tree().process_frame
	await get_tree().process_frame
	if not _check(kerni_asset.validate_contract(), "Kerni3D runtime asset contract invalid"):
		return false
	kerni_asset.queue_free()
	assembly.queue_free()
	await get_tree().process_frame
	var steam: SteamBridge = SteamBridgeScript.new()
	if not _check(not steam.initialize(), "Steam bridge invented a runtime without GodotSteam"):
		return false
	if not _check(steam.status == "disabled", "Steam bridge failed closed when plugin is absent"):
		return false
	steam.free()
	return true


## World map parses the shipped GeoJSON headless, the intro resolves instantly
## without a display, and the palace world carries the two landmark sites.
func _check_world_screens() -> bool:
	var map: CanvasLayer = load("res://scripts/ui/world_map.gd").new()
	add_child(map)
	await get_tree().process_frame
	map.open()
	await get_tree().process_frame
	if not _check(map._countries.size() > 100, "world map parsed %d countries" % map._countries.size()):
		return false
	if not _check(map._outlines.size() > 100, "world map projected no outlines"):
		return false
	map.close()
	map.queue_free()

	var intro: CanvasLayer = load("res://scripts/ui/intro_screen.gd").new()
	add_child(intro)
	await get_tree().process_frame
	if not _check(intro.STORY_CARDS.size() == 3 \
			and String(intro.STORY_CARDS[0].caption).contains("raccoon") \
			and String(intro.STORY_CARDS[0].line).contains("blood") \
			and String(intro.STORY_CARDS[1].caption).contains("Kerni") \
			and String(intro.STORY_CARDS[2].line).contains("not a cult") \
			and String(intro.STORY_CARDS[2].kicker).contains("LOCKTARD STREET"),
			"Godot intro cards lost the canonical story order"):
		return false
	var done := [false]
	intro.intro_done.connect(func() -> void: done[0] = true)
	intro.open()
	await get_tree().process_frame
	await get_tree().process_frame
	if not _check(done[0], "intro did not resolve headless"):
		return false
	intro.queue_free()

	var palace := PalaceWorldScript.new()
	add_child(palace)
	await get_tree().process_frame
	var garden := palace.find_child("Baumgarten", true, false)
	var pad := palace.find_child("Raketenbauplatz", true, false)
	if not _check(garden != null and pad != null, "palace landmarks missing"):
		return false
	var demo := pad as MocDemo
	if not _check(demo != null and not demo._persist_enabled, "smoke world may touch real MoC progress"):
		return false
	if not _check(demo.kerni != null and demo.kerni.validate_contract() and demo.world_agent != null,
			"Palace workshop did not mount Kerni3D + world-agent"):
		return false
	for station: Vector3 in [MocDemo.WORKBENCH_POINT, MocDemo.SOCKET_POINT, MocDemo.ECHO_POINT]:
		if not _check(Vector2(MocDemo.KERNI_POINT.x - station.x, MocDemo.KERNI_POINT.z - station.z).length() \
				> MocDemo.INTERACTION_RADIUS,
				"Kerni interaction radius overlaps a phase station"):
			return false
	palace._player.global_position = demo.to_global(MocDemo.KERNI_POINT + Vector3.UP)
	var phase_before_kerni := demo.loop.phase
	var unsolicited_presentation := demo.world_agent.request(demo.loop.snapshot())
	if not _check(not demo._present_kerni_proposal(unsolicited_presentation) \
			and demo.kerni.last_spoken_text.is_empty(),
			"MocDemo embodied a valid proposal without its own request token"):
		return false
	Game.set_world_input_blocked(&"smoke_overlay", true)
	await _tap_action(&"interact")
	Game.set_world_input_blocked(&"smoke_overlay", false)
	if not _check(demo.loop.phase == phase_before_kerni and demo.kerni.last_spoken_text.is_empty(),
			"overlay leaked E into Kerni/world interaction"):
		return false
	await _tap_action(&"interact")
	if demo.kerni_live_client != null:
		for _tick in 200:
			if not demo.kerni.last_spoken_text.is_empty():
				break
			await get_tree().create_timer(0.01).timeout
	if not _check(demo.loop.phase == phase_before_kerni and not demo.kerni.last_spoken_text.is_empty(),
			"asking Kerni changed phase or produced no embodied answer"):
		return false
	if not _check(String(demo.world_agent.last_proposal.authority) == "suggestion_only",
			"embodied Kerni answer lost its authority label"):
		return false
	palace._player.global_position = demo.to_global(Vector3(0, 1, 0))
	await _tap_action(&"interact")
	if not _check(demo.loop.phase == MocLoop.Phase.CALLING,
			"spatial E input did not enter CALLING · phase=%s local=%s blockers=%s mode=%s typing=%s" % [
				demo.loop.phase, demo.to_local(palace._player.global_position),
				Game.world_input_blockers_snapshot(), Game.mode, Game.typing,
			]):
		return false
	palace._player.global_position = demo.to_global(MocDemo.CALLING_POINTS[&"hearth"] + Vector3.UP)
	await _tap_action(&"interact")
	palace._player.global_position = demo.to_global(MocDemo.WORKBENCH_POINT + Vector3.UP)
	await _tap_action(&"interact")
	palace._player.global_position = demo.to_global(MocDemo.SOCKET_POINT + Vector3.UP)
	await _tap_action(&"interact")
	Game.set_world_input_blocked(&"smoke_overlay", true)
	await _tap_action(&"moc_invite")
	Game.set_world_input_blocked(&"smoke_overlay", false)
	if not _check(not bool(demo.loop.snapshot().invited), "overlay leaked I into invitation"):
		return false
	await _tap_action(&"moc_invite")
	palace._player.global_position = demo.to_global(MocDemo.ECHO_POINT + Vector3.UP)
	Game.set_world_input_blocked(&"smoke_overlay", true)
	await _tap_action(&"moc_remix")
	Game.set_world_input_blocked(&"smoke_overlay", false)
	if not _check(demo.loop.phase == MocLoop.Phase.CO_CREATE, "overlay leaked R into solo continuation"):
		return false
	await _tap_action(&"moc_remix")
	if not _check(demo.loop.phase == MocLoop.Phase.TRIAL and demo.loop.committed_modules_snapshot().size() == 1,
			"solo input path fabricated or blocked the second chair"):
		return false
	for point: Vector3 in MocDemo.TRIAL_POINTS:
		palace._player.global_position = demo.to_global(point + Vector3.UP)
		await _tap_action(&"interact")
	for point: Vector3 in MocDemo.CHORUS_POINTS:
		palace._player.global_position = demo.to_global(point + Vector3.UP)
		await _tap_action(&"interact")
	if not _check(demo.loop.phase == MocLoop.Phase.LEGACY and demo.loop.visible_module_count() == 29,
			"honest solo input path did not end visibly one module short"):
		return false
	if not _check(not demo.assembly.is_slot_visible(26) and demo.assembly.is_slot_visible(30),
			"solo runtime visuals fabricated peer slot or lost chorus slot"):
		return false
	if not _check(not bool(demo.loop.snapshot().co_created), "solo input path claimed co-creation"):
		return false
	palace.queue_free()
	await get_tree().process_frame
	return true


func _tap_action(action: StringName) -> void:
	Input.action_release(action)
	await get_tree().process_frame
	Input.action_press(action)
	await get_tree().process_frame
	Input.action_release(action)
	await get_tree().process_frame


## Instantiates the title screen headless and resizes the window across the
## supported range (960x540 floor, 1080p): the menu must build without script
## errors and keep its key nodes alive at every size.
func _check_menu_layout() -> bool:
	var menu: CanvasLayer = MainMenuScript.new()
	add_child(menu)
	await get_tree().process_frame
	for node_name: String in ["Root", "MatrixRain", "Title", "HomeList", "EnterButton",
			"PalaceButton", "DataStrip"]:
		if not _check(menu.find_child(node_name, true, false) != null,
				"menu node %s missing" % node_name):
			return false
	var win := get_window()
	if win != null:  # headless still has a root Window; resizing it is a safe no-op at OS level
		var before: Vector2i = win.size
		for dims: Vector2i in [Vector2i(960, 540), Vector2i(1920, 1080)]:
			win.size = dims
			await get_tree().process_frame
			var ok := is_instance_valid(menu) and menu.find_child("Title", true, false) != null \
					and menu.find_child("DataStrip", true, false) != null
			if not _check(ok, "menu broke after resize to %s" % dims):
				return false
		win.size = before
	menu.queue_free()
	await get_tree().process_frame
	return true


## Exercises the theme contract and the three net seams + their UI layers
## headless: loopback chat, mock voice handshake, media catalog fields.
func _check_social() -> bool:
	if not _check(UITheme.theme() is Theme, "UITheme.theme() did not return a Theme"):
		return false
	if not _check(UITheme.theme() == UITheme.theme(), "UITheme.theme() is not cached"):
		return false
	if not _check(UITheme.panel_style() is StyleBoxFlat, "panel_style() not a StyleBoxFlat"):
		return false
	for key: String in ["panel", "panel_strong", "border", "border_strong", "text", "body",
			"muted", "gold", "gold_bright", "cream", "coral", "teal_light"]:
		if not _check(UITheme.C.has(key), "UITheme.C missing key %s" % key):
			return false
	for action: String in ["chat_focus", "media_player", "voice_toggle"]:
		if not _check(InputMap.has_action(action), "input action %s missing" % action):
			return false
	if not _check(Game.get("typing") != null, "Game.typing flag missing"):
		return false

	# Chat transport: backlog replays deferred, send loops back with self=true.
	var chat_t := ChatTransportScript.new()
	chat_t.local_handle = "Smoke"
	add_child(chat_t)
	var received: Array = []
	chat_t.message_received.connect(func(msg: Dictionary) -> void: received.append(msg))
	await get_tree().process_frame  # deferred backlog lands
	var backlog := received.size()
	if not _check(backlog >= 2, "chat backlog not replayed"):
		return false
	chat_t.send("world", "hi")
	await get_tree().process_frame
	if not _check(received.size() == backlog + 1, "send('world','hi') emitted nothing"):
		return false
	var last: Dictionary = received.back()
	if not _check(bool(last.get("self", false)), "loopback message not self=true"):
		return false
	if not _check(String(last.get("body", "")) == "hi", "loopback body mangled"):
		return false
	chat_t.send("world", "   ")
	chat_t.send("nowhere", "hi")
	await get_tree().process_frame
	if not _check(received.size() == backlog + 1, "blank/unknown-channel send not dropped"):
		return false

	# Voice transport: off -> connecting -> live within ~1 s of frames.
	var voice_t := VoiceTransportScript.new()
	voice_t.local_handle = "Smoke"
	add_child(voice_t)
	voice_t.connect_voice()
	if not _check(String(voice_t.get_state().status) == "connecting", "voice not connecting"):
		return false
	await get_tree().create_timer(1.0).timeout
	var vstate: Dictionary = voice_t.get_state()
	if not _check(String(vstate.status) == "live", "voice not live after ~1 s"):
		return false
	if not _check((vstate.speakers as Array).has("Smoke"), "live speakers missing self"):
		return false
	voice_t.disconnect_voice()
	if not _check(String(voice_t.get_state().status) == "off", "voice did not disconnect"):
		return false

	# Media catalog: non-empty, every item playable + V4V-addressable.
	var catalog := MediaCatalogScript.new()
	add_child(catalog)
	var items: Array[Dictionary] = catalog.load_items()
	if not _check(not items.is_empty(), "media catalog empty"):
		return false
	for item: Dictionary in items:
		if not _check(String(item.get("audio_url", "")) != "", "media item missing audio_url"):
			return false
		if not _check(String(item.get("value_recipient", "")) != "",
				"media item missing value_recipient"):
			return false

	# UI layers build headless without errors (media skips HTTP when headless).
	var panel := ChatPanelScript.new()
	var dock := VoiceDockScript.new()
	var player := MediaPlayerScript.new()
	var craft := CraftMenuScript.new()
	add_child(panel)
	add_child(dock)
	dock.attach_transport(voice_t)
	add_child(player)
	add_child(craft)
	await get_tree().process_frame
	await get_tree().process_frame  # chat panel's own transport replays its backlog
	var alive := panel.is_inside_tree() and dock.is_inside_tree() and player.is_inside_tree() \
			and craft.is_inside_tree()
	if not _check(alive, "a social UI layer failed to instantiate"):
		return false
	if not _check(Game.world_input_blockers_snapshot().is_empty(), "UI blocker registry started dirty"):
		return false
	craft._open()
	if not _check(Game.world_input_blockers_snapshot().has(&"craft_menu"),
			"opening craft menu did not block world input"):
		return false
	craft.close()
	if not _check(not Game.world_input_blockers_snapshot().has(&"craft_menu"),
			"closing craft menu left world input blocked"):
		return false
	player._open_panel()
	if not _check(Game.world_input_blockers_snapshot().has(&"media_player"),
			"opening media panel did not block world input"):
		return false
	player._close_panel()
	if not _check(Game.world_input_blockers_snapshot().has(&"media_player") and player._panel.visible,
			"normal media close released world input before fade completed"):
		return false
	await get_tree().create_timer(0.25).timeout
	if not _check(not Game.world_input_blockers_snapshot().has(&"media_player") \
			and not player._panel.visible,
			"normal media close left panel visible or world input blocked"):
		return false
	player._open_panel()
	player.hide_panel()
	if not _check(not Game.world_input_blockers_snapshot().has(&"media_player"),
			"immediate media hide left world input blocked"):
		return false
	panel._input.grab_focus()
	await get_tree().process_frame
	if not _check(Game.world_input_blockers_snapshot().has(&"chat_input") and Game.typing,
			"real chat focus signal did not block world input"):
		return false
	panel._input.release_focus()
	await get_tree().process_frame
	if not _check(not Game.world_input_blockers_snapshot().has(&"chat_input") and not Game.typing,
			"real chat focus exit left world input blocked"):
		return false
	var walker: CharacterBody3D = PlayerScript.new()
	var magnet: Node3D = MagnetScript.new()
	add_child(walker)
	add_child(magnet)
	await get_tree().process_frame
	magnet.set_active(true)
	var magnet_before: Vector3 = magnet.global_position
	var walker_yaw: float = walker._pivot.rotation.y
	var magnet_yaw: float = magnet.rotation.y
	Game.set_world_input_blocked(&"polling_probe", true)
	Input.action_press(&"move_forward")
	Input.action_press(&"jump")
	walker.velocity = Vector3.ZERO
	walker._physics_process(0.1)
	magnet._physics_process(0.1)
	var mouse_motion := InputEventMouseMotion.new()
	mouse_motion.relative = Vector2(50.0, 20.0)
	walker._unhandled_input(mouse_motion)
	magnet._unhandled_input(mouse_motion)
	Input.action_release(&"move_forward")
	Input.action_release(&"jump")
	Game.set_world_input_blocked(&"polling_probe", false)
	if not _check(walker.velocity.x == 0.0 and walker.velocity.z == 0.0 \
			and walker.velocity.y <= 0.0 and magnet.global_position == magnet_before \
			and walker._pivot.rotation.y == walker_yaw and magnet.rotation.y == magnet_yaw,
			"world input blocker leaked movement, jump, fly or mouse aim"):
		return false
	walker.queue_free()
	magnet.queue_free()
	for node: Node in [panel, dock, player, craft, chat_t, voice_t, catalog]:
		node.queue_free()
	await get_tree().process_frame
	if not await _check_napplet_seam():
		return false
	return true


## Napplet runtime seam: the allowlist is enforced, a non-web build degrades to
## `unavailable` instead of failing, and the panel builds headless.
func _check_napplet_seam() -> bool:
	var runtime := NappletRuntimeScript.new()
	add_child(runtime)
	await get_tree().process_frame

	for m: String in ["available", "signer_available", "open", "close", "set_rect",
			"set_theme", "get_state"]:
		if not _check(runtime.has_method(m), "NappletRuntime.%s missing" % m):
			return false
	if not _check(runtime.has_signal("state_changed"), "NappletRuntime signal state_changed missing"):
		return false

	var items: Array[Dictionary] = runtime.catalog.load_items()
	if not _check(not items.is_empty(), "napplet catalog is empty"):
		return false
	for entry: Dictionary in items:
		for key: String in ["id", "title", "artifact_url", "sha256", "relays"]:
			if not _check(entry.has(key), "napplet entry missing '%s'" % key):
				return false
	if not _check(runtime.catalog.allows("plebeian-storefront"), "storefront not allowlisted"):
		return false

	# Anything not pinned must be refused before a single byte is fetched.
	if not _check(not runtime.catalog.allows("evil-napplet"), "catalog allowed an unpinned id"):
		return false
	if not _check(not runtime.open("evil-napplet", Rect2i(0, 0, 100, 100)),
			"runtime opened an unpinned napplet"):
		return false
	if not _check(String(runtime.get_state().status) == "error",
			"unpinned open did not report an error"):
		return false

	# Headless/desktop has no browser to sandbox an iframe: say so, do not crash.
	if not _check(not runtime.available(), "runtime claimed web hosting off the web export"):
		return false
	if not _check(not runtime.open("plebeian-storefront", Rect2i(0, 0, 640, 480)),
			"runtime claimed to open a napplet without a browser"):
		return false
	if not _check(String(runtime.get_state().status) == "unavailable",
			"non-web open did not report 'unavailable'"):
		return false
	# These must be inert rather than fatal off-web.
	runtime.set_rect(Rect2i(0, 0, 10, 10))
	runtime.set_theme(Color.BLACK, Color.WHITE, Color.ORANGE)
	runtime.close()

	var panel := NappletPanelScript.new()
	add_child(panel)
	await get_tree().process_frame
	panel.attach_runtime(runtime)
	if not _check(not panel.visible, "napplet panel starts visible"):
		return false

	# Opening headless must reserve a real rectangle, report `unavailable` through
	# the panel, and hand world input back on close.
	panel.open_napplet("plebeian-storefront")
	await get_tree().process_frame
	if not _check(panel.visible, "napplet panel did not open"):
		return false
	if not _check(Game.world_input_blocked(), "open napplet panel left world input live"):
		return false
	var frame_rect: Rect2i = panel._frame_rect()
	if not _check(frame_rect.size.x > 0 and frame_rect.size.y > 0,
			"napplet panel reserved an empty frame rect"):
		return false
	panel.close_napplet()
	await get_tree().process_frame
	if not _check(not panel.visible, "napplet panel stayed open after close"):
		return false
	if not _check(not Game.world_input_blocked(), "closed napplet panel kept world input blocked"):
		return false

	panel.queue_free()
	runtime.queue_free()
	await get_tree().process_frame
	return true


## Records the first failing reason; returns the condition unchanged.
func _check(cond: bool, reason: String) -> bool:
	if not cond and _fail.is_empty():
		_fail = reason
	return cond


## Asserts every contract method/signal exists on the four autoloads.
func _check_apis() -> bool:
	var specs: Array = [
		[Catalog, "Catalog",
			["get_object", "get_recipe", "recipe_ids", "block_ids", "furniture_ids", "make_material"]],
		[Economy, "Economy",
			["get_material", "get_count", "drip_rate", "can_afford", "queue_craft", "get_queue",
			"consume_object", "return_object", "set_specialty_context", "notify_condition"]],
		[Store, "Store",
			["list_homes", "create_home", "load_home", "save_home", "hosted_home", "set_hosted",
			"load_state", "save_state", "load_palace_decor", "save_palace_decor"]],
		[Game, "Game",
			["goto_menu", "goto_home", "goto_palace", "toggle_mode", "magnet_can_build"]],
	]
	for spec: Array in specs:
		var obj: Object = spec[0]
		for m: String in spec[2]:
			if not _check(obj.has_method(m), "%s.%s missing" % [spec[1], m]):
				return false
	for s: String in ["inventory_changed", "craft_completed", "move_in_arrived"]:
		if not _check(Economy.has_signal(s), "Economy signal %s missing" % s):
			return false
	for s: String in ["mode_changed", "space_changed"]:
		if not _check(Game.has_signal(s), "Game signal %s missing" % s):
			return false
	return true
