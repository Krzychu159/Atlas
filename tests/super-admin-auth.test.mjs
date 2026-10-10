import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { NextRequest, NextResponse } from "next/server.js";

function load(path, dependencies = {}, globals = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2017, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, {
    exports, require: name => dependencies[name] ?? {},
    URL, Headers, AbortSignal, Response, console,
    process: { env: { BACKEND_API_URL: "https://backend.test" } },
    ...globals,
  });
  return exports;
}

const auth = load("app/lib/auth/user.ts");
const redirects = load("app/lib/auth/redirect.ts");
const cookies = load("app/lib/server/auth-cookies.ts");
const profile = { id: 7, firstName: "Anna", lastName: "Nowak", email: "anna@example.test" };

test("SuperAdmin has priority regardless of role order or legacy Owner role", () => {
  for (const roles of [["Owner", "SuperAdmin"], ["SuperAdmin", "Trainer", "Client"], ["super-admin"]]) {
    const user = auth.normalizeUser({ ...profile, role: "Owner", roles });
    assert.equal(user.role, "super-admin");
    assert.ok(user.roles.includes("super-admin"));
    assert.equal(auth.normalizeUser(JSON.parse(JSON.stringify(user))).role, "super-admin");
  }
});

test("roles[] is authoritative and legacy studio profiles keep their role", () => {
  for (const role of ["Owner", "Trainer", "Client", "SuperAdmin"]) {
    assert.equal(auth.normalizeUser({ user: { ...profile, role } }).role, role === "SuperAdmin" ? "super-admin" : role.toLowerCase());
  }
  assert.equal(auth.normalizeUser({ ...profile, role: "SuperAdmin", roles: ["Client"] }).role, "client");
  assert.equal(auth.normalizeUser({ ...profile, roles: ["Unknown", "Trainer"] }).role, "trainer");
  for (const roles of [[], ["Unknown"]]) assert.throws(() => auth.normalizeUser({ ...profile, role: "Owner", roles }));
  assert.throws(() => auth.normalizeUser({ roles: ["SuperAdmin"] }));
});

test("login restores only links belonging to the verified panel", () => {
  for (const role of ["owner", "trainer", "client", "super-admin"]) {
    assert.equal(redirects.getLoginRedirectPath(role, null), `/${role}`);
    assert.equal(redirects.getLoginRedirectPath(role, `/${role}?from=login`), `/${role}?from=login`);
    for (const unsafe of ["https://evil.test", "//evil.test", "/super-admin/../owner", "/super-admin/\\evil.test", "/login"]) {
      assert.equal(redirects.getLoginRedirectPath(role, unsafe), `/${role}`);
    }
  }
  assert.equal(redirects.getLoginRedirectPath("super-admin", "/owner/settings"), "/super-admin");
  assert.equal(redirects.getLoginRedirectPath("owner", "/super-admin/organizations"), "/owner");
  assert.equal(redirects.getLoginRedirectPath("super-admin", "/super-admin/organizations"), "/super-admin/organizations");
});

function createSession(fetch) {
  return load("app/lib/server/session.ts", { "@/app/lib/auth/user": auth }, { fetch });
}

function createProxy(session) {
  return load("proxy.ts", {
    "next/server": { NextResponse },
    "@/app/lib/server/session": session,
    "@/app/lib/server/auth-cookies": cookies,
  });
}

function request(path, token = "valid") {
  return new NextRequest(`https://atlas.test${path}`, {
    headers: {
      ...(token ? { Cookie: `accessToken=${token}; role=super-admin` } : {}),
      "x-atlas-verified-user": encodeURIComponent(JSON.stringify({ ...profile, role: "SuperAdmin" })),
    },
  });
}

test("proxy denies every studio role on root and nested SuperAdmin routes", async () => {
  for (const role of ["Owner", "Trainer", "Client"]) {
    const proxy = createProxy(createSession(async () => Response.json({ ...profile, roles: [role] })));
    for (const path of ["/super-admin", "/super-admin/organizations"]) {
      const response = await proxy.proxy(request(path));
      assert.equal(response.status, 307);
      assert.equal(response.headers.get("location"), `https://atlas.test/${role.toLowerCase()}`);
    }
  }
});

test("proxy verifies JWT with backend and replaces forged identity headers", async () => {
  const calls = [];
  const session = createSession(async (url, options) => {
    calls.push({ url, options });
    return Response.json({ ...profile, role: "Owner", roles: ["Owner", "SuperAdmin"] });
  });
  const proxy = createProxy(session);
  const response = await proxy.proxy(request("/super-admin/organizations"));
  assert.equal(response.status, 200);
  assert.equal(calls[0].url, "https://backend.test/api/Auth/me");
  assert.equal(calls[0].options.headers.Authorization, "Bearer valid");
  assert.equal(calls[0].options.cache, "no-store");
  const user = JSON.parse(decodeURIComponent(response.headers.get("x-middleware-request-x-atlas-verified-user")));
  assert.equal(user.id, "7");
  assert.equal(user.role, "super-admin");
  assert.equal((await proxy.proxy(request("/owner"))).headers.get("location"), "https://atlas.test/super-admin");
});

test("missing or expired sessions go to common login; outage preserves cookies", async () => {
  const proxy = createProxy(createSession(async () => new Response(null, { status: 401 })));
  for (const token of [null, "expired"]) {
    const response = await proxy.proxy(request("/super-admin/organizations", token));
    const location = new URL(response.headers.get("location"));
    assert.equal(location.pathname, "/login");
    assert.equal(location.searchParams.get("next"), "/super-admin/organizations");
    assert.equal(response.cookies.get("accessToken").value, "");
  }
  const unavailable = createProxy(createSession(async () => new Response(null, { status: 503 })));
  const response = await unavailable.proxy(request("/super-admin"));
  assert.equal(response.status, 503);
  assert.equal(response.cookies.get("accessToken"), undefined);
});

test("login uses /me roles instead of login's Owner role and sets HttpOnly cookies", async () => {
  const fetch = async url => url.endsWith("/login")
    ? Response.json({ token: "valid", refreshToken: "refresh", userId: 7, role: "Owner" })
    : Response.json({ ...profile, role: "Owner", roles: ["Owner", "SuperAdmin"] });
  const route = load("app/api/auth/login/route.ts", {
    "next/server": { NextResponse },
    "@/app/lib/server/auth-cookies": cookies,
    "@/app/lib/server/request-origin": { hasSameOrigin: () => true },
    "@/app/lib/server/session": createSession(fetch),
  }, { fetch });
  const response = await route.POST({ json: async () => ({ email: profile.email, password: "test-password" }) });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).user.role, "super-admin");
  assert.equal(response.cookies.get("role").value, "super-admin");
  assert.equal(response.cookies.get("accessToken").httpOnly, true);
});
