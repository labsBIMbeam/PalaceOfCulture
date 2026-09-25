// Turn Natural Earth's 838 KB countries.geojson into something a napplet can
// inline. A napplet is one self-contained file with no origin to fetch from, so
// the world has to ship inside the artifact — which means dropping ~90
// properties per feature, simplifying rings, and rounding to a precision that
// still looks right at world scale.
//
// Simplification is Ramer-Douglas-Peucker, not stride sampling. Stride drops
// points by position rather than by importance: it shaves headlands and fjords
// flat while spending the same budget on straight coast, which is what made the
// old outlines look wrong. RDP keeps exactly the points the shape cannot do
// without.
//
// Run: node tools/build-world.mjs <path-to-countries.geojson>
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SOURCE =
  process.argv[2] ?? "G:/Github/PalaceOfCulture/godot/assets/world/countries.geojson";
const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "world.ts");

/**
 * ~0.01° ≈ 1.1 km. The map is 360 units wide, so even on a 4K display one
 * degree is ~10 px and this rounding lands well inside a pixel. At the old
 * 1 decimal the grid was ~0.33 px and coastlines visibly staircased.
 */
const PRECISION = 2;
/** Rings smaller than this bounding box in degrees are dropped (true islets). */
const MIN_SPAN = 0.25;
/**
 * RDP tolerance in degrees. Roughly the largest error the simplified line may
 * have from the original; 0.05° ≈ 5.5 km, under half a pixel at world scale.
 */
const TOLERANCE = 0.05;
/** Safety net only — RDP does the real work, this just bounds pathological rings. */
const MAX_POINTS = 900;

const round = (n) => Number(n.toFixed(PRECISION));

/**
 * Perpendicular distance from `p` to the segment `a`-`b`, in degrees. Squared
 * distances throughout: the comparison is all RDP needs and it avoids a sqrt
 * per point.
 */
function segmentDistanceSq(p, a, b) {
  let dx = b[0] - a[0];
  let dy = b[1] - a[1];
  if (dx !== 0 || dy !== 0) {
    const t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy);
    if (t > 1) {
      return (p[0] - b[0]) ** 2 + (p[1] - b[1]) ** 2;
    }
    if (t > 0) {
      dx = p[0] - (a[0] + dx * t);
      dy = p[1] - (a[1] + dy * t);
      return dx * dx + dy * dy;
    }
  }
  return (p[0] - a[0]) ** 2 + (p[1] - a[1]) ** 2;
}

/**
 * Ramer-Douglas-Peucker, iterative so a 10k-point coastline cannot blow the
 * stack. Returns the kept points in order, endpoints always included.
 */
function simplify(ring, tolerance) {
  if (ring.length < 3) return ring;
  const toleranceSq = tolerance * tolerance;
  const keep = new Uint8Array(ring.length);
  keep[0] = 1;
  keep[ring.length - 1] = 1;

  const stack = [[0, ring.length - 1]];
  while (stack.length > 0) {
    const [first, last] = stack.pop();
    let worst = 0;
    let index = -1;
    for (let i = first + 1; i < last; i += 1) {
      const distance = segmentDistanceSq(ring[i], ring[first], ring[last]);
      if (distance > worst) {
        worst = distance;
        index = i;
      }
    }
    // Everything between first and last is within tolerance of the chord, so
    // the chord replaces it.
    if (index === -1 || worst <= toleranceSq) continue;
    keep[index] = 1;
    stack.push([first, index], [index, last]);
  }

  const out = [];
  for (let i = 0; i < ring.length; i += 1) if (keep[i]) out.push(ring[i]);
  return out;
}

/**
 * A closed ring has no natural endpoints, and RDP pins whichever two it is
 * given. Splitting at the two most distant points gives it real anchors, so the
 * simplified ring does not develop a flat spot at an arbitrary seam.
 */
function simplifyRing(ring, tolerance) {
  const closed =
    ring.length > 3 &&
    ring[0][0] === ring[ring.length - 1][0] &&
    ring[0][1] === ring[ring.length - 1][1];
  if (!closed) return simplify(ring, tolerance);

  const open = ring.slice(0, -1);
  let far = 0;
  let worst = -1;
  for (let i = 1; i < open.length; i += 1) {
    const distance = (open[i][0] - open[0][0]) ** 2 + (open[i][1] - open[0][1]) ** 2;
    if (distance > worst) {
      worst = distance;
      far = i;
    }
  }
  const head = simplify(open.slice(0, far + 1), tolerance);
  const tail = simplify(open.slice(far), tolerance);
  // `far` is the last of head and the first of tail — drop one copy.
  const merged = head.concat(tail.slice(1));
  merged.push(merged[0]);
  return merged;
}

