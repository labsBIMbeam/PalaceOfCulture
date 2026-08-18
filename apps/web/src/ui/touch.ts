// Touch-first street: on a coarse-pointer device the game strips down to walking and the
// auto-dialogue — panels, feeds and desktop hints stay hidden (frontend.css `html.touch-ui`
// rules), movement comes from the on-screen joystick, and NPC dialogue advances by itself.

/** True on phones/tablets (primary pointer cannot hover-and-click precisely). */
export function isCoarsePointer(): boolean {
  try {
    return window.matchMedia?.("(pointer: coarse)").matches === true;
  } catch {
    return false;
  }
}

/** Stamp `touch-ui` on <html> once at boot so pure CSS can hide the desktop chrome. */
export function installTouchUiClass(): void {
  try {
    document.documentElement.classList.toggle("touch-ui", isCoarsePointer());
  } catch {
    // never let UI-mode detection break boot
  }
}
