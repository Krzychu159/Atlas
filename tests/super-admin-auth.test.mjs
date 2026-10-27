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
const studioOrganizationId = "b5100000-0000-4000-8000-000000000002";

test("organization context distinguishes legacy omission from null and validates supplied values", () => {
  const legacy = auth.normalizeUser({ ...profile, role: "SuperAdmin" });
  assert.equal(Object.hasOwn(legacy, "organizationId"), false);
  const platform = auth.normalizeUser({ ...profile, roles: ["SuperAdmin"], organizationId: null });
  assert.equal(platform.organizationId, null);
  assert.equal(auth.normalizeUser(JSON.parse(JSON.stringify(platform))).organizationId, null);
  for (const role of ["Owner", "Trainer", "Client"]) {
    assert.equal(auth.normalizeUser({ ...profile, roles: [role], organizationId: studioOrganizationId }).organizationId, studioOrganizationId);
  }
  for (const organizationId of [undefined, "", " ", 42, {}, []]) {
    assert.throws(() => auth.normalizeUser({ ...profile, role: "Owner", organizationId }));
  }
});

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
    const landing = role === "owner" ? "/owner/schedule" : `/${role}`;
    assert.equal(redirects.getLoginRedirectPath(role, null), landing);
    assert.equal(redirects.getLoginRedirectPath(role, `/${role}?from=login`), `/${role}?from=login`);
    for (const unsafe of ["https://evil.test", "//evil.test", "/super-admin/../owner", "/super-admin/\\evil.test", "/login"]) {
      assert.equal(redirects.getLoginRedirectPath(role, unsafe), landing);
    }
  }
  assert.equal(redirects.getLoginRedirectPath("super-admin", "/owner/settings"), "/super-admin");
  assert.equal(redirects.getLoginRedirectPath("owner", "/super-admin/organizations"), "/owner/schedule");
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

test("login forwards .NET credential rejection without calling /me or changing values", async () => {
  const calls = [];
  const input = { email: " diagnostic@example.invalid ", password: " isolated-test-value ", rememberMe: true };
  const fetch = async (url, options) => {
    calls.push(url);
    const body = JSON.parse(options.body);
    assert.ok(body.email === input.email && body.password === input.password, "Credential values must stay unchanged");
    assert.deepEqual(Object.keys(body).sort(), ["email", "password"]);
    return Response.json({ message: "Invalid email or password." }, { status: 401 });
  };
  const route = load("app/api/auth/login/route.ts", {
    "next/server": { NextResponse },
    "@/app/lib/server/auth-cookies": cookies,
    "@/app/lib/server/request-origin": { hasSameOrigin: () => true },
    "@/app/lib/server/session": { verifyBackendSession() { throw new Error("Must not call /me after credential rejection"); } },
  }, { fetch });
  const response = await route.POST({ json: async () => input });
  assert.equal(response.status, 401);
  assert.equal((await response.json()).message, "Invalid email or password.");
  assert.equal(calls.length, 1);
  assert.equal(response.cookies.get("accessToken"), undefined);
});

test("/me rejection after successful login has a different 401 message", async () => {
  const route = load("app/api/auth/login/route.ts", {
    "next/server": { NextResponse },
    "@/app/lib/server/auth-cookies": cookies,
    "@/app/lib/server/request-origin": { hasSameOrigin: () => true },
    "@/app/lib/server/session": { verifyBackendSession: async () => ({ state: "unauthorized" }) },
  }, { fetch: async () => Response.json({ token: "isolated-test-token", refreshToken: "isolated-test-refresh" }) });
  const response = await route.POST({ json: async () => ({ email: "diagnostic@example.invalid", password: "isolated-test-value" }) });
  assert.equal(response.status, 401);
  assert.equal((await response.json()).message, "Nie możemy teraz potwierdzić dostępu. Spróbuj zalogować się ponownie za chwilę.");
  assert.equal(response.cookies.get("accessToken"), undefined);
});

test("login preserves organization context for each role and remains compatible with legacy API", async () => {
  for (const role of ["SuperAdmin", "Owner", "Trainer", "Client"]) {
    for (const modern of [true, false]) {
      const context = modern ? { organizationId: role === "SuperAdmin" ? null : studioOrganizationId } : {};
      const fetch = async url => url.endsWith("/login")
        ? Response.json({ token: "login-fixture", refreshToken: "refresh-fixture", role, ...context })
        : Response.json({ ...profile, role, roles: [role], ...context });
      const route = load("app/api/auth/login/route.ts", {
        "next/server": { NextResponse },
        "@/app/lib/server/auth-cookies": cookies,
        "@/app/lib/server/request-origin": { hasSameOrigin: () => true },
        "@/app/lib/server/session": createSession(fetch),
      }, { fetch });
      const response = await route.POST({ json: async () => ({ email: profile.email, password: "fixture-only" }) });
      assert.equal(response.status, 200);
      const user = (await response.json()).user;
      assert.equal(Object.hasOwn(user, "organizationId"), modern);
      if (modern) assert.equal(user.organizationId, context.organizationId);
      assert.equal(redirects.getLoginRedirectPath(user.role, null), role === "SuperAdmin" ? "/super-admin" : role === "Owner" ? "/owner/schedule" : `/${role.toLowerCase()}`);
      assert.equal(response.cookies.get("organizationId"), undefined);
    }
  }
});

