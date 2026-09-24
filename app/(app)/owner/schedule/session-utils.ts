import type { Location } from "@/app/lib/owner/locations";
import type {
  OwnerSession,
  SessionParticipantPayload,
  SessionPayload,
} from "@/app/lib/owner/sessions";
import type { Trainer } from "@/app/lib/owner/trainers";
import { completeSession, updateSession } from "@/app/lib/owner/sessions";
import { getOwnerSessionPackageName } from "../components/session-display";
import { toDateTimeLocalValue } from "./date-utils";
import type { SessionFormValues, SessionStatusFilter } from "./types";

export function generatePublicSessionSlug(title: string, startAt: string) {
  const name = title.toLowerCase().replace(/ł/g, "l").normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return name && startAt ? `${name}-${startAt.slice(0, 16).replace(/[T:]/g, "-")}` : "";
}

function publicDateTime(value: string) {
  if (!/(?:Z|[+-]\d{2}:?\d{2})$/i.test(value)) return value.slice(0, 16);
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Warsaw", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).format(new Date(value)).replace(" ", "T");
}

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
  defaultTrainerId,
}: {
  session: OwnerSession | null;
  date: Date;
  trainers: Trainer[];
  locations: Location[];
  defaultTrainerId?: number | null;
}): SessionFormValues {
  if (session) {
    return {
      isPubliclyBookable: session.isPubliclyBookable ?? false,
      publicCapacity: session.publicCapacity == null ? "" : String(session.publicCapacity),
      publicSlug: session.publicSlug || "",
      participantsEdited: false,
      title: session.title || "",
      startAt: session.isPubliclyBookable ? publicDateTime(session.startAt) : toDateTimeLocalValue(new Date(session.startAt)),
      endAt: session.isPubliclyBookable ? publicDateTime(session.endAt) : toDateTimeLocalValue(new Date(session.endAt)),
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
  const defaultTrainer = trainers.find(
    (trainer) => trainer.id === defaultTrainerId,
  );

  return {
    isPubliclyBookable: false,
    publicCapacity: "",
    publicSlug: "",
    participantsEdited: false,
    title: "",
    startAt: toDateTimeLocalValue(start),
    endAt: toDateTimeLocalValue(end),
    trainerId: defaultTrainer?.id
      ? String(defaultTrainer.id)
      : trainers[0]?.id
        ? String(trainers[0].id)
        : "",
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

  const preservePublicParticipants = Boolean(session &&
    (session.isPubliclyBookable || values.isPubliclyBookable) && !values.participantsEdited);
  if (session?.status !== "Completed" && !values.isPubliclyBookable && !preservePublicParticipants && !values.participantIds.length) {
    throw new Error("Wybierz przynajmniej jednego klienta.");
  }

  if (!Number.isFinite(new Date(values.startAt).getTime()) || !Number.isFinite(new Date(values.endAt).getTime())) {
    throw new Error("Podaj poprawną datę i godzinę sesji.");
  }
  const startAt = values.isPubliclyBookable ? `${values.startAt.slice(0, 16)}:00` : new Date(values.startAt).toISOString();
  const endAt = values.isPubliclyBookable ? `${values.endAt.slice(0, 16)}:00` : new Date(values.endAt).toISOString();

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

  if (values.isPubliclyBookable) {
    if (!values.title.trim()) throw new Error("Podaj tytuł publicznych zajęć.");
    const capacity = Number(values.publicCapacity);
    if (!Number.isInteger(capacity) || capacity <= 0) throw new Error("Limit miejsc musi być dodatnią liczbą całkowitą.");
    const slug = values.publicSlug.trim();
    if (!slug) throw new Error("Podaj publiczny slug.");
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error("Slug może zawierać małe litery a–z, cyfry i pojedyncze myślniki.");
    payload.isPubliclyBookable = true;
    payload.plannedSessionType = "Group";
    payload.status = values.status || "Planned";
    payload.publicCapacity = capacity;
    payload.publicSlug = slug;
  } else if (session?.isPubliclyBookable) {
    payload.isPubliclyBookable = false;
  }

  const outlookCategories = values.outlookCategories
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  if (outlookCategories.length > 0 || values.isPubliclyBookable) {
    payload.outlookCategories = outlookCategories;
  }

  if (!preservePublicParticipants) {
    payload.participants = values.participantIds.map((clientId) =>
      getParticipantPayload(Number(clientId), session),
    );
  }

  return payload;
}

export async function correctCompletedSession(session: OwnerSession, values: SessionFormValues) {
  const correctionReason = values.correctionReason?.trim();
  if (!correctionReason) throw new Error("Podaj powód korekty.");
  if (!["Completed", "Planned", "Cancelled"].includes(values.status)) {
    throw new Error("Wybierz status: Zrealizowana, Zaplanowana lub Anulowana.");
  }
  if (!session.participants) throw new Error("Odśwież szczegóły sesji przed korektą uczestników.");
  const payload = toSessionPayload(values, session);
  const participantsChanged = values.participantIds.length !== session.participants.length ||
    session.participants.some((participant) => !values.participantIds.includes(String(participant.clientId)));
  const actualSessionType = (values.actualSessionType ?? session.actualSessionType ?? session.plannedSessionType ?? "").trim();
  const typeChanged = actualSessionType !== (session.actualSessionType || session.plannedSessionType || "");
  if (values.status === "Completed" && (participantsChanged || typeChanged)) {
    const initial = getDefaultFormValues({ session, date: new Date(session.startAt), trainers: [], locations: [] });
    const initialPayload = toSessionPayload(initial, session);
    const metadataKeys = [...new Set([...Object.keys(payload), ...Object.keys(initialPayload)])]
      .filter((key) => key !== "participants") as (keyof SessionPayload)[];
    if (metadataKeys.some((key) => JSON.stringify(payload[key]) !== JSON.stringify(initialPayload[key]))) {
      throw new Error("Zapisz korektę uczestników lub typu rozliczenia osobno od zmian pozostałych danych sesji.");
    }
    if (!actualSessionType) throw new Error("Podaj typ rozliczenia sesji.");
    await completeSession(session.id, {
      actualSessionType,
      correctionReason,
      participants: values.participantIds.map((id) => {
        const existing = session.participants!.find((participant) => participant.clientId === Number(id));
        return {
          ...getParticipantPayload(Number(id), session),
          attendanceStatus: existing?.attendanceStatus || "Present",
        };
      }),
    });
  } else {
    // Completed metadata edits must never replace the billed participant list.
    if (values.status === "Completed") delete payload.participants;
    await updateSession(session.id, { ...payload, correctionReason });
  }
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
