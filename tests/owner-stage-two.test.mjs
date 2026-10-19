import test from "node:test";
import assert from "node:assert/strict";
import { load, hooks, find, deferred, settle } from "./owner-read-harness.mjs";

const stub = () => null;
function reader(h) {
  return load("app/(app)/owner/components/use-owner-read.ts", { react: h.react,
    "@/app/lib/backend": { getErrorMessage: (_, fallback) => fallback },
  }, { setTimeout: h.window.setTimeout, clearTimeout: h.window.clearTimeout });
}
function requests() {
  const calls = [];
  const read = name => (...args) => {
    const request = { name, args, signal: args.find(value => value instanceof AbortSignal), ...deferred() };
    calls.push(request); return request.promise;
  };
  return { calls, read };
}

test("read keys, cleanup and old reload closures cannot replace newer results even when abort is ignored", async () => {
  const h = hooks(), { useOwnerRead } = reader(h), { calls, read } = requests();
  const loadA = read("a"), loadB = read("b");
  const render = (key, loader) => h.render(() => useOwnerRead(key, loader, "Nie udało się pobrać danych."));
  const oldReload = render("a", loadA).reload; h.commit(); await settle();
  render("b", loadB); h.commit(); await settle();
  assert.equal(calls[0].signal.aborted, true);
  await oldReload(); assert.equal(calls.length, 2);
  calls[1].resolve("new"); await settle();
  calls[0].resolve("old"); await settle();
  assert.equal(render("b", loadB).data, "new");
  render("c", loadA); h.commit(); await settle(); h.unmount();
  assert.equal(calls[2].signal.aborted, true);
  calls[2].reject(new Error("late failure")); await settle();
  assert.equal(render("c", loadA).error, undefined);
});

test("retry preserves existing data and draft state; local saved data wins against pending reads", async () => {
  const h = hooks(), { useOwnerRead } = reader(h), { calls, read } = requests(), loader = read("profile");
  function Component() {
    const [draft, setDraft] = h.react.useState("");
    return { draft, setDraft, ...useOwnerRead("1", loader, "Nie udało się pobrać profilu.") };
  }
  h.render(Component); h.commit(); await settle(); calls[0].resolve({ id: 1 }); await settle();
  let result = h.render(Component); result.setDraft("Niezapisana notatka"); result.retry(); await settle();
  calls[1].reject(new Error("failed")); await settle(); result = h.render(Component);
  assert.equal(result.draft, "Niezapisana notatka"); assert.equal(result.data.id, 1); assert.ok(result.error);
  result.retry(); await settle(); result.setData({ id: 1, saved: true });
  calls[2].resolve({ id: 1, saved: false }); await settle();
  assert.equal(h.render(Component).data.saved, true);
  assert.equal(h.render(Component).draft, "Niezapisana notatka"); h.unmount();
});

function profileFixture(trainer = false) {
  const h = hooks(), io = requests(); let correction = 0, id = "1";
  const ownerRead = reader(h);
  const dependencies = {
    react: h.react, "next/navigation": { useParams: () => ({ id }), useRouter: () => ({ push: stub, replace: stub }) },
    "@/app/lib/backend": { ApiError: class extends Error {}, isNotFoundError: error => error?.status === 404 },
    "../../components/use-owner-read": ownerRead,
    "@/app/lib/session-corrections": { useSessionCorrectionRevision: () => correction, usePaymentDateCorrectionRevision: () => 0 },
    "@/app/lib/owner/clients": Object.fromEntries(["getClient", "getClientSubscription", "getClientTrainingPlan", "getClientLegalConsents", "getClientRefunds", "getClientsByTrainer", "getClientClosurePreview"].map(name => [name, io.read(name)])),
    "@/app/lib/owner/billing": { getClientBilling: io.read("getClientBilling"), getClientPayments: io.read("getClientPayments") },
    "@/app/lib/owner/sessions": { getOwnerSessionPage: io.read("getOwnerSessionPage") },
    "@/app/lib/owner/trainers": { getTrainer: io.read("getTrainer") },
    "@/app/lib/owner/settlements": { getTrainerRates: io.read("getTrainerRates") },
  };
  const Page = load(`app/(app)/owner/${trainer ? "trainers" : "clients"}/[id]/page.tsx`, dependencies).default;
  let root = Page();
  const render = () => h.render(root.type, root.props);
  return { h, ...io, render, changeId(value) { id = value; root = Page(); }, correction() { correction++; },
    resolveAll() { for (const call of io.calls) {
      if (call.name === "getClient" || call.name === "getTrainer") call.resolve({ id: Number(call.args[0]), status: "active", isArchived: false });
      else if (call.name === "getClientPayments" || call.name === "getClientRefunds") call.resolve({ items: [] });
      else if (call.name === "getClientBilling" || call.name === "getClientSubscription" || call.name === "getClientTrainingPlan") call.resolve({});
      else call.resolve([]);
    } },
  };
}

