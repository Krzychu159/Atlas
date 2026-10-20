import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import React from "react";
import { load, find } from "./owner-read-harness.mjs";

const plural = load("app/lib/formatters/plural.ts");

test("Polish plural forms follow 1 / 2–4 / 5+ with the 12–14 exception", () => {
  const forms = count => plural.polishPlural(count, "trening", "treningi", "treningów");
  assert.deepEqual([1, 2, 4, 5, 11, 12, 14, 21, 22, 25, 104, 112, 0].map(forms),
    ["trening", "treningi", "treningi", "treningów", "treningów", "treningów", "treningów", "treningów", "treningi", "treningów", "treningi", "treningów", "treningów"]);
  assert.equal(plural.countLabel(1, "sesja", "sesje", "sesji"), "1 sesja");
  assert.equal(plural.countLabel(3, "sesja", "sesje", "sesji"), "3 sesje");
  assert.equal(plural.countLabel(5, "sesja", "sesje", "sesji"), "5 sesji");
});

test("payment amount explains why saving is blocked and keeps an empty field neutral", () => {
  const { paymentAmountError } = load("app/components/payments/PaymentEntryModal.tsx");
  assert.equal(paymentAmountError(""), null);
  assert.equal(paymentAmountError("   "), null);
  for (const value of ["-1", "0", "0,00", "-0.5"]) assert.equal(paymentAmountError(value), "Kwota musi być większa od 0.", value);
  for (const value of ["abc", "12,345", "1e3", "12 zł"]) assert.match(paymentAmountError(value), /maksymalnie z dwoma miejscami/, value);
  for (const value of ["120", "120,5", "120.50", " 840,00 "]) assert.equal(paymentAmountError(value), null, value);
});

test("payment form links the amount error to the input and keeps the entered value", () => {
  const input = load("app/components/ui/input.tsx", {
    react: { ...React, useId: () => "amount-error" },
    "./field-density": { useFieldDensity: () => "compact", compactFieldLabelClassName: "label", compactControlHeightClassName: "h" },
  });
  const tree = input.TextField({ label: "Kwota", value: "-1", onChange() {}, error: "Kwota musi być większa od 0." });
  const field = find(tree, node => node.type === input.FormField);
  const control = field.props.children;
  assert.equal(control.props["aria-invalid"], true);
  assert.equal(control.props["aria-describedby"], "amount-error");
  assert.equal(control.props.value, "-1");
  assert.equal(find(tree, node => node.props.id === "amount-error").props.children, "Kwota musi być większa od 0.");
  const valid = input.TextField({ label: "Kwota", value: "10", onChange() {}, error: null });
  assert.equal(find(valid, node => node.type === input.FormField).props.children.props["aria-invalid"], false);
  assert.equal(find(valid, node => node.props.id === "amount-error"), null);
  const plain = input.TextField({ label: "Kwota", value: "10", onChange() {} });
  assert.equal(plain.type, input.FormField, "fields without validation keep their previous structure");
});

test("operating result distinguishes positive, zero, negative and missing data without recalculating", () => {
  const { operatingResult } = load("app/(app)/owner/statistics/components/StatisticsOverview.tsx");
  assert.equal(operatingResult(120.5).meta, "Wynik dodatni");
  assert.equal(operatingResult(0).meta, "Wynik zerowy");
  assert.equal(operatingResult(0.004).meta, "Wynik zerowy");
  assert.equal(operatingResult(0).tone, "neutral");
  assert.equal(operatingResult(-1).meta, "Wynik ujemny");
  assert.equal(operatingResult(null).meta, "Brak danych");
  const page = fs.readFileSync("app/(app)/owner/statistics/page.tsx", "utf8");
  assert.match(page, /expenses\.operatingProfitNetAmount \|\| revenue\.netAmount - expenses\.netAmount/, "the calculation itself is unchanged");
});

