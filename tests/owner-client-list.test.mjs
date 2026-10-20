import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function load(file, modules = {}) {
  const exports = {};
  const require = (name) => {
    if (name in modules) return modules[name];
    throw new Error(`Unexpected import ${name} in ${file}`);
  };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports, require, Intl, Date });
  return exports;
}

const periodPackages = load("app/lib/period-packages.ts", { "./backend": {}, "./formatters/money": {} });
const clientDisplay = load("app/(app)/owner/clients/components/client-display.ts", { "@/app/lib/period-packages": periodPackages });
const plural = load("app/lib/formatters/plural.ts");
const display = load("app/components/clients/client-list-display.ts", { "@/app/(app)/owner/clients/components/client-display": clientDisplay, "@/app/lib/formatters/plural": plural });

const pkg = (overrides) => ({ clientPackageId: 10, packageId: 1, name: "12 treningów", billingMode: "SessionBased", status: "Active", paymentStatus: "Paid", totalSessions: 12, usedSessions: 8, remainingSessions: 4, validUntil: null, periodStartsAt: null, locationId: 1, ...overrides });
const base = { id: 1, firstName: "Anna", lastName: "Nowak", fullName: "Anna Nowak", trainerId: null, trainerFullName: "", status: "active" };

test("session packages show used, limit and remaining only when the list provides them", () => {
  const summary = display.clientPackageSummary({ ...base, activePackages: [pkg()], activeClientPackageId: 10 });
  assert.equal(summary.kind, "session");
  assert.equal(summary.used, 8);
  assert.equal(summary.limit, 12);
  assert.equal(summary.remaining, 4);
  assert.equal(summary.percent, 67);
  assert.equal(summary.extraCount, 0);

  const unknown = display.clientPackageSummary({ ...base, activePackages: [pkg({ usedSessions: null, remainingSessions: null })] });
  assert.equal(unknown.kind, "unknown");
  assert.equal(unknown.detail, "Brak danych o wykorzystaniu");
});

test("period packages show validity instead of a session counter", () => {
  const summary = display.clientPackageSummary({ ...base, activePackages: [pkg({ billingMode: "PeriodBased", name: "Dieta", totalSessions: null, usedSessions: null, remainingSessions: null, periodStartsAt: "2026-10-01", validUntil: "2026-11-01" })] });
  assert.equal(summary.kind, "period");
  assert.equal(summary.name, "Dieta");
  assert.equal(summary.detail, "Ważny do 31.10.2026");
  assert.equal("used" in summary, false);
});

test("clients without a package and with several packages", () => {
  assert.equal(display.clientPackageSummary({ ...base, activePackages: [] }).kind, "none");
  const many = display.clientPackageSummary({ ...base, activePackages: [pkg(), pkg({ clientPackageId: 11 })], activeClientPackageId: 11 });
  assert.equal(many.extraCount, 1);
});

test("amount due comes only from totalAmountDue and never turns missing data into zero", () => {
  const nbsp = value => value.replace(/\s/g, " ");
  assert.deepEqual({ ...display.clientAmountDue({ ...base }) }, { label: "Brak danych", tone: "missing" });
  assert.equal(display.clientAmountDue({ ...base, totalAmountDue: null, currentBalance: 300 }).tone, "missing");
  const settled = display.clientAmountDue({ ...base, totalAmountDue: 0, amountDueCurrency: "PLN", currentBalance: 300 });
  assert.equal(nbsp(settled.label), "0,00 zł"); assert.equal(settled.tone, "settled");
  const due = display.clientAmountDue({ ...base, totalAmountDue: 12500.5, amountDueCurrency: "PLN" });
  assert.equal(nbsp(due.label), "12 500,50 zł"); assert.equal(due.tone, "due");
  assert.equal(nbsp(display.clientAmountDue({ ...base, totalAmountDue: 99 }).label), "99,00 zł");
  assert.equal(display.clientAmountDue({ ...base, totalAmountDue: 10, amountDueCurrency: "EUR" }).label.includes("€"), true);
});

test("trainer and status labels follow the data", () => {
  assert.deepEqual({ ...display.clientTrainerLabel({ trainerId: null, trainerFullName: "" }) }, { label: "Nie przypisano", assigned: false });
  assert.deepEqual({ ...display.clientTrainerLabel({ trainerId: 4, trainerFullName: "" }) }, { label: "Brak danych o trenerze", assigned: true });
  assert.equal(display.clientTrainerLabel({ trainerId: 4, trainerFullName: "Jan Kowalski" }).label, "Jan Kowalski");
  assert.equal(display.clientStatus({ status: "Active" }).label, "Aktywny");
  assert.equal(display.clientStatus({ status: "suspended" }).label, "Zawieszony");
  assert.equal(display.clientStatus({ status: "new" }).label, "Nowy");
  assert.equal(display.clientStatus({ status: "Weird" }).label, "Status nieznany");
  assert.equal(display.pluralizeClients(1), "1 klient");
  assert.equal(display.pluralizeClients(4), "4 klientów");
  assert.equal(display.clientResultsLabel(44, 108), "44 wyniki z 108 klientów");
  assert.equal(display.clientResultsLabel(1, 1), "1 wynik z 1 klienta");
  assert.equal(display.clientResultsLabel(12, 300), "12 wyników z 300 klientów");
  assert.equal(display.clientResultsLabel(5), "5 wyników", "without a known total only results are counted");
});

test("session dots are exact up to 20 sessions and proportional above", () => {
  assert.deepEqual({ ...display.sessionDots(8, 12) }, { variant: "exact", total: 12, filled: 8 });
  assert.deepEqual({ ...display.sessionDots(20, 20) }, { variant: "exact", total: 20, filled: 20 });
  assert.deepEqual({ ...display.sessionDots(37, 50) }, { variant: "proportional", total: 10, filled: 7 });
  assert.deepEqual({ ...display.sessionDots(99, 50) }, { variant: "proportional", total: 10, filled: 10 });
  assert.equal(display.sessionDots(0, 0), null);
  assert.equal(display.sessionDots(3, Number.NaN), null);
});

test("missing period dates never produce a fake validity", () => {
  const summary = display.clientPackageSummary({ ...base, activePackages: [pkg({ billingMode: "PeriodBased", totalSessions: null, usedSessions: null, remainingSessions: null })] });
  assert.equal(summary.detail, "Okres ważności niedostępny");
});

test("trainer balance column never turns missing data into zero and never marks a balance as debt", () => {
  assert.deepEqual({ ...display.clientBalance({ ...base }) }, { label: "Brak danych", tone: "missing" });
  const negative = display.clientBalance({ ...base, currentBalance: -150, currency: "PLN" });
  assert.equal(negative.label.replace(/\s/g, " "), "-150,00 zł");
  assert.equal(negative.tone, "settled");
  assert.equal(display.clientBalance({ ...base, currentBalance: 0 }).tone, "settled");
});