for (const trainer of [false, true]) test(`${trainer ? "trainer" : "client"} profile renders core data before slow sections; isolated failure/retry keeps other data`, async () => {
  const fixture = profileFixture(trainer), { h, calls, render } = fixture;
  render(); h.commit(); await settle();
  assert.equal(calls.length, trainer ? 4 : 8);
  const core = calls.find(call => call.name === (trainer ? "getTrainer" : "getClient"));
  core.resolve({ id: 1, status: "active", isArchived: false }); await settle();
  assert.ok(find(render(), node => node.props[trainer ? "trainer" : "client"]?.id === 1));
  const failed = calls.find(call => call.name === (trainer ? "getClientsByTrainer" : "getOwnerSessionPage"));
  failed.reject(new Error("raw English failure")); await settle();
  const state = find(render(), node => node.props.error?.includes(trainer ? "klientów trenera" : "historii treningów"));
  assert.ok(state); state.props.retry(); await settle();
  assert.equal(calls.length, trainer ? 5 : 9);
  assert.equal(calls.at(-1).name, failed.name);
  calls.at(-1).resolve([]); await settle();
  assert.ok(find(render(), node => node.props[trainer ? "trainer" : "client"]?.id === 1));
  h.unmount(); assert.ok(calls.every(call => call.signal.aborted));
  fixture.resolveAll(); await settle();
});

test("client changes cancel every old section; session corrections exclude folder and consents", async () => {
  const fixture = profileFixture(), { h, calls, render } = fixture;
  render(); h.commit(); await settle();
  fixture.changeId("2"); render(); h.commit(); await settle();
  assert.ok(calls.slice(0, 8).every(call => call.signal.aborted));
  fixture.resolveAll(); await settle();
  assert.ok(find(render(), node => node.props.client?.id === 2));
  fixture.correction(); render(); h.commit(); await settle();
  assert.equal(calls.length, 22);
  assert.deepEqual(calls.slice(16).map(call => call.name).sort(), ["getClient", "getClientSubscription", "getClientBilling", "getOwnerSessionPage", "getClientPayments", "getClientRefunds"].sort());
  h.unmount(); fixture.resolveAll(); await settle();
});

test("package refresh retains its seven reads and propagates a partial read failure without hiding the profile", async () => {
  const fixture = profileFixture(), { h, calls, render } = fixture;
  render(); h.commit(); await settle(); fixture.resolveAll(); await settle();
  const packages = find(render(), node => "activeClientPackageId" in node.props && typeof node.props.onSaved === "function");
  const outcome = packages.props.onSaved().then(() => "ok", () => "failed"); await settle();
  assert.equal(calls.length, 15);
  assert.deepEqual(calls.slice(8).map(call => call.name).sort(), ["getClient", "getClientSubscription", "getClientBilling", "getOwnerSessionPage", "getClientPayments", "getClientRefunds", "getClientClosurePreview"].sort());
  calls.slice(8).forEach(call => {
    if (call.name === "getClientBilling") call.reject(new Error("failed refresh"));
    else if (call.name === "getClient") call.resolve({ id: 1, status: "active" });
    else call.resolve({ items: [] });
  });
  assert.equal(await outcome, "failed"); await settle();
  assert.ok(find(render(), node => node.props.client?.id === 1));
  assert.ok(find(render(), node => node.props.error?.includes("rozliczeń"))); h.unmount();
});

