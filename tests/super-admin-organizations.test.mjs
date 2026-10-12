import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function load(path, dependencies = {}, globals = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2017, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, { exports, require: name => dependencies[name] ?? {}, URL, Headers, AbortSignal, ...globals });
  return exports;
}

// Fixtures are isolated to tests; production reads exclusively from the backend.
const organization = { organizationId: "org-1", name: "Studio Żuraw", slug: "zuraw", uiVariant: "standard" };
const api = load("app/lib/super-admin/organizations.ts");

test("organization reader exposes only safe fields and accepts organizationId", () => {
  const result = api.parseOrganization({ ...organization, secret: "never-render", connectionString: "never-render" });
  assert.deepEqual(JSON.parse(JSON.stringify(result)), organization);
  assert.equal(api.parseOrganization({ ...organization, organizationId: 8 }).organizationId, "8");
  assert.equal(api.parseOrganization({ ...organization, id: "wrong-id" }).organizationId, "org-1");
});

test("unreadable responses fail instead of turning into an empty organization list", () => {
  for (const response of [null, [], {}, { items: [], total: "0", page: 1, pageSize: 25 }, { items: [], total: -1, page: 1, pageSize: 25 }, { items: [organization], total: 0, page: 1, pageSize: 25 }, { items: [organization], total: 1, page: 2, pageSize: 25 }, { items: [], total: 0, page: 1, pageSize: 0 }, { items: [], total: 0 }, { items: [], totalCount: 0, page: 1, pageSize: 25 }]) {
    assert.throws(() => api.parseOrganizationPage(response, 1));
  }
  assert.throws(() => api.parseOrganization({ organizationId: "org-1", name: "" }));
  assert.throws(() => api.parseOrganization({ name: "Studio" }));
  for (const patch of [{ organizationId: undefined, id: "org-1" }, { organizationId: NaN }, { slug: undefined }, { slug: null }, { uiVariant: {} }, { uiVariant: undefined }]) {
    assert.throws(() => api.parseOrganization({ ...organization, ...patch }));
  }
});

test("pagination handles empty, complete and last pages", () => {
  assert.equal(api.parseOrganizationPage({ items: [], total: 0, page: 1, pageSize: 25 }, 1).totalPages, 0);
  assert.equal(api.parseOrganizationPage({ items: [organization], total: 25, page: 1, pageSize: 25 }, 1).totalPages, 1);
  const last = api.parseOrganizationPage({ items: [organization], total: 26, page: 2, pageSize: 25 }, 2);
  assert.equal(last.totalPages, 2);
  assert.equal(last.page, 2);
});

test("filtering uses only loaded items and matches names, slugs and identifiers", () => {
  const items = [api.parseOrganization(organization), api.parseOrganization({ organizationId: "org-2", name: "Studio Ruch", slug: "ruch", uiVariant: "standard" })];
  assert.equal(api.filterOrganizations(items, " żURAW ").length, 1);
  assert.equal(api.filterOrganizations(items, "org-2")[0].name, "Studio Ruch");
  assert.equal(api.filterOrganizations(items, "unavailable-on-another-page").length, 0);
  assert.equal(api.filterOrganizations(items, " ").length, 2);
});

test("list and details use contracted paths, 25-item pages and cancellation", async () => {
  const calls = [];
  const signal = new AbortController().signal;
  const client = load("app/lib/super-admin/organizations.ts", {
    "@/app/lib/backend": { backendGet: async (path, query, requestSignal) => {
      calls.push({ path, query, signal: requestSignal });
      return query ? { items: [organization], total: 26, page: query.page, pageSize: query.pageSize } : organization;
    } },
  });
  await client.getOrganizations(2, signal);
  await client.getOrganization("org-1", signal);
  assert.equal(calls[0].path, "super-admin/organizations");
  assert.deepEqual(JSON.parse(JSON.stringify(calls[0].query)), { page: 2, pageSize: 25 });
  assert.equal(calls[0].signal, signal);
  assert.equal(calls[1].path, "super-admin/organizations/org-1");
  assert.equal(calls[1].signal, signal);
  await assert.rejects(() => client.getOrganization("other-organization"));
});

