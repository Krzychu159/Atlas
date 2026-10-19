import test from "node:test";
import assert from "node:assert/strict";
import { load } from "./owner-read-harness.mjs";

const plain = (value) => JSON.parse(JSON.stringify(value));
const groupSessions = load("app/lib/group-sessions.ts");
const userMessages = load("app/lib/user-messages.ts", { "./group-sessions": groupSessions });

function issuesLib() {
  const calls = [];
  const lib = load("app/lib/calendar/outlook-issues.ts", {
    "@/app/lib/backend": {
      backendGet: async (...args) => { calls.push(["get", ...args]); return calls.response; },
      backendPost: async (...args) => { calls.push(["post", ...args]); },
    },
  });
  return { lib, calls };
}

const issueDto = (overrides) => ({
  externalCalendarEventId: 11, sessionId: null, subject: "Trening", startAt: "2026-10-10T08:00:00Z", endAt: "2026-10-10T09:00:00Z",
  locationName: "Centrum", organizerEmail: "jan@studio.pl", issueType: "PastEventNeedsReview", requiresDecision: true,
  calendarOwnerFullName: "Jan Trener", message: null, email: null, importedAt: "2026-10-10T10:00:00Z", ...overrides,
});

test("calendar issues follow OutlookMappingIssueDto and map to the CRM action the owner can take", () => {
  const { lib } = issuesLib();
  const issues = lib.normalizeOutlookIssues([
    issueDto({ issueType: "CompletedSessionDeletedInOutlook", sessionId: 5, externalCalendarEventId: 11 }),
    issueDto({ issueType: "CompletedSessionAttendeeRemovedInOutlook", sessionId: 6, externalCalendarEventId: 12 }),
    issueDto({ issueType: "StartedSessionDeletedInOutlook", sessionId: 7, externalCalendarEventId: 13 }),
    issueDto({ issueType: "PastEventNeedsReview", externalCalendarEventId: 14 }),
    issueDto({ issueType: "SomethingNew", externalCalendarEventId: 15 }),
    issueDto({ issueType: "CompletedSessionDeletedInOutlook", sessionId: null, externalCalendarEventId: 16 }),
    issueDto({ externalCalendarEventId: 0 }),
    null,
  ]);
  assert.deepEqual(issues.map(issue => lib.outlookIssueAction(issue)), ["correct-session", "correct-session", "open-session", "convert", null, null], "a session issue without sessionId offers no broken link");
  assert.deepEqual(plain(issues[3]), {
    type: "PastEventNeedsReview", externalCalendarEventId: 14, sessionId: null, title: "Trening", message: null, startAt: "2026-10-10T08:00:00Z",
    locationName: "Centrum", calendarOwnerFullName: "Jan Trener", email: "jan@studio.pl", requiresDecision: true,
  });
  assert.equal(issues.length, 6, "items without an event id cannot be acted on and are skipped");
  assert.equal(lib.outlookIssueCopy("SomethingNew").title, "Zmiana w kalendarzu do sprawdzenia");
  assert.equal(lib.outlookIssueCopy("SomethingNew", false).title, "Informacja z kalendarza");
  assert.deepEqual(plain(lib.normalizeOutlookIssues({ items: [issueDto({})] })), [], "only the documented array shape is read");
  assert.deepEqual(plain(lib.normalizeOutlookIssues("oops")), []);
});

test("issues are split by requiresDecision and a missing flag still needs a decision", () => {
  const { lib } = issuesLib();
  const issues = lib.normalizeOutlookIssues([
    issueDto({ externalCalendarEventId: 1, requiresDecision: true }),
    issueDto({ externalCalendarEventId: 2, requiresDecision: false, issueType: "AttendeeWithoutClient" }),
    issueDto({ externalCalendarEventId: 3, requiresDecision: undefined }),
  ]);
  const { decisions, notices } = lib.splitOutlookIssues(issues);
  assert.deepEqual(decisions.map(issue => issue.externalCalendarEventId), [1, 3]);
  assert.deepEqual(notices.map(issue => issue.externalCalendarEventId), [2]);
});

