// The plaza foundation's growth law (docs/design/demo-loop-and-zap-light.md, decision 3):
// progress advances deterministically per completed raid run — community work becomes
// architecture. Zap volume never drives this. The law itself (progress = completed / 210)
// lives in @600b/multiplayer so client and server can never disagree about it.

import { RAID_FULL_GROWTH_COMPLETIONS, foundationProgress } from "@600b/multiplayer";

export { RAID_FULL_GROWTH_COMPLETIONS, foundationProgress };

/** Masonry courses the finished foundation drum stands on (21 — the lock numerology). */
export const FOUNDATION_COURSE_COUNT = 21;

/** Completed runs that reveal one more course (210 / 21 = every 10th run pops a course). */
export const RAIDS_PER_COURSE = RAID_FULL_GROWTH_COMPLETIONS / FOUNDATION_COURSE_COUNT;

export interface FoundationCourseSpec {
  /** Centre height of this course above the plaza floor. */
  readonly y: number;
  /** Top radius; the drum tapers gently from 4.3 m at the plinth to 3.88 m at the crown. */
  readonly radius: number;
  readonly height: number;
  /** Alternating masonry tone index (0 | 1). */
  readonly tone: 0 | 1;
}

const PLINTH_TOP_Y = 0.35;
const COURSE_HEIGHT = 0.23;
const BASE_RADIUS = 4.3;
const CROWN_RADIUS = 3.88;

/** Courses fully revealed at this completion count (0..21). */
export function visibleFoundationCourses(completedRaids: number): number {
  const progress = foundationProgress(completedRaids);
  return Math.min(FOUNDATION_COURSE_COUNT, Math.floor(progress * FOUNDATION_COURSE_COUNT));
}

/** Completed runs still missing before the next course rises (0 when the drum is complete). */
export function raidsUntilNextCourse(completedRaids: number): number {
  const courses = visibleFoundationCourses(completedRaids);
  if (courses >= FOUNDATION_COURSE_COUNT) return 0;
  return Math.ceil((courses + 1) * RAIDS_PER_COURSE - completedRaids);
}

/** Deterministic dimensions for course `index` (0-based, bottom to crown). */
export function foundationCourseSpec(index: number): FoundationCourseSpec {
  const step = (BASE_RADIUS - CROWN_RADIUS) / (FOUNDATION_COURSE_COUNT - 1);
  return {
    y: PLINTH_TOP_Y + index * COURSE_HEIGHT + COURSE_HEIGHT / 2,
    radius: BASE_RADIUS - step * index,
    height: COURSE_HEIGHT,
    tone: (index % 2) as 0 | 1,
  };
}