const jsx = (type, props) => ({ type, props });
test("detail route passes the current URL organizationId directly to its view", async () => {
  const route = load("app/super-admin/organizations/[id]/page.tsx", {
    "react/jsx-runtime": { jsx, jsxs: jsx },
    "../../components/organization-details": { OrganizationDetails: "OrganizationDetails" },
  });
  for (const organizationId of ["org-1", "org-2"]) {
    const tree = await route.default({ params: Promise.resolve({ id: organizationId }) });
    assert.equal(tree.props.organizationId, organizationId);
  }
});
const backend = load("app/lib/backend.ts", { "./user-messages": load("app/lib/user-messages.ts") });
const states = load("app/super-admin/components/organization-states.tsx", {
  "react/jsx-runtime": { jsx, jsxs: jsx },
  "@/app/lib/backend": backend,
});
function descendants(tree) {
  if (!tree || typeof tree !== "object") return [];
  return [tree, ...[tree.props?.children].flat(Infinity).flatMap(descendants)];
}
function text(tree) { return JSON.stringify(tree); }

test("organization profile shows actual values and leaves future modules without actions", () => {
  const view = load("app/super-admin/components/organization-profile.tsx", {
    "react/jsx-runtime": { jsx, jsxs: jsx },
  });
  const tree = view.OrganizationProfile({ organization });
  for (const value of Object.values(organization)) assert.ok(text(tree).includes(value));
  for (const title of ["Dane organizacji", "Wygląd", "Lokalizacje", "Integracje", "Ustawienia organizacji"]) assert.ok(text(tree).includes(title));
  const nodes = descendants(tree);
  assert.equal(nodes.filter(node => ["button", "input", "form"].includes(node.type)).length, 0);
  const links = nodes.filter(node => node.type === "a");
  assert.equal(links.length, 0);
  for (const link of links) assert.ok(nodes.some(node => `#${node.props?.id}` === link.props.href));
  assert.ok(text(tree).includes("Wkrótce"));
});

test("401/403/404 show Polish messages and appropriate actions without raw errors", () => {
  for (const status of [401, 403, 404, 500]) {
    const tree = states.OrganizationError({ error: new backend.ApiError("Internal exception: secret", { status }), retry() {}, details: true, returnPath: "/super-admin/organizations/org-1" });
    assert.equal(tree.props.role, "alert");
    assert.ok(!text(tree).includes("Internal exception"));
    const buttons = descendants(tree).filter(node => node.type === "button");
    assert.equal(buttons.length, status === 500 ? 1 : 0);
    if (status === 401) assert.ok(text(tree).includes("/logout?reason=session-expired"));
    if (status === 404) assert.ok(text(tree).includes("Nie znaleziono organizacji"));
  }
});

test("empty filtered page and empty catalog remain distinct", () => {
  const filtered = states.OrganizationEmpty({ filtered: true, page: 1, clear() {} });
  const empty = states.OrganizationEmpty({ filtered: false, page: 1, clear() {} });
  assert.ok(text(filtered).includes("Brak pasujących organizacji na tej stronie"));
  assert.ok(text(empty).includes("Nie ma jeszcze organizacji"));
  assert.equal(descendants(filtered).filter(node => node.type === "button").length, 1);
  assert.equal(descendants(empty).filter(node => node.type === "button").length, 0);
});

const managed = { ...organization, uiVariant: "default", status: "Draft", revision: 0, crmAccessEnabled: false };
const formValues = { name: "Atlas Demo", slug: "atlas-demo", uiVariant: "default", reason: "Środowisko testowe" };

test("modern organization fields are validated without fabricating legacy values", () => {
  assert.deepEqual(JSON.parse(JSON.stringify(api.parseManagedOrganization(managed))), managed);
  assert.equal(Object.hasOwn(api.parseOrganization(organization), "status"), false);
  assert.throws(() => api.parseManagedOrganization(organization));
  for (const patch of [{ status: "Unknown" }, { revision: -1 }, { revision: 0.5 }, { crmAccessEnabled: "false" }]) assert.throws(() => api.parseOrganization({ ...managed, ...patch }));
});

