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

test("owner sort menus disable unsupported choices while trainer payment sorts stay available", () => {
  const h = hooks();
  const filters = load("app/(app)/owner/clients/components/OwnerClientFilters.tsx", { react: h.react });
  const tree = h.render(filters.default, { value: filters.defaultOwnerClientFilters, onChange() {} });
  const options = find(tree, node => node.props.label === "Sortuj").props.options;
  assert.deepEqual(Array.from(options.filter(option => !option.disabled), option => option.value), ["newest", "name"]);
  const payments = load("app/(app)/owner/payments/components/PaymentFilters.tsx");
  const render = serverPagination => payments.PaymentFilters({ serverPagination, value: payments.defaultPaymentFilters, advancedOpen: false, onChange() {}, onClear() {}, onAdvancedOpenChange() {} });
  const ownerOptions = find(render(true), node => node.props.label === "Sortuj").props.options;
  assert.equal(ownerOptions.find(option => option.value === "clientAsc").disabled, true);
  assert.equal(ownerOptions.find(option => option.value === "overpaymentDesc").disabled, true);
  assert.ok(find(render(false), node => node.props.label === "Sortuj").props.options.every(option => !option.disabled));
});

function emptyClientsFixture(locationId = null, totalCount = 0) {
  const h = hooks();
  const reader = load("app/(app)/owner/components/use-owner-read.ts", { react: h.react, "@/app/lib/backend": { getErrorMessage: (_, fallback) => fallback } }, { setTimeout: h.window.setTimeout, clearTimeout: h.window.clearTimeout });
  const defaults = { search: "", packageFilter: "all", trainerFilter: "all", sort: "newest" };
  const Page = load("app/(app)/owner/clients/page.tsx", {
    react: h.react,
    "next/navigation": { useSearchParams: () => new URLSearchParams(), useRouter: () => ({ replace() {} }) },
    "../components/use-owner-read": reader,
    "@/app/lib/owner/location-filter": { useOwnerLocationFilter: () => ({ selectedLocationId: locationId }) },
    "@/app/lib/owner/clients": { getOwnerClients: async () => ({ items: [], page: 1, pageSize: 25, totalCount, totalPages: totalCount ? 1 : 0, summary: { withActivePackageCount: 0 } }) },
    "@/app/(app)/owner/clients/components/OwnerClientFilters": { default: () => null, defaultOwnerClientFilters: defaults },
    "@/app/(app)/owner/clients/components/client-list-display": { pluralizeClients: count => String(count) },
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

test("paginated history preserves server order and does not show misleading empty groups", () => {
  const h = hooks();
  const Component = load("app/(app)/owner/clients/[id]/components/ClientSessionHistory.tsx", { react: h.react, "@/app/lib/group-sessions": { isConsultationSession: () => false } }).default;
  const sessions = [{ id: 2, startAt: "2030-01-01", status: "Planned" }, { id: 1, startAt: "2020-01-01", status: "Completed" }];
  const tree = h.render(Component, { clientId: 1, sessions, pagination: { page: 2, pageSize: 25, totalCount: 100, totalPages: 4, onPageChange() {} } });
  assert.equal(find(tree, node => node.props.children === "Brak sesji w tej sekcji."), null);
  const container = find(tree, node => node.props.className === "flex flex-col gap-1.5");
  assert.deepEqual(Array.from(container.props.children, row => row.props.session.id), [2, 1]);
  assert.equal(find(tree, node => node.props.itemLabel === "treningów").props.totalItems, 100);
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
