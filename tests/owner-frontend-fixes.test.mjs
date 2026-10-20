import test from "node:test";
import assert from "node:assert/strict";
import { load, hooks, find, settle, deferred } from "./owner-read-harness.mjs";

test("disabled select options cannot change the current filter", () => {
  const h = hooks(), changes = [];
  const { CustomSelect } = load("app/components/ui/custom-select.tsx", { react: h.react, "./field-density": { useFieldDensity: () => "normal" } });
  const props = { value: "newest", options: [{ value: "newest", label: "Najnowsi" }, { value: "usage", label: "Wykorzystanie", disabled: true }], onChange: value => changes.push(value) };
  const render = () => h.render(CustomSelect, props);
  find(render(), node => node.type === "button").props.onClick();
  const option = find(render(), node => node.type === "button" && node.props.disabled);
  assert.ok(option); option.props.onClick();
  assert.deepEqual(changes, []);
});

test("owner and trainer sort menus expose every sort the server supports", () => {
  const h = hooks();
  const filters = load("app/(app)/owner/clients/components/OwnerClientFilters.tsx", { react: h.react });
  const tree = h.render(filters.default, { value: filters.defaultOwnerClientFilters, onChange() {} });
  const options = find(tree, node => node.props.label === "Sortuj").props.options;
  assert.deepEqual(Array.from(options.filter(option => !option.disabled), option => option.value), ["package-usage", "newest", "name", "trainer", "amount-due-desc", "amount-due-asc"]);
  const payments = load("app/(app)/owner/payments/components/PaymentFilters.tsx");
  const render = serverPagination => payments.PaymentFilters({ serverPagination, value: payments.defaultPaymentFilters, advancedOpen: false, onChange() {}, onClear() {}, onAdvancedOpenChange() {} });
  const ownerOptions = find(render(true), node => node.props.label === "Sortuj").props.options;
  assert.ok(ownerOptions.every(option => !option.disabled));
  assert.ok(find(render(false), node => node.props.label === "Sortuj").props.options.every(option => !option.disabled));
});

test("amount-due filter counts as an advanced filter and is cleared with the rest", () => {
  const h = hooks(), changes = [];
  const filters = load("app/(app)/owner/clients/components/OwnerClientFilters.tsx", { react: h.react });
  const render = value => h.render(filters.default, { value, onChange: next => changes.push(next) });
  const idle = render(filters.defaultOwnerClientFilters);
  assert.equal(idle.props.advancedActiveCount, 0); assert.equal(idle.props.canClear, false);
  const select = find(idle.props.advanced, node => node.props.label === "Płatności");
  assert.deepEqual(Array.from(select.props.options, option => option.value), ["all", "due"]);
  select.props.onChange("due");
  assert.equal(changes.at(-1).amountDueOnly, true);
  const active = render({ ...filters.defaultOwnerClientFilters, amountDueOnly: true, packageFilter: "active-package" });
  assert.equal(active.props.advancedActiveCount, 2); assert.equal(active.props.canClear, true);
  assert.equal(find(active.props.advanced, node => node.props.label === "Płatności").props.value, "due");
  active.props.onClear();
  assert.equal(changes.at(-1).amountDueOnly, false);
});

function amountDueClientsFixture(search) {
  const h = hooks(), queries = [], totalsQueries = [], urls = [];
  const reader = load("app/(app)/owner/components/use-owner-read.ts", { react: h.react, "@/app/lib/backend": { getErrorMessage: (_, fallback) => fallback } }, { setTimeout: h.window.setTimeout, clearTimeout: h.window.clearTimeout });
  const defaults = { search: "", packageFilter: "all", trainerFilter: "all", amountDueOnly: false, sort: "newest" };
  const Page = load("app/(app)/owner/clients/page.tsx", {
    react: h.react,
    "next/navigation": { useSearchParams: () => new URLSearchParams(search), useRouter: () => ({ replace() {} }) },
    "../components/use-owner-read": reader,
    "../components/list-url-state": { readPositiveInt: value => (value && /^\d+$/.test(value) ? Number(value) : null), listUrlKey: () => "", useListScrollRestoration() {}, useListUrlSync: params => urls.push(params) },
    "@/app/lib/owner/location-filter": { useOwnerLocationFilter: () => ({ selectedLocationId: null }) },
    "@/app/lib/owner/clients": { getOwnerClients: async query => { (query.pageSize === 1 ? totalsQueries : queries).push(query); return query.pageSize === 1 ? { items: [], page: 1, pageSize: 1, totalCount: 108, totalPages: 108, summary: { withActivePackageCount: 40 } } : { items: [], page: query.page, pageSize: 25, totalCount: 0, totalPages: 0, summary: { withActivePackageCount: 0 } }; } },
    "@/app/(app)/owner/clients/components/OwnerClientFilters": { default: () => null, defaultOwnerClientFilters: defaults },
    "@/app/components/clients/client-list-display": { pluralizeClients: count => String(count), clientResultsLabel: (count, total) => `${count} of ${total}`, clientAmountDue: () => ({ label: "", tone: "settled" }) },
  }).default;
  const root = Page().props.children;
  const render = () => h.render(root.type, root.props);
  const flush = async () => { render(); h.commit(); h.timers(); await settle(); return render(); };
  return { h, defaults, render, flush, queries, totalsQueries, urls };
}

