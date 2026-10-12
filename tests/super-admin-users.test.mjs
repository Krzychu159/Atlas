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
const jsx = (type, props) => ({ type, props });
function nodes(tree) {
  if (!tree || typeof tree !== "object") return [];
  return [tree, ...[tree.props?.children].flat(Infinity).flatMap(nodes)];
}
const backend = load("app/lib/backend.ts", { "./user-messages": load("app/lib/user-messages.ts") });
const api = load("app/lib/super-admin/organization-users.ts", { "@/app/lib/backend": backend });
const account = { userId: 123, fullName: "Anna Nowak", email: "anna@example.test", accountStatus: "Active", emailVerified: true };
const staff = { userId: 123, fullName: "Anna Nowak", email: "anna@example.test", accountStatus: "Active", roles: ["Owner"], membershipStatus: "Registered" };
const organization = { organizationId: "org-fixture", name: "Test organization", slug: "test", uiVariant: "default", status: "Draft", revision: 1, crmAccessEnabled: false };
const json = value => JSON.parse(JSON.stringify(value));

test("user readers whitelist contracted fields and reject malformed statuses or pagination", () => {
  assert.deepEqual(json(api.parseAccount({ ...account, token: "must-not-render", passwordHash: "must-not-render" })), account);
  assert.deepEqual(json(api.parseOrganizationUser({ ...staff, secret: "must-not-render" })), staff);
  for (const patch of [{ accountStatus: "Unknown" }, { emailVerified: null }, { userId: "123" }]) assert.throws(() => api.parseAccount({ ...account, ...patch }));
  assert.throws(() => api.parseOrganizationUser({ ...staff, membershipStatus: "Unknown" }));
  assert.throws(() => api.parseOrganizationUser({ ...staff, roles: ["Client"] }));
  const page = { items: [staff], total: 26, page: 2, pageSize: 25 };
  assert.equal(api.parseUserPage(page, 2, api.parseOrganizationUser).totalPages, 2);
  for (const patch of [{ total: -1 }, { pageSize: 10 }, { page: 1 }, { total: 0 }]) assert.throws(() => api.parseUserPage({ ...page, ...patch }, 2, api.parseOrganizationUser));
});

test("staff API uses URL organization, optional Owner/Trainer filters and 25-item pagination", async () => {
  const calls = [];
  const signal = new AbortController().signal;
  const client = load("app/lib/super-admin/organization-users.ts", { "@/app/lib/backend": { backendGet: async (path, query, requestSignal) => {
    calls.push({ path, query, signal: requestSignal });
    return { items: [staff], total: 26, page: query.page, pageSize: 25 };
  } } });
  for (const role of [undefined, "Owner", "Trainer"]) await client.getOrganizationUsers("org/fixture", role, 2, signal);
  for (let index = 0; index < calls.length; index++) {
    assert.equal(calls[index].path, "super-admin/organizations/org%2Ffixture/users");
    assert.equal(calls[index].query.page, 2);
    assert.equal(calls[index].query.pageSize, 25);
    assert.equal(calls[index].signal, signal);
  }
  assert.equal(Object.hasOwn(calls[0].query, "role"), false);
  assert.equal(calls[1].query.role, "Owner");
  assert.equal(calls[2].query.role, "Trainer");
  await assert.rejects(() => client.getOrganizationUsers("org", "Client", 1));
  await assert.rejects(() => client.getOrganizationUsers("org", undefined, 0));
});

test("account search never calls API below three characters and uses contracted query pagination", async () => {
  const calls = [];
  const client = load("app/lib/super-admin/organization-users.ts", { "@/app/lib/backend": { backendGet: async (path, query) => {
    calls.push({ path, query }); return { items: [account], total: 26, page: query.page, pageSize: 25 };
  } } });
  for (const query of ["", "an", "  a  ", "a".repeat(101)]) await assert.rejects(() => client.searchAccounts(query, 1));
  assert.equal(calls.length, 0);
  const result = await client.searchAccounts(" anna ", 2);
  assert.deepEqual(json(calls[0]), { path: "super-admin/users", query: { query: "anna", page: 2, pageSize: 25 } });
  assert.equal(result.items[0].emailVerified, true);
  await assert.rejects(() => client.searchAccounts("anna", 100001));
});