test("ignoring and converting calendar issues send the documented requests", async () => {
  const { lib, calls } = issuesLib();
  await lib.ignoreOutlookIssue(14, "Prywatne");
  await lib.convertImportedEventToSession(14);
  assert.deepEqual(plain(calls), [
    ["post", "outlook/issues/ignore", { externalCalendarEventId: 14, message: "Prywatne" }],
    ["post", "outlook/imported-events/14/convert-to-session", {}],
  ]);
});

test("a failed Microsoft connection shows the backend message and the Microsoft code", () => {
  const callback = load("app/lib/calendar/outlook-callback.ts", { "@/app/lib/user-messages": userMessages });
  assert.deepEqual(plain(callback.readOutlookCallbackError({ code: "AdminConsentRequired", message: "Administrator organizacji musi wyrazić zgodę.", microsoftCode: "AADSTS65001" })),
    { code: "AdminConsentRequired", message: "Administrator organizacji musi wyrazić zgodę.", microsoftCode: "AADSTS65001" });
  assert.match(callback.readOutlookCallbackError({ code: "AccessDenied", message: "Access denied by user" }).message, /Nie udzielono dostępu/, "raw English falls back to a Polish explanation");
  assert.equal(callback.readOutlookCallbackError({ code: "AccountNotSupported", microsoftCode: "<script>" }).microsoftCode, null);
  assert.equal(callback.readOutlookCallbackError({}), null);
  assert.equal(callback.escapeHtml("<b>\"x\"&'"), "&lt;b&gt;&quot;x&quot;&amp;&#39;");
});

const calls = [];
const utils = load("app/(app)/owner/schedule/session-utils.ts", {
  "./date-utils": { toDateTimeLocalValue: (date) => date.toISOString().slice(0, 16) },
  "@/app/lib/group-sessions": groupSessions,
  "@/app/lib/user-messages": userMessages,
  "@/app/lib/owner/sessions": {
    completeSession: async (id, payload) => { calls.push(["complete", id, payload]); },
    updateSession: async (id, payload) => { calls.push(["update", id, payload]); },
  },
}, { Date, Intl });

const completed = {
  id: 70, status: "Completed", plannedSessionType: "TwoToOne", actualSessionType: "TwoToOne", title: "Anna + Ola",
  startAt: "2026-10-15T09:00:00.000Z", endAt: "2026-10-15T10:00:00.000Z", trainerId: 2, locationId: 4, note: null,
  participants: [
    { id: 1, clientId: 10, clientFullName: "Anna", attendanceStatus: "Present", countsAgainstPackage: true, sessionsCharged: 1, note: null },
    { id: 2, clientId: 11, clientFullName: "Ola", attendanceStatus: "Present", countsAgainstPackage: true, sessionsCharged: 1, note: "VIP" },
  ],
};
const initialForm = () => utils.getDefaultFormValues({ session: completed, date: new Date(completed.startAt), trainers: [], locations: [] });

test("a participants correction sends the full list with attendance, package use and removals", async () => {
  calls.length = 0;
  const mode = await utils.correctCompletedSession(completed, {
    ...initialForm(), correctionMode: "participants", correctionReason: "Ola nie przyszła, doszedł Piotr",
    participantIds: ["10", "11", "12"], participantsEdited: true,
    participantCorrections: { 11: { attendanceStatus: "Absent", countsAgainstPackage: true, sessionsCharged: "1" }, 12: { attendanceStatus: "Present", countsAgainstPackage: true, sessionsCharged: "2" } },
  });
  assert.equal(mode, "participants");
  assert.deepEqual(plain(calls), [["complete", 70, {
    actualSessionType: "TwoToOne",
    correctionReason: "Ola nie przyszła, doszedł Piotr",
    participants: [
      { clientId: 10, attendanceStatus: "Present", countsAgainstPackage: true, sessionsCharged: 1, note: null },
      { clientId: 11, attendanceStatus: "Absent", countsAgainstPackage: true, sessionsCharged: 1, note: "VIP" },
      { clientId: 12, attendanceStatus: "Present", countsAgainstPackage: true, sessionsCharged: 2, note: null },
    ],
  }]]);

  calls.length = 0;
  await utils.correctCompletedSession(completed, { ...initialForm(), correctionMode: "participants", correctionReason: "Anna sama", participantIds: ["10"], participantsEdited: true });
  assert.deepEqual(plain(calls[0][2].participants.map(item => item.clientId)), [10], "a client left out is removed and gets the entry back");
});