test("verified /me context is authoritative; token response only fills missing legacy context", async () => {
  const platform = createSession(async () => Response.json({ ...profile, roles: ["SuperAdmin"], organizationId: null }));
  assert.equal((await platform.verifyBackendSession("fixture", { organizationId: studioOrganizationId })).user.organizationId, null);
  const legacy = createSession(async () => Response.json({ ...profile, roles: ["Owner"] }));
  assert.equal((await legacy.verifyBackendSession("fixture", { organizationId: studioOrganizationId })).user.organizationId, studioOrganizationId);
});

function refreshRoute(fetch, token = "old-refresh-fixture", sameOrigin = true) {
  return load("app/api/auth/refresh/route.ts", {
    "next/headers": { cookies: async () => ({ get: name => name === "refreshToken" && token ? { value: token } : undefined }) },
    "next/server": { NextResponse },
    "@/app/lib/server/auth-cookies": cookies,
    "@/app/lib/server/request-origin": { hasSameOrigin: () => sameOrigin },
    "@/app/lib/server/session": createSession(fetch),
  }, { fetch });
}

test("refresh rotates both HttpOnly tokens and preserves context for modern and legacy profiles", async () => {
  for (const role of ["SuperAdmin", "Owner", "Trainer", "Client"]) {
    for (const modern of [true, false]) {
      const context = modern ? { organizationId: role === "SuperAdmin" ? null : studioOrganizationId } : {};
      const calls = [];
      const fetch = async (url, options) => {
        calls.push(url);
        if (url.endsWith("/refresh")) {
          assert.equal(options.body, JSON.stringify({ refreshToken: "old-refresh-fixture" }));
          return Response.json({ token: "rotated-access-fixture", refreshToken: "rotated-refresh-fixture", role, ...context });
        }
        assert.equal(options.headers.Authorization, "Bearer rotated-access-fixture");
        return Response.json({ ...profile, role, roles: [role], ...context });
      };
      const response = await refreshRoute(fetch).POST(new Request("https://atlas.test/api/auth/refresh", { method: "POST" }));
      assert.equal(response.status, 200);
      const body = await response.json();
      assert.equal(Object.hasOwn(body.user, "organizationId"), modern);
      if (modern) assert.equal(body.user.organizationId, context.organizationId);
      assert.equal(Object.hasOwn(body, "token"), false);
      for (const [name, value] of [["accessToken", "rotated-access-fixture"], ["refreshToken", "rotated-refresh-fixture"]]) {
        assert.equal(response.cookies.get(name).value, value);
        assert.equal(response.cookies.get(name).httpOnly, true);
      }
      assert.equal(calls.length, 2);
    }
  }
});

test("refresh rejects missing tokens, cross-origin calls and malformed rotations without partial replacement", async () => {
  const unexpected = async () => { throw new Error("Must not reach backend"); };
  assert.equal((await refreshRoute(unexpected, null).POST({})).status, 401);
  const crossOrigin = await refreshRoute(unexpected, "fixture", false).POST({});
  assert.equal(crossOrigin.status, 403);
  assert.equal(crossOrigin.cookies.get("accessToken"), undefined);
  for (const payload of [{ token: "new-fixture" }, { refreshToken: "new-fixture" }, {}]) {
    const response = await refreshRoute(async () => Response.json(payload)).POST({});
    assert.equal(response.status, 502);
    assert.equal(response.cookies.get("accessToken"), undefined);
    assert.equal(response.cookies.get("refreshToken"), undefined);
  }
  for (const status of [401, 403, 503]) {
    const response = await refreshRoute(async () => new Response(null, { status })).POST({});
    assert.equal(response.status, status);
    assert.equal(response.cookies.get("refreshToken")?.value, status === 503 ? undefined : "");
  }
});

test("local /me and proxy carry context without selecting the organization in the URL", async () => {
  const session = createSession(async () => Response.json({ ...profile, roles: ["SuperAdmin"], organizationId: null }));
  const route = load("app/api/auth/me/route.ts", {
    "next/headers": { cookies: async () => ({ get: () => ({ value: "fixture" }) }) },
    "next/server": { NextResponse },
    "@/app/lib/server/auth-cookies": cookies,
    "@/app/lib/server/session": session,
  });
  assert.equal((await (await route.GET()).json()).user.organizationId, null);
  const response = await createProxy(session).proxy(request(`/super-admin/organizations/${studioOrganizationId}`));
  const user = JSON.parse(decodeURIComponent(response.headers.get("x-middleware-request-x-atlas-verified-user")));
  assert.equal(user.organizationId, null);
});

test("refresh preserves the rotated pair during /me outage but never grants an unverified profile", async () => {
  for (const status of [401, 403, 503]) {
    const response = await refreshRoute(async url => url.endsWith("/refresh")
      ? Response.json({ token: "new-access-fixture", refreshToken: "new-refresh-fixture", organizationId: null })
      : new Response(null, { status })).POST({});
    assert.equal(response.status, status);
    assert.equal(response.cookies.get("accessToken").value, status === 503 ? "new-access-fixture" : "");
    assert.equal(response.cookies.get("refreshToken").value, status === 503 ? "new-refresh-fixture" : "");
    assert.equal((await response.json()).user, undefined);
    if (status === 503) assert.equal(response.cookies.get("role"), undefined);
  }
});
