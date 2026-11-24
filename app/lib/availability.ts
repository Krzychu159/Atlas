import { ApiError, backendGet, backendPost, backendPut } from "./backend";
import { userMessage } from "./user-messages";

// Contract: TrainerAvailabilityController (/api/availability), shared by the Trainer and Owner portals.
// Dates are yyyy-MM-dd, times HH:mm in studio time ("24:00" = midnight), `*At` fields are UTC.
// Swagger marks every list as nullable, so responses are normalized here before the UI reads them.

export type AvailabilityRange = { start: string; end: string };

export type AvailabilityTemplateDay = { dayOfWeek: number; ranges: AvailabilityRange[] };

export type AvailabilityTemplate = {
  id: number;
  validFrom: string;
  validUntil: string;
  days: AvailabilityTemplateDay[];
  updatedAt: string | null;
};

export type AvailabilityTemplates = {
  trainerId: number;
  firstOpenWeek: string;
  lastPlannableDate: string;
  defaultTemplateWeeks: number;
  templates: AvailabilityTemplate[];
};

export type AvailabilityWeekStatus = "Open" | "Submitted" | "Missed";
export type AvailabilityDayMode = "Template" | "Custom" | "Off";

export type AvailabilityWeekDay = {
  date: string;
  dayOfWeek: number;
  /** `Locked` only in a locked week. */
  mode: AvailabilityDayMode | "Locked";
  ranges: AvailabilityRange[];
  templateRanges: AvailabilityRange[];
};

export type AvailabilityDayChange = { date: string; mode: AvailabilityDayMode; ranges: AvailabilityRange[] };
export type AvailabilityDayRanges = { date: string; ranges: AvailabilityRange[] };

export type AvailabilityChangeRequestStatus = "Pending" | "Approved" | "Rejected" | "Cancelled";

export type AvailabilityChangeRequest = {
  id: number;
  trainerId: number;
  trainerName: string | null;
  weekStart: string;
  status: AvailabilityChangeRequestStatus | string;
  reason: string | null;
  /** The requested days. */
  days: AvailabilityDayChange[];
  /** Hours in force on those days now (before a decision: for comparison; after approval: already changed). */
  currentDays: AvailabilityDayRanges[];
  createdAt: string | null;
  decidedAt: string | null;
  decidedByName: string | null;
  decisionNote: string | null;
};

export type AvailabilityWeek = {
  trainerId: number;
  trainerName: string | null;
  weekStart: string;
  status: AvailabilityWeekStatus;
  isLocked: boolean;
  deadlineAt: string;
  submittedAt: string | null;
  changedAfterLockAt: string | null;
  hasPendingChangeRequest: boolean;
  canEdit: boolean;
  canSubmit: boolean;
  canRequestChange: boolean;
  pendingChangeRequest: AvailabilityChangeRequest | null;
  days: AvailabilityWeekDay[];
};

type Raw = Record<string, unknown>;

const isRecord = (value: unknown): value is Raw => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const text = (value: unknown) => (typeof value === "string" && value.trim() ? value : null);
const list = (value: unknown) => (Array.isArray(value) ? value.filter(isRecord) : []);
const dayModes: readonly string[] = ["Template", "Custom", "Off"];

function ranges(value: unknown): AvailabilityRange[] {
  return list(value).flatMap((range) => {
    const start = text(range.start);
    const end = text(range.end);
    return start && end ? [{ start, end }] : [];
  });
}

function dayChanges(value: unknown): AvailabilityDayChange[] {
  return list(value).flatMap((day) => {
    const date = text(day.date);
    const mode = text(day.mode);
    return date && mode && dayModes.includes(mode) ? [{ date, mode: mode as AvailabilityDayMode, ranges: ranges(day.ranges) }] : [];
  });
}

function normalizeChangeRequest(raw: unknown): AvailabilityChangeRequest | null {
  if (!isRecord(raw) || typeof raw.id !== "number") return null;
  return {
    id: raw.id,
    trainerId: typeof raw.trainerId === "number" ? raw.trainerId : 0,
    trainerName: text(raw.trainerName),
    weekStart: text(raw.weekStart) ?? "",
    status: text(raw.status) ?? "Pending",
    reason: text(raw.reason),
    days: dayChanges(raw.days),
    currentDays: list(raw.currentDays).flatMap((day) => {
      const date = text(day.date);
      return date ? [{ date, ranges: ranges(day.ranges) }] : [];
    }),
    createdAt: text(raw.createdAt),
    decidedAt: text(raw.decidedAt),
    decidedByName: text(raw.decidedByName),
    decisionNote: text(raw.decisionNote),
  };
}