test("missing training folder is valid absent data rather than an endless retry error", async () => {
  const { h, calls, render } = profileFixture();
  render(); h.commit(); await settle();
  calls.find(call => call.name === "getClientTrainingPlan").reject(Object.assign(new Error("not found"), { status: 404 }));
  calls.find(call => call.name === "getClient").resolve({ id: 1, status: "active" }); await settle();
  assert.equal(find(render(), node => node.props.label === "Ładowanie folderu klienta...").props.error, undefined);
  h.unmount(); calls.forEach(call => call.resolve({ items: [] })); await settle();
});

test("trainer rate failure never becomes an empty editable rate list", async () => {
  const { h, calls, render } = profileFixture(true);
  render(); h.commit(); await settle();
  calls.find(call => call.name === "getTrainer").resolve({ id: 1 });
  calls.find(call => call.name === "getTrainerRates").reject(new Error("rates unavailable")); await settle();
  const header = find(render(), node => "ratesAvailable" in node.props);
  assert.equal(header.props.ratesAvailable, false);
  assert.ok(find(render(), node => node.props.error?.includes("stawek")));
  h.unmount(); calls.forEach(call => call.resolve([])); await settle();
});

test("trainer identifier changes cancel old reads and never mix clients or rates", async () => {
  const fixture = profileFixture(true), { h, calls, render } = fixture;
  render(); h.commit(); await settle(); fixture.changeId("2"); render(); h.commit(); await settle();
  assert.ok(calls.slice(0, 4).every(call => call.signal.aborted));
  calls[4].resolve({ id: 2 }); calls[5].resolve([{ id: 22 }]); calls[6].resolve([{ id: 32 }]); calls[7].resolve([]);
  await settle(); calls[0].resolve({ id: 1 }); calls[1].resolve([{ id: 11 }]); calls[2].reject(new Error("old rates failed")); calls[3].resolve([]);
  await settle(); assert.ok(find(render(), node => node.props.trainer?.id === 2));
  assert.ok(find(render(), node => node.props.clients?.[0]?.id === 22));
  assert.equal(find(render(), node => "ratesAvailable" in node.props).props.rates[0].id, 32); h.unmount();
});

test("nearest trainer sessions use a stable lower date boundary across pages", async () => {
  const fixture = profileFixture(true), { h, calls, render } = fixture;
  const before = Date.now();
  render(); h.commit(); await settle();
  const first = calls.find(call => call.name === "getOwnerSessionPage");
  assert.ok(Date.parse(first.args[0].from) >= before);
  assert.ok(Date.parse(first.args[0].from) <= Date.now());
  assert.equal(first.args[0].order, "asc");
  first.resolve({ items: [], page: 1, pageSize: 4, totalCount: 20, totalPages: 5 });
  calls.find(call => call.name === "getTrainer").resolve({ id: 1 }); await settle();
  find(render(), node => node.props.pagination?.pageSize === 4).props.pagination.onPageChange(2);
  render(); h.commit(); await settle();
  assert.equal(calls.at(-1).args[0].page, 2);
  assert.equal(calls.at(-1).args[0].from, first.args[0].from);
  h.unmount(); fixture.resolveAll(); await settle();
});

