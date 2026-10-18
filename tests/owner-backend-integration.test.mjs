import test from "node:test";
import assert from "node:assert/strict";
import { load, deferred, hooks, find, settle } from "./owner-read-harness.mjs";

class ApiError extends Error {
  constructor(status, payload) { super("failure"); this.status = status; this.payload = payload; }
}
const { createStaffPaymentIntent, getStaffPaymentOperation } = load("app/lib/owner/staff-payment-intent.ts", {
  "../backend": { ApiError, backendGet: async () => { throw new ApiError(404, { state: "NotFound" }); } },
});
const payload = { clientId: 1, clientPackageId: 2, amount: 120, method: 3, note: null };
const payment = { id: 9, amount: 120, status: 2 };
const completed = key => ({ key, operation: "CreateStaffPayment", state: "Completed", result: payment });

test("successful double submit reuses outcome; a new intent gets a new key", async () => {
  const calls = []; let sequence = 0;
  const dependencies = { post: async (body, key) => { calls.push({ body, key }); return payment; }, uuid: () => `key-${++sequence}` };
  const intent = createStaffPaymentIntent(dependencies);
  await intent.execute(payload); await intent.execute({ ...payload });
  assert.equal(calls.length, 1);
  await createStaffPaymentIntent(dependencies).execute(payload);
  assert.equal(calls.length, 2); assert.notEqual(calls[0].key, calls[1].key);
});

test("timeout recovers committed payment without a second POST", async () => {
  let writes = 0;
  const intent = createStaffPaymentIntent({ uuid: () => "same", post: async () => { writes++; throw new TypeError("network"); }, lookup: async key => completed(key) });
  const result = await intent.execute(payload);
  assert.equal(result.recovered, true); assert.equal(result.payment.id, 9);
  assert.equal(intent.unresolved, false); assert.equal(writes, 1);
});

test("NotFound preserves uncertain form and only explicit identical retry posts the same key", async () => {
  const keys = []; let checks = 0;
  const intent = createStaffPaymentIntent({ uuid: () => "same", lookup: async () => { checks++; return null; }, post: async (_, key) => { keys.push(key); if (keys.length === 1) throw new ApiError(504); return payment; } });
  await assert.rejects(intent.execute(payload), /Nie potwierdziliśmy/);
  assert.equal(intent.unresolved, true); assert.equal(keys.length, 1);
  await assert.rejects(intent.execute({ ...payload, amount: 130 }), /poprzedniej wpłaty/);
  assert.equal(keys.length, 1);
  await intent.execute(payload);
  assert.deepEqual(keys, ["same", "same"]); assert.equal(checks, 2);
});

test("unavailable lookup never triggers a blind retry", async () => {
  let writes = 0;
  const intent = createStaffPaymentIntent({ uuid: () => "key", lookup: async () => { throw new ApiError(503); }, post: async () => { writes++; throw new TypeError("network"); } });
  await assert.rejects(intent.execute(payload), /Nie możemy teraz sprawdzić/);
  await assert.rejects(intent.execute(payload));
  assert.equal(writes, 1); assert.equal(intent.unresolved, true);
});

test("409 is terminal for the intent and does not become a network retry", async () => {
  let checks = 0, writes = 0;
  const intent = createStaffPaymentIntent({ uuid: () => "key", lookup: async () => { checks++; return null; }, post: async () => { writes++; throw new ApiError(409); } });
  await assert.rejects(intent.execute(payload), /konflikt/);
  await assert.rejects(intent.execute(payload), /sprzeczne/);
  assert.equal(writes, 1); assert.equal(checks, 0);
});

test("parallel click cannot send a second POST", async () => {
  const request = deferred(); let writes = 0;
  const intent = createStaffPaymentIntent({ uuid: () => "key", post: async () => { writes++; return request.promise; } });
  const first = intent.execute(payload);
  await assert.rejects(intent.execute(payload), /Trwa zapisywanie/);
  request.resolve(payment); await first; assert.equal(writes, 1);
});

test("known 4xx does not invoke operation recovery, malformed recovered result is rejected", async () => {
  for (const status of [400, 401, 403, 404]) {
    let checks = 0;
    const intent = createStaffPaymentIntent({ uuid: () => "key", post: async () => { throw new ApiError(status); }, lookup: async () => { checks++; return null; } });
    await assert.rejects(intent.execute(payload), error => error.status === status);
    assert.equal(checks, 0); assert.equal(intent.unresolved, false);
  }
  const intent = createStaffPaymentIntent({ uuid: () => "key", post: async () => { throw new ApiError(500); }, lookup: async () => completed("other-key") });
  await assert.rejects(intent.execute(payload)); assert.equal(intent.unresolved, true);
});

