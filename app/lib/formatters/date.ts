export function formatDateTime(value?: string | null) {
  if (!value) return "Brak daty";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("pl-PL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

// trainingStartDate represents a calendar day, even when serialized as DateTime.
export function parseTrainingStartDate(value?: string | null) {
  const match = value?.trim().match(/^(\d{4})-(\d{2})-(\d{2})(?:T|$)/);
  if (!match) return null;
  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(0);
  date.setHours(12, 0, 0, 0);
  date.setFullYear(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null;
}

export function formatTrainingStartDate(value?: string | null) {
  const date = parseTrainingStartDate(value);
  return date ? new Intl.DateTimeFormat("pl-PL", { day: "2-digit", month: "short", year: "numeric" }).format(date) : "Nie podano daty";
}

export function formatRelativeDate(value?: string | null) {
  if (!value) return "Brak daty";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) return "Teraz";
  if (diffMinutes < 60) return `${diffMinutes} min temu`;
  if (diffHours < 24) return `${diffHours} godz. temu`;
  if (diffDays < 7) return `${diffDays} dni temu`;

  return new Intl.DateTimeFormat("pl-PL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatSessionTime(value?: string | null) {
  if (!value) return "--:--";

  if (/^\d{1,2}:\d{2}$/.test(value)) return value;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("pl-PL", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function toDateInputValue(value?: string | null) {
  if (!value) return "";

  return value.match(/^\d{4}-\d{2}-\d{2}/)?.[0] || "";
}

export function formatDateInputValue(value?: string | null) {
  const normalized = toDateInputValue(value);

  if (!normalized) return "";

  const [year, month, day] = normalized.split("-");

  return `${day}.${month}.${year}`;
}

export function dateInputToIsoDateTime(value?: string | null) {
  const normalized = toDateInputValue(value);

  return normalized ? `${normalized}T00:00:00.000Z` : null;
}

// Short start of a planned session, e.g. "pon. 21.10, 18:00"; the year is added outside the current year.
export function formatSessionStart(value?: string | null, now = new Date()) {
  if (!value) return "Brak daty";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Brak daty";
  const sameYear = date.getFullYear() === now.getFullYear();
  const weekday = new Intl.DateTimeFormat("pl-PL", { weekday: "short" }).format(date);
  const day = new Intl.DateTimeFormat("pl-PL", { day: "2-digit", month: "2-digit", ...(sameYear ? {} : { year: "numeric" }) }).format(date);
  return `${weekday} ${day}, ${formatSessionTime(value)}`;
}
