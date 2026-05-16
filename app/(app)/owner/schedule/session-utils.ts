import type { Location } from "@/app/lib/owner/locations";
import type {
  OwnerSession,
  SessionParticipantPayload,
  SessionPayload,
} from "@/app/lib/owner/sessions";
import type { Trainer } from "@/app/lib/owner/trainers";
import { getOwnerSessionPackageName } from "../components/session-display";
import { toDateTimeLocalValue } from "./date-utils";
import type { SessionFormValues, SessionStatusFilter } from "./types";

export function sortSessions(sessions: OwnerSession[]) {
  return [...sessions].sort(
    (first, second) =>
      new Date(first.startAt).getTime() - new Date(second.startAt).getTime(),
  );
}

export function getSessionType(session: OwnerSession) {
  return (
    session.actualSessionType ||
    session.plannedSessionType ||
    session.primaryOutlookCategory ||
    "Sesja"
  );
}

export function getSessionTitle(session: OwnerSession) {
  return session.title || getSessionType(session);
}

export function getSessionStatusLabel(status?: string | null) {
  const normalized = (status || "").toLowerCase();

  if (normalized.includes("cancel")) return "Anulowana";
  if (normalized.includes("complete") || normalized.includes("done")) {
    return "Zrealizowana";
  }
  if (normalized.includes("active")) return "Aktywna";

  return "Zaplanowana";
}

export function getParticipantsLabel(session: OwnerSession) {
  const count =
    session.actualParticipantsCount ??
    session.participantsCount ??
    session.participants?.length ??
    0;

  if (session.locationLimit) return `${count}/${session.locationLimit}`;

  return `${count}`;
}

export function isCancelledSession(session: OwnerSession) {
  return (session.status || "").toLowerCase().includes("cancel");
}

export function matchesStatusFilter(
  session: OwnerSession,
  statusFilter: SessionStatusFilter,
) {
  const normalizedStatus = (session.status || "").toLowerCase();

  if (statusFilter === "all") return true;
  if (statusFilter === "without-cancelled") return !isCancelledSession(session);
  if (statusFilter === "Cancelled") return isCancelledSession(session);
  if (statusFilter === "Completed") {
    return (
      normalizedStatus.includes("complete") || normalizedStatus.includes("done")
    );
  }

  return normalizedStatus.includes(statusFilter.toLowerCase());
}

export const getSessionPackageName = getOwnerSessionPackageName;

function getSessionTone(session: OwnerSession) {
  const status = (session.status || "").toLowerCase();

  if (status.includes("cancel")) return "danger";
  if (status.includes("complete") || status.includes("done")) return "success";
  if (status.includes("progress") || status.includes("active")) {
    return "primary";
  }

  return "neutral";
}

export function getToneClasses(session: OwnerSession) {
  const tone = getSessionTone(session);

  if (tone === "danger") {
    return "border-error/25 bg-error-container/20";
  }

  if (tone === "success") {
    return "border-tertiary/25 bg-tertiary-container/20";
  }

  if (tone === "primary") {
    return "border-primary/35 bg-primary/15";
  }

  return "border-white/8 bg-surface-container-low";
}

export function getDefaultFormValues({
  session,
  date,
  trainers,
  locations,
}: {
  session: OwnerSession | null;
  date: Date;
  trainers: Trainer[];
  locations: Location[];
}): SessionFormValues {
  if (session) {
    return {
      title: session.title || "",
      startAt: toDateTimeLocalValue(new Date(session.startAt)),
      endAt: toDateTimeLocalValue(new Date(session.endAt)),
      trainerId: String(session.trainerId || ""),
      locationId: String(session.locationId || ""),
      status: session.status || "",
      plannedSessionType: session.plannedSessionType || "",
      outlookCategories: session.outlookCategories?.join(", ") || "",
      participantIds:
        session.participants
          ?.map((participant) => String(participant.clientId))
          .filter(Boolean) || [],
      note: session.note || "",
    };
  }

  const start = new Date(date);
  start.setHours(10, 0, 0, 0);
  const end = new Date(start);
  end.setHours(start.getHours() + 1);

  return {
    title: "",
    startAt: toDateTimeLocalValue(start),
    endAt: toDateTimeLocalValue(end),
    trainerId: trainers[0]?.id ? String(trainers[0].id) : "",
    locationId: locations[0]?.id ? String(locations[0].id) : "",
    status: "",
    plannedSessionType: "",
    outlookCategories: "",
    participantIds: [],
    note: "",
  };
}

export function toSessionPayload(
  values: SessionFormValues,
  session: OwnerSession | null,
): SessionPayload {
  const trainerId = Number(values.trainerId);
  const locationId = Number(values.locationId);

  if (!trainerId) throw new Error("Wybierz trenera.");
  if (!locationId) throw new Error("Wybierz lokalizację.");
  if (!values.startAt || !values.endAt) {
    throw new Error("Uzupełnij czas sesji.");
  }

  if (!values.participantIds.length) {
    throw new Error("Wybierz przynajmniej jednego klienta.");
  }

  const startAt = new Date(values.startAt).toISOString();
  const endAt = new Date(values.endAt).toISOString();

  if (new Date(endAt).getTime() <= new Date(startAt).getTime()) {
    throw new Error("Koniec sesji musi być później niż start.");
  }

  const payload: SessionPayload = {
    title: values.title.trim() || null,
    note: values.note.trim() || null,
    startAt,
    endAt,
    trainerId,
    locationId,
  };

  if (values.status) {
    payload.status = values.status;
  }

  if (values.plannedSessionType) {
    payload.plannedSessionType = values.plannedSessionType;
  }

  const outlookCategories = values.outlookCategories
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  if (outlookCategories.length > 0) {
    payload.outlookCategories = outlookCategories;
  }

  payload.participants = values.participantIds.map((clientId) =>
    getParticipantPayload(Number(clientId), session),
  );

  return payload;
}

function getParticipantPayload(
  clientId: number,
  session: OwnerSession | null,
): SessionParticipantPayload {
  const existing = session?.participants?.find(
    (participant) => participant.clientId === clientId,
  );

  return {
    clientId,
    countsAgainstPackage: existing?.countsAgainstPackage ?? true,
    sessionsCharged: existing?.sessionsCharged ?? 1,
    note: existing?.note ?? null,
  };
}