test("amount-due filter is applied by the server, resets the page and is kept in the address", async () => {
  const { h, defaults, render, flush, queries, urls } = amountDueClientsFixture("page=3");
  await flush();
  assert.equal(queries.at(-1).page, 3); assert.equal(queries.at(-1).hasAmountDue, undefined);
  find(render(), node => node.props.value?.trainerFilter === "all").props.onChange({ ...defaults, amountDueOnly: true });
  const tree = await flush();
  assert.equal(queries.at(-1).page, 1); assert.equal(queries.at(-1).hasAmountDue, true);
  assert.equal(urls.at(-1).due, "1"); assert.equal(urls.at(-1).page, null);
  const empty = find(tree, node => node.props.title === "Nikt nie ma nic do zapłaty");
  assert.ok(empty);
  empty.props.action.props.onClick();
  await flush();
  assert.equal(queries.at(-1).hasAmountDue, undefined); assert.equal(urls.at(-1).due, null);
  h.unmount();
});

test("filtered client list counts results against the whole client base from one unfiltered count read", async () => {
  const { h, flush, queries, totalsQueries } = amountDueClientsFixture("due=1");
  const tree = await flush();
  assert.equal(queries.at(-1).hasAmountDue, true);
  assert.deepEqual(totalsQueries.map(query => ({ ...query })), [{ page: 1, pageSize: 1, isArchived: false, locationId: null }]);
  assert.equal(find(tree, node => node.props.title === "Lista klientów").props.meta, "0 of 108");
  assert.ok(find(tree, node => node.type === "p" && node.props.className?.includes("text-tertiary-light") && node.props.children === 40));
  h.unmount();
  const unfiltered = amountDueClientsFixture("");
  await unfiltered.flush();
  assert.equal(unfiltered.totalsQueries.length, 0, "without filters the list itself is the total");
  unfiltered.h.unmount();
});

test("amount-due filter and sort are restored from the address", async () => {
  const { h, flush, queries } = amountDueClientsFixture("due=1&sort=amount-due-desc");
  await flush();
  assert.equal(queries.at(-1).hasAmountDue, true); assert.equal(queries.at(-1).sort, "amountDueDesc");
  h.unmount();
  const legacy = amountDueClientsFixture("due=yes&sort=balance-desc");
  await legacy.flush();
  assert.equal(legacy.queries.at(-1).hasAmountDue, undefined); assert.equal(legacy.queries.at(-1).sort, "createdDesc");
  legacy.h.unmount();
});

function emptyClientsFixture(locationId = null, totalCount = 0) {
  const h = hooks();
  const reader = load("app/(app)/owner/components/use-owner-read.ts", { react: h.react, "@/app/lib/backend": { getErrorMessage: (_, fallback) => fallback } }, { setTimeout: h.window.setTimeout, clearTimeout: h.window.clearTimeout });
  const defaults = { search: "", packageFilter: "all", trainerFilter: "all", amountDueOnly: false, sort: "newest" };
  const Page = load("app/(app)/owner/clients/page.tsx", {
    react: h.react,
    "next/navigation": { useSearchParams: () => new URLSearchParams(), useRouter: () => ({ replace() {} }) },
    "../components/use-owner-read": reader,
    "@/app/lib/owner/location-filter": { useOwnerLocationFilter: () => ({ selectedLocationId: locationId }) },
    "@/app/lib/owner/clients": { getOwnerClients: async () => ({ items: [], page: 1, pageSize: 25, totalCount, totalPages: totalCount ? 1 : 0, summary: { withActivePackageCount: 0 } }) },
    "@/app/(app)/owner/clients/components/OwnerClientFilters": { default: () => null, defaultOwnerClientFilters: defaults },
    "@/app/components/clients/client-list-display": { pluralizeClients: count => String(count), clientResultsLabel: (count, total) => `${count} of ${total}`, clientAmountDue: () => ({ label: "", tone: "settled" }) },
  }).default;
  const root = Page().props.children;
  const render = () => h.render(root.type, root.props);
  return { h, defaults, render };
}

