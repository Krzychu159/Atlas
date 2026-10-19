import test from "node:test";
import assert from "node:assert/strict";
import { load } from "./owner-read-harness.mjs";

const result = { integrationsProcessed: 1, outlookEventsFound: 4, importedOrUpdatedEvents: 2, missingOutlookEventsMarkedDeleted: 0, crmSessionsSyncedToOutlook: 3, errors: [] };

class NotFound extends Error {}

function outlook({ post, get }) {
  const calls = [];
  const lib = load("app/lib/calendar/outlook.ts", {
    "@/app/lib/backend": {
      backendPost: async (...args) => { calls.push(["post", ...args]); return post(...args); },
      backendGet: async (...args) => { calls.push(["get", ...args]); return get(...args); },
      isNotFoundError: error => error instanceof NotFound,
    },
    "@/app/lib/user-messages": { userMessage: (value, fallback) => (typeof value === "string" && value) || fallback },
  }, { window: { setTimeout: callback => setTimeout(callback, 0), clearTimeout } });
  return { lib, calls };
}

test("reconcile sends the scope in the body and returns an immediate result", async () => {
  const { lib, calls } = outlook({ post: async () => result, get: async () => { throw new Error("no poll"); } });
  assert.equal(await lib.reconcileOutlook({ kind: "mine" }), result);
  await lib.reconcileOutlook({ kind: "trainer", trainerId: 7 });
  await lib.reconcileOutlook({ kind: "all" });
  const bodies = calls.map(call => call[2]);
  assert.equal(calls[0][1], "outlook/reconcile");
  assert.equal(bodies[0].onlyMine, true); assert.equal(bodies[0].trainerId, undefined);
  assert.equal(bodies[1].trainerId, 7); assert.equal(bodies[1].onlyMine, undefined);
  assert.equal(bodies[2].onlyMine, undefined); assert.equal(bodies[2].trainerId, undefined);
  assert.ok(bodies.every(body => body.pastDays === 30 && body.futureDays === 180));
});

test("a background job is polled until it completes", async () => {
  const states = [{ jobId: "a/b", state: "Running" }, { jobId: "a/b", state: "Completed", result }];
  const { lib, calls } = outlook({ post: async () => ({ jobId: "a/b", state: "Queued", message: "Started" }), get: async () => states.shift() });
  assert.equal(await lib.reconcileOutlook({ kind: "all" }), result);
  const polls = calls.filter(call => call[0] === "get");
  assert.equal(polls.length, 2);
  assert.equal(polls[0][1], "outlook/reconcile/a%2Fb");
});

test("a failed job, a lost job and a malformed job end with a clear message", async () => {
  const failed = outlook({ post: async () => ({ jobId: "j", state: "Queued" }), get: async () => ({ jobId: "j", state: "Failed", message: "Brak połączenia z Outlookiem." }) });
  await assert.rejects(failed.lib.reconcileOutlook({ kind: "mine" }), /Brak połączenia z Outlookiem/);
  const lost = outlook({ post: async () => ({ jobId: "j", state: "Queued" }), get: async () => { throw new NotFound("404"); } });
  await assert.rejects(lost.lib.reconcileOutlook({ kind: "mine" }), /Kliknij ponownie/);
  const malformed = outlook({ post: async () => ({ unexpected: true }), get: async () => null });
  await assert.rejects(malformed.lib.reconcileOutlook({ kind: "mine" }), /odczytać wyniku/);
});

test("a background job that finishes with partial errors returns them for the warning", async () => {
  const partial = { ...result, errors: ["Nie udało się pobrać kalendarza trenera Jan."] };
  const { lib } = outlook({ post: async () => ({ jobId: "p", state: "Queued", queuedAt: "2026-10-19T10:00:00Z" }), get: async () => ({ jobId: "p", state: "Completed", result: partial }) });
  const data = await lib.reconcileOutlook({ kind: "all" });
  assert.deepEqual(data.errors, ["Nie udało się pobrać kalendarza trenera Jan."]);
});

test("a completed job without a result and a cancelled wait never report success", async () => {
  const empty = outlook({ post: async () => ({ jobId: "e", state: "Running" }), get: async () => ({ jobId: "e", state: "Completed", result: null }) });
  await assert.rejects(empty.lib.reconcileOutlook({ kind: "mine" }), /nie udało się odczytać podsumowania/);
  const controller = new AbortController();
  controller.abort();
  const aborted = outlook({ post: async () => ({ jobId: "a", state: "Running" }), get: async () => { throw new Error("must not poll"); } });
  await assert.rejects(aborted.lib.reconcileOutlook({ kind: "mine" }, controller.signal), error => error.name === "AbortError");
});
