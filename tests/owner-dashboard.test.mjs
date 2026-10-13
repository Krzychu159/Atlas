import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { createRequire } from "node:module";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const nativeRequire = createRequire(import.meta.url);
function load(path, dependencies = {}, globals = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, { exports, require: name => name in dependencies ? dependencies[name] : nativeRequire(name),
    AbortController, AbortSignal, DOMException, URL, Headers, Response, console, ...globals });
  return exports;
}
class ApiError extends Error { constructor(status) { super("Raw server error"); this.status = status; } }
const calls = [];
const responses = {};
const backend = { ApiError, backendGet: async (path, query, signal) => { calls.push({ path, query, signal }); return responses[path]; } };
const api = load("app/lib/owner/dashboard-overview.ts", { "../backend": backend });
const money = load("app/lib/formatters/money.ts");
const summary = { period: "2026-10", previousPeriod: "2026-09", timeZone: "Europe/Warsaw", asOf: "2026-10-13T10:00:00Z", currency: "PLN", isPartial: true,
  revenue: { current: -140.55, previous: 500, changeAmount: -640.55, changePercent: -128.11 },
  activeClients: { current: 12, previous: 10, change: 2, changePercent: 20 }, newClients: 0,
  completedSessions: { current: 0, previous: 0, change: 0, changePercent: null }, clientsWithoutJoinedAt: 2 };
const revenue = { period: "2026-10", months: 12, currency: "PLN", timeZone: "Europe/Warsaw", asOf: summary.asOf,
  items: [1200, 2400, 2000, -600, 3200, 4800, 3600, 6500, 7300, 7000, 9100, 8600].map((value, index) => ({ period: `${index === 0 ? "2025-11" : index === 1 ? "2025-12" : `2026-${String(index - 1).padStart(2, "0")}`}`, revenue: value, received: 99999, refunded: 88888, isPartial: index === 11 })),
  average: 4567.89, total: 50000, previousYearTotal: 40000, yearOverYearChangePercent: 25 };
const clients = [{ id: 7, firstName: "Anna", lastName: "Kowalska", fullName: "Anna Kowalska", joinedAt: null, createdAt: "2026-01-01" },
  { id: 8, firstName: "Michał", lastName: "Nowak", fullName: "Michał Nowak", joinedAt: "2026-10-10T08:00:00Z", createdAt: "2026-01-01" }];
const attention = { asOf: summary.asOf, inactivityDays: 30, clientsWithoutTraining30Days: 0, clientsWithOneRemainingSession: 9, clientsWithoutAttendanceBaseline: 3 };
const fixtures = { summary, revenue, clients, attention };

for (const [name, invoke, value, query] of [
  ["summary", () => api.getDashboardSummary("2026-10"), summary, { period: "2026-10" }],
  ["revenue", () => api.getDashboardRevenue("2026-09", 6), revenue, { months: 6, period: "2026-09" }],
  ["recent-clients", () => api.getDashboardRecentClients(), clients, { limit: 4 }],
  ["attention", () => api.getDashboardAttention(), attention, undefined],
]) test(`maps ${name} response without recalculating or substituting values`, async () => {
  responses[`owner/dashboard/${name}`] = value;
  assert.equal(await invoke(), value);
  assert.deepEqual(calls.at(-1).query === undefined ? undefined : JSON.parse(JSON.stringify(calls.at(-1).query)), query);
});
test("Warsaw month boundary and allowed historical periods", () => {
  assert.equal(api.currentDashboardPeriod(new Date("2026-09-30T22:30:00Z")), "2026-10");
  assert.equal(api.currentDashboardPeriod(new Date("2026-12-31T23:30:00Z")), "2027-01");
  for (const value of ["2000-01", "2026-09", "2026-10"]) assert.equal(api.validDashboardPeriod(value, "2026-10"), true);
  for (const value of ["1999-12", "2026-11", "2026-00", "2026-13", "", "2026-1"]) assert.equal(api.validDashboardPeriod(value, "2026-10"), false);
});
test("null changes are neutral, numbers use Polish formatting", () => {
  assert.equal(api.dashboardChange(null), "Brak podstawy do porównania");
  assert.equal(api.dashboardChange(-12.8), "-12,8%");
  assert.equal(api.dashboardChange(0), "0%");
  assert.equal(api.dashboardChange(8, false), "+8");
});
test("joined date never falls back to account creation, uses Warsaw", () => {
  assert.equal(api.dashboardJoinedDate(clients[0].joinedAt), "Brak daty");
  assert.equal(api.dashboardJoinedDate("2026-09-30T22:30:00Z"), "01.10.2026");
});
test("chart supports negative, zero, flat, single-point and empty series", () => {
  for (const values of [[-300, 0, 100], [-10, -20], [0, 0], [50, 50], [42], []]) {
    const result = api.revenueGeometry(values.map(revenue => ({ revenue })));
    assert.ok(!/NaN|Infinity/.test(result.line + result.area));
    assert.equal(result.points.length, values.length);
    for (const point of result.points) assert.ok(point.y >= 0 && point.y <= 100);
    assert.ok(result.ticks.includes(0));
    for (let index = 0; index < values.length; index++) assert.equal(result.points[index].y, result.y(values[index]));
    if (values.some(value => value < 0) && values.some(value => value > 0)) assert.ok(result.y(0) > 0 && result.y(0) < 100);
  }
});
test("status and network failures never expose raw messages", () => {
  assert.match(api.dashboardError(new ApiError(401)), /Zaloguj/);
  assert.match(api.dashboardError(new ApiError(403)), /dostępu/);
  assert.match(api.dashboardError(new ApiError(400)), /inny miesiąc/);
  assert.match(api.dashboardError(new Error("Failed to fetch")), /Spróbuj ponownie/);
});

