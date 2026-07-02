## Third-person walking character. Builds its own capsule body, head and
## SpringArm3D orbit camera in code; worlds toggle it via set_active().
extends CharacterBody3D

const SPEED := 5.0
const SPRINT_SPEED := 9.0
const JUMP_VELOCITY := 7.0
const GRAVITY := 18.0
const MOUSE_SENSITIVITY := 0.003
const PITCH_MIN := -1.2
const PITCH_MAX := 0.5

var _pivot: Node3D
var _camera: Camera3D
var _active := true


func _ready() -> void:
	var collider := CollisionShape3D.new()
	var capsule := CapsuleShape3D.new()
	capsule.radius = 0.4
	capsule.height = 1.6
	collider.shape = capsule
	collider.position = Vector3(0, 0.8, 0)
	add_child(collider)

	var body := MeshInstance3D.new()
	var body_mesh := CapsuleMesh.new()
	body_mesh.radius = 0.4
	body_mesh.height = 1.6
	body_mesh.material = Catalog.make_material(Color("23806f"))
	body.mesh = body_mesh
	body.position = Vector3(0, 0.8, 0)
	add_child(body)

	var head := MeshInstance3D.new()
	var head_mesh := SphereMesh.new()
	head_mesh.radius = 0.28
	head_mesh.height = 0.56
	head_mesh.material = Catalog.make_material(Color("efe6d2"))
	head.mesh = head_mesh
	head.position = Vector3(0, 1.85, 0)
	add_child(head)

	_pivot = Node3D.new()
	_pivot.position = Vector3(0, 1.6, 0)
	_pivot.rotation.x = -0.3
	add_child(_pivot)

	var arm := SpringArm3D.new()
	arm.spring_length = 4.5
	arm.add_excluded_object(get_rid())
	_pivot.add_child(arm)

	_camera = Camera3D.new()
	arm.add_child(_camera)

	_apply_active()


## Enables/disables input, physics and the camera; worlds call this on mode switches.
func set_active(on: bool) -> void:
	_active = on
	if _camera != null:
		_apply_active()


func _apply_active() -> void:
	set_physics_process(_active)
	set_process_unhandled_input(_active)
	_camera.current = _active
	if _active:
		Input.mouse_mode = Input.MOUSE_MODE_CAPTURED
	else:
		velocity = Vector3.ZERO


func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventMouseMotion and Input.mouse_mode == Input.MOUSE_MODE_CAPTURED:
		_pivot.rotation.y -= event.relative.x * MOUSE_SENSITIVITY
		_pivot.rotation.x = clampf(
			_pivot.rotation.x - event.relative.y * MOUSE_SENSITIVITY, PITCH_MIN, PITCH_MAX
		)


func _physics_process(delta: float) -> void:
	if not is_on_floor():
		velocity.y -= GRAVITY * delta
	elif Input.is_action_just_pressed("jump"):
		velocity.y = JUMP_VELOCITY
	var input := Vector2.ZERO
	if Input.mouse_mode == Input.MOUSE_MODE_CAPTURED:
		input = Input.get_vector("move_left", "move_right", "move_forward", "move_back")
	var dir := Vector3(input.x, 0.0, input.y).rotated(Vector3.UP, _pivot.rotation.y)
	var speed := SPRINT_SPEED if Input.is_action_pressed("sprint") else SPEED
	velocity.x = dir.x * speed
	velocity.z = dir.z * speed
	move_and_slide()
