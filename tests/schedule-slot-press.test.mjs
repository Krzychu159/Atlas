import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function loadModule(path, requireMap = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText, {
    exports, Date, Math, Intl, setTimeout, clearTimeout,
    require: (name) => {
      if (name in requireMap) return requireMap[name];
      throw new Error(`Unexpected import ${name}`);
    },
  });
  return exports;
}

const slots = loadModule("app/(app)/owner/schedule/slot-press.ts");
const dateUtils = loadModule("app/(app)/owner/schedule/date-utils.ts");
const sessionUtils = loadModule("app/(app)/owner/schedule/session-utils.ts", {
  "@/app/lib/group-sessions": { isGroupTraining: () => false, groupSeatsLabel: () => "" },
  "@/app/lib/user-messages": { sessionTrainingType: () => "" },
  "@/app/lib/owner/sessions": { completeSession: () => undefined, updateSession: () => undefined },
  "./date-utils": dateUtils,
});

function withTimeZone(timeZone, run) {
  const previous = process.env.TZ;
  process.env.TZ = timeZone;
  try { run(); } finally {
    if (previous === undefined) delete process.env.TZ; else process.env.TZ = previous;
  }
}

const localParts = (date) => [date.getFullYear(), date.getMonth() + 1, date.getDate(), date.getHours(), date.getMinutes()];

test("slot start rounds to the nearest 15 minutes and stays within the day", () => {
  assert.equal(slots.roundSlotMinutes(14 * 60 + 7), 14 * 60);
  assert.equal(slots.roundSlotMinutes(14 * 60 + 8), 14 * 60 + 15);
  assert.equal(slots.roundSlotMinutes(14 * 60 + 52), 14 * 60 + 45);
  assert.equal(slots.roundSlotMinutes(14 * 60 + 53), 15 * 60);
  assert.equal(slots.roundSlotMinutes(-20), 0);
  assert.equal(slots.roundSlotMinutes(23 * 60 + 59), 23 * 60 + 45);
});

test("slot start is local wall-clock time on the clicked day, without UTC shifts", () => {
  for (const timeZone of ["Europe/Warsaw", "America/New_York", "Pacific/Auckland"]) {
    withTimeZone(timeZone, () => {
      const tuesday = new Date(2026, 9, 13, 0, 0);
      assert.deepEqual(localParts(slots.slotStartDate(tuesday, 14 * 60 + 2)), [2026, 10, 13, 14, 0], timeZone);
      assert.deepEqual(localParts(slots.slotStartDate(tuesday, 23 * 60 + 40)), [2026, 10, 13, 23, 45], timeZone);
      assert.deepEqual(localParts(slots.slotStartDate(tuesday, 5)), [2026, 10, 13, 0, 0], timeZone);
    });
  }
  // The clocks go back on 25 October 2026 in Poland; the slot still shows the picked hour.
  withTimeZone("Europe/Warsaw", () => {
    assert.deepEqual(localParts(slots.slotStartDate(new Date(2026, 9, 25), 14 * 60)), [2026, 10, 25, 14, 0]);
  });
});

test("the create form takes the picked slot with a 60-minute default and keeps 10:00 otherwise", () => {
  withTimeZone("Europe/Warsaw", () => {
    const day = new Date(2026, 9, 13, 0, 0);
    const base = { session: null, date: day, trainers: [], locations: [], defaultTrainerId: null };
    const picked = sessionUtils.getDefaultFormValues({ ...base, startAt: slots.slotStartDate(day, 14 * 60 + 9) });
    assert.equal(picked.startAt, "2026-10-13T14:15");
    assert.equal(picked.endAt, "2026-10-13T15:15");
    const late = sessionUtils.getDefaultFormValues({ ...base, startAt: slots.slotStartDate(day, 23 * 60 + 30) });
    assert.equal(late.startAt, "2026-10-13T23:30");
    assert.equal(late.endAt, "2026-10-14T00:30");
    const fallback = sessionUtils.getDefaultFormValues(base);
    assert.equal(fallback.startAt, "2026-10-13T10:00");
    assert.equal(fallback.endAt, "2026-10-13T11:00");
  });
});

