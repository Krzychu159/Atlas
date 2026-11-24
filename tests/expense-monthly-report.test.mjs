import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function loadModule(path) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText, {
    exports, Date, Math, Intl, Number, String,
    require: (name) => { throw new Error(`Unexpected import ${name}`); },
  });
  return exports;
}

const report = loadModule("app/lib/owner/expense-monthly-report.ts");
const plain = (value) => JSON.parse(JSON.stringify(value));

test("reads the skipped documents header", () => {
  assert.deepEqual(plain(report.parseSkippedPacketDocuments("42:main:Unsupported,57:7:Failed")), [
    { expenseId: 42, attachmentId: null, status: "Unsupported" },
    { expenseId: 57, attachmentId: 7, status: "Failed" },
  ]);
  assert.deepEqual(plain(report.parseSkippedPacketDocuments(" 3:main:NotStored ")), [
    { expenseId: 3, attachmentId: null, status: "NotStored" },
  ]);
  assert.deepEqual(plain(report.parseSkippedPacketDocuments("")), []);
  assert.deepEqual(plain(report.parseSkippedPacketDocuments(null)), []);
  assert.deepEqual(plain(report.parseSkippedPacketDocuments("x:main:Failed,5:abc:Failed,6:1,7:2:Failed")), [
    { expenseId: 7, attachmentId: 2, status: "Failed" },
  ]);
});

test("reads the document count header", () => {
  assert.equal(report.parsePacketDocumentCount("12"), 12);
  assert.equal(report.parsePacketDocumentCount("0"), 0);
  assert.equal(report.parsePacketDocumentCount(""), null);
  assert.equal(report.parsePacketDocumentCount(null), null);
  assert.equal(report.parsePacketDocumentCount("-1"), null);
});

test("moves between months across years", () => {
  assert.deepEqual(plain(report.shiftReportMonth({ year: 2026, month: 1 }, -1)), { year: 2025, month: 12 });
  assert.deepEqual(plain(report.shiftReportMonth({ year: 2026, month: 12 }, 1)), { year: 2027, month: 1 });
  assert.deepEqual(plain(report.shiftReportMonth({ year: 2026, month: 11 }, -13)), { year: 2025, month: 10 });
});

test("recognises a list range that covers exactly one month", () => {
  assert.deepEqual(plain(report.getRangeReportMonth("2026-11-01", "2026-11-30")), { year: 2026, month: 11 });
  assert.deepEqual(plain(report.getRangeReportMonth("2028-02-01", "2028-02-29")), { year: 2028, month: 2 });
  assert.equal(report.getRangeReportMonth("2026-11-01", "2026-11-29"), null);
  assert.equal(report.getRangeReportMonth("2026-11-02", "2026-11-30"), null);
  assert.equal(report.getRangeReportMonth("", ""), null);
});

test("starts from the previous month unless the list shows another full month", () => {
  const now = new Date(2026, 10, 24);
  assert.deepEqual(plain(report.getInitialReportMonth("2026-11-01", "2026-11-30", now)), { year: 2026, month: 10 });
  assert.deepEqual(plain(report.getInitialReportMonth("", "", now)), { year: 2026, month: 10 });
  assert.deepEqual(plain(report.getInitialReportMonth("2026-08-01", "2026-08-31", now)), { year: 2026, month: 8 });
  assert.deepEqual(plain(report.getInitialReportMonth("2027-01-01", "2027-01-31", now)), { year: 2026, month: 11 });
  assert.deepEqual(plain(report.getInitialReportMonth("", "", new Date(2026, 0, 3))), { year: 2025, month: 12 });
});

test("formats the month in Polish", () => {
  assert.equal(report.formatReportMonth({ year: 2026, month: 11 }), "Listopad 2026");
});

test("uses the local calendar day for a new expense", () => {
  assert.equal(report.getLocalDateValue(new Date(2026, 10, 1, 0, 30)), "2026-11-01");
});