test("creation validates lengths, whitespace, single hyphens and permitted variants", () => {
  assert.equal(Object.keys(api.validateOrganizationForm(formValues)).length, 0);
  for (const patch of [{ name: " " }, { name: "a".repeat(101) }, { slug: "" }, { slug: "UPPER" }, { slug: "a--b" }, { slug: "-a" }, { slug: "a-" }, { slug: "a_b" }, { slug: "a".repeat(101) }, { reason: "  " }, { reason: "a".repeat(1001) }, { uiVariant: "invented" }]) {
    assert.ok(Object.keys(api.validateOrganizationForm({ ...formValues, ...patch })).length > 0);
  }
  assert.equal(Object.keys(api.validateOrganizationForm({ name: "a".repeat(100), slug: "a".repeat(100), uiVariant: "bsworkout", reason: "a".repeat(1000) })).length, 0);
});

test("POST and PATCH send only contracted fields and return confirmed API data", async () => {
  const calls = [];
  const client = load("app/lib/super-admin/organizations.ts", { "@/app/lib/backend": {
    backendPost: async (path, body) => { calls.push({ path, body }); return managed; },
    backendPatch: async (path, body) => { calls.push({ path, body }); return { ...managed, revision: 1, name: "Confirmed name" }; },
  } });
  assert.equal((await client.createOrganization({ ...formValues, crmAccessEnabled: true })).status, "Draft");
  assert.deepEqual(JSON.parse(JSON.stringify(calls[0])), { path: "super-admin/organizations", body: { ...formValues, initialOwnerUserId: null } });
  const saved = await client.updateOrganization("org-1", 0, { ...formValues, status: "LegacyActive" });
  assert.equal(saved.revision, 1);
  assert.equal(saved.name, "Confirmed name");
  assert.deepEqual(JSON.parse(JSON.stringify(calls[1])), { path: "super-admin/organizations/org-1", body: { ...formValues, expectedRevision: 0 } });
  await assert.rejects(() => client.updateOrganization("org-1", -1, formValues));
  await assert.rejects(() => client.createOrganization({ ...formValues, slug: "bad--slug" }));
  assert.equal(calls.length, 2);
});

test("201 is accepted by the existing client without exposing an activation operation", async () => {
  const clientBackend = load("app/lib/backend.ts", { "./user-messages": load("app/lib/user-messages.ts") }, {
    Response, URLSearchParams, fetch: async () => Response.json(managed, { status: 201 }),
  });
  const client = load("app/lib/super-admin/organizations.ts", { "@/app/lib/backend": clientBackend });
  const created = await client.createOrganization(formValues);
  assert.equal(created.status, "Draft");
  assert.equal(created.crmAccessEnabled, false);
  assert.equal(Object.keys(client).some(key => /activate|delete|impersonate/i.test(key)), false);
});

test("status rendering distinguishes Draft, LegacyActive and absent legacy fields", () => {
  const status = load("app/super-admin/components/organization-status.tsx", { "react/jsx-runtime": { jsx, jsxs: jsx } });
  assert.ok(text(status.OrganizationStatus({ organization: managed })).includes("Szkic"));
  assert.ok(text(status.OrganizationStatus({ organization: managed })).includes("Brak aktywnego dostępu do CRM"));
  assert.ok(text(status.OrganizationStatus({ organization: { ...managed, status: "LegacyActive", crmAccessEnabled: true } })).includes("Dostęp do CRM aktywny"));
  const legacy = text(status.OrganizationStatus({ organization }));
  assert.ok(legacy.includes("Status niedostępny"));
  assert.ok(!legacy.includes("Szkic"));
});

function formHarness(dependencies) {
  const slots = [];
  let cursor = 0;
  const react = {
    useEffect() {},
    useState(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = typeof initial === "function" ? initial() : initial;
      return [slots[index], next => { slots[index] = typeof next === "function" ? next(slots[index]) : next; }];
    },
    useRef(initial) { const index = cursor++; if (!(index in slots)) slots[index] = { current: initial }; return slots[index]; },
  };
  const view = load("app/super-admin/components/organization-form.tsx", {
    react, "react/jsx-runtime": { jsx, jsxs: jsx }, "@/app/lib/backend": backend,
    "@/app/lib/super-admin/organizations": { ...load("app/lib/super-admin/organizations.ts", { "@/app/lib/backend": backend }), ...dependencies },
    "./use-unsaved-changes": { useUnsavedChanges() {} },
  });
  return { render(props) { cursor = 0; return view.OrganizationForm(props); }, slots };
}