const css = { default: new Proxy({}, { get: (_, name) => String(name) }), __esModule: true };
const chart = load("app/(app)/owner/components/OverviewRevenueChart.tsx", {
  "@/app/lib/owner/dashboard-overview": api, "@/app/lib/formatters/money": money, "./owner-overview.module.css": css,
}).default;
const info = load("app/(app)/owner/components/OverviewInfo.tsx", { "./owner-overview.module.css": css }).default;
function overview(overrides = {}, role = "owner", resourceCalls = []) {
  const component = load("app/(app)/owner/components/OwnerOverview.tsx", {
    "@/app/components/current-user-provider": { useCurrentUser: () => ({ user: { role } }) },
    "@/app/lib/formatters/money": money, "@/app/lib/owner/dashboard-overview": api,
    "@/app/lib/session-corrections": { usePaymentDateCorrectionRevision: () => 0 },
    "./OverviewInfo": { default: info, __esModule: true }, "./OverviewRevenueChart": { default: chart, __esModule: true }, "./owner-overview.module.css": css,
    "next/link": { default: ({ href, children, ...props }) => React.createElement("a", { href, ...props }, children), __esModule: true },
    "./use-dashboard-resource": { useDashboardResource: (key, loader) => {
      const section = key.split(":")[0]; resourceCalls.push({ key, loader });
      return { data: fixtures[section], loading: false, retry() {}, ...overrides[section] };
    } },
  }).default;
  return renderToStaticMarkup(React.createElement(component, { currentPeriod: "2026-10" }));
}
test("renders measured KPIs, partial comparison and missing baseline", () => {
  const html = overview();
  assert.match(html, /-140,55/);
  assert.match(html, /Brak podstawy do porównania/);
  assert.match(html, /pełnym poprzednim miesiącem/);
  assert.match(html, /wrzesień 2026/);
  assert.match(html, /Dla 3 klientów brakuje danych/);
  assert.match(html, /Brak daty/);
  assert.match(html, /10.10.2026/);
  assert.match(html, /href="\/owner\/clients\/7"/);
  assert.match(html, /4\s?567,89/);
  assert.doesNotMatch(html, /99.999|88.888|wzrost stabilności|zaległ/);
});
test("empty lists and zero values are valid displayed data", () => {
  const html = overview({ clients: { data: [] }, revenue: { data: { ...revenue, items: [], average: 0, yearOverYearChangePercent: null } },
    summary: { data: { ...summary, isPartial: false, revenue: { ...summary.revenue, current: 0, changePercent: 0 } } } });
  assert.match(html, /Nie ma jeszcze nowych klientów/);
  assert.match(html, /Brak przychodów do wyświetlenia/);
  assert.match(html, /0,00/);
  assert.doesNotMatch(html.match(/<footer[\s\S]*?<\/footer>/)?.[0] ?? "", /r\/r/); assert.doesNotMatch(html, /class="partial"/);
});
for (const section of ["summary", "revenue", "clients", "attention"]) test(`${section} failure leaves other sections available`, () => {
  const html = overview({ [section]: { data: undefined, error: "Nie udało się pobrać danych." } });
  assert.match(html, /Spróbuj ponownie/);
  if (section !== "summary") assert.match(html, /-140,55/);
  if (section !== "clients") assert.match(html, /Anna Kowalska/);
  if (section !== "attention") assert.match(html, /ostatni trening w pakiecie/);
  if (section !== "revenue") assert.match(html, /4\s?567,89/);
});
test("skeletons keep sections present and expose loading state", () => {
  const html = overview(Object.fromEntries(Object.keys(fixtures).map(key => [key, { data: undefined, loading: true }])));
  assert.equal((html.match(/aria-busy="true"/g) ?? []).length, 4);
  assert.match(html, /Przychód/);
  assert.match(html, /Ładowanie danych/);
});
test("non-owner roles never render dashboard or start data loading", () => {
  for (const role of ["client", "trainer", "super-admin", null]) {
    const calls = [];
    assert.match(overview({}, role, calls), /Nie masz dostępu/);
    assert.equal(calls.length, 0);
  }
});
test("chart has Polish months, exact accessible values, range controls and month limits", () => {
  const html = overview();
  assert.match(html, /min="2000-01"/); assert.match(html, /max="2026-10"/);
  assert.match(html, /aria-pressed="false"[^>]*>6 miesięcy/);
  assert.match(html, /aria-pressed="true"[^>]*>12 miesięcy/);
  assert.match(html, /październik 2026: 8\s?600,00/);
  assert.match(html, /miesiąc w toku/);
  assert.match(html, /sty/);
});

