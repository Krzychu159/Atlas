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
