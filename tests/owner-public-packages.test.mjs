import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const api = {};
vm.runInNewContext(ts.transpileModule(
  fs.readFileSync("app/(app)/owner/packages/package-form.ts", "utf8"),
  { compilerOptions: { module: ts.ModuleKind.CommonJS } },
).outputText, { exports: api });

const standard = { ...api.createPackageForm(), name: "Pakiet", price: "199", sessionsLimit: "4", durationDays: "30" };
const group = { ...standard, billingType: "5", locationId: "4", participantsCount: "20", isPubliclyAvailable: true, publicSlug: "grupowe-4-wejscia" };

test("standard package preserves billing configuration and defaults to private", () => {
  const result = api.packageFormPayload({ ...standard, billingType: "3" });
  assert.equal(result.billingType, 3);
  assert.equal(result.isPubliclyAvailable, false);
  assert.equal(result.sessionsLimit, 4);
  assert.equal(result.participantsCount, 1);
  assert.equal(result.sessionsPerWeek, 1);
  assert.equal(result.currency, "PLN");
});
test("public group payload separates entries from participants configuration", () => {
  const result = api.packageFormPayload(group);
  assert.equal(result.billingType, 5);
  assert.equal(result.sessionsLimit, 4);
  assert.equal(result.participantsCount, 20);
  assert.equal(result.isPubliclyAvailable, true);
  assert.equal(result.locationId, 4);
  assert.equal(result.price, 199);
  assert.equal(result.durationDays, 30);
  assert.equal(result.publicSlug, group.publicSlug);
});
test("slug strips Polish letters, punctuation and repeated separators", () => {
  assert.equal(api.generatePackageSlug("  Zajęcia grupowe -- 4 wejścia!  "), "zajecia-grupowe-4-wejscia");
  assert.equal(api.generatePackageSlug("ŁÓDŹ Żółć"), "lodz-zolc");
});
test("automatic slug follows name until manual editing, including after toggling", () => {
  let form = api.changePackageField(group, "name", "Nowy pakiet");
  assert.equal(form.publicSlug, "nowy-pakiet");
  form = api.changePackageField(form, "publicSlug", "moj-link");
  form = api.changePackageField(form, "name", "Inna nazwa");
  form = api.changePackageField(form, "isPubliclyAvailable", false);
  form = api.changePackageField(form, "isPubliclyAvailable", true);
  assert.equal(form.publicSlug, "moj-link");
});
test("public validation rejects missing or invalid required data", () => {
  for (const change of [{ publicSlug: " " }, { name: " " }, { locationId: "" }, { price: "0" },
    { price: "NaN" }, { sessionsLimit: "-1" }, { durationDays: "0" }, { billingType: "1" }]) {
    assert.throws(() => api.packageFormPayload({ ...group, ...change }));
  }
  assert.doesNotThrow(() => api.packageFormPayload({ ...standard, publicSlug: "" }));
});
test("EDIT restores group, publication, slug and all editable parameters", () => {
  const item = { ...api.packageFormPayload(group), id: 12, publicSlug: "existing-link" };
  const form = api.createPackageForm(item);
  assert.equal(form.billingType, "5");
  assert.equal(form.isPubliclyAvailable, true);
  assert.equal(form.locationId, "4");
  assert.equal(form.sessionsLimit, "4");
  assert.equal(form.slugEdited, true);
  assert.equal(api.changePackageField(form, "name", "Zmiana").publicSlug, "existing-link");
  assert.equal(JSON.stringify(api.packageFormPayload(form)), JSON.stringify({ ...api.packageFormPayload(group), publicSlug: "existing-link" }));
});
test("unpublishing and changing purchased package parameters are left to backend", () => {
  const result = api.packageFormPayload({ ...group, isPubliclyAvailable: false, price: "100", locationId: "9", durationDays: "10", sessionsLimit: "2" });
  assert.equal(result.isPubliclyAvailable, false);
  assert.equal(result.locationId, 9);
  assert.equal(result.sessionsLimit, 2);
  assert.equal(result.durationDays, 10);
  assert.equal(result.price, 100);
  assert.equal(api.changePackageField(group, "billingType", "1").isPubliclyAvailable, false);
});
