import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const display = {};
vm.runInNewContext(ts.transpileModule(
  fs.readFileSync("app/(app)/owner/trainers/trainer-list-display.ts", "utf8"),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
).outputText, { exports: display, Date });

const base = { email: "", phone: "", bio: "", locationNames: [], experienceYears: 0, sessionsCount: 0, createdAt: "2026-01-01T00:00:00Z" };
const anna = { ...base, id: 1, fullName: "Anna Nowak", status: "Active", bio: "Trening siłowy", sessionsCount: 40, experienceYears: 6, email: "anna@studio.pl", createdAt: "2026-02-01T00:00:00Z" };
const bartek = { ...base, id: 2, fullName: "", firstName: "Bartek", lastName: "Zieliński", status: "Inactive", sessionsCount: 12, experienceYears: 1, locationNames: ["Mokotów"] };
const celina = { ...base, id: 3, fullName: "Celina Adamska", status: "paused", sessionsCount: 90, experienceYears: 3, createdAt: "2026-03-01T00:00:00Z" };
const all = [anna, bartek, celina];
const filters = { ...display.defaultTrainerListFilters };
const ids = (items) => Array.from(items, (item) => item.id);

test("status is matched exactly, so Inactive never counts as active", () => {
  assert.equal(display.trainerStatus(anna), "active");
  assert.equal(display.trainerStatus(bartek), "inactive");
  assert.equal(display.trainerStatus(celina), "paused");
  assert.equal(display.trainerStatus({ status: "Suspended" }), "unknown");
  assert.equal(display.trainerStatusLabel("unknown"), "Status nieznany");
  assert.deepEqual(ids(display.filterTrainers(all, { ...filters, status: "active" })), [1]);
  assert.deepEqual(ids(display.filterTrainers(all, { ...filters, status: "inactive" })), [2]);
});

test("search covers name, e-mail, specialization and locations", () => {
  assert.deepEqual(ids(display.filterTrainers(all, { ...filters, search: "zieliń" })), [2]);
  assert.deepEqual(ids(display.filterTrainers(all, { ...filters, search: "anna@" })), [1]);
  assert.deepEqual(ids(display.filterTrainers(all, { ...filters, search: "siłowy" })), [1]);
  assert.deepEqual(ids(display.filterTrainers(all, { ...filters, search: "mokotów" })), [2]);
});

test("sorting", () => {
  assert.deepEqual(ids(display.filterTrainers(all, filters)), [1, 2, 3]);
  assert.deepEqual(ids(display.filterTrainers(all, { ...filters, sort: "name-desc" })), [3, 2, 1]);
  assert.deepEqual(ids(display.filterTrainers(all, { ...filters, sort: "sessions-desc" })), [3, 1, 2]);
  assert.deepEqual(ids(display.filterTrainers(all, { ...filters, sort: "experience-desc" })), [1, 3, 2]);
  assert.deepEqual(ids(display.filterTrainers(all, { ...filters, sort: "newest" })), [3, 1, 2]);
});

test("labels never invent values", () => {
  assert.equal(display.trainerFullName(bartek), "Bartek Zieliński");
  assert.equal(display.trainerInitials(bartek), "BZ");
  assert.equal(display.trainerSpecialization(bartek), "Trener personalny");
  assert.equal(display.trainerExperienceLabel(0), null);
  assert.equal(display.trainerExperienceLabel(1), "1 rok");
  assert.equal(display.trainerExperienceLabel(3), "3 lata");
  assert.equal(display.trainerExperienceLabel(12), "12 lat");
  assert.equal(display.trainerSessionsCount({ sessionsCount: undefined }), null);
  assert.equal(display.pluralizeTrainers(1), "1 trener");
  assert.equal(display.pluralizeTrainers(3), "3 trenerów");
});
