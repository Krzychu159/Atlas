import test from "node:test";
import assert from "node:assert/strict";
import { load } from "./owner-read-harness.mjs";

test("trainer receipts use the trainer portal endpoints", async () => {
  const calls = [];
  const record = method => async (path, body) => { calls.push([method, path, body]); return {}; };
  const portal = load("app/lib/trainer/portal.ts", { "../backend": { backendGet: record("GET"), backendPost: record("POST"), backendPut: record("PUT"), backendPatch: record("PATCH"), backendDelete: record("DELETE") } });
  await portal.getTrainerPortalPendingReceipts();
  await portal.issueTrainerPortalPaymentReceipt(12);
  await portal.cancelTrainerPortalPaymentReceipt(12);
  assert.deepEqual(calls.shift().slice(0, 2), ["GET", "trainer-portal/receipts/pending"]);
  assert.deepEqual(calls.map(call => [call[0], call[1]]), [
    ["POST", "trainer-portal/payments/12/receipt/issue"],
    ["POST", "trainer-portal/payments/12/receipt/cancel"],
  ]);
  assert.deepEqual(JSON.parse(JSON.stringify(calls[0][2])), { receiptNumber: null });
  assert.equal(calls[1][2], undefined);
});

test("receipt errors from the server are shown in Polish", () => {
  const { userMessage } = load("app/lib/user-messages.ts");
  const fallback = "Nie udało się oznaczyć paragonu.";
  for (const [message, expected] of [
    ["Only confirmed payments can receive a receipt.", "Paragon można oznaczyć dopiero po potwierdzeniu wpłaty."],
    ["Receipt has already been issued for this payment.", "Paragon za tę wpłatę jest już oznaczony jako wystawiony."],
    ["Only issued receipts can be cancelled.", "Ta wpłata nie ma wystawionego paragonu, więc nie ma czego cofać."],
    ["Trainer does not have access to this client.", "Ten klient nie jest przypisany do Ciebie."],
  ]) assert.equal(userMessage(message, fallback), expected);
});

test("a cancelled receipt no longer counts as issued", () => {
  const { isPaymentReceiptIssued } = load("app/lib/payments/display.ts");
  assert.equal(isPaymentReceiptIssued({ receiptStatus: "Issued", receiptNumber: "P/1" }), true);
  assert.equal(isPaymentReceiptIssued({ receiptStatus: "Cancelled", receiptNumber: "P/1", receiptIssuedAt: "2026-11-04T10:00:00Z" }), false);
  for (const receiptStatus of ["Pending", "ManualRequired", "Failed"]) assert.equal(isPaymentReceiptIssued({ receiptStatus }), false);
});