/** The week, or null when the response is not a week at all. */
export function asAvailabilityWeek(raw: unknown, weekStart?: string): AvailabilityWeek | null {
  if (!isRecord(raw) || typeof raw.weekStart !== "string" || (weekStart && raw.weekStart !== weekStart)) return null;
  const status = text(raw.status);
  const days = list(raw.days).flatMap((day): AvailabilityWeekDay[] => {
    const date = text(day.date);
    const mode = text(day.mode);
    if (!date || !mode || (mode !== "Locked" && !dayModes.includes(mode))) return [];
    return [{
      date,
      dayOfWeek: typeof day.dayOfWeek === "number" ? day.dayOfWeek : 0,
      mode: mode as AvailabilityWeekDay["mode"],
      ranges: ranges(day.ranges),
      templateRanges: ranges(day.templateRanges),
    }];
  });
  if (!days.length) return null;
  return {
    trainerId: typeof raw.trainerId === "number" ? raw.trainerId : 0,
    trainerName: text(raw.trainerName),
    weekStart: raw.weekStart,
    status: status === "Submitted" || status === "Missed" ? status : "Open",
    isLocked: raw.isLocked === true,
    deadlineAt: text(raw.deadlineAt) ?? "",
    submittedAt: text(raw.submittedAt),
    changedAfterLockAt: text(raw.changedAfterLockAt),
    hasPendingChangeRequest: raw.hasPendingChangeRequest === true,
    canEdit: raw.canEdit === true,
    canSubmit: raw.canSubmit === true,
    canRequestChange: raw.canRequestChange === true,
    pendingChangeRequest: normalizeChangeRequest(raw.pendingChangeRequest),
    days,
  };
}

function weekOrThrow(raw: unknown, weekStart: string) {
  const week = asAvailabilityWeek(raw, weekStart);
  if (!week) throw new Error("Nie udało się wczytać tygodnia. Spróbuj ponownie.");
  return week;
}

function normalizeTemplates(raw: unknown): AvailabilityTemplates {
  const data = isRecord(raw) ? raw : {};
  const firstOpenWeek = text(data.firstOpenWeek);
  const lastPlannableDate = text(data.lastPlannableDate);
  if (!firstOpenWeek || !lastPlannableDate) throw new Error("Nie udało się wczytać dyspozycji. Spróbuj ponownie.");
  return {
    trainerId: typeof data.trainerId === "number" ? data.trainerId : 0,
    firstOpenWeek,
    lastPlannableDate,
    defaultTemplateWeeks: typeof data.defaultTemplateWeeks === "number" && data.defaultTemplateWeeks > 0 ? data.defaultTemplateWeeks : 13,
    templates: list(data.templates).flatMap((template) => {
      const validFrom = text(template.validFrom);
      const validUntil = text(template.validUntil);
      if (typeof template.id !== "number" || !validFrom || !validUntil) return [];
      return [{
        id: template.id,
        validFrom,
        validUntil,
        updatedAt: text(template.updatedAt),
        days: list(template.days).flatMap((day) => (typeof day.dayOfWeek === "number" ? [{ dayOfWeek: day.dayOfWeek, ranges: ranges(day.ranges) }] : [])),
      }];
    }),
  };
}

const base = "availability";

export async function getAvailabilityTemplates(trainerId?: number, signal?: AbortSignal) {
  return normalizeTemplates(await backendGet<unknown>(`${base}/template`, { trainerId }, signal));
}

export async function saveAvailabilityTemplate(payload: {
  trainerId?: number;
  validFrom: string;
  validUntil?: string;
  days: AvailabilityTemplateDay[];
}) {
  return normalizeTemplates(await backendPut<unknown>(`${base}/template`, payload));
}

export async function getAvailabilityWeek(weekStart: string, trainerId?: number, signal?: AbortSignal) {
  return weekOrThrow(await backendGet<unknown>(`${base}/weeks/${weekStart}`, { trainerId }, signal), weekStart);
}

/** Send only the changed days; the response is the whole week. */
export async function saveAvailabilityWeek(weekStart: string, days: AvailabilityDayChange[], trainerId?: number) {
  return weekOrThrow(await backendPut<unknown>(`${base}/weeks/${weekStart}`, { trainerId, days }), weekStart);
}

