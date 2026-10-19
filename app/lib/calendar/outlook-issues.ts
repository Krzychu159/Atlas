import { backendGet, backendPost } from "@/app/lib/backend";

export type OutlookIssueType =
  | "CompletedSessionDeletedInOutlook"
  | "CompletedSessionAttendeeRemovedInOutlook"
  | "StartedSessionDeletedInOutlook"
  | "PastEventNeedsReview";

// GET /api/outlook/issues → OutlookMappingIssueDto[]
export type OutlookMappingIssueDto = {
  externalCalendarEventId: number;
  sessionId: number | null;
  subject: string | null;
  startAt: string;
  endAt: string;
  locationName: string | null;
  organizerEmail: string | null;
  issueType: string | null;
  requiresDecision: boolean;
  calendarOwnerFullName: string | null;
  message: string | null;
  email: string | null;
  importedAt: string;
};

export type OutlookIssue = {
  type: string;
  externalCalendarEventId: number;
  sessionId: number | null;
  title: string | null;
  message: string | null;
  startAt: string | null;
  locationName: string | null;
  calendarOwnerFullName: string | null;
  email: string | null;
  requiresDecision: boolean;
};

export type OutlookIssueAction = "correct-session" | "open-session" | "convert" | null;

function readNumber(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : null;
}

function readText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

// Items without an event id cannot be acted on, so they are skipped instead of shown as broken rows.
export function normalizeOutlookIssues(value: unknown): OutlookIssue[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap(item => {
    if (!item || typeof item !== "object") return [];
    const raw = item as Partial<Record<keyof OutlookMappingIssueDto, unknown>>;
    const externalCalendarEventId = readNumber(raw.externalCalendarEventId);
    if (!externalCalendarEventId) return [];
    return [{
      type: readText(raw.issueType) ?? "Unknown",
      externalCalendarEventId,
      sessionId: readNumber(raw.sessionId),
      title: readText(raw.subject),
      message: readText(raw.message),
      startAt: readText(raw.startAt),
      locationName: readText(raw.locationName),
      calendarOwnerFullName: readText(raw.calendarOwnerFullName),
      email: readText(raw.email) ?? readText(raw.organizerEmail),
      // A missing flag is treated as needing a decision, so nothing is hidden by accident.
      requiresDecision: raw.requiresDecision !== false,
    }];
  });
}

export function splitOutlookIssues(issues: OutlookIssue[]) {
  return {
    decisions: issues.filter(issue => issue.requiresDecision),
    notices: issues.filter(issue => !issue.requiresDecision),
  };
}

export function outlookIssueAction(issue: Pick<OutlookIssue, "type" | "sessionId">): OutlookIssueAction {
  if ((issue.type === "CompletedSessionDeletedInOutlook" || issue.type === "CompletedSessionAttendeeRemovedInOutlook") && issue.sessionId) return "correct-session";
  if (issue.type === "StartedSessionDeletedInOutlook" && issue.sessionId) return "open-session";
  if (issue.type === "PastEventNeedsReview") return "convert";
  return null;
}

const issueDescriptions: Record<OutlookIssueType, { title: string; description: string }> = {
  CompletedSessionDeletedInOutlook: {
    title: "Zrealizowana sesja usunięta w Outlooku",
    description: "Wejścia i saldo klientów nie zmieniły się. Jeśli sesja się nie odbyła, popraw ją w korekcie sesji.",
  },
  CompletedSessionAttendeeRemovedInOutlook: {
    title: "Uczestnik usunięty w Outlooku",
    description: "Z zaproszenia zrealizowanej sesji usunięto uczestnika. Wejście nadal jest rozliczone – zmień listę uczestników w korekcie, jeśli trzeba.",
  },
  StartedSessionDeletedInOutlook: {
    title: "Rozpoczęta sesja usunięta w Outlooku",
    description: "Sesja trwa lub już się zaczęła, a w Outlooku jej nie ma. Sprawdź, czy się odbywa.",
  },
  PastEventNeedsReview: {
    title: "Wydarzenie z Outlooka do sprawdzenia",
    description: "W kalendarzu jest minione wydarzenie, którego nie ma w ATLAS. Zamień je na sesję albo pomiń.",
  },
};

export function outlookIssueCopy(type: string, requiresDecision = true) {
  if (Object.hasOwn(issueDescriptions, type)) return issueDescriptions[type as OutlookIssueType];
  return requiresDecision
    ? { title: "Zmiana w kalendarzu do sprawdzenia", description: "Outlook zgłosił zmianę, która wymaga Twojej decyzji." }
    : { title: "Informacja z kalendarza", description: "Outlook zgłosił zmianę. Nie wymaga ona Twojej decyzji." };
}

export async function getOutlookIssues(signal?: AbortSignal) {
  return normalizeOutlookIssues(await backendGet<unknown>("outlook/issues", undefined, signal));
}

export function ignoreOutlookIssue(externalCalendarEventId: number, message: string | null) {
  return backendPost<unknown>("outlook/issues/ignore", { externalCalendarEventId, message });
}

// The backend settles package entries for the converted session itself.
export function convertImportedEventToSession(externalCalendarEventId: number) {
  return backendPost<unknown>(`outlook/imported-events/${externalCalendarEventId}/convert-to-session`, {});
}