test("only explicit operations NotFound means safe identical retry", async () => {
  assert.equal(await getStaffPaymentOperation("key"), null);
  const service = load("app/lib/owner/staff-payment-intent.ts", { "../backend": { ApiError, backendGet: async () => { throw new ApiError(404, { message: "missing route" }); } } });
  await assert.rejects(service.getStaffPaymentOperation("key"), error => error.status === 404);
});

test("payment queries preserve zero amount, effective location and server sorts", () => {
  const { paymentListQuery } = load("app/lib/owner/payment-list-query.ts");
  const filters = { client: "anna", sortBy: "amountAsc", amountMin: "0", amountMax: "120,50", dateFrom: "", dateTo: "", status: "all", source: "all", overpayment: "yes" };
  const query = paymentListQuery(filters, 3, 8, 2);
  assert.equal(query.page, 3); assert.equal(query.pageSize, 8);
  assert.equal(query.amountMin, 0); assert.equal(query.amountMax, 120.5);
  assert.equal(query.locationMatch, "effective"); assert.equal(query.sort, "amount"); assert.equal(query.search, "anna"); assert.equal(query.hasOverpayment, true);
  assert.equal(paymentListQuery({ ...filters, sortBy: "clientAsc" }, 1, 8, null).sort, "clientName");
  assert.equal(paymentListQuery({ ...filters, sortBy: "overpaymentDesc" }, 1, 8, null).sort, "overpaymentDesc");
  assert.throws(() => paymentListQuery({ ...filters, sortBy: "unknown" }, 1, 8, null), /niedostępne|dostępne/);
  assert.throws(() => paymentListQuery({ ...filters, amountMin: "200" }, 1, 8, null), /większa/);
});

test("paged adapters retain filters, server summary and cancellation; legacy schedule stays unpaged", async () => {
  const calls = [], response = { items: [], page: 2, pageSize: 25, totalCount: 2000, totalPages: 80, summary: { totalAmount: 9123, paidAmount: 1000, unpaidAmount: 8123, trainersCount: 2000, paidTrainersCount: 100 } };
  const backend = { backendGet: async (...args) => { calls.push(args); return args[0] === "owner/filter-options" ? { clients: [], trainers: [] } : response; } };
  const signal = new AbortController().signal;
  const clients = load("app/lib/owner/clients.ts", { "../backend": backend });
  const sessions = load("app/lib/owner/sessions.ts", { "../backend": backend });
  const settlements = load("app/lib/owner/settlements.ts", { "../backend": backend });
  const options = load("app/lib/owner/filter-options.ts", { "../backend": backend });
  assert.equal(await clients.getOwnerClients({ page: 2, pageSize: 25, isArchived: false, locationId: 3, packageStatus: "active", sort: "createdDesc" }, signal), response);
  assert.equal(await settlements.getOwnerTrainerSettlements(2026, 10, 3, { search: "Anna", page: 2, pageSize: 25 }, signal), response);
  await sessions.getOwnerSessionPage({ clientId: 4, page: 2, pageSize: 25, order: "desc" }, signal);
  await sessions.getOwnerSessions({ trainerId: 5, from: "2026-10-01" }, signal);
  await options.getOwnerFilterOptions({ search: "Anna", locationId: 3, limit: 20 }, signal);
  assert.equal(calls.length, 5); assert.ok(calls.every(call => call[2] === signal));
  const normalized = query => Object.fromEntries(Object.entries(query).map(([key, value]) => [key.toLowerCase(), value]));
  assert.equal(normalized(calls[0][1]).page, 2); assert.equal(normalized(calls[0][1]).packageStatus?.toLowerCase() ?? normalized(calls[0][1]).packagestatus, "active");
  assert.equal(calls[1][0], "owner/trainer-settlements"); assert.equal(normalized(calls[1][1]).search, "Anna");
  assert.equal(normalized(calls[2][1]).clientid, 4); assert.equal(normalized(calls[2][1]).page, 2);
  assert.equal(normalized(calls[3][1]).page, undefined);
  assert.equal(normalized(calls[4][1]).limit, 20);
});

