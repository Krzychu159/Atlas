import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import * as nextServer from "next/server.js";

const { NextRequest } = nextServer;
const origin = "https://atlassystem.pl";
const correlation = "__Host-atlas_outlook_oauth=abc; Path=/; Secure; HttpOnly; SameSite=Lax";

function load(path, dependencies = {}, globals = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText, {
    exports, require: name => dependencies[name] ?? (name === "next/server" ? nextServer : {}),
    URL, Headers, AbortSignal, Response, console: { ...console, warn: () => {} },
    process: { env: { BACKEND_API_URL: "https://backend.test", NODE_ENV: "production" } },
    ...globals,
  });
  return exports;
}

const authCookies = load("app/lib/server/auth-cookies.ts");
const cookies = load("app/lib/server/backend-cookies.ts", { "@/app/lib/server/auth-cookies": authCookies });

function backendResponse(status, { body = "", headers = {}, setCookies = [] } = {}) {
  const responseHeaders = new Headers(headers);
  for (const value of setCookies) responseHeaders.append("Set-Cookie", value);
  return new Response(status === 204 || (status >= 300 && status < 400) ? null : body, { status, headers: responseHeaders });
}

function loadCallback(fetchImpl, env = { BACKEND_API_URL: "https://backend.test" }) {
  return load("app/api/outlook/callback/route.ts", { "@/app/lib/server/backend-cookies": cookies }, {
    fetch: fetchImpl, process: { env },
  });
}

function callbackRequest(search, cookieHeader) {
  return new NextRequest(`${origin}/api/outlook/callback${search}`, cookieHeader ? { headers: { cookie: cookieHeader } } : undefined);
}

test("Set-Cookie relay keeps host-only backend cookies and rejects session or foreign-domain cookies", () => {
  assert.equal(cookies.isRelayableSetCookie(correlation), true);
  assert.equal(cookies.isRelayableSetCookie("oauth_state=1; Path=/api/outlook; HttpOnly; Secure; SameSite=Lax"), true);
  assert.equal(cookies.isRelayableSetCookie("__Host-x=1; Path=/; Secure; Domain=atlassystem.pl"), false);
  assert.equal(cookies.isRelayableSetCookie("__Host-x=1; Path=/api; Secure"), false);
  assert.equal(cookies.isRelayableSetCookie("__Host-x=1; Path=/"), false);
  assert.equal(cookies.isRelayableSetCookie("__Secure-x=1; Path=/"), false);
  assert.equal(cookies.isRelayableSetCookie("x=1; Domain=studiocrm-backend.onrender.com; Path=/"), false);
  for (const name of ["accessToken", "refreshToken", "AccessToken", "role", "userId"]) {
    assert.equal(cookies.isRelayableSetCookie(`${name}=forged; Path=/; HttpOnly`), false);
  }
});

test("Cookie header for the backend never carries ATLAS session tokens", () => {
  assert.equal(
    cookies.backendCookieHeader("accessToken=secret; __Host-atlas_outlook_oauth=abc; refreshToken=r; theme=dark"),
    "__Host-atlas_outlook_oauth=abc; theme=dark",
  );
  assert.equal(cookies.backendCookieHeader("accessToken=secret; role=owner"), null);
  assert.equal(cookies.backendCookieHeader(null), null);
});

test("backend proxy relays every Set-Cookie from connect-url and drops session overrides", async () => {
  const calls = [];
  const route = load("app/api/backend/[...path]/route.ts", {
    "next/headers": { cookies: async () => ({ get: name => (name === "accessToken" ? { value: "token" } : undefined) }) },
    "@/app/lib/server/auth-cookies": authCookies,
    "@/app/lib/server/backend-cookies": cookies,
    "@/app/lib/server/request-origin": { hasSameOrigin: () => true },
  }, {
    fetch: async (url, init) => {
      calls.push({ url, init });
      return backendResponse(200, {
        body: JSON.stringify({ url: "https://login.microsoftonline.com/x" }),
        headers: { "content-type": "application/json" },
        setCookies: [correlation, "__Host-atlas_outlook_pkce=v; Path=/; Secure; HttpOnly; SameSite=Lax", "accessToken=forged; Path=/"],
      });
    },
  });

  const response = await route.GET(new NextRequest(`${origin}/api/backend/outlook/connect-url`), { params: Promise.resolve({ path: ["outlook", "connect-url"] }) });
  assert.equal(response.status, 200);
  assert.equal(calls[0].url, "https://backend.test/api/outlook/connect-url");
  assert.deepEqual(response.headers.getSetCookie(), [correlation, "__Host-atlas_outlook_pkce=v; Path=/; Secure; HttpOnly; SameSite=Lax"]);
  assert.equal((await response.json()).url, "https://login.microsoftonline.com/x");
});