function span(ring) {
  let minX = 180;
  let maxX = -180;
  let minY = 90;
  let maxY = -90;
  for (const [x, y] of ring) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  return Math.max(maxX - minX, maxY - minY);
}

/**
 * True when the ring hops the antimeridian.
 *
 * The tell is a jump between *consecutive* points — +179 to -179 is 2 km on the
 * globe and 358 units on a flat map, so it streaks a line across everything.
 * Total width is not the test: Antarctica spans all 360° with no jump anywhere,
 * because its ring runs the coast and closes along the pole, and it draws
 * perfectly well in equirectangular.
 */
function crossesAntimeridian(ring) {
  for (let i = 1; i < ring.length; i += 1) {
    const [x, y] = ring[i];
    const [px, py] = ring[i - 1];
    if (Math.abs(x - px) <= 180) continue;
    // A jump at a pole is not a tear: [180,-90] and [-180,-90] are the same
    // place on the globe, and every polar polygon carries that seam because it
    // has to close along the bottom edge. Antarctica draws correctly with it.
    if (Math.abs(y) >= 89.5 && Math.abs(py) >= 89.5) continue;
    return true;
  }
  return false;
}

let wrapped = 0;

function cleanRing(ring) {
  if (span(ring) < MIN_SPAN) return null;
  // Natural Earth normally pre-splits these, so this only fires on a bad source.
  if (crossesAntimeridian(ring)) {
    wrapped += 1;
    return null;
  }

  let simplified = simplifyRing(ring, TOLERANCE);
  // Escalate rather than truncate: cutting the tail off a ring leaves a
  // straight line across the country, a coarser pass just loses fine detail.
  let tolerance = TOLERANCE;
  while (simplified.length > MAX_POINTS) {
    tolerance *= 2;
    simplified = simplifyRing(ring, tolerance);
  }

  const out = [];
  for (const [x, y] of simplified) {
    const point = [round(x), round(y)];
    // Collapse consecutive duplicates introduced by rounding.
    const prev = out[out.length - 1];
    if (!prev || prev[0] !== point[0] || prev[1] !== point[1]) out.push(point);
  }
  return out.length >= 4 ? out : null;
}

const source = JSON.parse(readFileSync(SOURCE, "utf8"));
const countries = [];

for (const feature of source.features) {
  const name =
    feature.properties.ADMIN ?? feature.properties.SOVEREIGNT ?? feature.properties.NAME;
  if (!name) continue;
  const polygons =
    feature.geometry.type === "Polygon"
      ? [feature.geometry.coordinates]
      : feature.geometry.coordinates;

  const rings = [];
  for (const polygon of polygons) {
    // Outer ring only — holes are invisible at this scale and cost a third of the size.
    const cleaned = cleanRing(polygon[0]);
    if (cleaned) rings.push(cleaned);
  }
  if (rings.length > 0) countries.push({ n: name, r: rings });
}

const points = countries.reduce((sum, c) => sum + c.r.reduce((s, r) => s + r.length, 0), 0);
const rings = countries.reduce((sum, c) => sum + c.r.length, 0);
const body = `/**
 * Simplified world outlines, generated by tools/build-world.mjs from Natural
 * Earth. Do not edit by hand — regenerate instead.
 *
 * ${countries.length} countries, ${rings} rings, ${points} points.
 * Douglas-Peucker at ${TOLERANCE}°, ${PRECISION} decimal places.
 */

/** One country: a display name and its outer rings as [lon, lat] pairs. */
export interface Country {
  n: string;
  r: [number, number][][];
}

export const WORLD: Country[] = ${JSON.stringify(countries)};
`;

writeFileSync(OUT, body, "utf8");
process.stdout.write(
  `world.ts: ${countries.length} countries, ${rings} rings, ${points} points, ` +
    `${(body.length / 1024).toFixed(1)} KB` +
    (wrapped > 0 ? ` (${wrapped} antimeridian ring(s) dropped)` : "") +
    "\n",
);