test("trainer section retry preserves the open editor's input data references", async () => {
  const fixture = profileFixture(true), { h, calls, render } = fixture;
  render(); h.commit(); await settle(); fixture.resolveAll(); await settle();
  const header = find(render(), node => "ratesAvailable" in node.props);
  header.props.onEdit();
  const before = find(render(), node => node.props.open === true && typeof node.props.onSaved === "function");
  assert.ok(before);
  const rates = find(render(), node => node.props.label === "Ładowanie stawek trenera...");
  rates.props.retry(); await settle(); calls.at(-1).reject(new Error("failed")); await settle();
  find(render(), node => node.props.label === "Ładowanie stawek trenera...").props.retry(); await settle();
  calls.at(-1).resolve([{ id: 99, rate: 100 }]); await settle();
  const after = find(render(), node => node.props.open === true && typeof node.props.onSaved === "function");
  assert.equal(after.props.trainer, before.props.trainer); assert.equal(after.props.rates, before.props.rates);
  h.unmount();
});

function expenseFixture() {
  const h = hooks(), io = requests(), filters = () => null, ownerRead = reader(h);
  const dictionary = { fallbackCategories: [], fallbackPaymentStatuses: [], fallbackRecurrenceEditScopes: [], deriveLegalEntities: () => [], normalizeDictionary: value => value };
  const Page = load("app/(app)/owner/expenses/page.tsx", {
    react: h.react, "../components/use-owner-read": ownerRead,
    "@/app/lib/owner/location-filter": { useOwnerLocationFilter: () => ({ selectedLocationId: null, setSelectedLocationValue: stub }) },
    "@/app/lib/owner/locations": { getLocations: async () => [] },
    "@/app/lib/owner/expenses": { getExpenses: io.read("list"), getExpenseStatistics: io.read("summary"), getExpenseCategories: async () => [], getExpensePaymentStatuses: async () => [], getExpenseRecurrenceEditScopes: async () => [] },
    "./components/ExpenseFilters": { __esModule: true, default: filters, initialExpenseFilters: { search: "" } }, "./expense-config": dictionary,
  }, { window: h.window }).default;
  const root = Page(); const render = () => h.render(root.type, root.props);
  return { h, ...io, render, filters };
}

test("expense pagination reads only list, filters read both; failed summary does not hide list or close form", async () => {
  const { h, calls, render, filters } = expenseFixture();
  render(); h.commit(); h.timers(); await settle();
  assert.deepEqual(calls.map(call => call.name), ["list", "summary"]);
  calls[0].resolve({ items: [{ id: 1 }], totalCount: 51, totalPages: 3 });
  calls[1].reject(new Error("summary failure")); await settle();
  let list = find(render(), node => typeof node.props.onPageChange === "function");
  assert.equal(list.props.expenses[0].id, 1);
  assert.ok(find(render(), node => node.props.error?.includes("podsumowania")));
  list.props.onAdd(); list.props.onPageChange(2); render(); h.commit(); h.timers(); await settle();
  assert.equal(calls.length, 3); assert.equal(calls[2].name, "list"); assert.equal(calls[2].args[0].page, 2);
  calls[2].reject(new Error("list failure")); await settle();
  assert.equal(find(render(), node => typeof node.props.onPageChange === "function"), null);
  find(render(), node => node.props.error?.includes("pobrać wydatków")).props.retry(); await settle();
  assert.equal(calls.length, 4); assert.equal(calls[3].name, "list");
  assert.ok(find(render(), node => node.props.open === true && "defaultRecurring" in node.props));
  calls[3].resolve({ items: [], totalPages: 3 }); await settle();
  find(render(), node => node.type === filters).props.onChange("search", "nowy");
  render(); h.commit(); h.timers(); await settle();
  assert.deepEqual(calls.slice(4).map(call => call.name), ["list", "summary"]);
  assert.equal(calls[5].args[0].page, undefined);
  h.unmount(); calls.slice(4).forEach(call => call.resolve({ items: [] })); await settle();
});

