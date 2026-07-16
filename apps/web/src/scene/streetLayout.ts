import type { RoofStyle } from "./Building";
import { mulberry32 } from "./rand";

/** One table per frontage — id, polar angle and room count stay together so places can never
 *  drift out of index alignment. The south arc (≈230–310°) is kept free for the approach. */
const PLACES = [
  { id: "place:market:ring", label: "Market", angle: 318, rooms: 2 },
  { id: "place:commons:citadel-wire", label: "Commons", angle: 350, rooms: 1 },
  { id: "place:guild:culture", label: "Culture", angle: 22, rooms: 3 },
  { id: "place:arcade:portal", label: "Arcade", angle: 58, rooms: 2 },
  { id: "place:guild:shelter", label: "Shelter", angle: 94, rooms: 4 },
  { id: "place:guild:craft", label: "Workshop", angle: 130, rooms: 1 },
] as const;

export type PlaceId = (typeof PLACES)[number]["id"];

export const RING_PLACES: readonly PlaceId[] = PLACES.map(({ id }) => id);

export type Ringed = {
  id: PlaceId;
  /** Polar angle in degrees, retained for map/path projections. */
  angle: number;
  pos: [number, number, number];
  rotY: number;
  rooms: 1 | 2 | 3 | 4;
  wall: string;
  roof: string;
  height: number;
  depth: number;
  roofStyle: RoofStyle;
  porch: boolean;
};

/** Game-space centre of the round plaza (x, z) — the single source; Plaza.tsx re-exports it. */
export const PLAZA_CENTRE: [number, number] = [0, 88];
/** Radius of the paved plaza floor — the ring frontages must stay outside it. */
export const PLAZA_RADIUS = 24;
/** Waypost at the point where the south approach opens into the plaza. */
export const PLAZA_WAYPOST: [number, number, number] = [10, 0, 64];

const WAYFINDING_PLACES: readonly PlaceId[] = [
  "place:market:ring",
  "place:guild:culture",
  "place:guild:craft",
];

/** Stable ring frontage data shared by visuals and colliders. */
export function plazaRing(): Ringed[] {
  const [cx, cz] = PLAZA_CENTRE;
  const radius = 35;
  const walls = ["#cbb083", "#c7a271", "#d0c0a0", "#c2ab86", "#cbb083", "#bfa47c"];
  const roofs = ["#7a4a2c", "#6d4530", "#7f5433", "#71452a", "#7a4e36", "#684026"];
  const rnd = mulberry32(517);

  return PLACES.map(({ id, angle, rooms }, i) => {
    const radians = (angle * Math.PI) / 180;
    const x = cx + Math.cos(radians) * radius;
    const z = cz + Math.sin(radians) * radius;
    const rotY = Math.atan2(cx - x, cz - z) + (rnd() - 0.5) * 0.12;
    return {
      id,
      angle,
      pos: [x, 0, z],
      rotY,
      rooms,
      wall: walls[i % walls.length] ?? "#cbb083",
      roof: roofs[i % roofs.length] ?? "#7a4a2c",
      height: 3 + rnd() * 0.9,
      depth: 5.6 + rnd() * 1.4,
      roofStyle: rnd() > 0.45 ? "hip" : "flat",
      porch: rnd() > 0.4,
    };
  });
}

/** Readable approach directions derived from the semantic frontage table. */
export function plazaWayfinding(): { text: string; angle: number; placeId: PlaceId }[] {
  const ringById = new Map(plazaRing().map((place) => [place.id, place]));
  return WAYFINDING_PLACES.map((placeId) => {
    const place = PLACES.find(({ id }) => id === placeId);
    const target = ringById.get(placeId);
    if (!place || !target) throw new Error(`Missing authored plaza place: ${placeId}`);
    return {
      text: place.label,
      angle: -Math.atan2(target.pos[2] - PLAZA_WAYPOST[2], target.pos[0] - PLAZA_WAYPOST[0]),
      placeId,
    };
  });
}
