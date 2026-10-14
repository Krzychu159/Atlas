import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { load, hooks, find, deferred, settle } from "./owner-read-harness.mjs";

const stub = () => null;
test("read adapters propagate cancellation without changing query contracts", async () => {
  const calls = [];
  const backend = { backendGet: async (...args) => { calls.push(args); return {}; } };
  const analytics = load("app/lib/owner/analytics.ts", { "../backend": backend });
  const expenses = load("app/lib/owner/expenses.ts", { "@/app/lib/backend": backend });
  const packages = load("app/lib/owner/packages.ts", { "../backend": backend });
  const signal = new AbortController().signal;
  const query = { locationId: 7, page: 2, pageSize: 25 };
  await analytics.getRevenueStatistics(query, signal);
  await analytics.getTrainerCostStatistics(query, signal);
  await expenses.getExpenses(query, signal);
  await expenses.getExpenseStatistics(query, signal);
  await packages.getPackageClients(9, signal);
  assert.ok(calls.every(call => call[2] === signal));
  assert.deepEqual(JSON.parse(JSON.stringify(calls[3][1])), { locationId: 7 });
  assert.equal(query.page, 2);
  assert.equal(calls[4][0], "Packages/9/clients");
});

test("package reads start in parallel and late old profiles cannot overwrite the new one", async () => {
  const h = hooks(), calls = [], errors = [];
  const api = Object.fromEntries(["getPackage", "getPackageClients"].map(name => [name, (id, signal) => {
    const request = { name, id, signal, ...deferred() }; calls.push(request); return request.promise;
  }]));
  const Page = load("app/(app)/owner/packages/[id]/page.tsx", {
    react: h.react, "@/app/lib/owner/packages": api,
    "@/app/lib/backend": { getErrorMessage: (_, fallback) => fallback },
    "../../components/owner-toast": { showOwnerError: error => errors.push(error) },
  }).default;
  const render = id => h.render(Page, { params: { id: String(id) } });
  render(1); h.commit(); await settle();
  assert.deepEqual(calls.map(call => call.name), ["getPackage", "getPackageClients"]);
  render(2); h.commit(); await settle();
  assert.ok(calls.slice(0, 2).every(call => call.signal.aborted));
  calls[2].resolve({ id: 2, name: "Nowy" }); calls[3].resolve([{ id: 12 }]); await settle();
  calls[0].resolve({ id: 1, name: "Stary" }); calls[1].reject(new Error("old failure")); await settle();
  const hero = find(render(2), element => element.props.item?.id === 2 && "clientsAvailable" in element.props);
  assert.ok(hero);
  assert.equal(hero.props.clients[0].id, 12);
  assert.equal(errors.length, 0);
  h.unmount();
});

test("package client failure is visible and retry does not pretend no clients exist", async () => {
  const h = hooks(); let fail = true, calls = 0, packageCalls = 0;
  const Page = load("app/(app)/owner/packages/[id]/page.tsx", {
    react: h.react,
    "@/app/lib/owner/packages": { getPackage: async () => { packageCalls++; return { id: 3 }; }, getPackageClients: async () => { calls++; if (fail) throw new Error("unavailable"); return [{ id: 42 }]; } },
    "@/app/lib/backend": { getErrorMessage: (_, fallback) => fallback },
  }).default;
  const render = () => h.render(Page, { params: { id: "3" } });
  render(); h.commit(); await settle();
  const tree = render();
  const initialItem = find(tree, element => "clientsAvailable" in element.props).props.item;
  assert.ok(find(tree, element => element.props.role === "alert"));
  assert.equal(find(tree, element => "clientsAvailable" in element.props).props.clientsAvailable, false);
  const retry = find(tree, element => element.props.children === "Spróbuj ponownie");
  fail = false; retry.props.onClick(); render(); h.commit(); await settle();
  assert.equal(calls, 2);
  assert.equal(packageCalls, 1);
  assert.equal(find(render(), element => "clientsAvailable" in element.props).props.item, initialItem);
  assert.equal(find(render(), element => "clientsAvailable" in element.props).props.clientsAvailable, true);
  h.unmount();
});

test("invalid package identifiers never send a read", async () => {
  for (const id of ["0", "-1", "1.5", "abc", "9007199254740992"]) {
    const h = hooks(); let calls = 0;
    const Page = load("app/(app)/owner/packages/[id]/page.tsx", { react: h.react,
      "@/app/lib/owner/packages": { getPackage: () => { calls++; }, getPackageClients: () => { calls++; } },
    }).default;
    const render = () => h.render(Page, { params: { id } });
    render(); h.commit(); await settle();
    assert.equal(calls, 0); assert.ok(find(render(), element => element.props.role === "alert")); h.unmount();
  }
});