test("schedule retains Outlook gate, cancels old dates, deduplicates local status filtering and scopes trainer reset", async () => {
  const h = hooks(), io = requests(), ownerRead = reader(h), errors = [];
  let locationId = null;
  const outlook = deferred();
  const Page = load("app/(app)/owner/schedule/page.tsx", {
    react: h.react, "../components/use-owner-read": ownerRead,
    "@/app/lib/backend": { ApiError: class extends Error {} },
    "@/app/lib/auth/current-user": { getCurrentUser: async () => ({ id: "1", email: "owner@atlas.test" }) },
    "@/app/lib/owner/location-filter": { useOwnerLocationFilter: () => ({ selectedLocationId: locationId }), matchesOwnerLocationId: (entity, id) => id === null || entity.locationIds?.includes(id) || entity.locationId === id },
    "@/app/lib/owner/outlook": { getOutlookStatus: () => outlook.promise },
    "@/app/lib/owner/trainers": { getTrainers: async () => [{ id: 10, email: "owner@atlas.test", locationIds: [1] }] },
    "@/app/lib/owner/locations": { getLocations: async () => [] }, "@/app/lib/owner/clients": { getClients: async () => [] },
    "@/app/lib/owner/sessions": { getOwnerSessions: io.read("sessions"), getSession: io.read("detail") },
    "@/app/lib/session-corrections": { useSessionCorrectionRevision: () => 0 },
    "./date-utils": { getPeriod: (_view, date) => ({ fromIso: date.toISOString(), toIso: date.toISOString(), label: "Okres" }), startOfWeek: date => date, addDays: (date, days) => new Date(date.getTime() + days * 86400000), toDateInputValue: () => "2026-10-14" },
    "./session-utils": { sortSessions: value => value, matchesStatusFilter: () => true },
    "../components/owner-toast": { showOwnerError: error => errors.push(error) },
  }).default;
  const render = () => h.render(Page);
  render(); h.commit(); await settle(); assert.equal(io.calls.length, 0);
  outlook.resolve({ isConnected: true }); await settle(); render(); h.commit(); await settle();
  assert.equal(io.calls.length, 1);
  let tree = render(); const date = find(tree, node => typeof node.props.onDateChange === "function");
  date.props.onDateChange(new Date("2026-10-15T12:00:00Z")); render(); h.commit(); await settle();
  assert.equal(io.calls[0].signal.aborted, true);
  io.calls[1].resolve([{ id: 2 }]); await settle(); io.calls[0].resolve([{ id: 1 }]); await settle();
  tree = render(); assert.equal(find(tree, node => node.props.sessions?.[0]?.id === 2).props.sessions[0].id, 2);
  let filter = find(tree, node => typeof node.props.onStatusFilterChange === "function");
  filter.props.onStatusFilterChange("all"); render(); h.commit(); await settle(); assert.equal(io.calls.length, 2);
  filter = find(render(), node => typeof node.props.onTrainerFilterChange === "function");
  filter.props.onTrainerFilterChange("10"); render(); h.commit(); await settle(); assert.equal(io.calls.length, 3);
  locationId = 2; render(); h.commit(); await settle(); render(); h.commit(); await settle();
  assert.equal(io.calls.length, 4); assert.equal(io.calls[3].args[0].trainerId, undefined);
  const calendar = find(render(), node => typeof node.props.onSelectSession === "function");
  calendar.props.onSelectSession({ id: 4 }); calendar.props.onSelectSession({ id: 5 }); await settle();
  assert.equal(io.calls[4].signal.aborted, true);
  io.calls[5].resolve({ id: 5 }); await settle(); io.calls[4].resolve({ id: 4 }); await settle();
  assert.ok(find(render(), node => node.props.open === true && node.props.session?.id === 5));
  h.unmount(); assert.equal(io.calls[3].signal.aborted, true);
  io.calls[3].reject(new Error("late error")); await settle(); assert.equal(errors.length, 0);
});

