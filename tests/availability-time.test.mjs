import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function loadModule(path) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText, {
    exports, Date, Math, Intl, Number, String,
    require: (name) => { throw new Error(`Unexpected import ${name}`); },
  });
  return exports;
}

const time = loadModule("app/lib/availability-time.ts");
const plain = (value) => JSON.parse(JSON.stringify(value));

test("reads typed times the way people write them", () => {
  assert.equal(time.normalizeTimeInput("8"), "08:00");
  assert.equal(time.normalizeTimeInput("830"), "08:30");
  assert.equal(time.normalizeTimeInput("8:3"), "08:30");
  assert.equal(time.normalizeTimeInput("8.30"), "08:30");
  assert.equal(time.normalizeTimeInput("1745"), "17:45");
  assert.equal(time.normalizeTimeInput("24"), "24:00");
  assert.equal(time.normalizeTimeInput("24:05"), null);
  assert.equal(time.normalizeTimeInput("25"), null);
  assert.equal(time.normalizeTimeInput("8:75"), null);
  assert.equal(time.normalizeTimeInput("abc"), null);
});

test("validates step, length, order and overlaps", () => {
  assert.deepEqual(plain(time.validateRanges([{ start: "08:00", end: "12:00" }, { start: "16:00", end: "24:00" }])), [null, null]);
  assert.match(time.validateRanges([{ start: "08:03", end: "12:00" }])[0], /co 5 minut/);
  assert.match(time.validateRanges([{ start: "12:00", end: "08:00" }])[0], /później/);
  assert.match(time.validateRanges([{ start: "08:00", end: "08:10" }])[0], /15 minut/);
  const overlap = time.validateRanges([{ start: "10:00", end: "12:00" }, { start: "08:00", end: "10:30" }]);
  assert.equal(overlap[1], null);
  assert.match(overlap[0], /nachodzą/);
  assert.deepEqual(plain(time.validateRanges([{ start: "08:00", end: "10:00" }, { start: "10:00", end: "12:00" }])), [null, null]);
});

test("compares ranges regardless of order", () => {
  assert.equal(time.sameRanges([{ start: "16:00", end: "20:00" }, { start: "08:00", end: "12:00" }], [{ start: "08:00", end: "12:00" }, { start: "16:00", end: "20:00" }]), true);
  assert.equal(time.sameRanges([{ start: "08:00", end: "12:00" }], []), false);
  assert.equal(time.formatRanges([{ start: "16:00", end: "20:00" }, { start: "08:00", end: "12:00" }]), "8:00–12:00, 16:00–20:00");
});

test("suggests the next range after the last one", () => {
  assert.deepEqual(plain(time.suggestNextRange([])), { start: "08:00", end: "12:00" });
  assert.deepEqual(plain(time.suggestNextRange([{ start: "08:00", end: "12:00" }])), { start: "13:00", end: "15:00" });
  assert.deepEqual(plain(time.suggestNextRange([{ start: "18:00", end: "23:00" }])), { start: "22:00", end: "24:00" });
});

test("calculates weeks on date-only values", () => {
  assert.equal(time.mondayOf("2026-11-29"), "2026-11-23");
  assert.equal(time.mondayOf("2026-11-23"), "2026-11-23");
  assert.equal(time.addDaysIso("2026-12-28", 7), "2027-01-04");
  assert.equal(time.addDaysIso("2026-03-29", 1), "2026-03-30");
  assert.equal(time.isIsoDate("2026-02-30"), false);
  assert.equal(time.isIsoDate("2026-02-28"), true);
  assert.equal(time.studioToday(new Date("2026-11-15T23:30:00Z")), "2026-11-16");
});

test("formats week ranges in Polish", () => {
  assert.equal(time.formatWeekRange("2026-11-23", 2026), "23–29 listopada");
  assert.equal(time.formatWeekRange("2026-11-30", 2026), "30 listopada – 6 grudnia");
  assert.equal(time.formatWeekRange("2026-12-28", 2026), "28 grudnia – 3 stycznia 2027");
  assert.equal(time.formatStudioDateTime("2026-11-22T19:00:00Z"), "niedziela, 22 listopada, 20:00");
});
