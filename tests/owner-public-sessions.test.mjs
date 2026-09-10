import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const api = {};
vm.runInNewContext(ts.transpileModule(
  fs.readFileSync("app/(app)/owner/schedule/session-utils.ts", "utf8"),
  { compilerOptions: { module: ts.ModuleKind.CommonJS } },
).outputText, {
  exports: api, Date, Intl,
  require: (name) => name === "./date-utils"
    ? { toDateTimeLocalValue: (date) => date.toISOString().slice(0, 16) }
    : { getOwnerSessionPackageName: () => "" },
});
const values = {
  title: "Full Body", note: "Poziom średni", startAt: "2026-09-20T18:00", endAt: "2026-09-20T19:00",
  trainerId: "2", locationId: "4", status: "", plannedSessionType: "Individual", outlookCategories: "",
  participantIds: [], participantsEdited: false, isPubliclyBookable: true, publicCapacity: "12", publicSlug: "full-body-2026-09-20-18-00",
};
const existing = { id: 88, isPubliclyBookable: true, participants: [{ clientId: 55, sessionsCharged: 1, countsAgainstPackage: true }],
  title: "Full Body", startAt: "2026-09-20T18:00:00", endAt: "2026-09-20T19:00:00", trainerId: 2, locationId: 4,
  publicCapacity: 12, publicSlug: "original-link", plannedSessionType: "Group", status: "Planned" };

test("public CREATE allows no participants and sends local studio hours", () => {
  const result = api.toSessionPayload(values, null);
  assert.equal(result.plannedSessionType, "Group");
  assert.equal(result.status, "Planned");
  assert.equal(result.isPubliclyBookable, true);
  assert.equal(result.publicCapacity, 12);
  assert.equal(result.publicSlug, values.publicSlug);
  assert.equal(result.startAt, "2026-09-20T18:00:00");
  assert.equal(result.participants.length, 0);
  assert.equal(result.outlookCategories.length, 0);
});
test("public UPDATE omits participants even when their DTO collection is missing", () => {
  assert.equal("participants" in api.toSessionPayload(values, existing), false);
  assert.equal("participants" in api.toSessionPayload(values, { ...existing, participants: null }), false);
});
test("explicit participant editing can remove all participants", () => {
  assert.equal(api.toSessionPayload({ ...values, participantsEdited: true }, existing).participants.length, 0);
});
test("unpublishing preserves bookings and capacity reduction is left to backend", () => {
  const result = api.toSessionPayload({ ...values, isPubliclyBookable: false }, existing);
  assert.equal(result.isPubliclyBookable, false);
  assert.equal("participants" in result, false);
  assert.equal(api.toSessionPayload({ ...values, publicCapacity: "1" }, existing).publicCapacity, 1);
});
test("public validation and private participant validation remain separate", () => {
  for (const change of [{ title: " " }, { publicCapacity: "0" }, { publicCapacity: "1.5" }, { publicSlug: "" }, { trainerId: "" }, { locationId: "" }]) {
    assert.throws(() => api.toSessionPayload({ ...values, ...change }, null));
  }
  assert.throws(() => api.toSessionPayload({ ...values, isPubliclyBookable: false }, null), /klienta/);
  const result = api.toSessionPayload({ ...values, isPubliclyBookable: false, participantIds: ["55"] }, null);
  assert.equal("isPubliclyBookable" in result, false);
  assert.equal(result.participants[0].clientId, 55);
  assert.equal(result.plannedSessionType, "Individual");
});
test("slug strips Polish characters and defaults restore public DTO", () => {
  assert.equal(api.generatePublicSessionSlug("Łąka: Siła & Ćwiczenia!", "2026-09-20T18:00"), "laka-sila-cwiczenia-2026-09-20-18-00");
  const restored = api.getDefaultFormValues({ session: existing, date: new Date(), trainers: [], locations: [] });
  assert.equal(restored.publicSlug, "original-link");
  assert.equal(restored.publicCapacity, "12");
  assert.equal(restored.isPubliclyBookable, true);
  assert.equal(restored.participantsEdited, false);
  assert.equal(restored.startAt, "2026-09-20T18:00");
});
