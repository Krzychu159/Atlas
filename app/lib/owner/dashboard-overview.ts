import { ApiError, backendGet } from "../backend";

export type MoneyMetric = { current: number; previous: number; changeAmount: number; changePercent: number | null };
export type CountMetric = { current: number; previous: number; change: number; changePercent: number | null };
export type DashboardSummary = {
  period: string; previousPeriod: string; timeZone: "Europe/Warsaw"; asOf: string;
  isPartial: boolean; currency: "PLN"; revenue: MoneyMetric; activeClients: CountMetric;
  newClients: number; completedSessions: CountMetric; clientsWithoutJoinedAt: number;
};
export type DashboardRevenue = {
  period: string; months: 6 | 12; currency: "PLN"; timeZone: "Europe/Warsaw"; asOf: string;
  items: { period: string; received: number; refunded: number; revenue: number; isPartial: boolean }[];
  total: number; average: number; previousYearTotal: number; yearOverYearChangePercent: number | null;
};
export type DashboardRecentClient = {
  id: number; firstName: string; lastName: string; fullName: string; joinedAt: string | null; createdAt: string;
};
export type DashboardAttention = {
  asOf: string; inactivityDays: 30; clientsWithoutTraining30Days: number;
  clientsWithOneRemainingSession: number; clientsWithoutAttendanceBaseline: number;
};
export function getDashboardSummary(period: string, signal?: AbortSignal) {
  return backendGet<DashboardSummary>("owner/dashboard/summary", { period }, signal);
}
export function getDashboardRevenue(period: string, months: 6 | 12, signal?: AbortSignal) {
  return backendGet<DashboardRevenue>("owner/dashboard/revenue", { months, period }, signal);
}
export function getDashboardRecentClients(signal?: AbortSignal) {
  return backendGet<DashboardRecentClient[]>("owner/dashboard/recent-clients", { limit: 4 }, signal);
}
export function getDashboardAttention(signal?: AbortSignal) {
  return backendGet<DashboardAttention>("owner/dashboard/attention", undefined, signal);
}
export function currentDashboardPeriod(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Warsaw", year: "numeric", month: "2-digit" }).formatToParts(now);
  return `${parts.find(part => part.type === "year")!.value}-${parts.find(part => part.type === "month")!.value}`;
}
export function validDashboardPeriod(period: string, maximum: string) {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(period) && period >= "2000-01" && period <= maximum;
}
export function dashboardMonth(period: string, short = false) {
  return new Intl.DateTimeFormat("pl-PL", { timeZone: "UTC", month: short ? "short" : "long", ...(short ? {} : { year: "numeric" }) }).format(new Date(`${period}-01T12:00:00Z`));
}
export function dashboardJoinedDate(value: string | null) {
  if (!value) return "Brak daty";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Brak daty" : new Intl.DateTimeFormat("pl-PL", { timeZone: "Europe/Warsaw", day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}
export function dashboardChange(value: number | null, percent = true) {
  if (value === null) return "Brak podstawy do porównania";
  return `${value > 0 ? "+" : ""}${new Intl.NumberFormat("pl-PL", { maximumFractionDigits: percent ? 1 : 0 }).format(value)}${percent ? "%" : ""}`;
}
export function dashboardClientCount(value: number) {
  return `${value.toLocaleString("pl-PL")} ${value === 1 ? "klient" : "klientów"}`;
}
export function dashboardError(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 401) return "Sesja wygasła. Zaloguj się ponownie.";
    if (error.status === 403) return "Nie masz dostępu do tych informacji.";
    if (error.status === 400) return "Nie możemy wyświetlić danych dla tego okresu. Wybierz inny miesiąc.";
  }
  return "Nie udało się pobrać danych. Spróbuj ponownie za chwilę.";
}
// Plot geometry only; all business metrics come directly from dashboard responses.
export function revenueGeometry(items: DashboardRevenue["items"]) {
  const values = items.map(item => item.revenue);
  const low = Math.min(0, ...values);
  const high = Math.max(0, ...values);
  const span = high - low || 1;
  const step = 10 ** Math.floor(Math.log10(span / 4));
  const tickStep = Math.ceil(span / 4 / step) * step;
  const min = Math.floor(low / tickStep) * tickStep;
  const max = Math.ceil((high || (low === 0 ? 1 : 0)) / tickStep) * tickStep;
  const y = (value: number) => 100 - (value - min) / (max - min) * 100;
  const points = values.map((value, index) => ({ x: values.length === 1 ? 50 : index / (values.length - 1) * 100, y: y(value) }));
  // Monotone interpolation keeps the curve inside each pair of measured values.
  const slopes = points.slice(1).map((point, index) => (point.y - points[index].y) / (point.x - points[index].x));
  const tangents = points.map((_, index) => {
    if (index === 0) return slopes[0] ?? 0;
    if (index === points.length - 1) return slopes[index - 1];
    const before = slopes[index - 1], after = slopes[index];
    return before * after <= 0 ? 0 : 2 * before * after / (before + after);
  });
  const line = points.map((point, index) => {
    if (!index) return `M${point.x},${point.y}`;
    const previous = points[index - 1];
    const third = (point.x - previous.x) / 3;
    return `C${previous.x + third},${previous.y + tangents[index - 1] * third} ${point.x - third},${point.y - tangents[index] * third} ${point.x},${point.y}`;
  }).join(" ");
  const area = points.length ? `${line} L${points.at(-1)!.x},${y(0)} L${points[0].x},${y(0)} Z` : "";
  const ticks = Array.from({ length: Math.round((max - min) / tickStep) + 1 }, (_, index) => max - index * tickStep);
  return { points, line, area, ticks, y };
}
