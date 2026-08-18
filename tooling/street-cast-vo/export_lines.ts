/** Export every street-cast line to lines.json for the voice generator (make_voices.py).
 *
 * Run from the repo root:  pnpm exec tsx tooling/street-cast-vo/export_lines.ts
 * The cast data is the single source of truth — this file never edits lines.
 */

import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { KERNI_CREW_TOUR, STREET_CAST } from "../../apps/web/src/scene/streetCast";
import { MEMBERS } from "../../apps/web/src/ui/members";

interface VoiceLine {
  /** Output stem: apps/web/public/vo/cast/<file>.mp3 */
  file: string;
  speaker: string;
  /** The in-game presentation (parametric avatar gender) — drives the voice pool. */
  gender: "masculine" | "feminine" | "neutral" | "familiar";
  text: string;
}

const genderOf = new Map(MEMBERS.map((member) => [member.name, member.avatar.gender]));

const lines: VoiceLine[] = STREET_CAST.flatMap((entry) =>
  entry.lines.map((text, index) => ({
    file: `${entry.member.toLowerCase()}-${index + 1}`,
    speaker: entry.member,
    gender: genderOf.get(entry.member) ?? "neutral",
    text,
  })),
);
KERNI_CREW_TOUR.forEach((step, index) => {
  lines.push({ file: `kerni-${index + 1}`, speaker: "Kerni", gender: "familiar", text: step.line });
});

const out = resolve(dirname(fileURLToPath(import.meta.url)), "lines.json");
writeFileSync(out, `${JSON.stringify(lines, null, 2)}\n`);
console.log(
  `wrote ${out}: ${lines.length} lines, ${lines.reduce((n, l) => n + l.text.length, 0)} chars`,
);
