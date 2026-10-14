import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { createRequire } from "node:module";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";

const nativeRequire = createRequire(import.meta.url);
function load(path, dependencies = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, { exports, require: name => name in dependencies ? dependencies[name] : nativeRequire(name) });
  return exports;
}

const theme = load("app/lib/organization-theme.ts");
const scope = load("app/components/organization-theme.tsx");
const normalize = load("app/lib/auth/user.ts").normalizeUser;
const organizationId = "b5100000-0000-4000-8000-000000000002";
const user = role => normalize({ id: "theme-fixture", role, organizationId });
const logoComponents = load("app/components/bsworkout-logo.tsx", {
  "next/image": props => React.createElement("img", { src: props.src.src, alt: props.alt, className: props.className }),
  "@/public/branding/logo_bsw.png": { src: "/branding/logo_bsw.png", width: 392, height: 126 },
});

test("only the verified BSworkout organization in studio roles gets the custom theme", () => {
  for (const role of ["Owner", "Trainer", "Client"]) {
    const profile = user(role);
    assert.equal(theme.getOrganizationTheme(profile), "bsworkout");
    for (const id of [undefined, null, "", "other-organization", `${organizationId} `]) {
      assert.equal(theme.getOrganizationTheme({ ...profile, organizationId: id, name: "BSworkout", slug: "bsworkout", uiVariant: "bsworkout" }), "atlas");
    }
  }
  assert.equal(theme.getOrganizationTheme(user("SuperAdmin")), "atlas");
  assert.equal(theme.getOrganizationTheme(normalize({ id: "platform", role: "Owner", roles: ["Owner", "SuperAdmin"], organizationId })), "atlas");
});

test("server layout chooses the theme from verified identity before rendering the shell", async () => {
  const verified = user("Owner");
  let backendChecks = 0;
  const layout = load("app/(app)/layout.tsx", {
    "next/headers": {
      cookies: async () => ({ get: () => ({ value: "fixture-token" }) }),
      headers: async () => ({ get: key => key === "x-atlas-current-path" ? "/owner?theme=atlas" : encodeURIComponent(JSON.stringify(verified)) }),
    },
    "next/navigation": { redirect: () => { throw new Error("Unexpected redirect"); } },
    "@/app/components/app-shell": { AppShell: "app-shell" },
    "@/app/components/current-user-provider": { CurrentUserProvider: "user-provider" },
    "@/app/lib/auth/user": { normalizeUser: normalize },
    "@/app/lib/organization-theme": theme,
    "@/app/lib/server/session": {
      VERIFIED_USER_HEADER: "x-atlas-verified-user", isValidAppRole: role => role === "owner",
      verifyBackendSession: async () => { backendChecks++; return { state: "authenticated", user: verified }; },
    },
  });
  const tree = await layout.default({ children: "panel" });
  assert.equal(tree.props.children.props.theme, "bsworkout");
  assert.equal(backendChecks, 0);
});

test("portal descendants inherit the verified theme, and context defaults to ATLAS", () => {
  const portal = React.createElement(scope.OrganizationPortalScope, null, "payment modal");
  assert.match(renderToStaticMarkup(portal), /data-atlas-theme="atlas"/);
  const html = renderToStaticMarkup(React.createElement(scope.OrganizationThemeScope, { theme: "bsworkout" }, portal));
  assert.equal((html.match(/data-atlas-theme="bsworkout"/g) || []).length, 2);
});

test("shell shows static logos only in BSworkout and retains the ATLAS platform marks", () => {
  const shell = load("app/components/app-shell.tsx", {
    react: { ...React, useEffect: () => {} },
    "next/link": ({ children, ...props }) => React.createElement("a", { ...props, prefetch: undefined }, children),
    "@/app/lib/notifications": {},
    "@/app/components/sidebar-nav": { SidebarNav: () => null },
    "@/app/components/header": { Header: () => null },
    "@/app/components/navigation": { navigationByRole: { owner: [], trainer: [], client: [] } },
    "@/app/components/current-user-provider": { useCurrentUser: () => ({ user: user("Owner") }) },
    "@/app/components/organization-theme": scope,
    "@/app/components/bsworkout-logo": logoComponents,
    "@/app/components/app-toaster": { AppToaster: () => null },
  });
  for (const role of ["owner", "trainer", "client"]) {
    const atlas = renderToStaticMarkup(React.createElement(shell.AppShell, { role }, "screen"));
    const bsworkout = renderToStaticMarkup(React.createElement(shell.AppShell, { role, theme: "bsworkout" }, "screen"));
    assert.doesNotMatch(atlas, /logo_bsw/);
    assert.match(atlas, />Status</);
    assert.equal((bsworkout.match(/src="\/branding\/logo_bsw.png"/g) || []).length, 3); // footer, drawer, mobile topbar
    assert.equal((bsworkout.match(/data-atlas-platform-brand="true"/g) || []).length, 3);
    assert.doesNotMatch(bsworkout, />Status</);
  }
});

