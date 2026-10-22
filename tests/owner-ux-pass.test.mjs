import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { load, hooks, deferred, settle } from "./owner-read-harness.mjs";

function locationOptions(stored, locationsRequest) {
  const h = hooks(), events = [], storage = { "atlas-owner-location-id": stored };
  const window = {
    localStorage: { getItem: key => storage[key] ?? null, setItem: (key, value) => { storage[key] = value; } },
    addEventListener() {}, removeEventListener() {}, dispatchEvent: event => events.push(event),
  };
  const api = load("app/lib/owner/location-filter.ts", {
    react: { ...h.react, useSyncExternalStore: (_subscribe, snapshot) => snapshot() },
    "./locations": { getLocations: () => locationsRequest },
  }, { window, CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail; } }, DOMException });
  const render = () => h.render(() => api.useOwnerLocationOptions(true));
  return { h, render, storage };
}

test("failed location list keeps the selected scope instead of widening it to all locations", async () => {
  const request = deferred();
  const { h, render, storage } = locationOptions("7", request.promise);
  render(); h.commit();
  request.reject(new Error("offline")); await settle();
  const state = render(); h.commit();
  assert.equal(state.status, "error");
  assert.equal(state.selectedLocationValue, "7");
  assert.equal(storage["atlas-owner-location-id"], "7");
  assert.ok(state.options.some(option => option.value === "7"));
});

test("a location missing from a successfully loaded list resets the scope", async () => {
  const { h, render, storage } = locationOptions("7", Promise.resolve([{ id: 1, name: "Kraków", isActive: true }]));
  render(); h.commit(); await settle();
  render(); h.commit();
  assert.equal(storage["atlas-owner-location-id"], "all");
});

test("location list is shared within a session and reloaded after the session changes", async () => {
  const lists = { 1: [{ id: 1, name: "Studio A", isActive: true }], 2: [{ id: 2, name: "Studio B", isActive: true }] };
  let revision = 1, calls = 0, h = hooks();
  const window = { localStorage: { getItem: () => null, setItem() {} }, addEventListener() {}, removeEventListener() {}, dispatchEvent() {} };
  // One module instance across mounts, like a single browser tab; each mount gets fresh hook state.
  const react = new Proxy({}, { get: (_target, key) => key === "useSyncExternalStore" ? (_subscribe, snapshot) => snapshot() : h.react[key] });
  const api = load("app/lib/owner/location-filter.ts", {
    react,
    "../backend": { getBackendSessionRevision: () => revision },
    "./locations": { getLocations: () => { calls += 1; return Promise.resolve(lists[revision]); } },
  }, { window, CustomEvent: class {}, DOMException });
  const mount = async () => {
    h = hooks();
    const screen = () => h.render(() => api.useOwnerLocationOptions(true));
    screen(); h.commit(); await settle();
    const labels = Array.from(screen().options, option => option.label); h.unmount();
    return labels;
  };
  assert.deepEqual(await mount(), ["Wszystkie lokalizacje", "Studio A"]);
  assert.deepEqual(await mount(), ["Wszystkie lokalizacje", "Studio A"]);
  assert.equal(calls, 1);
  revision = 2;
  assert.deepEqual(await mount(), ["Wszystkie lokalizacje", "Studio B"]);
  assert.equal(calls, 2);
});

test("phone location picker shares the stored selection and marks a narrowed scope", async () => {
  const { h, storage } = locationOptions("1", Promise.resolve([{ id: 1, name: "Kraków", isActive: true }]));
  const { OwnerLocationIconPicker } = load("app/components/owner-mobile-location.tsx", {
    react: h.react,
    "@/app/lib/owner/location-filter": { OWNER_LOCATION_ALL: "all", useOwnerLocationOptions: () => ({ options: [{ value: "all", label: "Wszystkie lokalizacje" }, { value: "1", label: "Kraków" }], status: "ready", selectedLocationValue: storage["atlas-owner-location-id"], setSelectedLocationValue: value => { storage["atlas-owner-location-id"] = value; } }) },
  });
  const tree = OwnerLocationIconPicker({});
  const select = tree.props.children.find(child => child?.type === "select");
  assert.equal(select.props["aria-label"], "Lokalizacja: Kraków");
  select.props.onChange({ target: { value: "all" } });
  assert.equal(storage["atlas-owner-location-id"], "all");
});

test("package filters show no active marker and disabled clearing at defaults", () => {
  const mod = load("app/components/packages/PackageListFilters.tsx", {
    react: { ...React, useState: initial => [initial, () => {}] },
    "@/app/components/ui/list/FilterToolbar": { FilterToolbar: () => null, FilterSearchField: () => null },
  });
  const render = value => mod.default({ value, onChange: () => {} });
  const defaults = mod.defaultPackageListFilters;
  assert.equal(render(defaults).props.canClear, false);
  assert.equal(render({ ...defaults, sort: "price-asc" }).props.canClear, false);
  assert.equal(render({ ...defaults, search: "karnet" }).props.canClear, true);
  assert.equal(render({ ...defaults, billingModeFilter: "PeriodBased" }).props.canClear, true);
  assert.equal(render({ ...defaults, durationFilter: "31-60" }).props.canClear, true);
});