test("location selects distinguish loading, error, no data and loaded options", () => {
  const { locationSelectOptions, locationListMessage } = load("app/(app)/owner/components/location-options.ts");
  const loaded = [{ value: "1", label: "Kraków" }];
  assert.equal(locationSelectOptions("loading", [])[0].label, "Wczytywanie lokalizacji…");
  assert.equal(locationSelectOptions("error", [])[0].label, "Nie udało się pobrać lokalizacji");
  assert.equal(locationSelectOptions("ready", [])[0].label, "Brak aktywnych lokalizacji");
  assert.equal(locationSelectOptions("ready", loaded), loaded);
  assert.equal(locationListMessage("loading"), "Wczytywanie lokalizacji…");
  assert.match(locationListMessage("error"), /Nie udało się pobrać lokalizacji/);
  assert.equal(locationListMessage("ready"), "Brak lokalizacji do wyboru.");
});

test("package billing type is a labelled choice that keeps the numeric values sent to the server", () => {
  const mod = load("app/(app)/owner/packages/components/PackagePublicationFields.tsx");
  assert.deepEqual([...mod.individualBillingTypeOptions.map(option => option.value)], ["1", "2", "3", "4"]);
  assert.match(mod.individualBillingTypeOptions[0].label, /1:1/);
  assert.equal(mod.billingTypeSelectOptions("2").length, 4);
  const unknown = mod.billingTypeSelectOptions("7");
  assert.equal(unknown.at(-1).value, "7", "an unexpected stored value is preserved, not replaced");
  const changes = [];
  const select = { type: "select" };
  const fields = load("app/(app)/owner/packages/components/PackagePublicationFields.tsx", { "@/app/components/ui/custom-select": { CustomSelect: select } });
  const tree = fields.default({ form: { billingType: "3", isPubliclyAvailable: false, publicSlug: "" }, onChange: (field, value) => changes.push([field, value]) });
  const billing = find(tree, node => node.props?.label === "Typ rozliczenia");
  assert.equal(billing.props.value, "3");
  billing.props.onChange("4");
  assert.deepEqual(changes, [["billingType", "4"]]);
});

test("notification categories wrap from tablet width instead of hiding behind a scroll", () => {
  const source = fs.readFileSync("app/(app)/owner/components/NotificationFilters.tsx", "utf8");
  assert.match(source, /md:flex-wrap/);
  assert.doesNotMatch(source, /scrollbarWidth: "none"/);
});

test("risky client actions move to a labelled Więcej menu while routine ones stay visible", () => {
  const hero = fs.readFileSync("app/(app)/owner/clients/[id]/components/ClientProfileHero.tsx", "utf8");
  assert.match(hero, /<ProfileMoreMenu items=\{moreActions\} \/>/);
  assert.doesNotMatch(hero, /IconAction label="Archiwizuj klienta"/);
  assert.doesNotMatch(hero, /IconAction label="Zakończ współpracę"/);
  const { ProfileMoreMenu } = load("app/components/ui/profile-more-menu.tsx", {
    react: { ...React, useState: initial => [initial, () => {}], useRef: () => ({ current: null }), useEffect() {}, useId: () => "menu" },
    "./profile-hero": { profileSecondaryActionClassName: "" },
  });
  assert.equal(ProfileMoreMenu({ items: [] }), null);
  const tree = ProfileMoreMenu({ items: [{ label: "Archiwizuj klienta", icon: null, onSelect() {}, tone: "danger" }] });
  const button = find(tree, node => node.type === "button");
  assert.equal(button.props["aria-haspopup"], "menu");
  assert.equal(button.props["aria-expanded"], false);
  assert.ok(React.Children.toArray(button.props.children).includes("Więcej"));
});

test("session start label is short Polish date and time", () => {
  const { formatSessionStart } = load("app/lib/formatters/date.ts");
  const now = new Date(2026, 9, 20, 12);
  assert.equal(formatSessionStart(new Date(2026, 9, 21, 18, 0).toISOString(), now), "śr. 21.10, 18:00");
  assert.match(formatSessionStart(new Date(2027, 0, 4, 9, 30).toISOString(), now), /04\.01\.2027, 09:30$/);
  assert.equal(formatSessionStart("bad", now), "Brak daty");
});
