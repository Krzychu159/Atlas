import test from "node:test";
import assert from "node:assert/strict";
import { load } from "./owner-read-harness.mjs";

const groupSessions = load("app/lib/group-sessions.ts");
const userMessages = load("app/lib/user-messages.ts", { "./group-sessions": groupSessions });
const calls = [];
const sessionsApi = {
  completeSession: async (id, payload) => { calls.push(["complete", id, payload]); },
  updateSession: async (id, payload) => { calls.push(["update", id, payload]); },
};
const utils = load("app/(app)/owner/schedule/session-utils.ts", {
  "./date-utils": { toDateTimeLocalValue: (date) => date.toISOString().slice(0, 16) },
  "@/app/lib/group-sessions": groupSessions,
  "@/app/lib/user-messages": userMessages,
  "@/app/lib/owner/sessions": sessionsApi,
}, { Date, Intl });

const form = {
  title: "", note: "", startAt: "2026-10-15T09:00", endAt: "2026-10-15T10:00", trainerId: "2", locationId: "4",
  status: "", plannedSessionType: "Consultation", outlookCategories: "", participantIds: [], participantsEdited: false,
  isPubliclyBookable: false, publicCapacity: "", publicSlug: "", eventRules: "", registrationClosesBeforeMinutes: "", cancellationClosesBeforeMinutes: "",
};
const plain = (value) => JSON.parse(JSON.stringify(value));

test("consultation type is recognised from the planned or actual session type", () => {
  assert.equal(groupSessions.isConsultationSession({ plannedSessionType: "Consultation" }), true);
  assert.equal(groupSessions.isConsultationSession({ plannedSessionType: "Consultation", actualSessionType: "Consultation" }), true);
  assert.equal(groupSessions.isConsultationSession({ plannedSessionType: "OneToOne" }), false);
  assert.equal(groupSessions.isConsultationSession({ plannedSessionType: "Consultation", actualSessionType: "OneToOne" }), false);
  assert.equal(groupSessions.isGroupTraining({ plannedSessionType: "Consultation" }), false);
  assert.equal(userMessages.sessionTrainingType({ plannedSessionType: "Consultation" }), "Konsultacja");
});

test("a new consultation needs no client and is sent without participants or public booking", () => {
  const payload = plain(utils.toSessionPayload(form, null));
  assert.equal(payload.plannedSessionType, "Consultation");
  assert.deepEqual(payload.participants, []);
  assert.equal(payload.isPubliclyBookable, false);
  assert.equal(payload.title, null, "the backend applies the default title");
  assert.equal("publicSlug" in payload, false);
  assert.equal("publicCapacity" in payload, false);
});

test("a consultation can be saved as already completed and keeps an optional title", () => {
  const payload = plain(utils.toSessionPayload({ ...form, status: "Completed", title: "Wstępna rozmowa" }, null));
  assert.equal(payload.status, "Completed");
  assert.equal(payload.title, "Wstępna rozmowa");
  assert.deepEqual(payload.participants, []);
});

test("stray participants or public booking never reach the backend for a consultation", () => {
  const payload = plain(utils.toSessionPayload({ ...form, participantIds: ["7"], participantsEdited: true, publicSlug: "x" }, null));
  assert.deepEqual(payload.participants, []);
  assert.equal(payload.isPubliclyBookable, false);
});

test("a planned training switched to a consultation drops its participants; a completed one with clients is blocked", () => {
  const planned = { id: 5, status: "Planned", plannedSessionType: "OneToOne", startAt: "2026-10-15T09:00:00Z", endAt: "2026-10-15T10:00:00Z", trainerId: 2, locationId: 4, participants: [{ clientId: 9, sessionsCharged: 1, countsAgainstPackage: true }] };
  assert.deepEqual(plain(utils.toSessionPayload({ ...form, participantsEdited: true }, planned)).participants, []);
  assert.throws(() => utils.toSessionPayload(form, { ...planned, status: "Completed" }), /nie można zmienić na konsultację/);
});

test("regular trainings still require a client", () => {
  assert.throws(() => utils.toSessionPayload({ ...form, plannedSessionType: "OneToOne" }, null), /Wybierz przynajmniej jednego klienta/);
});

test("calendar labels say there is no client instead of showing a count", () => {
  assert.equal(utils.getParticipantsLabel({ plannedSessionType: "Consultation", participantsCount: 0 }), "Bez klienta");
  assert.equal(utils.getParticipantsLabel({ plannedSessionType: "OneToOne", participantsCount: 2 }), "2");
});