test("assignment sends only expectedRevision and reason and cannot modify LegacyActive", async () => {
  const calls = [];
  const client = load("app/lib/super-admin/organization-users.ts", { "@/app/lib/backend": { backendPut: async (path, body) => { calls.push({ path, body }); } } });
  await client.assignOwner(organization, account, "Przypisanie do testów");
  assert.deepEqual(json(calls[0]), { path: "super-admin/organizations/org-fixture/owners/123", body: { expectedRevision: 1, reason: "Przypisanie do testów" } });
  for (const patch of [{ status: "LegacyActive" }, { revision: undefined }, { crmAccessEnabled: true }]) await assert.rejects(() => client.assignOwner({ ...organization, ...patch }, account, "Reason"));
  for (const patch of [{ accountStatus: "Inactive" }, { emailVerified: false }]) await assert.rejects(() => client.assignOwner(organization, { ...account, ...patch }, "Reason"));
  for (const reason of [" ", "a".repeat(1001)]) await assert.rejects(() => client.assignOwner(organization, account, reason));
  assert.equal(calls.length, 1);
  assert.equal(organization.crmAccessEnabled, false);
});

function harness(extra = {}, initialOverride = value => value, globals = {}) {
  const slots = [];
  let cursor = 0;
  const effects = [];
  const react = {
    useCallback: fn => fn,
    useEffect: fn => { effects.push(fn); },
    useState(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = initialOverride(typeof initial === "function" ? initial() : initial);
      return [slots[index], value => { slots[index] = typeof value === "function" ? value(slots[index]) : value; }];
    },
    useRef(initial) { const index = cursor++; if (!(index in slots)) slots[index] = { current: initial }; return slots[index]; },
  };
  const view = load("app/super-admin/components/owner-assignment.tsx", {
    react, "react/jsx-runtime": { jsx, jsxs: jsx },
    "@/app/lib/super-admin/organization-users": { ...api, ...extra },
    "@/app/lib/backend": backend,
    "./use-unsaved-changes": { useUnsavedChanges() {} },
    "./use-organization-resource": { useOrganizationResource: () => ({ data: { items: [account, { ...account, userId: 124, accountStatus: "Inactive" }, { ...account, userId: 125, emailVerified: false }], totalPages: 1 }, loading: false }) },
    "@/app/components/ui/button": { Button: "Button" },
  }, { setTimeout() {}, clearTimeout() {}, ...globals });
  return { render(props) { cursor = 0; return view.OwnerAssignment(props); }, view, slots, effects };
}

test("search results disable inactive and unverified accounts; LegacyActive has no assignment control", () => {
  const current = harness();
  const result = current.view.AccountResults({ query: "anna", selected: null, choose() {} });
  const buttons = nodes(result).filter(node => node.type === "Button");
  assert.deepEqual(buttons.map(node => node.props.disabled), [false, true, true]);
  const legacy = current.render({ organization: { ...organization, status: "LegacyActive" }, changed() {} });
  assert.equal(nodes(legacy).some(node => node.type === "Button"), false);
});

test("assignment requires confirmation, blocks replay and refreshes after success or conflict", async () => {
  for (const status of [null, 409, 503]) {
    let puts = 0;
    let refreshes = 0;
    let message;
    const current = harness({ assignOwner: async () => { puts++; if (status) throw new backend.ApiError("secret internal error", { status }); } });
    const props = { organization, changed(value) { refreshes++; message = value; } };
    current.render(props);
    current.slots[2] = account;
    current.slots[3] = "Reason";
    const form = current.render(props);
    assert.ok(JSON.stringify(form).includes(organization.name));
    assert.ok(JSON.stringify(form).includes(account.email));
    const button = nodes(form).find(node => node.type === "Button");
    await button.props.onClick();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(puts, 1);
    assert.equal(refreshes, 1);
    assert.ok(!message.includes("secret"));
    if (!status) assert.ok(message.includes("nie aktywuje"));
    const blocked = current.render(props);
    assert.ok(nodes(blocked).some(node => node.type === "fieldset" && node.props.disabled));
    await nodes(blocked).find(node => node.type === "Button").props.onClick();
    assert.equal(puts, 1);
  }
});