test("edit conflict blocks automatic PATCH replay and requests current organization data", async () => {
  let patches = 0;
  let refreshes = 0;
  let saved = 0;
  const harness = formHarness({ updateOrganization: async () => { patches++; throw new backend.ApiError("raw internal details", { status: 409 }); } });
  const props = { organization: managed, onSaved() { saved++; }, onConflict(message) { refreshes++; assert.ok(message.includes("kod organizacji")); } };
  harness.render(props);
  harness.slots[0] = formValues;
  await harness.render(props).props.onSubmit({ preventDefault() {} });
  const blocked = harness.render(props);
  assert.ok(descendants(blocked).some(node => node.type === "fieldset" && node.props.disabled));
  assert.ok(!text(blocked).includes("raw internal details"));
  await blocked.props.onSubmit({ preventDefault() {} });
  assert.equal(patches, 1);
  assert.equal(refreshes, 1);
  assert.equal(saved, 0);
});

test("successful form uses server-confirmed values; old backend cannot enable editing", async () => {
  const confirmed = { ...managed, name: "Server-confirmed", revision: 4 };
  let result;
  const harness = formHarness({ updateOrganization: async () => confirmed });
  const props = { organization: managed, onSaved(value) { result = value; } };
  harness.render(props);
  harness.slots[0] = formValues;
  await harness.render(props).props.onSubmit({ preventDefault() {} });
  assert.equal(result, confirmed);
  const legacy = formHarness({}).render({ organization, onSaved() {} });
  assert.ok(descendants(legacy).some(node => node.type === "fieldset" && node.props.disabled));
});

test("mutation errors have safe Polish explanations for 400/401/403/404/409", () => {
  const client = load("app/lib/super-admin/organizations.ts", { "@/app/lib/backend": backend });
  for (const status of [400, 401, 403, 404, 409]) {
    const message = client.organizationMutationMessage(new backend.ApiError("raw internal error", { status }));
    assert.ok(message.length > 0);
    assert.ok(!message.includes("raw internal"));
  }
});

test("detail conflict refreshes the resource and success replaces it with confirmed data", () => {
  let reloads = 0;
  let replaced;
  const details = load("app/super-admin/components/organization-details.tsx", {
    react: { useCallback: callback => callback, useState: initial => [initial, () => {}] },
    "react/jsx-runtime": { jsx, jsxs: jsx },
    "./use-organization-resource": { useOrganizationResource: () => ({ data: managed, loading: false, error: null, retry() { reloads++; }, replace(value) { replaced = value; } }) },
    "./organization-form": { OrganizationForm: "OrganizationForm" },
  });
  const form = descendants(details.OrganizationDetails({ organizationId: "org-1" })).find(node => node.type === "OrganizationForm");
  form.props.onConflict("Conflict");
  assert.equal(reloads, 1);
  assert.equal(replaced, undefined);
  const confirmed = { ...managed, revision: 1 };
  form.props.onSaved(confirmed);
  assert.equal(replaced, confirmed);
});

test("successful creation navigates to the returned organization; Draft has no activation control", () => {
  let destination;
  const page = load("app/super-admin/organizations/new/page.tsx", {
    "react/jsx-runtime": { jsx, jsxs: jsx },
    "next/navigation": { useRouter: () => ({ replace(path) { destination = path; } }) },
    "../../components/organization-form": { OrganizationForm: "OrganizationForm" },
  });
  const form = descendants(page.default()).find(node => node.type === "OrganizationForm");
  form.props.onSaved(managed);
  assert.equal(destination, "/super-admin/organizations/org-1?created=1");
  const draft = formHarness({}).render({ organization: managed, onSaved() {} });
  assert.ok(!text(draft).includes("Aktywuj"));
  assert.ok(!text(draft).includes("Zaloguj jako"));
});

test("invalid organization form focuses the first field without sending a mutation", async () => {
  let focused;
  let requests = 0;
  const harness = formHarness({ createOrganization: async () => { requests++; } });
  const form = harness.render({ onSaved() {} });
  await form.props.onSubmit({ preventDefault() {}, currentTarget: { querySelector(selector) { return { focus() { focused = selector; } }; } } });
  assert.equal(focused, '[name="name"]');
  assert.equal(requests, 0);
});