test("backend proxy relays Set-Cookie on 204 and alongside expired-session cookie cleanup", async () => {
  let call = 0;
  const route = load("app/api/backend/[...path]/route.ts", {
    "next/headers": { cookies: async () => ({ get: name => (name === "accessToken" ? { value: "expired" } : undefined) }) },
    "@/app/lib/server/auth-cookies": authCookies,
    "@/app/lib/server/backend-cookies": cookies,
    "@/app/lib/server/request-origin": { hasSameOrigin: () => true },
  }, {
    fetch: async () => (call++ === 0 ? backendResponse(401) : backendResponse(200, { body: "[]", setCookies: ["public_marker=1; Path=/; Secure"] })),
  });
  const response = await route.GET(new NextRequest(`${origin}/api/backend/public/group-classes`), { params: Promise.resolve({ path: ["public", "group-classes"] }) });
  const setCookies = response.headers.getSetCookie();
  assert.ok(setCookies.some(c => c.startsWith("accessToken=;")));
  assert.ok(setCookies.includes("public_marker=1; Path=/; Secure"));

  const noContent = load("app/api/backend/[...path]/route.ts", {
    "next/headers": { cookies: async () => ({ get: () => ({ value: "token" }) }) },
    "@/app/lib/server/auth-cookies": authCookies,
    "@/app/lib/server/backend-cookies": cookies,
    "@/app/lib/server/request-origin": { hasSameOrigin: () => true },
  }, { fetch: async () => backendResponse(204, { setCookies: [correlation] }) });
  const empty = await noContent.POST(new NextRequest(`${origin}/api/backend/outlook/disconnect`, { method: "POST" }), { params: Promise.resolve({ path: ["outlook", "disconnect"] }) });
  assert.equal(empty.status, 204);
  assert.deepEqual(empty.headers.getSetCookie(), [correlation]);
});

test("callback forwards the original query string and correlation cookies without a CRM session", async () => {
  const calls = [];
  const route = loadCallback(async (url, init) => {
    calls.push({ url, init });
    return backendResponse(200, { body: "{}", setCookies: ["__Host-atlas_outlook_oauth=; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=0"] });
  });
  const search = "?code=M.C5%2B%2Fab&state=s%20t%3D1&session_state=x";
  const response = await route.GET(callbackRequest(search, "__Host-atlas_outlook_oauth=abc; __Host-atlas_outlook_pkce=v"));

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, `https://backend.test/api/outlook/callback${search}`);
  assert.equal(calls[0].init.redirect, "manual");
  assert.equal(calls[0].init.headers.Cookie, "__Host-atlas_outlook_oauth=abc; __Host-atlas_outlook_pkce=v");
  assert.equal("Authorization" in calls[0].init.headers, false);
  assert.equal(response.status, 200);
  assert.match(await response.text(), /Konto Microsoft jest połączone/);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(response.headers.get("referrer-policy"), "no-referrer");
  assert.deepEqual(response.headers.getSetCookie(), ["__Host-atlas_outlook_oauth=; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=0"]);
});

test("callback strips ATLAS session tokens from the forwarded Cookie header", async () => {
  const calls = [];
  const route = loadCallback(async (url, init) => { calls.push(init); return backendResponse(200); });
  await route.GET(callbackRequest("?code=c&state=s", "accessToken=secret; refreshToken=r; __Host-atlas_outlook_oauth=abc"));
  assert.equal(calls[0].headers.Cookie, "__Host-atlas_outlook_oauth=abc");

  await route.GET(callbackRequest("?code=c&state=s"));
  assert.equal("Cookie" in calls[1].headers, false);
});