test("client list renders one responsive row per returned client and preserves server pagination", async () => {
  const h = hooks();
  const clients = Array.from({ length: 500 }, (_, index) => ({ id: index + 1, fullName: "Klient " + index, firstName: "Klient", lastName: String(index) }));
  const Page = load("app/(app)/owner/clients/page.tsx", {
    react: h.react, "../components/use-owner-read": reader(h), "next/navigation": { useSearchParams: () => new URLSearchParams(), useRouter: () => ({ replace: stub }) },
    "@/app/lib/owner/clients": { getOwnerClients: async () => ({ items: clients.slice(0, 25), page: 1, pageSize: 25, totalCount: 500, totalPages: 20, summary: { withActivePackageCount: 0 } }) },
    "@/app/lib/owner/location-filter": { useOwnerLocationFilter: () => ({ selectedLocationId: null }), matchesOwnerLocationId: () => true },
    "@/app/(app)/owner/clients/components/client-display": {
      getClientName: client => client.fullName, getClientBalance: () => 0, formatClientBalance: () => "0 zł",
      getClientPackageUsage: () => ({ percent: 0, label: "Brak", packageName: "Brak" }), hasActiveClientPackage: () => false, getPortalAccessLabel: () => "Brak konta",
    },
    "@/app/(app)/owner/clients/components/OwnerClientFilters": {
      default: stub, defaultOwnerClientFilters: { search: "", packageFilter: "all", trainerFilter: "all", amountDueOnly: false, sort: "newest" },
    },
    "@/app/components/clients/client-list-display": { pluralizeClients: count => `${count} klientów`, clientAmountDue: () => ({ label: "", tone: "settled" }) },
  }).default;
  const root = Page().props.children; const render = () => h.render(root.type, root.props);
  render(); h.commit(); h.timers(); await settle();
  const rowIds = []; let pageLevelProfileLinks = 0, pagination = 0;
  function count(node) {
    if (!node || typeof node !== "object") return;
    if (node.props?.client?.id) rowIds.push(node.props.client.id);
    if (/^\/owner\/clients\/\d+$/.test(node.props?.href ?? "")) pageLevelProfileLinks++;
    if ("totalItems" in (node.props ?? {}) || "pageSize" in (node.props ?? {})) pagination++;
    const children = node.props?.children;
    (Array.isArray(children) ? children.flat(Infinity) : [children]).forEach(count);
  }
  count(render());
  assert.equal(rowIds.length, 25);
  assert.equal(new Set(rowIds).size, 25);
  assert.equal(pageLevelProfileLinks, 0, "the page must not render a second, duplicated representation of each client");
  assert.equal(pagination, 1);
  h.unmount();
});

test("stage-two adapters preserve paths/queries and pass an optional AbortSignal", async () => {
  const calls = [], backend = { backendGet: async (...args) => { calls.push(args); return []; } };
  const clients = load("app/lib/owner/clients.ts", { "../backend": backend });
  const sessions = load("app/lib/owner/sessions.ts", { "../backend": backend });
  const billing = load("app/lib/owner/billing.ts", { "../backend": backend });
  const signal = new AbortController().signal;
  await clients.getClient(1, signal); await clients.getClientsByTrainer(2, signal);
  await clients.getClientSubscription(1, signal); await clients.getClientTrainingPlan(1, signal);
  await clients.getClientLegalConsents(1, signal); await clients.getClientRefunds(1, { page: 1, pageSize: 25 }, signal);
  await sessions.getOwnerSessions({ from: "2026-10-01", trainerId: 2 }, signal);
  await sessions.getTrainerSessions(2, signal); await sessions.getSession(3, signal);
  await billing.getClientPayments(1, { page: 1, pageSize: 3 }, signal);
  assert.equal(calls.length, 10); assert.ok(calls.every(call => call[2] === signal));
  assert.equal(calls[5][1].PageSize, 25); assert.equal(calls[6][1].TrainerId, 2); assert.equal(calls[9][1].PageSize, 3);
});