test("manual completion sends only an empty participant list; the backend sets the type", async () => {
  calls.length = 0;
  await utils.completeConsultation(31);
  assert.deepEqual(plain(calls), [["complete", 31, { participants: [] }]]);
  const trainerCalls = [];
  await utils.completeConsultation(32, async (id, payload) => { trainerCalls.push([id, payload]); });
  assert.deepEqual(plain(trainerCalls), [[32, { participants: [] }]], "the trainer portal endpoint gets the same payload");
});

test("a completed consultation can be corrected even when its participant list is missing", async () => {
  calls.length = 0;
  const completed = { id: 40, status: "Completed", plannedSessionType: "Consultation", actualSessionType: "Consultation", participants: null, startAt: "2026-10-15T09:00:00Z", endAt: "2026-10-15T10:00:00Z", trainerId: 2, locationId: 4, title: "Konsultacja" };
  await utils.correctCompletedSession(completed, { ...form, status: "Completed", title: "Konsultacja", correctionReason: "Zła lokalizacja", locationId: "5" });
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], "update");
  assert.equal(calls[0][2].locationId, 5);
  assert.equal("participants" in calls[0][2], false, "completed metadata edits never replace the participant list");
});

test("Outlook consultations keep the trainer colour instead of the shared Konsultacje category", () => {
  const colors = load("app/lib/calendar/outlook-colors.ts");
  const session = { primaryOutlookCategory: "Konsultacje", primaryOutlookCategoryColor: null, outlookCategoryColors: [{ name: "Konsultacje", color: "preset1" }, { name: "Anna Nowak", color: "preset4" }] };
  assert.equal(colors.getSessionCategoryColor(session), "preset4");
  assert.equal(colors.getSessionCategoryColor({ primaryOutlookCategory: "Anna Nowak", primaryOutlookCategoryColor: "preset4" }), "preset4");
  assert.equal(colors.getSessionCategoryColor({ primaryOutlookCategory: "Konsultacje", outlookCategoryColors: [{ name: "Konsultacje", color: "preset1" }] }), "preset1");
});

test("calendar block headline marks consultations without inventing a client", () => {
  const block = load("app/(app)/owner/schedule/components/SessionBlock.tsx", {
    "@/app/lib/group-sessions": groupSessions,
    "@/app/lib/calendar/outlook-colors": load("app/lib/calendar/outlook-colors.ts"),
    "../date-utils": { formatTime: (value) => value.slice(11, 16) },
    "../session-utils": { getSessionTitle: (session) => session.title || userMessages.sessionTrainingType(session), getSessionStatusLabel: () => "Zaplanowana", isCancelledSession: () => false },
  });
  assert.deepEqual(plain(block.getSessionHeadline({ title: "Konsultacja", plannedSessionType: "Consultation", clientsDisplayName: null })), { primary: "Konsultacja", secondary: null });
  assert.deepEqual(plain(block.getSessionHeadline({ title: "Rozmowa wstępna", plannedSessionType: "Consultation" })), { primary: "Rozmowa wstępna", secondary: "Konsultacja" });
  assert.match(block.describeSession({ title: "Rozmowa wstępna", plannedSessionType: "Consultation", startAt: "2026-10-15T09:00:00Z", endAt: "2026-10-15T10:00:00Z" }), /Konsultacja/);
});

test("settlement rows label consultations instead of showing zero participants", () => {
  const items = load("app/components/settlements/SettlementItems.tsx", {
    "@/app/lib/group-sessions": groupSessions,
    "@/app/lib/user-messages": userMessages,
    "@/app/lib/trainer/settlement-display": { formatSettlementNumber: (value) => String(value), formatSettlementMoney: String, formatSettlementDate: String },
  });
  assert.equal(items.settlementParticipantsLabel({ sessionType: "Consultation", participantsCount: 0 }), "Bez klienta");
  assert.equal(items.settlementParticipantsLabel({ sessionType: "Consultation", participantsCount: 0 }, true), "bez klienta");
  assert.equal(items.settlementParticipantsLabel({ sessionType: "TwoToOne", participantsCount: 2 }, true), "2 os.");
  assert.deepEqual(plain(items.settlementContractNumbers([
    { isCoveredByContract: true, contractNumber: "01/06/2026" },
    { isCoveredByContract: true, contractNumber: " 01/06/2026 " },
    { isCoveredByContract: true, contractNumber: "02/09/2026" },
    { isCoveredByContract: false, contractNumber: "99/2026" },
    { isCoveredByContract: true, contractNumber: null },
  ])), ["01/06/2026", "02/09/2026"], "contracts are listed once above the rows");
});