function harness() {
  let clock = 0;
  let nextId = 1;
  const timers = new Map();
  const press = slots.createSlotPress({
    now: () => clock,
    schedule: (callback, ms) => { const id = nextId++; timers.set(id, { callback, at: clock + ms }); return id; },
    unschedule: (id) => timers.delete(id),
  });
  const advance = (ms) => {
    clock += ms;
    for (const [id, timer] of [...timers]) if (timer.at <= clock) { timers.delete(id); timer.callback(); }
  };
  return { press, advance };
}

const touch = (x, y, extra = {}) => ({ pointerId: 7, pointerType: "touch", clientX: x, clientY: y, isPrimary: true, ...extra });
const mouse = (x, y) => ({ pointerId: 1, pointerType: "mouse", clientX: x, clientY: y, button: 0 });

test("a mouse click on an empty slot creates a session; a drag or right button does not", () => {
  const { press } = harness();
  press.down(mouse(100, 200), () => assert.fail("mouse never long-presses"));
  assert.equal(press.click({ clientX: 102, clientY: 201 }), true);
  press.down(mouse(100, 200), () => undefined);
  assert.equal(press.click({ clientX: 100, clientY: 260 }), false, "dragging is not a click");
  press.down({ ...mouse(100, 200), button: 2 }, () => undefined);
  assert.equal(press.click({ clientX: 100, clientY: 200 }), true, "the click event only fires for the primary button");
  assert.equal(press.shouldPreventContextMenu(), false);
});

test("a short tap on touch never opens the form, so taps and scrolls stay free", () => {
  const { press, advance } = harness();
  let created = 0;
  press.down(touch(50, 300), () => created++);
  advance(200);
  press.end({ pointerId: 7 });
  advance(1000);
  assert.equal(created, 0);
  assert.equal(press.click({ clientX: 50, clientY: 300 }), false, "the tap's synthetic click is ignored");
});

test("scrolling cancels a pending long press (finger moves or the browser takes over)", () => {
  const { press, advance } = harness();
  let created = 0;
  press.down(touch(50, 300), () => created++);
  advance(150);
  press.move(touch(52, 304));
  advance(100);
  press.move(touch(50, 330));
  advance(1000);
  assert.equal(created, 0, "moving past the tolerance cancels");

  press.down(touch(50, 300), () => created++);
  advance(120);
  press.end({ pointerId: 7 }); // pointercancel when native scrolling starts
  advance(1000);
  assert.equal(created, 0, "pointercancel cancels");

  press.down(touch(50, 300), () => created++);
  press.down(touch(80, 300, { pointerId: 8, isPrimary: false }), () => created++);
  advance(1000);
  assert.equal(created, 0, "a second finger (pinch) cancels");
});

test("a steady 500 ms long press creates once and swallows the click that follows", () => {
  const { press, advance } = harness();
  let created = 0;
  press.down(touch(50, 300), () => created++);
  press.move(touch(53, 302));
  advance(499);
  assert.equal(created, 0);
  advance(1);
  assert.equal(created, 1);
  assert.equal(press.shouldPreventContextMenu(), true);
  press.end({ pointerId: 7 });
  assert.equal(press.shouldSuppressClick(), true);
  assert.equal(press.click({ clientX: 50, clientY: 300 }), false);
  advance(1000);
  assert.equal(created, 1);
  assert.equal(press.shouldSuppressClick(), false);

  // A device with touch screen and mouse: the next mouse click works normally.
  press.down(mouse(10, 10), () => undefined);
  assert.equal(press.click({ clientX: 10, clientY: 10 }), true);
  assert.equal(press.shouldPreventContextMenu(), false);
});
