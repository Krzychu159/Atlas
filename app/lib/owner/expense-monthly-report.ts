export type ReportMonth = { year: number; month: number };

export type SkippedPacketDocument = {
  expenseId: number;
  /** null = the expense's main document. */
  attachmentId: number | null;
  status: string;
};

export const MIN_REPORT_YEAR = 2000;
export const MAX_REPORT_YEAR = 2100;

/** Reads `X-Expense-Packet-Skipped`, e.g. `42:main:Unsupported,57:7:Failed`. Malformed entries are ignored. */
export function parseSkippedPacketDocuments(value: string | null | undefined): SkippedPacketDocument[] {
  if (!value) return [];

  return value.split(",").flatMap((entry): SkippedPacketDocument[] => {
    const [expensePart, attachmentPart, status] = entry.trim().split(":");
    const expenseId = Number(expensePart);
    if (!Number.isInteger(expenseId) || expenseId <= 0 || !attachmentPart || !status) return [];
    if (attachmentPart === "main") return [{ expenseId, attachmentId: null, status }];

    const attachmentId = Number(attachmentPart);
    return Number.isInteger(attachmentId) && attachmentId > 0 ? [{ expenseId, attachmentId, status }] : [];
  });
}

export function parsePacketDocumentCount(value: string | null | undefined) {
  if (!value?.trim()) return null;
  const count = Number(value);
  return Number.isInteger(count) && count >= 0 ? count : null;
}

export function shiftReportMonth({ year, month }: ReportMonth, delta: number): ReportMonth {
  const index = year * 12 + (month - 1) + delta;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

export function compareReportMonths(a: ReportMonth, b: ReportMonth) {
  return a.year * 12 + a.month - (b.year * 12 + b.month);
}

export function getLocalReportMonth(date = new Date()): ReportMonth {
  return { year: date.getFullYear(), month: date.getMonth() + 1 };
}

/** The month covered exactly by a `yyyy-mm-dd` range (first to last day), otherwise null. */
export function getRangeReportMonth(from: string, to: string): ReportMonth | null {
  const start = from.match(/^(\d{4})-(\d{2})-01$/);
  if (!start || !to) return null;

  const year = Number(start[1]);
  const month = Number(start[2]);
  if (month < 1 || month > 12) return null;

  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return to === `${start[1]}-${start[2]}-${String(lastDay).padStart(2, "0")}` ? { year, month } : null;
}

/**
 * Documents for the accountant are usually sent after the month ends, so start from the previous month,
 * unless the list is already narrowed to a different full month.
 */
export function getInitialReportMonth(from: string, to: string, now = new Date()): ReportMonth {
  const current = getLocalReportMonth(now);
  const selected = getRangeReportMonth(from, to);
  if (selected && compareReportMonths(selected, current) !== 0) return clampReportMonth(selected, current);
  return shiftReportMonth(current, -1);
}

export function clampReportMonth(month: ReportMonth, latest: ReportMonth): ReportMonth {
  if (compareReportMonths(month, latest) > 0) return latest;
  if (month.year < MIN_REPORT_YEAR) return { year: MIN_REPORT_YEAR, month: 1 };
  return month;
}

export function formatReportMonth({ year, month }: ReportMonth) {
  const label = new Intl.DateTimeFormat("pl-PL", { month: "long", year: "numeric", timeZone: "UTC" })
    .format(new Date(Date.UTC(year, month - 1, 1)));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** Today as `yyyy-mm-dd` in the user's time zone (not UTC). */
export function getLocalDateValue(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