test("empty search results do not suggest that the studio has no clients", async () => {
  const { h, defaults, render } = emptyClientsFixture();
  const filter = find(render(), node => node.props.value?.trainerFilter === "all");
  filter.props.onChange({ ...defaults, search: "nieistniejący klient" });
  render(); h.commit(); h.timers(); await settle();
  const tree = render();
  assert.ok(find(tree, node => node.props.title === "Brak klientów spełniających wybrane kryteria"));
  assert.equal(find(tree, node => node.props.title === "Brak klientów"), null);
  h.unmount();
});

test("location-only empty result prompts changing location without an ineffective clear button", async () => {
  const { h, render } = emptyClientsFixture(2);
  render(); h.commit(); h.timers(); await settle();
  const empty = find(render(), node => node.props.title === "Brak klientów spełniających wybrane kryteria");
  assert.match(empty.props.message, /lokalizację/); assert.equal(empty.props.action, undefined);
  h.unmount();
});

test("empty page with nonzero total never claims that the client database is empty", async () => {
  const { h, render } = emptyClientsFixture(null, 25);
  render(); h.commit(); h.timers(); await settle();
  assert.ok(find(render(), node => node.props.title === "Brak klientów na tej stronie"));
  h.unmount();
});

test("paginated history separates upcoming sessions from history without misleading empty groups", () => {
  const h = hooks();
  const mod = load("app/(app)/owner/clients/[id]/components/ClientSessionHistory.tsx", { react: h.react, "@/app/lib/group-sessions": { isConsultationSession: () => false } });
  const sessions = [{ id: 3, startAt: "2031-01-01", status: "Planned" }, { id: 2, startAt: "2030-01-01", status: "Planned" }, { id: 4, startAt: "2030-06-01", status: "Cancelled" }, { id: 1, startAt: "2020-01-01", status: "Completed" }, { id: 0, startAt: "2019-01-01", status: "Completed" }];
  const tree = h.render(mod.default, { clientId: 1, sessions, pagination: { page: 2, pageSize: 25, totalCount: 100, totalPages: 4, onPageChange() {} } });
  assert.equal(find(tree, node => node.props.children === "Brak sesji w tej sekcji."), null);
  const group = title => find(tree, node => node.props.title === title);
  assert.deepEqual(Array.from(group("Nadchodzące").props.children, row => row.props.session.id), [2, 3], "nearest upcoming first");
  assert.deepEqual(Array.from(group("Historia treningów").props.children, row => row.props.session.id), [4, 1, 0], "history keeps the server order; cancelled sessions are not upcoming");
  assert.equal(find(tree, node => node.props.itemLabel === "treningów").props.totalItems, 100);
  const onlyPast = h.render(mod.default, { clientId: 1, sessions: [sessions[3]], pagination: { page: 3, pageSize: 25, totalCount: 100, totalPages: 4, onPageChange() {} } });
  assert.equal(find(onlyPast, node => node.props.title === "Nadchodzące"), null, "no empty upcoming group");
});

