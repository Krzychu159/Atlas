import test from "node:test";
import assert from "node:assert/strict";
import { load } from "./owner-read-harness.mjs";

class ApiError extends Error { constructor(message, status) { super(message); this.status = status; } }
const backend = { ApiError, getErrorMessage: (_error, fallback) => fallback };

test("trainer series use the trainer portal endpoints", async () => {
  const calls = [];
  const record = method => async (path, body) => { calls.push([method, path, body]); return {}; };
  const portal = load("app/lib/trainer/portal.ts", { "../backend": { backendGet: record("GET"), backendPost: record("POST"), backendPut: record("PUT"), backendPatch: record("PATCH"), backendDelete: record("DELETE") } });
  const session = { title: "Trening", startAt: "2026-10-27T08:00:00", endAt: "2026-10-27T09:00:00", trainerId: 3, locationId: 2 };
  const recurrence = { frequency: "Weekly", interval: 1, daysOfWeek: ["Monday", "Thursday"], occurrencesCount: 12, endDate: null };
  await portal.createTrainerPortalSessionSeries(session, recurrence);
  await portal.syncTrainerPortalSessionSeriesOutlook("abc/1");
  await portal.deleteTrainerPortalSessionSeries("abc/1");
  assert.deepEqual(calls.map(call => [call[0], call[1]]), [
    ["POST", "trainer-portal/sessions/series"],
    ["POST", "trainer-portal/sessions/series/abc%2F1/sync-outlook"],
    ["DELETE", "trainer-portal/sessions/series/abc%2F1"],
  ]);
  assert.deepEqual(JSON.parse(JSON.stringify(calls[0][2])), { session, recurrence });
});

test("group, public and group-category series are blocked before sending", () => {
  const series = load("app/lib/trainer/session-series.ts", { "../backend": backend, "./payment-errors": { trainerPaymentError: (_e, fallback) => fallback } });
  assert.equal(series.trainerSeriesBlocker({ plannedSessionType: "OneToOne", outlookCategories: "Trening personalny" }), null);
  assert.equal(series.trainerSeriesBlocker({ plannedSessionType: "TwoToOne", outlookCategories: [] }), null);
  assert.match(series.trainerSeriesBlocker({ plannedSessionType: "Group" }), /indywidualnych i semi/);
  assert.match(series.trainerSeriesBlocker({ isPubliclyBookable: true }), /indywidualnych i semi/);
  assert.match(series.trainerSeriesBlocker({ outlookCategories: "Opłacone, zajęcia grupowe" }), /Zajęcia grupowe/);
});

test("series errors become product messages instead of raw backend text", () => {
  const series = load("app/lib/trainer/session-series.ts", { "../backend": backend, "./payment-errors": { trainerPaymentError: (_e, fallback) => fallback } });
  const outlook = series.trainerSeriesError(new ApiError("Session series was not created because Outlook synchronization failed: token", 400), "x");
  assert.match(outlook, /Podłącz Outlook w ustawieniach/);
  assert.match(series.trainerSeriesError(new ApiError("Trainers can create series of individual or semi sessions only.", 400), "x"), /indywidualnych i semi/);
  assert.match(series.trainerSeriesError(new ApiError("Series not found", 404), "x"), /Nie znaleziono tej serii/);
  assert.equal(series.trainerSeriesError(new Error("offline"), "Spróbuj ponownie."), "Spróbuj ponownie.");
});
