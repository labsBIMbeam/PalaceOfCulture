// Locks the foundation-grows-on-raids law (docs/design/demo-loop-and-zap-light.md, decision 3):
// deterministic growth per completed run, 210 runs to full, 21 masonry courses, and a strict
// no-data completion report. Zap volume must never appear anywhere in this math.

import {
  MULTIPLAYER_PROTOCOL_VERSION,
  MultiplayerInputError,
  RAID_FULL_GROWTH_COMPLETIONS,
  foundationProgress,
  parseRaidCompleteMessage,
} from "@600b/multiplayer";
import {
  FOUNDATION_COURSE_COUNT,
  RAIDS_PER_COURSE,
  foundationCourseSpec,
  raidsUntilNextCourse,
  visibleFoundationCourses,
} from "../src/scene/foundationGrowth";

function assert(name: string, condition: boolean): void {
  if (!condition) throw new Error(`FAIL: ${name}`);
  console.log(`ok: ${name}`);
}

function rejects(name: string, run: () => void): void {
  try {
    run();
  } catch (error) {
    assert(name, error instanceof MultiplayerInputError);
    return;
  }
  throw new Error(`FAIL: ${name} (accepted)`);
}

// The law itself, shared with the server through @600b/multiplayer.
assert("state change ships as protocol version 4", MULTIPLAYER_PROTOCOL_VERSION === 4);
assert("210 completed runs reach full growth", RAID_FULL_GROWTH_COMPLETIONS === 210);
assert("zero runs is zero progress", foundationProgress(0) === 0);
assert("half the runs is half the growth", foundationProgress(105) === 0.5);
assert("full growth caps at one", foundationProgress(210) === 1 && foundationProgress(9_999) === 1);
assert("garbage counts never grow", foundationProgress(Number.NaN) === 0);
assert("negative counts never grow", foundationProgress(-5) === 0);

// The masonry drum: 21 courses, one per ten runs, floor semantics (a course pops complete).
assert("21 courses to the crown", FOUNDATION_COURSE_COUNT === 21);
assert("a course rises every ten runs", RAIDS_PER_COURSE === 10);
assert("an untouched site has no courses", visibleFoundationCourses(0) === 0);
assert("nine runs have not raised the first course", visibleFoundationCourses(9) === 0);
assert("the tenth run raises the first course", visibleFoundationCourses(10) === 1);
assert("104 runs stand ten courses tall", visibleFoundationCourses(104) === 10);
assert("run 110 raises the eleventh course", visibleFoundationCourses(110) === 11);
assert("210 runs complete the drum", visibleFoundationCourses(210) === 21);
assert("the drum never exceeds its crown", visibleFoundationCourses(100_000) === 21);

// The demo pre-seed math the runbook relies on: seed 109 -> the live run on stage pops a course.
assert("seed 109 leaves exactly one run to the next course", raidsUntilNextCourse(109) === 1);
assert("a fresh boundary resets the wait to ten", raidsUntilNextCourse(110) === 10);
assert("a complete drum waits for nothing", raidsUntilNextCourse(210) === 0);

// Deterministic course dimensions: stacked without gaps, tapering, alternating tones.
const first = foundationCourseSpec(0);
const crown = foundationCourseSpec(FOUNDATION_COURSE_COUNT - 1);
assert("the first course sits on the plinth", Math.abs(first.y - first.height / 2 - 0.35) < 1e-9);
assert("the drum tapers toward the crown", first.radius === 4.3 && crown.radius === 3.88);
for (let i = 1; i < FOUNDATION_COURSE_COUNT; i += 1) {
  const below = foundationCourseSpec(i - 1);
  const course = foundationCourseSpec(i);
  if (Math.abs(course.y - below.y - course.height) > 1e-9) {
    throw new Error(`FAIL: course ${i} does not sit flush on course ${i - 1}`);
  }
  if (course.radius >= below.radius) throw new Error(`FAIL: course ${i} does not taper`);
  if (course.tone === below.tone) throw new Error(`FAIL: course ${i} does not alternate tone`);
}
console.log("ok: all 21 courses stack flush, taper, and alternate");

// The completion report is a strict, empty record — a claim carries no client-authored facts.
assert("an empty report parses", Object.keys(parseRaidCompleteMessage({})).length === 0);
rejects("extra fields are rejected", () => parseRaidCompleteMessage({ completedRaids: 999 }));
rejects("arrays are rejected", () => parseRaidCompleteMessage([]));
rejects("null is rejected", () => parseRaidCompleteMessage(null));
rejects("class instances are rejected", () => parseRaidCompleteMessage(new (class {})()));

console.log("foundation-smoke: all assertions passed");