test("nearest planned session is reported only when the first page can prove it", () => {
  const { nearestUpcomingSession } = load("app/(app)/owner/clients/[id]/components/ClientSessionHistory.tsx", { "@/app/lib/group-sessions": { isConsultationSession: () => false } });
  const now = Date.parse("2026-10-20T12:00:00Z");
  const planned = (id, startAt, status = "Planned") => ({ id, startAt, status });
  const page = (items, extra = {}) => ({ page: 1, totalPages: 3, items, ...extra });
  assert.equal(nearestUpcomingSession(page([planned(3, "2026-10-30T10:00:00Z"), planned(2, "2026-10-22T10:00:00Z"), planned(1, "2026-10-01T10:00:00Z", "Completed")]), now).id, 2);
  assert.equal(nearestUpcomingSession(page([planned(3, "2026-10-30T10:00:00Z"), planned(2, "2026-10-22T10:00:00Z")]), now), undefined, "all future on a multi-page history: the nearest may be on a later page");
  assert.equal(nearestUpcomingSession(page([planned(2, "2026-10-22T10:00:00Z")], { totalPages: 1 }), now).id, 2);
  assert.equal(nearestUpcomingSession(page([planned(2, "2026-10-22T10:00:00Z", "Cancelled"), planned(1, "2026-10-01T10:00:00Z", "Completed")]), now), null);
  assert.equal(nearestUpcomingSession(page([planned(1, "2026-10-01T10:00:00Z")], { page: 2 }), now), undefined);
  assert.equal(nearestUpcomingSession(page(null, { totalPages: 0 }), now), null);
});

test("Active is matched exactly, and bad package validity cannot crash the group list", () => {
  const { isActiveTrainer } = load("app/lib/owner/trainers.ts");
  assert.equal(isActiveTrainer({ status: " Active " }), true);
  for (const status of ["Inactive", "NotActive", "Archived", null, undefined]) assert.equal(isActiveTrainer({ status }), false);
  const { groupPackageValidityLabel } = load("app/lib/owner/group-enrollments.ts");
  assert.equal(groupPackageValidityLabel(null), null);
  assert.equal(groupPackageValidityLabel("not-a-date"), "Termin ważności niedostępny");
  assert.match(groupPackageValidityLabel("2026-12-31T12:00:00Z"), /31\.12\.2026/);
});

test("filter options reject missing or malformed data instead of pretending no people exist", async () => {
  for (const result of [null, {}, { clients: [], trainers: null }, { clients: [{ id: 1, name: null }], trainers: [] }, { clients: [], trainers: [{ id: 0, name: "Anna" }] }]) {
    const { getOwnerFilterOptions } = load("app/lib/owner/filter-options.ts", { "../backend": { backendGet: async () => result } });
    await assert.rejects(getOwnerFilterOptions({ limit: 20 }), /dostępnych osób/);
  }
  const result = { clients: [], trainers: [] };
  const { getOwnerFilterOptions } = load("app/lib/owner/filter-options.ts", { "../backend": { backendGet: async () => result } });
  assert.equal(await getOwnerFilterOptions({}), result);
});

test("remote select retains the resolved name after its result disappears on refresh", async () => {
  const h = hooks(); h.react.useId = () => "fixture-select";
  let data = { clients: [], trainers: [{ id: 42, name: "Anna Kowalska" }] };
  const { OwnerRemoteSelect } = load("app/(app)/owner/components/OwnerRemoteSelect.tsx", { react: h.react, "./use-owner-read": { useOwnerRead: () => ({ data, loading: false }) } });
  const props = { kind: "trainers", value: "42", label: "Trener", onChange() {} };
  h.render(OwnerRemoteSelect, props); h.commit(); await settle();
  data = { clients: [], trainers: [] };
  assert.ok(find(h.render(OwnerRemoteSelect, props), node => node.props.children === "Anna Kowalska"));
  h.unmount();
});

test("trainer assignment validates only the selected trainer and ignores late data after closing", async () => {
  const h = hooks(), calls = [], changes = [], checking = [];
  const pending = deferred();
  const { isActiveTrainer } = load("app/lib/owner/trainers.ts");
  const { OwnerTrainerAssignmentSelect } = load("app/(app)/owner/components/OwnerTrainerAssignmentSelect.tsx", {
    react: h.react,
    "@/app/lib/owner/trainers": { isActiveTrainer, getTrainer: (...args) => { calls.push(args); return pending.promise; } },
    "@/app/lib/backend": { getErrorMessage: error => error.message },
  });
  const props = { value: "", locationId: 2, onChange: value => changes.push(value), onCheckingChange: value => checking.push(value) };
  const render = () => h.render(OwnerTrainerAssignmentSelect, props);
  const tree = render(); h.commit(); assert.equal(calls.length, 0);
  find(tree, node => node.props.kind === "trainers").props.onChange("7");
  assert.equal(calls.length, 1); assert.equal(calls[0][0], 7); assert.equal(checking.at(-1), true);
  assert.ok(find(render(), node => node.type === "fieldset").props.disabled);
  h.unmount(); assert.equal(calls[0][1].aborted, true);
  pending.resolve({ id: 7, status: "Active", locationIds: [2] }); await settle();
  assert.deepEqual(changes, []); assert.equal(checking.at(-1), false);
});