function reportPage(path, isStatistics) {
  const h = hooks(), calls = [], location = deferred(), errors = [];
  const read = name => (query, signal) => { const call = { name, query, signal, ...deferred() }; calls.push(call); return call.promise; };
  const filters = () => null;
  const dictionary = { fallbackCategories: [], fallbackPaymentStatuses: [], fallbackRecurrenceEditScopes: [], normalizeDictionary: value => value, deriveLegalEntities: () => [] };
  const ownerRead = load("app/(app)/owner/components/use-owner-read.ts", { react: h.react, "@/app/lib/backend": { getErrorMessage: (_, fallback) => fallback } }, { setTimeout: h.window.setTimeout, clearTimeout: h.window.clearTimeout });
  const dependencies = {
    "../components/use-owner-read": ownerRead,
    react: h.react,
    "@/app/lib/owner/location-filter": { useOwnerLocationFilter: () => ({ selectedLocationId: null, setSelectedLocationValue: stub }) },
    "@/app/lib/session-corrections": { usePaymentDateCorrectionRevision: () => 0 },
    "@/app/lib/owner/locations": { getLocations: () => location.promise },
    "@/app/lib/owner/clients": { getClients: async () => [] },
    "@/app/lib/owner/trainers": { getTrainers: async () => [] },
    "@/app/lib/owner/analytics": { getRevenueStatistics: read("revenue"), getTrainerCostStatistics: read("trainer"), getTrainerCostSessions: () => { throw new Error("hidden section requested"); } },
    "@/app/lib/owner/expenses": { getExpenses: read("list"), getExpenseStatistics: read("expense"), getExpenseCategories: async () => [], getExpensePaymentStatuses: async () => [], getExpenseRecurrenceEditScopes: async () => [] },
    "../components/owner-toast": { showOwnerError: error => errors.push(error) },
    "./components/StatisticsFilters": { __esModule: true, default: filters, initialStatisticsFilters: {} },
    "./components/ExpenseFilters": { __esModule: true, default: filters, initialExpenseFilters: { search: "" } },
    "../expenses/expense-config": dictionary, "./expense-config": dictionary,
    "./statistics-config": { booleanFilter: () => null, numberFilter: () => null, combineMonthlyData: () => [], emptyExpenseStatistics: {}, emptyRevenueStatistics: {}, emptyTrainerCostStatistics: {} },
  };
  const Page = load(path, dependencies, { window: h.window }).default;
  const root = Page();
  const render = () => h.render(root.type, root.props);
  return { h, calls, location, errors, render, filters, expected: isStatistics ? 3 : 2 };
}

for (const isStatistics of [true, false]) test(`${isStatistics ? "statistics" : "expenses"}: old filters and unmounted reads never publish data`, async () => {
  const view = reportPage(`app/(app)/owner/${isStatistics ? "statistics" : "expenses"}/page.tsx`, isStatistics);
  const { h, calls, render, filters, expected } = view;
  render(); h.commit(); h.timers(); await settle();
  assert.equal(calls.length, expected);
  const first = calls.slice();
  const filter = find(render(), element => element.type === filters);
  filter.props.onChange(isStatistics ? "from" : "search", "new");
  render(); h.commit();
  assert.ok(first.every(call => call.signal.aborted));
  h.timers(); await settle();
  const latest = calls.slice(expected);
  for (const call of latest) call.resolve(call.name === "list" ? { items: [], totalCount: 0, totalPages: 1 } : { marker: "new" });
  await settle();
  for (const call of first) call.resolve(call.name === "list" ? { items: [], totalCount: 0, totalPages: 1 } : { marker: "old" });
  await settle();
  assert.equal(view.errors.length, 0);
  const tree = render();
  const stats = find(tree, element => element.props[isStatistics ? "revenue" : "statistics"]?.marker === "new");
  assert.ok(stats);
  const refresh = find(tree, element => isStatistics ? element.props.children === "Odśwież" : element.props["aria-label"] === "Odśwież wydatki");
  refresh.props.onClick(); await settle(); h.unmount();
  assert.ok(calls.slice(-expected).every(call => call.signal.aborted));
  for (const call of calls.slice(-expected)) call.reject(new Error("unmounted"));
  await settle(); assert.equal(view.errors.length, 0);
});

test("late location dictionary does not refetch expense list and summary", async () => {
  const { h, calls, render, location } = reportPage("app/(app)/owner/expenses/page.tsx", false);
  render(); h.commit(); h.timers(); await settle();
  assert.equal(calls.length, 2);
  for (const call of calls) call.resolve(call.name === "list" ? { items: [], totalPages: 1 } : {});
  await settle(); render(); h.commit();
  location.resolve([{ id: 7, isActive: true }]); await settle();
  render(); h.commit(); h.timers(); await settle();
  assert.equal(calls.length, 2); h.unmount();
});

test("disabled storage keeps the location filter and same-tab synchronization usable", () => {
  const h = hooks(), events = [];
  const window = { localStorage: { getItem() { throw new Error("denied"); }, setItem() { throw new Error("denied"); } }, dispatchEvent: event => events.push(event) };
  const api = load("app/lib/owner/location-filter.ts", { react: h.react }, { window, CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail; } } });
  let filter = h.render(api.useOwnerLocationFilter);
  assert.equal(filter.selectedLocationId, null);
  filter.setSelectedLocationValue("7");
  filter = h.render(api.useOwnerLocationFilter);
  assert.equal(filter.selectedLocationId, 7);
  assert.equal(events[0].detail.value, "7");
});

test("unavailable package clients display unknown counts and usage instead of zero", () => {
  const Hero = load("app/(app)/owner/packages/[id]/components/PackageDetailsHero.tsx", { "@/app/lib/period-packages": { isPeriodPackage: () => false } }).default;
  const markup = renderToStaticMarkup(React.createElement(Hero, { item: { id: 3, name: "Pakiet", price: 200, currency: "PLN", durationDays: 30, sessionsLimit: 10 }, clients: [], clientsAvailable: false }));
  assert.ok(markup.includes("Brak danych o wykorzystaniu"));
  assert.ok(!markup.includes("0 wykorzystanych sesji"));
  assert.equal((markup.match(/—/g) || []).length, 2);
});