export async function submitAvailabilityWeek(weekStart: string, trainerId?: number) {
  return weekOrThrow(await backendPost<unknown>(`${base}/weeks/${weekStart}/submit`, trainerId ? { trainerId } : {}), weekStart);
}

export async function getAvailabilityChangeRequests(query: { status?: AvailabilityChangeRequestStatus; trainerId?: number } = {}, signal?: AbortSignal) {
  const result = await backendGet<unknown>(`${base}/change-requests`, query, signal);
  return (Array.isArray(result) ? result : []).flatMap((item) => normalizeChangeRequest(item) ?? []);
}

export function createAvailabilityChangeRequest(payload: {
  weekStart: string;
  days: AvailabilityDayChange[];
  reason?: string;
}) {
  return backendPost<unknown>(`${base}/change-requests`, payload);
}

export function cancelAvailabilityChangeRequest(id: number) {
  return backendPost<unknown>(`${base}/change-requests/${id}/cancel`, {});
}

export function approveAvailabilityChangeRequest(id: number, note?: string) {
  return backendPost<unknown>(`${base}/change-requests/${id}/approve`, { note: note?.trim() || undefined });
}

export function rejectAvailabilityChangeRequest(id: number, note?: string) {
  return backendPost<unknown>(`${base}/change-requests/${id}/reject`, { note: note?.trim() || undefined });
}

// Schedule of availability (owner view; a trainer sees colleagues from their own locations).

export type AvailabilitySource = "None" | "Template" | "Custom" | "Off" | "Locked";

export type AvailabilityBusy = {
  sessionId: number;
  /** null when a trainer looks at another trainer's session. */
  title: string | null;
  start: string;
  end: string;
  startAt: string;
  endAt: string;
  locationId: number;
  plannedSessionType: string | null;
  status: string | null;
};

export type AvailabilitySlot = { start: string; end: string; startAt: string; endAt: string };

export type AvailabilityScheduleDay = {
  date: string;
  source: AvailabilitySource;
  availability: AvailabilityRange[];
  busy: AvailabilityBusy[];
  /** Availability minus sessions minus time that has passed. */
  free: AvailabilitySlot[];
};

export type AvailabilityWeekState = {
  weekStart: string;
  status: AvailabilityWeekStatus;
  isLocked: boolean;
  deadlineAt: string | null;
  submittedAt: string | null;
  changedAfterLockAt: string | null;
  hasPendingChangeRequest: boolean;
};

export type AvailabilityScheduleTrainer = {
  trainerId: number;
  name: string;
  outlookCategoryName: string | null;
  outlookCategoryColor: string | null;
  locationIds: number[];
  weeks: AvailabilityWeekState[];
  days: AvailabilityScheduleDay[];
};

export type AvailabilitySchedule = { from: string; to: string; timeZone: string | null; trainers: AvailabilityScheduleTrainer[] };

const sources: readonly string[] = ["None", "Template", "Custom", "Off", "Locked"];

function weekState(raw: Raw): AvailabilityWeekState | null {
  const weekStart = text(raw.weekStart);
  if (!weekStart) return null;
  const status = text(raw.status);
  return {
    weekStart,
    status: status === "Submitted" || status === "Missed" ? status : "Open",
    isLocked: raw.isLocked === true,
    deadlineAt: text(raw.deadlineAt),
    submittedAt: text(raw.submittedAt),
    changedAfterLockAt: text(raw.changedAfterLockAt),
    hasPendingChangeRequest: raw.hasPendingChangeRequest === true,
  };
}

function slots(value: unknown): AvailabilitySlot[] {
  return list(value).flatMap((slot) => {
    const start = text(slot.start);
    const end = text(slot.end);
    const startAt = text(slot.startAt);
    const endAt = text(slot.endAt);
    return start && end && startAt && endAt ? [{ start, end, startAt, endAt }] : [];
  });
}