function hookHarness() {
  const slots = []; let cursor = 0; let pending = []; let cleanup;
  const react = {
    useState(initial) { const index = cursor++; if (!(index in slots)) slots[index] = initial; return [slots[index], next => { slots[index] = typeof next === "function" ? next(slots[index]) : next; }]; },
    useEffect(effect, deps) { const index = cursor++; const prev = slots[index]; if (!prev || deps.some((value, i) => value !== prev[i])) { slots[index] = deps; pending.push(effect); } },
  };
  const hook = load("app/(app)/owner/components/use-dashboard-resource.ts", { react, "@/app/lib/owner/dashboard-overview": api }).useDashboardResource;
  return { render(key, loader) { cursor = 0; const value = hook(key, loader); for (const effect of pending) { cleanup?.(); cleanup = effect(); } pending = []; return value; }, unmount() { cleanup?.(); } };
}
const flush = () => new Promise(resolve => setImmediate(resolve));
test("changing month/range cancels old requests, hides stale values and retries independently", async () => {
  const pending = [];
  const loader = signal => new Promise((resolve, reject) => pending.push({ resolve, reject, signal }));
  const harness = hookHarness();
  assert.equal(harness.render("2026-10:12", loader).loading, true);
  pending[0].resolve(revenue); await flush();
  assert.equal(harness.render("2026-10:12", loader).data, revenue);
  assert.equal(harness.render("2026-09:6", loader).loading, true);
  assert.equal(pending[0].signal.aborted, true);
  pending[1].reject(new Error("Network")); await flush();
  const failed = harness.render("2026-09:6", loader);
  assert.match(failed.error, /Spróbuj/);
  failed.retry();
  assert.equal(harness.render("2026-09:6", loader).loading, true);
  pending[2].resolve({ ...revenue, months: 6 }); await flush();
  assert.equal(harness.render("2026-09:6", loader).data.months, 6);
  harness.unmount(); assert.equal(pending[2].signal.aborted, true);
});
test("late results cannot overwrite a newer month", async () => {
  const pending = [];
  const loader = signal => new Promise(resolve => pending.push({ resolve, signal }));
  const harness = hookHarness();
  harness.render("2026-10", loader); harness.render("2026-09", loader);
  pending[1].resolve("September"); await flush();
  pending[0].resolve("October"); await flush();
  assert.equal(harness.render("2026-09", loader).data, "September");
  harness.unmount();
});
test("period-independent clients and attention use stable loading keys", () => {
  const calls = []; overview({}, "owner", calls);
  assert.deepEqual(calls.map(call => call.key), ["summary:2026-10:0", "revenue:2026-10:12:0", "clients", "attention"]);
});

