import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { load } from "./owner-read-harness.mjs";

const summary = load("app/lib/client/billing-summary.ts", {
  "@/app/lib/period-packages": { isSessionPackage: item => item.billingMode !== "PeriodBased" },
});
const pkg = (id, amountDue, extra = {}) => ({ clientPackageId: id, amountDue, currency: "PLN", paymentDueDate: null, closedAt: null, ...extra });

test("unknown amount due stays unknown instead of zero", () => {
  assert.equal(summary.getClientAmountDue(null), null);
  assert.equal(summary.getClientAmountDue({}), null);
  assert.equal(summary.getClientAmountDue({ totalAmountDue: 0 }), 0);
  assert.equal(summary.getClientAmountDue({ totalAmountDue: 150 }), 150);
});

test("unpaid packages cover every open package, nearest due date first", () => {
  const billing = { packages: [
    pkg(1, 0),
    pkg(2, 100),
    pkg(3, 50, { paymentDueDate: "2026-11-20T00:00:00Z" }),
    pkg(4, 75, { paymentDueDate: "2026-11-05T00:00:00Z" }),
    pkg(5, 90, { closedAt: "2026-10-01T00:00:00Z" }),
  ] };
  assert.deepEqual(summary.getUnpaidPackages(billing).map(item => item.clientPackageId), [4, 3, 2]);
  assert.equal(summary.getNearestPaymentDueDate(billing), "2026-11-05T00:00:00Z");
  assert.equal(summary.getNearestPaymentDueDate({ packages: [pkg(1, 0, { paymentDueDate: "2026-10-23T00:00:00Z" })] }), null);
});

test("online checkout is limited to session packages", () => {
  assert.equal(summary.canPayPackageOnline(pkg(1, 10)), true);
  assert.equal(summary.canPayPackageOnline(pkg(2, 10, { billingMode: "PeriodBased" })), false);
});

test("currency comes from packages and falls back to payments, never invented", () => {
  assert.equal(summary.getClientBillingCurrency({ activeClientPackageId: 2, packages: [pkg(1, 0, { currency: "EUR" }), pkg(2, 0)] }), "PLN");
  assert.equal(summary.getClientBillingCurrency({ packages: [], payments: [{ currency: "EUR" }] }), "EUR");
  assert.equal(summary.getClientBillingCurrency(null), null);
});

test("dashboard and mobile payments read the total for all packages", () => {
  const dashboard = fs.readFileSync("app/(app)/client/page.tsx", "utf8");
  const payments = fs.readFileSync("app/(app)/client/payments/page.tsx", "utf8");
  assert.match(dashboard, /getClientAmountDue\(billing\)/);
  assert.doesNotMatch(dashboard, /mainPackage\?\.amountDue/);
  assert.doesNotMatch(payments, /activePackageAmountDue/);
});

test("hidden tooltips do not widen the page", () => {
  const tooltip = fs.readFileSync("app/components/ui/tooltip.tsx", "utf8");
  assert.match(tooltip, /\bhidden\b/);
  assert.doesNotMatch(tooltip, /opacity-0/);
});
