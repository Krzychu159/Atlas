export const SLOT_STEP_MINUTES = 15;
export const DEFAULT_SLOT_MINUTES = 60;
export const LONG_PRESS_MS = 500;
export const TOUCH_MOVE_TOLERANCE_PX = 10;
// A long press can be followed by a synthetic click (or a tap landing on the freshly opened form).
const CLICK_SUPPRESS_MS = 700;
const LAST_SLOT_START = 24 * 60 - SLOT_STEP_MINUTES;

/** Minutes since local midnight, rounded to the nearest 15 minutes and kept within the day. */
export function roundSlotMinutes(minutes: number) {
  const rounded = Math.round(minutes / SLOT_STEP_MINUTES) * SLOT_STEP_MINUTES;
  return Math.min(Math.max(rounded, 0), LAST_SLOT_START);
}

/** Local wall-clock start on `day` — built from calendar fields, so no UTC shift. */
export function slotStartDate(day: Date, minutesFromMidnight: number) {
  const minutes = roundSlotMinutes(minutesFromMidnight);
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), Math.floor(minutes / 60), minutes % 60, 0, 0);
}

export type SlotPointer = {
  pointerId: number;
  pointerType: string;
  clientX: number;
  clientY: number;
  button?: number;
  isPrimary?: boolean;
};

type Timer = ReturnType<typeof setTimeout>;

/**
 * Decides when a press on an empty part of the grid should create a session:
 * a mouse/pen click right away, a touch only after a steady long press, so a
 * plain tap or swipe keeps scrolling the calendar.
 */
export function createSlotPress({
  longPressMs = LONG_PRESS_MS,
  tolerancePx = TOUCH_MOVE_TOLERANCE_PX,
  now = () => Date.now(),
  schedule = (callback: () => void, ms: number) => setTimeout(callback, ms),
  unschedule = (timer: Timer) => clearTimeout(timer),
}: {
  longPressMs?: number;
  tolerancePx?: number;
  now?: () => number;
  schedule?: (callback: () => void, ms: number) => Timer;
  unschedule?: (timer: Timer) => void;
} = {}) {
  let lastPointerType = "mouse";
  let press: { pointerId: number; x: number; y: number; timer: Timer } | null = null;
  let mouseDown: { x: number; y: number } | null = null;
  let suppressClicksUntil = 0;

  function cancel() {
    if (press) unschedule(press.timer);
    press = null;
  }

  return {
    /** `onActivate` runs only if this touch turns into a steady long press. */
    down(event: SlotPointer, onActivate: () => void) {
      lastPointerType = event.pointerType;
      if (event.pointerType !== "touch") {
        mouseDown = event.button === 0 || event.button === undefined ? { x: event.clientX, y: event.clientY } : null;
        return;
      }
      cancel();
      // A second finger means pinch-zoom, not a press.
      if (event.isPrimary === false) return;
      const timer = schedule(() => {
        press = null;
        suppressClicksUntil = now() + CLICK_SUPPRESS_MS;
        onActivate();
      }, longPressMs);
      press = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, timer };
    },
    move(event: SlotPointer) {
      if (!press || event.pointerId !== press.pointerId) return;
      if (Math.hypot(event.clientX - press.x, event.clientY - press.y) > tolerancePx) cancel();
    },
    /** Finger lifted, browser took over for scrolling (pointercancel) or the pointer left the grid. */
    end(event?: Pick<SlotPointer, "pointerId">) {
      if (!press || (event && event.pointerId !== press.pointerId)) return;
      cancel();
    },
    /** Returns true when the click should create a session at `point`. */
    click(event: Pick<SlotPointer, "clientX" | "clientY">) {
      if (now() < suppressClicksUntil) return false;
      if (lastPointerType === "touch") return false;
      const start = mouseDown;
      mouseDown = null;
      // Ignore drags (e.g. selecting text) that happen to end on the grid.
      return !start || Math.hypot(event.clientX - start.x, event.clientY - start.y) <= tolerancePx;
    },
    /** Clicks anywhere right after a long press should be swallowed. */
    shouldSuppressClick() {
      return now() < suppressClicksUntil;
    },
    /** Long-pressing would otherwise open the browser's context menu on touch screens. */
    shouldPreventContextMenu() {
      return lastPointerType === "touch";
    },
    cancel,
  };
}
