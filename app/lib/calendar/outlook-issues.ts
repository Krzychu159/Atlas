import { backendGet, backendPost } from "@/app/lib/backend";

export type OutlookIssueType =
  | "CompletedSessionDeletedInOutlook"
  | "CompletedSessionAttendeeRemovedInOutlook"
  | "StartedSessionDeletedInOutlook"
  | "PastEventNeedsReview";

export type OutlookIssue = {
  type: string;
  externalCalendarEventId: number | null;
  sessionId: number | null;
  title: string | null;
  message: string | null;
  startAt: string | null;
  trainerId: number | null;
  trainerFullName: string | null;
};

export type OutlookIssueAction = "correct-session" | "open-session" | "convert" | null;

// The issues response has no documented schema; read only the fields the CRM acts on.
function readNumber(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : null;
}

function readText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function normalizeOutlookIssues(value: unknown): OutlookIssue[] {
  const items = Array.isArray(value) ? value : value && typeof value === "object" && Array.isArray((value as { items?: unknown }).items) ? (value as { items: unknown[] }).items : [];
  return items.flatMap(item => {
    if (!item || typeof item !== "object") return [];
    const raw = item as Record<string, unknown>;
    const type = readText(raw.type) ?? readText(raw.issueType);
    if (!type) return [];
    return [{
      type,
      externalCalendarEventId: readNumber(raw.externalCalendarEventId),
      sessionId: readNumber(raw.sessionId),
      title: readText(raw.title) ?? readText(raw.subject),
      message: readText(raw.message),
      startAt: readText(raw.startAt),
      trainerId: readNumber(raw.trainerId),
      trainerFullName: readText(raw.trainerFullName) ?? readText(raw.trainerName),
    }];
  });
}

export function outlookIssueAction(issue: Pick<OutlookIssue, "type" | "sessionId" | "externalCalendarEventId">): OutlookIssueAction {
  if ((issue.type === "CompletedSessionDeletedInOutlook" || issue.type === "CompletedSessionAttendeeRemovedInOutlook") && issue.sessionId) return "correct-session";
  if (issue.type === "StartedSessionDeletedInOutlook" && issue.sessionId) return "open-session";
  if (issue.type === "PastEventNeedsReview" && issue.externalCalendarEventId) return "convert";
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

export function outlookIssueCopy(type: string) {
  return Object.hasOwn(issueDescriptions, type)
    ? issueDescriptions[type as OutlookIssueType]
    : { title: "Zmiana w kalendarzu do sprawdzenia", description: "Outlook zgłosił zmianę, która wymaga Twojej decyzji." };
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
