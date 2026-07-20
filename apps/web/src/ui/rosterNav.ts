// Keyboard navigation math for the character-select roster (MemberSelect). The roster is a
// responsive `auto-fill` grid, so the column count only exists at render time — the component
// measures it (detectColumns) and the arrow/Home/End stepping stays pure and testable here.

/** Keys the roster consumes; everything else (Tab, Enter, letters) keeps its native behaviour. */
export const NAV_KEYS: ReadonlySet<string> = new Set([
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "Home",
  "End",
]);

/** Column count of the rendered grid: the run of chips sharing the first row's offsetTop. */
export function detectColumns(offsetTops: readonly number[]): number {
  const first = offsetTops[0];
  if (first === undefined) return 1;
  let columns = 1;
  while (columns < offsetTops.length && offsetTops[columns] === first) columns += 1;
  return columns;
}

/**
 * Next roster index for a key, ARIA-grid style: Left/Right clamp at the ends, Up/Down move a full
 * row (Down into a partial last row lands on the final chip), Home/End jump. Unknown keys return
 * the index unchanged; degenerate counts never step out of range.
 */
export function stepRosterIndex(
  index: number,
  key: string,
  count: number,
  columns: number,
): number {
  if (count <= 0) return 0;
  const cols = Math.max(1, columns);
  const last = count - 1;
  const clamped = Math.min(Math.max(index, 0), last);
  switch (key) {
    case "ArrowLeft":
      return Math.max(clamped - 1, 0);
    case "ArrowRight":
      return Math.min(clamped + 1, last);
    case "ArrowUp":
      return clamped - cols >= 0 ? clamped - cols : clamped;
    case "ArrowDown": {
      const lastRowStart = Math.floor(last / cols) * cols;
      if (clamped >= lastRowStart) return clamped;
      return Math.min(clamped + cols, last);
    }
    case "Home":
      return 0;
    case "End":
      return last;
    default:
      return index;
  }
}
