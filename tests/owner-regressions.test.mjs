import test from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { load, hooks, find, settle } from "./owner-read-harness.mjs";

const router = { useRouter: () => ({ push() {}, replace() {} }) };
function loginFixture(search, browser = true) {
  const h = hooks();
  const Page = load("app/(auth)/login/page.tsx", { react: h.react, "next/navigation": router }, {
    URLSearchParams, ...(browser ? { window: { location: { search } } } : {}),
  }).default;
  return { h, render: () => h.render(Page) };
}

for (const search of ["?reason=session-expired", "?reason=invitation-accepted&email=anna%40example.test", "?resetToken=fixture-token&email=anna%40example.test"]) {
  test(`login initial server and browser markup match for ${search}`, async () => {
    const server = loginFixture(search, false), browser = loginFixture(search);
    const serverHTML = renderToStaticMarkup(server.render());
    assert.equal(renderToStaticMarkup(browser.render()), serverHTML);
    browser.h.commit(); await settle();
    const tree = browser.render();
    if (search.includes("session-expired")) assert.ok(find(tree, node => node.props.children === "Twoja sesja wygasła. Zaloguj się ponownie, żeby kontynuować pracę."));
    if (search.includes("invitation-accepted")) assert.ok(find(tree, node => node.props.children === "Konto zostało utworzone. Możesz się teraz zalogować."));
    if (search.includes("resetToken")) {
      assert.ok(find(tree, node => node.props.children === "Ustaw nowe hasło"));
      assert.ok(find(tree, node => node.type === "input" && node.props.value === "fixture-token"));
    } else if (search.includes("email=")) assert.ok(find(tree, node => node.type === "input" && node.props.value === "anna@example.test"));
    browser.h.unmount(); server.h.unmount();
  });
}

for (const summary of [undefined, null, {}, { withActivePackageCount: 0 }, { withActivePackageCount: 18 }]) {
  test(`clients remain visible when summary is ${JSON.stringify(summary)}`, async () => {
    const h = hooks();
    const reader = load("app/(app)/owner/components/use-owner-read.ts", {
      react: h.react, "@/app/lib/backend": { getErrorMessage: (_, fallback) => fallback },
    }, { setTimeout: h.window.setTimeout, clearTimeout: h.window.clearTimeout });
    const Page = load("app/(app)/owner/clients/page.tsx", {
      react: h.react, "next/navigation": { ...router, useSearchParams: () => new URLSearchParams() },
      "../components/use-owner-read": reader,
      "@/app/lib/owner/location-filter": { useOwnerLocationFilter: () => ({ selectedLocationId: null }) },
      "@/app/lib/owner/clients": { getOwnerClients: async () => ({ items: [{ id: 1, fullName: "Anna" }], page: 1, pageSize: 25, totalCount: 1, totalPages: 1, summary }) },
      "@/app/(app)/owner/clients/components/OwnerClientFilters": { default: () => null, defaultOwnerClientFilters: { search: "", packageFilter: "all", trainerFilter: "all", sort: "newest" } },
      "@/app/(app)/owner/clients/components/client-list-display": { pluralizeClients: count => `${count} klientów` },
    }).default;
    const root = Page().props.children;
    const render = () => h.render(root.type, root.props);
    render(); h.commit(); h.timers(); await settle();
    const tree = render();
    assert.ok(find(tree, node => node.props.client?.id === 1));
    const missing = summary?.withActivePackageCount === undefined;
    assert.equal(Boolean(find(tree, node => node.props.children === "Podsumowanie klientów z aktywnym pakietem jest chwilowo niedostępne.")), missing);
    assert.ok(find(tree, node => node.type === "p" && node.props.className?.includes("text-tertiary-light") && node.props.children === (missing ? "—" : summary.withActivePackageCount)));
    h.unmount();
  });
}

test("clients adapter rejects legacy arrays and malformed page metadata instead of showing an empty list", async () => {
  const page = { items: [], page: 1, pageSize: 25, totalCount: 0, totalPages: 0 };
  for (const value of [[], null, { items: [] }, { ...page, items: {} }, { ...page, totalCount: -1 }]) {
    const api = load("app/lib/owner/clients.ts", { "../backend": { backendGet: async () => value } });
    await assert.rejects(api.getOwnerClients({ page: 1, pageSize: 25 }), /listy klientów/);
  }
  const api = load("app/lib/owner/clients.ts", { "../backend": { backendGet: async () => page } });
  assert.equal(await api.getOwnerClients({ page: 1, pageSize: 25 }), page);
});

test("settlements reject missing financial summary instead of deriving totals from the current page", async () => {
  for (const summary of [undefined, null, {}, { totalAmount: 100 }]) {
    const api = load("app/lib/owner/settlements.ts", { "../backend": { backendGet: async () => ({ items: [], summary }) } });
    await assert.rejects(api.getOwnerTrainerSettlements(2026, 10), /podsumowania rozliczeń/);
  }
});