for (const trainer of [{ id: 7, status: "Inactive", locationIds: [2] }, { id: 7, status: "Active", locationIds: [3] }, { id: 7, status: "Active", locationIds: [2] }]) {
  test(`trainer assignment checks ${trainer.status} and location ${trainer.locationIds}`, async () => {
    const h = hooks(), changes = [], checking = [];
    const { isActiveTrainer } = load("app/lib/owner/trainers.ts");
    const { OwnerTrainerAssignmentSelect } = load("app/(app)/owner/components/OwnerTrainerAssignmentSelect.tsx", {
      react: h.react, "@/app/lib/backend": { getErrorMessage: error => error.message },
      "@/app/lib/owner/trainers": { isActiveTrainer, getTrainer: async () => trainer },
    });
    const props = { value: "", locationId: 2, onChange: value => changes.push(value), onCheckingChange: value => checking.push(value) };
    const render = () => h.render(OwnerTrainerAssignmentSelect, props);
    const tree = render(); h.commit();
    find(tree, node => node.props.kind === "trainers").props.onChange("7"); await settle();
    const valid = trainer.status === "Active" && trainer.locationIds.includes(2);
    assert.deepEqual(changes, valid ? ["7"] : []);
    assert.equal(Boolean(find(render(), node => node.props.role === "alert")), !valid);
    assert.equal(checking.at(-1), false); h.unmount();
  });
}

for (const invitation of [false, true]) {
  test(`${invitation ? "invite" : "add client"} form does not load all trainers and cancels stale location reads`, async () => {
    const h = hooks(), calls = [], locations = deferred();
    const path = invitation ? "app/(app)/owner/components/InviteUserModal.tsx" : "app/(app)/owner/clients/components/AddClientModal.tsx";
    const Component = load(path, {
      react: h.react, "next/navigation": { useRouter: () => ({ push() {} }) },
      "@/app/lib/owner/location-filter": { useOwnerLocationFilter: () => ({ selectedLocationId: null }) },
      "@/app/lib/owner/locations": { getLocations: signal => { calls.push(["locations", signal]); return locations.promise; } },
      "@/app/lib/owner/trainers": { getTrainers: () => { throw new Error("Unexpected full trainer list"); } },
      "@/app/lib/owner/invitations": { getInvitations: async () => [], isPendingInvitation: () => true },
    }).default;
    const props = { open: true, role: "Client", onClose() {}, onCreated: async () => {} };
    h.render(Component, props); h.commit(); await settle();
    assert.equal(calls.length, 1); assert.equal(calls[0][0], "locations");
    h.render(Component, { ...props, open: false }); h.commit();
    assert.equal(calls[0][1].aborted, true);
    locations.resolve([{ id: 9, isActive: true }]); await settle();
    assert.equal(h.render(Component, { ...props, open: false }), null);
    h.unmount();
  });
}

test("owner client edit loads only the assigned trainer and preserves an inactive assignment", async () => {
  const h = hooks(), calls = [];
  const Component = load("app/(app)/owner/clients/[id]/components/EditClientModal.tsx", {
    react: h.react,
    "@/app/lib/backend": { isNotFoundError: () => false },
    "@/app/lib/owner/trainers": { getTrainer: async id => { calls.push(id); return { id, status: "Inactive", locationIds: [2] }; }, getTrainers: () => { throw new Error("Unexpected full trainer list"); } },
    "@/app/lib/owner/locations": { getLocations: async () => [{ id: 2, isActive: true, name: "Studio" }] },
    "@/app/lib/owner/clients": { getClientTrainingPlan: async () => ({ url: "" }) },
    "@/app/lib/formatters/date": { toDateInputValue: () => "" },
  }).default;
  const props = { open: true, client: { id: 1, firstName: "Anna", lastName: "Nowak", trainerId: 7, trainerFullName: "Dotychczasowy trener", locationId: 2 }, onClose() {}, onSaved() {} };
  h.render(Component, props); h.commit(); await settle();
  const tree = h.render(Component, props);
  assert.deepEqual(calls, [7]);
  const select = find(tree, node => node.props.requireActive === false);
  assert.ok(select); assert.equal(select.props.value, "7");
  assert.equal(select.props.initialName, "Dotychczasowy trener");
  h.unmount();
});
