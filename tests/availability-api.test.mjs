import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

class ApiError extends Error {
  constructor(message, { status, payload }) { super(message); this.status = status; this.payload = payload; }
}

function loadModule(path, requireMap) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText, {
    exports, Date, Number, Array, Object, JSON,
    require: (name) => {
      if (name in requireMap) return requireMap[name];
      throw new Error(`Unexpected import ${name}`);
    },
  });
  return exports;
}

const api = loadModule("app/lib/availability.ts", {
  "./backend": { ApiError, backendGet: async () => null, backendPost: async () => null, backendPut: async () => null },
  "./user-messages": { userMessage: (value, fallback) => (typeof value === "string" && /[ąćęłńóśźż]/i.test(value) ? value : fallback) },
});
const plain = (value) => JSON.parse(JSON.stringify(value));

test("a week with null lists is read as empty lists, not a crash", () => {
  const week = api.asAvailabilityWeek({
    weekStart: "2026-11-30", status: "Submitted", isLocked: true, deadlineAt: "2026-11-29T19:00:00Z",
    pendingChangeRequest: { id: 5, weekStart: "2026-11-30", status: "Pending", days: [{ date: "2026-12-02", mode: "Off", ranges: null }], currentDays: null },
    days: [{ date: "2026-11-30", dayOfWeek: 1, mode: "Locked", ranges: null, templateRanges: [{ start: "08:00", end: "12:00" }] }],
  }, "2026-11-30");
  assert.equal(week.status, "Submitted");
  assert.deepEqual(plain(week.days[0].ranges), []);
  assert.deepEqual(plain(week.pendingChangeRequest.days), [{ date: "2026-12-02", mode: "Off", ranges: [] }]);
  assert.deepEqual(plain(week.pendingChangeRequest.currentDays), []);
  assert.equal(week.canUnsubmit, false);
  assert.equal(week.submittedAfterDeadline, false);
});

test("a confirmed week may still be taken back, and a late confirmation is kept", () => {
  const week = api.asAvailabilityWeek({
    weekStart: "2026-11-30", status: "Submitted", isLocked: true, canUnsubmit: true, submittedAfterDeadline: true,
    days: [{ date: "2026-11-30", dayOfWeek: 1, mode: "Locked", ranges: [], templateRanges: [] }],
  }, "2026-11-30");
  assert.equal(week.canUnsubmit, true);
  assert.equal(week.submittedAfterDeadline, true);
});

test("something that is not the requested week is rejected", () => {
  assert.equal(api.asAvailabilityWeek({ weekStart: "2026-11-23", days: [] }, "2026-11-30"), null);
  assert.equal(api.asAvailabilityWeek({ weekStart: "2026-11-30", days: null }, "2026-11-30"), null);
  assert.equal(api.asAvailabilityWeek(null), null);
});

test("validation errors keep the Polish message and the day they refer to", () => {
  const error = new ApiError("Przedziały w środę nachodzą na siebie.", {
    status: 400,
    payload: { code: "AvailabilityRangesOverlap", message: "Przedziały w środę nachodzą na siebie.", details: { date: "2026-12-02", dayOfWeek: 3, start: "10:00", end: "12:00" } },
  });
  assert.deepEqual(plain(api.getAvailabilityError(error)), { code: "AvailabilityRangesOverlap", message: "Przedziały w środę nachodzą na siebie.", date: "2026-12-02", dayOfWeek: 3 });
  assert.equal(api.getAvailabilityErrorCode(error), null);
  assert.equal(api.getAvailabilityErrorMessage(error), "Przedziały w środę nachodzą na siebie.");
});

const time = loadModule("app/lib/availability-time.ts", {});
const days = loadModule("app/lib/availability-days.ts", { "./availability-time": time });
const r = (start, end) => ({ start, end });

test("a locked day reads as 'jak zwykle' only while it matches the regular schedule", () => {
  const usual = { date: "2026-11-25", dayOfWeek: 3, mode: "Locked", ranges: [r("16:00", "20:00")], templateRanges: [r("16:00", "20:00")] };
  assert.deepEqual(plain(days.dayDraft(usual)), { mode: "Template", ranges: [] });
  assert.deepEqual(plain(days.dayDraft({ ...usual, ranges: [r("10:00", "12:00")] })), { mode: "Custom", ranges: [r("10:00", "12:00")] });
  assert.deepEqual(plain(days.dayDraft({ ...usual, ranges: [] })), { mode: "Off", ranges: [] });
  assert.deepEqual(plain(days.dayDraft({ ...usual, mode: "Template", ranges: [r("16:00", "20:00")] })), { mode: "Template", ranges: [] });
});

test("drafts compare by meaning and send hours only for own hours", () => {
  assert.equal(days.sameDraft({ mode: "Off", ranges: [r("08:00", "09:00")] }, { mode: "Off", ranges: [] }), true);
  assert.equal(days.sameDraft({ mode: "Custom", ranges: [r("12:00", "14:00"), r("08:00", "10:00")] }, { mode: "Custom", ranges: [r("08:00", "10:00"), r("12:00", "14:00")] }), true);
  assert.deepEqual(plain(days.toDayPayload({ mode: "Template", ranges: [r("08:00", "10:00")] })), { mode: "Template", ranges: [] });
  assert.equal(days.isDraftComplete({ mode: "Custom", ranges: [] }), false);
  assert.deepEqual(plain(days.draftRanges({ mode: "Template", ranges: [] }, [r("08:00", "12:00")])), [r("08:00", "12:00")]);
});

test("schedule lists may be null without breaking the owner view", () => {
  const schedule = api.normalizeAvailabilitySchedule({
    from: "2026-11-23", to: "2026-11-29",
    trainers: [{ trainerId: 1, name: null, outlookCategoryColor: "preset5", locationIds: null, weeks: null,
      days: [{ date: "2026-11-24", source: "Template", availability: null, busy: [{ sessionId: 3, title: null, start: "09:00", end: "10:00", startAt: "x", endAt: "y", locationId: 1 }], free: null }] }],
  });
  assert.equal(schedule.trainers[0].name, "Trener");
  assert.deepEqual(plain(schedule.trainers[0].days[0].free), []);
  assert.equal(schedule.trainers[0].days[0].busy[0].title, null);
});

test("handled codes fall back to our wording when the message is missing", () => {
  const locked = new ApiError("", { status: 400, payload: { code: "AvailabilityWeekLocked", message: null } });
  assert.equal(api.getAvailabilityErrorCode(locked), "AvailabilityWeekLocked");
  assert.match(api.getAvailabilityErrorMessage(locked), /zablokowany/);
  assert.equal(api.getAvailabilityError(new ApiError("x", { status: 403, payload: { code: null } })), null);
});