test("only a present participant counted against a package uses an entry", () => {
  assert.equal(utils.chargesPackageEntry({ attendanceStatus: "Present", countsAgainstPackage: true }), true);
  assert.equal(utils.chargesPackageEntry({ attendanceStatus: "Absent", countsAgainstPackage: true }), false);
  assert.equal(utils.chargesPackageEntry({ attendanceStatus: "Present", countsAgainstPackage: false }), false);
});

test("a participants correction rejects unchanged lists, mixed edits and bad entry counts", async () => {
  await assert.rejects(utils.correctCompletedSession(completed, { ...initialForm(), correctionMode: "participants", correctionReason: "x" }), /Nie wprowadzono zmian/);
  await assert.rejects(utils.correctCompletedSession(completed, { ...initialForm(), correctionMode: "participants", correctionReason: "x", locationId: "9", participantIds: ["10"], participantsEdited: true }), /osobno/);
  await assert.rejects(utils.correctCompletedSession(completed, { ...initialForm(), correctionMode: "participants", correctionReason: "x", participantCorrections: { 10: { attendanceStatus: "Present", countsAgainstPackage: true, sessionsCharged: "0" } } }), /co najmniej 1 wejście/);
  await assert.rejects(utils.correctCompletedSession(completed, { ...initialForm(), correctionMode: "participants", correctionReason: "  " }), /Podaj powód korekty/);
});

test("rescheduling a completed session keeps its billing and never sends participants", async () => {
  calls.length = 0;
  const mode = await utils.correctCompletedSession(completed, { ...initialForm(), correctionMode: "details", correctionReason: "Inna sala", locationId: "9", trainerId: "3" });
  assert.equal(mode, "details");
  assert.equal(calls[0][0], "update");
  assert.equal(calls[0][2].status, "Completed");
  assert.equal(calls[0][2].locationId, 9);
  assert.equal(calls[0][2].trainerId, 3);
  assert.equal(calls[0][2].correctionReason, "Inna sala");
  assert.equal("participants" in calls[0][2], false);
});

test("a session that did not take place is cancelled or planned again with a reason", async () => {
  calls.length = 0;
  await utils.correctCompletedSession(completed, { ...initialForm(), correctionMode: "not-held", status: "Cancelled", correctionReason: "Trener chory" });
  await utils.correctCompletedSession(completed, { ...initialForm(), correctionMode: "not-held", status: "Planned", correctionReason: "Przełożona" });
  assert.deepEqual(plain(calls.map(([kind, , payload]) => [kind, payload.status, payload.correctionReason, "participants" in payload])), [
    ["update", "Cancelled", "Trener chory", false],
    ["update", "Planned", "Przełożona", false],
  ]);
  await assert.rejects(utils.correctCompletedSession(completed, { ...initialForm(), correctionMode: "not-held", status: "Completed", correctionReason: "x" }), /anulować/);
});

test("refused corrections are explained without raw backend text", () => {
  assert.match(utils.correctionErrorMessage(new Error("Trainer settlement for this period has already been paid.")), /wypłacone/);
  assert.match(utils.correctionErrorMessage(new Error("Client already uses the next package.")), /kolejnego pakietu/);
  assert.match(utils.correctionErrorMessage(new Error("Package is closed.")), /zamknięty/);
  assert.match(utils.correctionErrorMessage(new Error("Client is archived.")), /archiwum/);
  assert.equal(utils.correctionErrorMessage(new Error("Nie można zmienić sesji w zamkniętym okresie.")), "Nie można zmienić sesji w zamkniętym okresie.");
  assert.match(utils.correctionErrorMessage(new Error("NullReferenceException at Foo()")), /Nie udało się zapisać korekty/);
  assert.equal(utils.correctionChangeLabel("ParticipantsChanged"), "Zmiana uczestników lub obecności");
  assert.equal(utils.correctionChangeLabel(null), "Korekta sesji");
});

