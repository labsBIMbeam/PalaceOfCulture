// Character-select keyboard navigation — the roster is one roving tab stop, arrows move the
// highlight through the responsive grid. Pure math here; MemberSelect wires it to the DOM.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { detectColumns, stepRosterIndex } from "../src/ui/rosterNav";

const webRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// Column detection: chips on the first rendered row share an offsetTop; the count of that run is
// the grid's column count. A single column and an all-one-row roster both resolve correctly.
assert.equal(detectColumns([0, 0, 0, 44, 44, 44, 88]), 3);
assert.equal(detectColumns([0, 44, 88, 132]), 1);
assert.equal(detectColumns([12, 12, 12, 12]), 4, "one full row = all chips are columns");
assert.equal(detectColumns([]), 1, "empty roster degrades to one column");
console.log("ok: column detection from chip offsets");

// Horizontal steps clamp at the roster edges (ARIA grid behaviour — no surprise wrap).
assert.equal(stepRosterIndex(0, "ArrowLeft", 28, 5), 0);
assert.equal(stepRosterIndex(0, "ArrowRight", 28, 5), 1);
assert.equal(stepRosterIndex(27, "ArrowRight", 28, 5), 27);
assert.equal(stepRosterIndex(9, "ArrowLeft", 28, 5), 8);
console.log("ok: left/right clamp at the edges");

// Vertical steps move a full row; the top row ignores Up, the last row ignores Down. Stepping down
// into a partial last row lands on the final chip instead of dying mid-air.
assert.equal(stepRosterIndex(2, "ArrowUp", 28, 5), 2);
assert.equal(stepRosterIndex(7, "ArrowUp", 28, 5), 2);
assert.equal(stepRosterIndex(2, "ArrowDown", 28, 5), 7);
assert.equal(stepRosterIndex(23, "ArrowDown", 28, 5), 27, "partial last row catches the step");
assert.equal(stepRosterIndex(26, "ArrowDown", 28, 5), 26, "last row: Down is a no-op");
assert.equal(stepRosterIndex(0, "ArrowDown", 3, 3), 0, "single-row roster: Down is a no-op");
console.log("ok: up/down move by row without falling off the grid");

// Home/End jump; anything else (Tab, letters) leaves the index alone.
assert.equal(stepRosterIndex(13, "Home", 28, 5), 0);
assert.equal(stepRosterIndex(13, "End", 28, 5), 27);
assert.equal(stepRosterIndex(13, "Tab", 28, 5), 13);
assert.equal(stepRosterIndex(13, "a", 28, 5), 13);
console.log("ok: home/end jump, other keys pass through");

// Degenerate guards: hostile columns/count never produce an out-of-range index.
assert.equal(stepRosterIndex(0, "ArrowDown", 1, 0), 0);
assert.equal(stepRosterIndex(5, "ArrowRight", 0, 5), 0);
console.log("ok: degenerate inputs stay in range");

// MemberSelect must actually wire the roving pattern: one tab stop (roving tabIndex), arrows via
// stepRosterIndex, and initial focus on the active chip so arrows work straight off the story cards.
const memberSelect = readFileSync(resolve(webRoot, "src/ui/MemberSelect.tsx"), "utf8");
assert.ok(memberSelect.includes("stepRosterIndex"), "MemberSelect steps through rosterNav");
assert.ok(memberSelect.includes("detectColumns"), "MemberSelect measures the live grid");
assert.ok(memberSelect.includes("tabIndex"), "MemberSelect uses a roving tab stop");
console.log("ok: character select wires the roving keyboard pattern");

console.log("\nROSTER NAV TESTS GREEN");