if (process.env.ATLAS_DASHBOARD_PREVIEW) {
  fs.writeFileSync(`${process.env.ATLAS_DASHBOARD_PREVIEW}.json`, JSON.stringify(fixtures));
  const globals = fs.readFileSync("app/globals.css", "utf8").match(/:root\s*\{[\s\S]*?\n\}/)[0];
  const styles = fs.readFileSync("app/(app)/owner/components/owner-overview.module.css", "utf8");
  fs.writeFileSync(process.env.ATLAS_DASHBOARD_PREVIEW, `<!doctype html><html lang="pl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Dashboard — visual test fixture</title><style>${globals} *{box-sizing:border-box} body{margin:0;background:var(--color-surface);color:var(--color-on-surface);font-family:Arial,sans-serif;padding:32px} a{color:inherit;text-decoration:none} button,input{font:inherit} ${styles}</style>${overview()}</html>`);
}


test("existing BFF forwards all four routes, query parameters and Bearer session", async () => {
  const requests = [];
  const route = load("app/api/backend/[...path]/route.ts", {
    "next/headers": { cookies: async () => ({ get: () => ({ value: "test-owner-token" }) }) },
    "@/app/lib/server/auth-cookies": { expireAuthCookies() {} },
    "@/app/lib/server/request-origin": { hasSameOrigin: () => true },
  }, { process: { env: { BACKEND_API_URL: "https://studio.test" } }, fetch: async (url, options) => {
    requests.push({ url, options }); return Response.json({ valid: true });
  } });
  for (const suffix of ["summary?period=2026-10", "revenue?months=6&period=2026-09", "recent-clients?limit=4", "attention"]) {
    const requestUrl = new URL(`https://atlas.test/api/backend/owner/dashboard/${suffix}`);
    const request = { method: "GET", headers: new Headers(), signal: new AbortController().signal, nextUrl: requestUrl };
    const response = await route.GET(request, { params: Promise.resolve({ path: ["owner", "dashboard", suffix.split("?")[0]] }) });
    assert.equal(response.status, 200);
    assert.equal(requests.at(-1).url, `https://studio.test/api/owner/dashboard/${suffix}`);
    assert.equal(requests.at(-1).options.headers.Authorization, "Bearer test-owner-token");
    assert.equal(response.headers.get("Cache-Control"), "no-store");
  }
});
test("BFF denies unauthenticated requests and preserves backend Owner-only 403", async () => {
  let called = false;
  function bff(token) {
    return load("app/api/backend/[...path]/route.ts", {
      "next/headers": { cookies: async () => ({ get: () => token ? { value: token } : undefined }) },
      "@/app/lib/server/auth-cookies": { expireAuthCookies() {} },
      "@/app/lib/server/request-origin": { hasSameOrigin: () => true },
    }, { process: { env: { BACKEND_API_URL: "https://studio.test" } }, fetch: async () => { called = true; return Response.json({ message: "Forbidden" }, { status: 403 }); } });
  }
  const request = { method: "GET", headers: new Headers(), signal: new AbortController().signal, nextUrl: new URL("https://atlas.test/api/backend/owner/dashboard/summary?period=2026-10") };
  const context = { params: Promise.resolve({ path: ["owner", "dashboard", "summary"] }) };
  assert.equal((await bff(null).GET(request, context)).status, 401);
  assert.equal(called, false);
  assert.equal((await bff("test-trainer-token").GET(request, context)).status, 403);
});


