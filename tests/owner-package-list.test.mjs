import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function load(file, modules = {}) {
  const exports = {};
  const require = (name) => {
    if (name in modules) return modules[name];
    throw new Error(`Unexpected import ${name} in ${file}`);
  };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports, require, Intl });
  return exports;
}

const periodPackages = load("app/lib/period-packages.ts", { "./backend": {}, "./formatters/money": {} });
const packageFilters = load("app/lib/packageFilters.ts", { "./period-packages": periodPackages });
const packageValidity = load("app/lib/package-validity.ts");
const display = load("app/components/packages/package-list-display.ts", {
  "@/app/lib/packageFilters": packageFilters,
  "@/app/lib/package-validity": packageValidity,
  "@/app/lib/period-packages": periodPackages,
});

const base = { description: null, currency: "PLN", createdBy: null, updatedAt: "2026-01-01T00:00:00Z" };
const solo = { ...base, id: 1, name: "12 treningów 1:1", billingMode: "SessionBased", packageType: "Individual", participantsCount: 1, sessionsLimit: 12, durationDays: 45, price: 1200, isActive: true, createdAt: "2026-01-03T00:00:00Z", locationName: "Centrum" };
const group = { ...base, id: 2, name: "Grupowe 8 wejść", billingMode: "SessionBased", packageType: "Group", billingType: 5, participantsCount: 20, sessionsLimit: 8, durationDays: 30, price: 320, isActive: false, createdAt: "2026-01-02T00:00:00Z", locationId: 4 };
const period = { ...base, id: 3, name: "Dieta 30 dni", billingMode: "PeriodBased", packageType: "PeriodBased", participantsCount: 0, sessionsLimit: 0, durationDays: 30, price: 199, isActive: true, createdAt: "2026-01-01T00:00:00Z" };
const all = [solo, group, period];
const filters = { search: "", participantsFilter: "all", sessionsFilter: "all", durationFilter: "all", sort: "newest", billingModeFilter: "all" };
const ids = (items) => Array.from(items, (item) => item.id);

test("activity filter is optional and distinguishes active from inactive packages", () => {
  assert.deepEqual(ids(packageFilters.filterPackages(all, filters)), [1, 2, 3]);
  assert.deepEqual(ids(packageFilters.filterPackages(all, { ...filters, activityFilter: "all" })), [1, 2, 3]);
  assert.deepEqual(ids(packageFilters.filterPackages(all, { ...filters, activityFilter: "active" })), [1, 3]);
  assert.deepEqual(ids(packageFilters.filterPackages(all, { ...filters, activityFilter: "inactive" })), [2]);
});

test("session filters never match period-based offers and billing mode filter separates models", () => {
  assert.deepEqual(ids(packageFilters.filterPackages(all, { ...filters, sessionsFilter: "5-8" })), [2]);
  assert.deepEqual(ids(packageFilters.filterPackages(all, { ...filters, participantsFilter: "group" })), [2]);
  assert.deepEqual(ids(packageFilters.filterPackages(all, { ...filters, billingModeFilter: "PeriodBased" })), [3]);
  assert.deepEqual(ids(packageFilters.filterPackages(all, { ...filters, billingModeFilter: "SessionBased", activityFilter: "active" })), [1]);
  assert.deepEqual(ids(packageFilters.filterPackages(all, { ...filters, durationFilter: "up-to-30", sort: "price-asc" })), [3, 2]);
});

test("session-based rows show sessions or entries with validity", () => {
  assert.deepEqual({ ...display.packageLimitLabel(solo) }, { primary: "12 sesji", secondary: "Ważność 45 dni" });
  assert.deepEqual({ ...display.packageLimitLabel(group) }, { primary: "8 wejść", secondary: "Ważność 30 dni" });
  assert.equal(display.packageLimitLabel({ ...solo, sessionsLimit: 2 }).primary, "2 sesje");
  assert.equal(display.packageLimitLabel({ ...solo, sessionsLimit: 0 }).primary, "Limit nieokreślony");
  assert.equal(display.packageKindLabel(solo).detail, "1 osoba");
  assert.equal(display.packageKindLabel(group).detail, "Grupowe");
});

test("period-based rows show only duration, never a session limit", () => {
  assert.deepEqual({ ...display.packageLimitLabel(period) }, { primary: "30 dni", secondary: null });
  assert.equal(display.packageLimitLabel({ ...period, durationDays: 1 }).primary, "1 dzień");
  assert.equal(display.packageKindLabel(period).title, "Usługa okresowa");
  assert.equal(display.packageStatusLabel(period), "Aktywna");
});

test("status, location and count labels", () => {
  assert.equal(display.packageStatusLabel(solo), "Aktywny");
  assert.equal(display.packageStatusLabel(group), "Nieaktywny");
  assert.equal(display.packageLocationLabel(solo), "Centrum");
  assert.equal(display.packageLocationLabel(group), "Lokalizacja 4");
  assert.equal(display.packageLocationLabel(period), "Bez przypisanej lokalizacji");
  assert.equal(display.pluralizePackages(1), "1 pakiet");
  assert.equal(display.pluralizePackages(3), "3 pakiety");
  assert.equal(display.pluralizePackages(12), "12 pakietów");
  assert.equal(display.pluralizePackages(22), "22 pakiety");
});