test("callback follows backend redirects only within ATLAS and relays their cookies", async () => {
  const sameOrigin = loadCallback(async () => backendResponse(302, {
    headers: { location: "/owner/settings?tab=integrations&outlook=connected" },
    setCookies: ["__Host-atlas_outlook_oauth=; Path=/; Secure; Max-Age=0", "__Host-atlas_outlook_pkce=; Path=/; Secure; Max-Age=0"],
  }));
  const redirected = await sameOrigin.GET(callbackRequest("?code=c&state=s"));
  assert.equal(redirected.status, 303);
  assert.equal(redirected.headers.get("location"), `${origin}/owner/settings?tab=integrations&outlook=connected`);
  assert.equal(redirected.headers.getSetCookie().length, 2);

  const absolute = loadCallback(async () => backendResponse(302, { headers: { location: `${origin}/trainer/settings` } }));
  assert.equal((await absolute.GET(callbackRequest("?code=c&state=s"))).headers.get("location"), `${origin}/trainer/settings`);

  for (const location of ["https://evil.example/phish", "//evil.example/x", "https://studiocrm-backend.onrender.com/done"]) {
    const foreign = loadCallback(async () => backendResponse(302, { headers: { location } }));
    const response = await foreign.GET(callbackRequest("?code=c&state=s"));
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("location"), null);
    assert.match(await response.text(), /Łączenie z Microsoft zostało zakończone/);
  }
});

test("callback translates OAuth failures into user messages without exposing backend errors", async () => {
  const correlationFailure = loadCallback(async () => backendResponse(400, {
    body: JSON.stringify({ message: "OAuth browser correlation failed" }),
    headers: { "content-type": "application/json" },
  }));
  const failed = await correlationFailure.GET(callbackRequest("?code=c&state=s"));
  const failedHtml = await failed.text();
  assert.equal(failed.status, 400);
  assert.match(failed.headers.get("content-type"), /text\/html/);
  assert.match(failedHtml, /Nie udało się potwierdzić połączenia/);
  assert.doesNotMatch(failedHtml, /correlation|OAuth|code=/i);

  const calls = [];
  const denied = loadCallback(async (url) => { calls.push(url); return backendResponse(400, { body: "{}" }); });
  const cancelled = await denied.GET(callbackRequest("?error=access_denied&error_description=AADSTS65004%3A+User+declined&state=s"));
  assert.equal(calls[0], "https://backend.test/api/outlook/callback?error=access_denied&error_description=AADSTS65004%3A+User+declined&state=s");
  assert.equal(cancelled.status, 400);
  const cancelledHtml = await cancelled.text();
  assert.match(cancelledHtml, /Połączenie z Microsoft zostało przerwane/);
  assert.doesNotMatch(cancelledHtml, /AADSTS/);

  const deniedRedirect = loadCallback(async () => backendResponse(302, { headers: { location: "/owner/settings?outlook=connected" } }));
  assert.equal((await deniedRedirect.GET(callbackRequest("?error=access_denied&state=s"))).status, 400);

  const serverError = loadCallback(async () => backendResponse(500, { body: "System.Exception: token exchange failed" }));
  const unavailable = await serverError.GET(callbackRequest("?code=c&state=s"));
  assert.equal(unavailable.status, 502);
  assert.doesNotMatch(await unavailable.text(), /System\.Exception/);

  const offline = loadCallback(async () => { throw new TypeError("fetch failed"); });
  assert.equal((await offline.GET(callbackRequest("?code=c&state=s"))).status, 502);

  const unconfigured = loadCallback(async () => assert.fail("must not call backend"), {});
  assert.equal((await unconfigured.GET(callbackRequest("?code=c&state=s"))).status, 502);
});

test("callback is served by the App Router at the Redirect URI registered in Microsoft Entra", () => {
  const route = loadCallback(async () => backendResponse(200));
  assert.ok(fs.existsSync("app/api/outlook/callback/route.ts"));
  assert.equal(typeof route.GET, "function");
  assert.equal(fs.existsSync("vercel.json"), false);
  assert.doesNotMatch(fs.readFileSync("next.config.ts", "utf8"), /rewrites|redirects|basePath/);
});

test("route protection does not require a CRM session for the OAuth callback", async () => {
  const proxy = load("proxy.ts", {
    "@/app/lib/server/session": { verifyBackendSession: async () => assert.fail("callback must not verify a session"), VERIFIED_USER_HEADER: "x" },
    "@/app/lib/server/auth-cookies": authCookies,
  });
  const response = await proxy.proxy(callbackRequest("?code=c&state=s"));
  assert.equal(response.headers.get("x-middleware-next"), "1");
  assert.ok(proxy.config.matcher.every(pattern => !pattern.startsWith("/api")));
});