test("detail membership change refreshes organization and selects Owners even from another filter", () => {
  let reloads = 0;
  const states = [];
  const detail = load("app/super-admin/components/organization-details.tsx", {
    react: { useCallback: fn => fn, useState: initial => [initial === "general" ? "users" : initial, value => states.push(value)] },
    "react/jsx-runtime": { jsx, jsxs: jsx },
    "./organization-users": { OrganizationUsers: "OrganizationUsers" },
    "./use-organization-resource": { useOrganizationResource: () => ({ data: organization, loading: false, retry() { reloads++; } }) },
  });
  const users = nodes(detail.OrganizationDetails({ organizationId: "org-fixture" })).find(node => node.type === "OrganizationUsers");
  users.props.changed("Confirmed");
  assert.equal(reloads, 1);
  assert.ok(states.includes("Owner"));
  assert.ok(states.includes("Confirmed"));
});

test("staff loader includes current organization, filter and page; Registered does not promise CRM", async () => {
  let called;
  let request;
  const component = load("app/super-admin/components/organization-users.tsx", {
    react: { useState: initial => [initial, () => {}], useCallback: fn => fn },
    "react/jsx-runtime": { jsx, jsxs: jsx },
    "@/app/lib/super-admin/organization-users": { getOrganizationUsers: async (...args) => { called = args; return {}; } },
    "./use-organization-resource": { useOrganizationResource: (key, load) => { request = load; return { data: { items: [staff], totalPages: 1 }, loading: false }; } },
  });
  const tree = component.OrganizationUsers({ organization, initialRole: "Trainer", changed() {} });
  const signal = new AbortController().signal;
  await request(signal);
  assert.deepEqual(called, ["org-fixture", "Trainer", 1, signal]);
  assert.ok(JSON.stringify(tree).includes("nie oznacza aktywnego dostępu do CRM"));
});

test("management errors never render raw backend messages", () => {
  for (const status of [400, 401, 403, 404, 409, 503]) assert.ok(!api.userManagementMessage(new backend.ApiError("secret internal details", { status })).includes("secret"));
});

test("search UI waits 400 ms and never renders a search request for a short query", () => {
  const timers = [];
  const current = harness({}, value => value, { setTimeout(fn, ms) { timers.push({ fn, ms }); return timers.length; }, clearTimeout() {} });
  const props = { organization, changed() {} };
  current.render(props);
  current.slots[0] = "an";
  current.slots[1] = "an";
  assert.ok(!nodes(current.render(props)).some(node => typeof node.type === "function" && node.type.name === "AccountResults"));
  current.slots[0] = "anna";
  current.slots[1] = "";
  assert.ok(!nodes(current.render(props)).some(node => typeof node.type === "function" && node.type.name === "AccountResults"));
  current.effects.at(-1)();
  assert.equal(timers.at(-1).ms, 400);
  timers.at(-1).fn();
  assert.ok(nodes(current.render(props)).some(node => typeof node.type === "function" && node.type.name === "AccountResults"));
});

test("account validation failure preserves selected account and reason for correction", async () => {
  let reloads = 0;
  const current = harness({ assignOwner: async () => { throw new backend.ApiError("Invalid account", { status: 400 }); } });
  const props = { organization, changed() { reloads++; } };
  current.render(props);
  current.slots[2] = account;
  current.slots[3] = "Reason to retain";
  const button = nodes(current.render(props)).find(node => node.type === "Button");
  button.props.onClick();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(reloads, 0);
  assert.equal(current.slots[2], account);
  assert.equal(current.slots[3], "Reason to retain");
  assert.ok(!nodes(current.render(props)).some(node => node.type === "fieldset" && node.props.disabled));
});