test("topbar logo comes between search and location filter and is absent in ATLAS", () => {
  const header = load("app/components/header.tsx", {
    react: { ...React, useEffect: () => {} },
    "next/link": ({ children, ...props }) => React.createElement("a", { ...props, prefetch: undefined }, children),
    "@/app/(app)/owner/components/NotificationsPanel": () => null,
    "@/app/components/ui/custom-select": { CustomSelect: () => React.createElement("div", { "data-location-filter": true }) },
    "@/app/components/current-user-provider": { useCurrentUser: () => ({ user: user("Owner") }) },
    "@/app/components/organization-theme": scope,
    "@/app/components/bsworkout-logo": logoComponents,
    "@/app/lib/owner/clients": {}, "@/app/lib/owner/trainers": {}, "@/app/lib/owner/locations": {},
    "@/app/lib/owner/location-filter": { useOwnerLocationFilter: () => ({ selectedLocationValue: "all" }), OWNER_LOCATION_ALL: "all" },
  });
  const element = React.createElement(header.Header, { role: "owner", unreadNotificationCount: 0, onUnreadCountChange: () => {} });
  assert.doesNotMatch(renderToStaticMarkup(element), /logo_bsw/);
  const html = renderToStaticMarkup(React.createElement(scope.OrganizationThemeScope, { theme: "bsworkout" }, element));
  assert.ok(html.indexOf("<input") < html.indexOf("<img"));
  assert.ok(html.indexOf("<img") < html.indexOf("data-location-filter"));
});

test("logo preserves its proportions and falls back to text after an image error", () => {
  let failed = false;
  let imageProps;
  const logo = load("app/components/bsworkout-logo.tsx", {
    react: { ...React, useState: () => [failed, value => { failed = value; }] },
    "next/image": props => {
      imageProps = props;
      return React.createElement("img", { src: props.src.src, alt: props.alt, className: props.className });
    },
    "@/public/branding/logo_bsw.png": { src: "/branding/logo_bsw.png", width: 392, height: 126 },
  });
  const element = React.createElement(logo.BsworkoutLogo, { className: "h-10 w-28" });
  const html = renderToStaticMarkup(element);
  assert.match(html, /object-contain/);
  assert.equal(imageProps.fill, true);
  imageProps.onError();
  const fallback = renderToStaticMarkup(element);
  assert.doesNotMatch(fallback, /<img/);
  assert.match(fallback, />BSworkout</);
});

test("one toast host per route, with semantic borders independent of brand actions", () => {
  for (const pathname of ["/owner", "/trainer/settings", "/client", "/super-admin", "/login", "/classes"]) {
    let config;
    const toaster = load("app/components/app-toaster.tsx", {
      "next/navigation": { usePathname: () => pathname },
      sonner: { Toaster: props => { config = props; return React.createElement("div", { "data-toast-host": true }); } },
    });
    const root = renderToStaticMarkup(React.createElement(toaster.AppToaster));
    const panelRoute = /^\/(owner|trainer|client)(?:\/|$)/.test(pathname);
    assert.equal(root.includes("data-toast-host"), !panelRoute);
    const panel = renderToStaticMarkup(React.createElement(toaster.AppToaster, { organizationPanel: true }));
    assert.match(panel, /data-toast-host/);
    assert.match(config.toastOptions.classNames.info, /border-l-info-light/);
    assert.match(config.toastOptions.classNames.success, /border-l-tertiary-light/);
    assert.match(config.toastOptions.classNames.error, /border-l-error-light/);
    assert.match(config.toastOptions.classNames.warning, /border-l-warning-light/);
    assert.match(config.toastOptions.classNames.actionButton, /bg-primary/);
  }
});

test("compiled Tailwind utilities use local brand variables and keep semantic colors separate", async () => {
  const result = await postcss([tailwind()]).process(fs.readFileSync("app/globals.css", "utf8"), { from: "app/globals.css" });
  const css = postcss.parse(result.css);
  const declarations = selector => {
    const values = {};
    css.walkRules(rule => { if (rule.selector === selector) rule.walkDecls(decl => { values[decl.prop] = decl.value; }); });
    return values;
  };
  const custom = declarations('[data-atlas-theme="bsworkout"]');
  assert.equal(custom["--color-primary"].toLowerCase(), "#c52121");
  assert.deepEqual(Object.keys(custom).sort(), ["--color-primary", "--color-primary-light", "--color-primary-container", "--color-on-primary", "--color-on-primary-container"].sort());
  assert.equal(declarations(".bg-primary")["background-color"], "var(--color-primary)");
  assert.equal(declarations(".text-primary-light").color, "var(--color-primary-light)");
  assert.equal(declarations(".text-info-light").color, "var(--color-info-light)");
  assert.equal(declarations(".bg-error")["background-color"], "var(--color-error)");
  assert.equal(declarations("[data-atlas-platform-brand]")["--color-primary"], "#0052ff");
});