export function normalizeAvailabilitySchedule(raw: unknown): AvailabilitySchedule {
  const data = isRecord(raw) ? raw : {};
  return {
    from: text(data.from) ?? "",
    to: text(data.to) ?? "",
    timeZone: text(data.timeZone),
    trainers: list(data.trainers).flatMap((trainer) => {
      if (typeof trainer.trainerId !== "number") return [];
      return [{
        trainerId: trainer.trainerId,
        name: text(trainer.name) ?? "Trener",
        outlookCategoryName: text(trainer.outlookCategoryName),
        outlookCategoryColor: text(trainer.outlookCategoryColor),
        locationIds: Array.isArray(trainer.locationIds) ? trainer.locationIds.filter((id): id is number => typeof id === "number") : [],
        weeks: list(trainer.weeks).flatMap((week) => weekState(week) ?? []),
        days: list(trainer.days).flatMap((day) => {
          const date = text(day.date);
          if (!date) return [];
          const source = text(day.source);
          return [{
            date,
            source: (source && sources.includes(source) ? source : "None") as AvailabilitySource,
            availability: ranges(day.availability),
            busy: list(day.busy).flatMap((busy) => {
              const start = text(busy.start);
              const end = text(busy.end);
              const startAt = text(busy.startAt);
              const endAt = text(busy.endAt);
              if (typeof busy.sessionId !== "number" || !start || !end || !startAt || !endAt) return [];
              return [{
                sessionId: busy.sessionId,
                title: text(busy.title),
                start, end, startAt, endAt,
                locationId: typeof busy.locationId === "number" ? busy.locationId : 0,
                plannedSessionType: text(busy.plannedSessionType),
                status: text(busy.status),
              }];
            }),
            free: slots(day.free),
          }];
        }),
      }];
    }),
  };
}

/** At most 42 days per request. */
export async function getAvailabilitySchedule(query: { from: string; to: string; trainerId?: number; locationId?: number }, signal?: AbortSignal) {
  return normalizeAvailabilitySchedule(await backendGet<unknown>(`${base}/schedule`, query, signal));
}

export function createAvailabilityConsultation(payload: {
  trainerId: number;
  locationId: number;
  startAt: string;
  endAt: string;
  title?: string;
  note?: string;
  confirmOutsideAvailability: boolean;
}) {
  return backendPost<unknown>(`${base}/consultations`, payload);
}

/** The warning sent when a consultation falls outside the trainer's free time; the owner may confirm it. */
export function getConsultationWarning(error: unknown) {
  if (!(error instanceof ApiError) || error.status !== 400 || !isRecord(error.payload) || error.payload.code !== "ConsultationOutsideAvailability") return null;
  const details = isRecord(error.payload.details) ? error.payload.details : {};
  const message = text(error.payload.message);
  return {
    message: (message && userMessage(message, "")) || "Ten termin jest poza wolnym czasem trenera. Czy mimo to dodać konsultację?",
    reasons: Array.isArray(details.reasons) ? details.reasons.filter((reason): reason is string => typeof reason === "string") : [],
  };
}

/** A 400 from the availability endpoints: `message` is Polish and ready to show; `details` points at the day. */
export type AvailabilityError = {
  code: string | null;
  message: string | null;
  date: string | null;
  dayOfWeek: number | null;
};

export function getAvailabilityError(error: unknown): AvailabilityError | null {
  if (!(error instanceof ApiError) || error.status !== 400 || !isRecord(error.payload)) return null;
  const details = isRecord(error.payload.details) ? error.payload.details : {};
  const message = text(error.payload.message);
  return {
    code: text(error.payload.code),
    message: message ? userMessage(message, "") || null : null,
    date: text(details.date),
    dayOfWeek: typeof details.dayOfWeek === "number" ? details.dayOfWeek : null,
  };
}

export type AvailabilityErrorCode =
  | "AvailabilityWeekLocked"
  | "AvailabilityWeekNotLocked"
  | "AvailabilityChangeRequestNotPending";

const handledCodes: readonly string[] = ["AvailabilityWeekLocked", "AvailabilityWeekNotLocked", "AvailabilityChangeRequestNotPending"];

/** Codes after which the screen reloads the week, because its state changed elsewhere. */
export function getAvailabilityErrorCode(error: unknown): AvailabilityErrorCode | null {
  const code = getAvailabilityError(error)?.code;
  return code && handledCodes.includes(code) ? (code as AvailabilityErrorCode) : null;
}

const fallbackMessages: Record<AvailabilityErrorCode, string> = {
  AvailabilityWeekLocked: "Ten tydzień jest już zablokowany. Zmianę możesz zgłosić właścicielowi.",
  AvailabilityWeekNotLocked: "Ten tydzień możesz jeszcze zmienić sam, bez prośby do właściciela.",
  AvailabilityChangeRequestNotPending: "Ta prośba została już rozpatrzona albo wycofana.",
};

/** The backend's Polish message, or our own wording for the codes the screen handles. */
export function getAvailabilityErrorMessage(error: unknown) {
  const details = getAvailabilityError(error);
  if (!details) return null;
  const code = getAvailabilityErrorCode(error);
  return details.message ?? (code ? fallbackMessages[code] : null);
}