test("group options use one read, hide period offers and reject options without a billing mode", async () => {
  const calls = [], writes = [];
  let options = { offers: [{ packageId: 2, billingMode: "PeriodBased" }, { packageId: 3, billingMode: "SessionBased" }], ownedPackages: [{ clientPackageId: 7, billingMode: "SessionBased" }] };
  const { isSessionPackage } = load("app/lib/period-packages.ts");
  const groups = load("app/lib/owner/group-enrollments.ts", {
    "../backend": { backendGet: async (...args) => { calls.push(args); return options; }, backendPost: async (...args) => { writes.push(args); return { id: 9 }; } },
    "../period-packages": { isSessionPackage },
    "./filter-options": { getOwnerFilterOptions: async () => ({ clients: [], trainers: [] }) },
  });
  const result = await groups.getGroupPackageOptions(10, 1);
  assert.equal(calls.length, 1);
  assert.deepEqual(Array.from(result.offers, offer => offer.packageId), [3]);
  assert.equal(result.ownedPackages.length, 1);
  options = { offers: [{ packageId: 2 }], ownedPackages: [] };
  await assert.rejects(groups.getGroupPackageOptions(10, 1), /rodzaju pakietów/);
  await groups.prepareGroupEnrollment(10, { clientId: 1, packageId: 3 });
  assert.equal(writes.length, 1); assert.equal(calls.length, 2);
});

test("group list has no per-person reads; payment details load only after explicit action", async () => {
  const h = hooks(), calls = [];
  const rows = Array.from({ length: 25 }, (_, index) => ({ id: index + 1, clientId: index + 1, clientPackageId: index + 50, status: "AwaitingPayment", amountDue: 120, allowedActions: index === 0 ? ["RecordPayment"] : [], clientName: `Klient ${index}` }));
  const Component = load("app/(app)/owner/schedule/components/GroupEnrollmentsSection.tsx", {
    react: h.react,
    "@/app/lib/session-corrections": { useClientPaymentRevision: () => 0 },
    "@/app/lib/group-sessions": { groupSeatsLabel: () => "25 miejsc", isCancelledParticipant: () => false },
    "@/app/lib/owner/group-enrollments": { getGroupEnrollments: async (...args) => { calls.push(["list", ...args]); return { items: rows, page: 1, pageSize: 25, totalCount: 1000, totalPages: 40 }; }, groupEnrollmentStatus: () => "Oczekuje na płatność" },
    "@/app/lib/owner/billing": { getClientBilling: async id => { calls.push(["billing", id]); return { packages: [], payments: [] }; } },
  }, { window: { addEventListener() {}, removeEventListener() {} } }).default;
  const props = { session: { id: 10, locationId: 2, status: "Planned", availableSeats: 25, startAt: "2026-10-25T12:00:00Z", participants: [] }, canConfirm: true, onBusyChange() {} };
  const render = () => h.render(Component, props);
  render(); h.commit(); await settle();
  assert.equal(calls.length, 1); assert.equal(calls[0][0], "list");
  const check = find(render(), node => node.props.children === "Sprawdź wpłaty");
  assert.ok(check); await check.props.onClick(); await settle();
  assert.equal(calls.length, 2); assert.equal(calls[1][0], "billing");
  h.unmount();
});

test("payment proxy forwards idempotency header only to the staff payment creation route", async () => {
  const calls = [];
  class NextResponse extends Response {
    static json(body, options) { return new NextResponse(JSON.stringify(body), options); }
  }
  const routes = load("app/api/backend/[...path]/route.ts", {
    "next/headers": { cookies: async () => ({ get: () => ({ value: "fixture-token" }) }) },
    "next/server": { NextResponse },
    "@/app/lib/server/request-origin": { hasSameOrigin: () => true },
    "@/app/lib/server/backend-cookies": { relayBackendSetCookies() {} },
  }, {
    process: { env: { BACKEND_API_URL: "https://fixture.invalid" } },
    URL, Response,
    fetch: async (...args) => { calls.push(args); return new Response("{}", { status: 201 }); },
  });
  for (const path of [["billing", "payments"], ["billing", "payments", "9", "confirm"]]) {
    await routes.POST({ method: "POST", signal: new AbortController().signal, headers: new Headers({ "Idempotency-Key": "fixture-key" }), nextUrl: new URL("https://app.invalid"), arrayBuffer: async () => new ArrayBuffer(0) }, { params: Promise.resolve({ path }) });
  }
  assert.equal(calls[0][1].headers["Idempotency-Key"], "fixture-key");
  assert.equal(calls[1][1].headers["Idempotency-Key"], undefined);
});