test("correction errors from status codes and backend codes are explained without raw text", () => {
  const apiError = (status, message, payload) => Object.assign(new Error(message), { status, payload });
  assert.equal(utils.correctionErrorMessage(apiError(403, "Nie masz uprawnień do tej operacji.")), "Nie masz uprawnień, aby poprawić tę sesję.");
  assert.match(utils.correctionErrorMessage(apiError(404, "Session not found")), /już nie istnieje/);
  assert.match(utils.correctionErrorMessage(apiError(409, "Conflict")), /w międzyczasie zmieniona/);
  assert.match(utils.correctionErrorMessage(apiError(400, "Bad request", { code: "TrainerSettlementAlreadyPaid" })), /wypłacone/, "the backend code is used when the message is not readable");
  assert.match(utils.correctionErrorMessage(apiError(400, "One or more validation errors occurred.", { title: "CorrectionReason must be at most 500 characters" })), /od 1 do 500 znaków/);
  assert.match(utils.correctionErrorMessage(apiError(400, "Invalid attendance status")), /Obecny/);
  assert.equal(utils.correctionErrorMessage(apiError(400, "Rozliczenie trenera za październik zostało wypłacone. Cofnij wypłatę, aby poprawić sesję.")), "Rozliczenie trenera za październik zostało wypłacone. Cofnij wypłatę, aby poprawić sesję.", "a readable Polish backend message is shown as it is");
  assert.match(utils.correctionErrorMessage(null), /Nie udało się zapisać korekty/);
});

test("the correction history names the author from changedByFullName", () => {
  assert.equal(utils.correctionAuthor({ changedByFullName: " Anna Owner ", changedByUserId: 3 }), "Anna Owner");
  assert.equal(utils.correctionAuthor({ changedByFullName: null, changedByUserId: 3 }), "użytkownik #3");
  assert.equal(utils.correctionAuthor({ changedByUserId: null }), "brak danych");
});

test("a failed correction call sends nothing else, so no partial financial change is made by the CRM", async () => {
  const sent = [];
  const failing = async (id, payload) => { sent.push([id, payload]); throw Object.assign(new Error("Package is closed."), { status: 400 }); };
  await assert.rejects(utils.correctCompletedSession(completed, { ...initialForm(), correctionMode: "participants", correctionReason: "Ola nieobecna", participantCorrections: { 11: { attendanceStatus: "Absent", countsAgainstPackage: true, sessionsCharged: "1" } } }, failing), /Package is closed/);
  assert.equal(sent.length, 1, "one complete call, no follow-up update");
});

test("the reason must be 1-500 characters after trimming", async () => {
  await assert.rejects(utils.correctCompletedSession(completed, { ...initialForm(), correctionMode: "details", correctionReason: "x".repeat(501), locationId: "9" }), /maksymalnie 500/);
  calls.length = 0;
  await utils.correctCompletedSession(completed, { ...initialForm(), correctionMode: "details", correctionReason: "  " + "x".repeat(500) + "  ", locationId: "9" });
  assert.equal(calls[0][2].correctionReason.length, 500, "surrounding spaces are trimmed before sending");
});

test("a trainer billing correction uses the trainer endpoint passed in, never the owner one", async () => {
  calls.length = 0;
  const trainerCalls = [];
  await utils.correctCompletedSession(completed, { ...initialForm(), status: "Completed", actualSessionType: "OneToOne", correctionReason: "Zły typ" }, async (id, payload) => { trainerCalls.push([id, payload]); });
  assert.equal(calls.length, 0, "the owner complete/update endpoints are not used");
  assert.equal(trainerCalls.length, 1);
  assert.equal(trainerCalls[0][1].actualSessionType, "OneToOne");
  assert.equal(trainerCalls[0][1].participants.length, 2, "the full participant list is sent unchanged");
});