test("month and 6/12 controls request selected periods while clients and alerts remain stable", async () => {
  let cursor = 0; const states = []; const requests = [];
  const fakeReact = { ...React,
    useState(initial) { const index = cursor++; if (!(index in states)) states[index] = initial; return [states[index], value => { states[index] = value; }]; },
    useCallback(callback) { return callback; },
  };
  const component = load("app/(app)/owner/components/OwnerOverview.tsx", {
    react: fakeReact,
    "@/app/components/current-user-provider": { useCurrentUser: () => ({ user: { role: "owner" } }) },
    "@/app/lib/formatters/money": money, "@/app/lib/owner/dashboard-overview": api,
    "@/app/lib/session-corrections": { usePaymentDateCorrectionRevision: () => 0 },
    "./OverviewInfo": { default: info, __esModule: true }, "./OverviewRevenueChart": { default: chart, __esModule: true }, "./owner-overview.module.css": css,
    "next/link": { default: () => null, __esModule: true },
    "./use-dashboard-resource": { useDashboardResource: (key, loader) => {
      requests.push({ key, loader }); return { data: fixtures[key.split(":")[0]], loading: false, retry() {} };
    } },
  }).default;
  function render() { cursor = 0; requests.length = 0; const wrapper = component({ currentPeriod: "2026-10" }); return wrapper.type(wrapper.props); }
  function find(node, predicate) {
    if (!node) return null;
    if (Array.isArray(node)) { for (const child of node) { const match = find(child, predicate); if (match) return match; } return null; }
    if (typeof node !== "object") return null;
    if (predicate(node)) return node;
    return find(node.props?.children, predicate);
  }
  let tree = render();
  const input = find(tree, node => node.type === "input");
  let opened = 0;
  input.props.onClick({ currentTarget: { showPicker() { opened += 1; } } });
  assert.equal(opened, 1);
  assert.doesNotThrow(() => input.props.onClick({ currentTarget: { showPicker() { throw new Error("Not supported"); } } }));
  assert.doesNotThrow(() => input.props.onClick({ currentTarget: {} }));
  input.props.onInput({ currentTarget: { value: "2026-08" } });
  tree = render(); assert.equal(requests[0].key, "summary:2026-08:0");
  find(tree, node => node.type === "input").props.onChange({ target: { value: "2026-09" } });
  tree = render();
  assert.deepEqual(requests.map(request => request.key), ["summary:2026-09:0", "revenue:2026-09:12:0", "clients", "attention"]);
  find(tree, node => node.type === "button" && node.props.children?.[0] === 6).props.onClick();
  tree = render();
  assert.equal(requests[1].key, "revenue:2026-09:6:0");
  await requests[1].loader(new AbortController().signal);
  assert.equal(calls.at(-1).query.months, 6); assert.equal(calls.at(-1).query.period, "2026-09");
  find(tree, node => node.type === "button" && node.props.children?.[0] === 12).props.onClick();
  tree = render(); assert.equal(requests[1].key, "revenue:2026-09:12:0");
  for (const invalid of ["2026-11", "1999-12", ""]) {
    find(tree, node => node.type === "input").props.onChange({ target: { value: invalid } });
    tree = render(); assert.equal(requests[0].key, "summary:2026-09:0");
  }
});



test("compact KPI explanations live in accessible tooltips with one partial badge", () => {
  const html = overview();
  assert.equal((html.match(/<span>Miesiąc w toku<\/span>/g) ?? []).length, 1);
  assert.match(html, /aria-label="Informacje: Nowi klienci"/);
  assert.match(html, /role="tooltip" hidden=""[^>]*>Liczba klientów,[\s\S]*?Klienci bez daty dołączenia: 2/);
  const visible = html.replace(/<span[^>]*role="tooltip" hidden=""[^>]*>[\s\S]*?<\/span>/g, "");
  assert.doesNotMatch(visible, /Klienci bez daty dołączenia|względem poprzedniego miesiąca|W wybranym miesiącu/);
  assert.match(visible, /\+2.*m\/m/);
  assert.match(visible, /aria-label="Brak podstawy do porównania">—/);
  assert.match(visible, /Wszystkie lokalizacje/);
  assert.equal((visible.match(/class="lucide lucide-calendar-days"/g) ?? []).length, 1);
});
test("information tooltips open with focus and touch, dismiss with Escape and blur", () => {
  let open = false;
  const component = load("app/(app)/owner/components/OverviewInfo.tsx", {
    react: { useId: () => "info-test", useState: () => [open, value => { open = typeof value === "function" ? value(open) : value; }] },
    "./owner-overview.module.css": css,
  }).default;
  const render = () => component({ label: "Informacje: Przychód", children: "Opis przychodu" });
  const tree = render(); const [button, tooltip] = tree.props.children;
  assert.equal(tooltip.props.hidden, true);
  assert.equal(button.props["aria-describedby"], tooltip.props.id);
  button.props.onFocus(); assert.equal(render().props.children[1].props.hidden, false);
  button.props.onKeyDown({ key: "Escape", preventDefault() {} }); assert.equal(render().props.children[1].props.hidden, true);
  button.props.onClick(); assert.equal(render().props.children[1].props.hidden, false);
  button.props.onBlur(); assert.equal(render().props.children[1].props.hidden, true);
  tree.props.onMouseEnter(); assert.equal(render().props.children[1].props.hidden, false);
  tree.props.onMouseLeave(); assert.equal(render().props.children[1].props.hidden, true);
});
