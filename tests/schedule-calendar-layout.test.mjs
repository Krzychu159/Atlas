import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const api = {};
vm.runInNewContext(ts.transpileModule(
  fs.readFileSync("app/(app)/owner/schedule/calendar-layout.ts", "utf8"),
  { compilerOptions: { module: ts.ModuleKind.CommonJS } },
).outputText, { exports: api, Date, Math, Infinity });

const plain = (value) => JSON.parse(JSON.stringify(value));
const day = new Date(2026, 9, 12, 12);
const at = (hour, minute = 0, dayOffset = 0) => new Date(2026, 9, 12 + dayOffset, hour, minute).toISOString();
const session = (id, start, end) => ({ id, title: null, note: null, status: "Planned", startAt: start, endAt: end });

test("sessions of 30, 60, 90 and 120 minutes get proportional heights without overlap columns", () => {
  const items = api.layoutDay([
    session(1, at(8), at(8, 30)),
    session(2, at(9), at(10)),
    session(3, at(10), at(11, 30)),
    session(4, at(12), at(14)),
  ], day, 7);
  assert.deepEqual(plain(items.map((item) => [item.session.id, item.top, item.height, item.columns])), [
    [1, 60, 30, 1], [2, 120, 60, 1], [3, 180, 90, 1], [4, 300, 120, 1],
  ]);
});

test("overlapping sessions share the width side by side and reuse freed columns", () => {
  const items = api.layoutDay([
    session(1, at(9), at(10)),
    session(2, at(9), at(10)),
    session(3, at(9, 30), at(10, 30)),
    session(4, at(10), at(11)),
    session(5, at(12), at(13)),
  ], day, 7);
  const byId = Object.fromEntries(items.map((item) => [item.session.id, item]));
  assert.equal(byId[1].columns, 3);
  assert.deepEqual([byId[1].column, byId[2].column, byId[3].column], [0, 1, 2]);
  assert.equal(byId[4].column, 0, "a session starting when another ends takes its column");
  assert.equal(byId[5].columns, 1, "a later, separate session uses the full width");
});

test("hour range widens to fit early and late sessions and clips sessions crossing midnight", () => {
  assert.deepEqual(plain(api.getHourRange([], [day])), { startHour: 7, endHour: 21 });
  assert.deepEqual(plain(api.getHourRange([session(1, at(5, 30), at(6, 30)), session(2, at(21), at(22, 15))], [day])), { startHour: 5, endHour: 23 });
  const overnight = session(3, at(23), at(1, 0, 1));
  assert.deepEqual(plain(api.getHourRange([overnight], [day])), { startHour: 7, endHour: 24 });
  const [item] = api.layoutDay([overnight], day, 7);
  assert.equal(item.height, 60);
  assert.equal(item.durationMinutes, 120);
  assert.equal(api.layoutDay([session(4, at(9, 0, 1), at(10, 0, 1))], day, 7).length, 0);
});
