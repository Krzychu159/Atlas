import { CONSULTATION_SESSION_TYPE, groupSeatsLabel, isConsultationSession, isGroupTraining } from "@/app/lib/group-sessions";
import { sessionTrainingType, userMessage } from "@/app/lib/user-messages";
import type { Location } from "@/app/lib/owner/locations";
import type {
  SessionParticipantPayload,
  SessionPayload,
} from "@/app/lib/owner/sessions";
import type { Trainer } from "@/app/lib/owner/trainers";
import { completeSession, updateSession } from "@/app/lib/owner/sessions";

import { toDateTimeLocalValue } from "./date-utils";
import type { CalendarSession, CorrectionMode, ParticipantCorrection, SessionEditorSession, SessionFormValues, SessionStatusFilter } from "./types";

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

export function sortSessions<TSession extends CalendarSession>(sessions: TSession[]) {
  return [...sessions].sort(
    (first, second) =>
      new Date(first.startAt).getTime() - new Date(second.startAt).getTime(),
  );
}

export function getSessionType(session: CalendarSession) {
  return sessionTrainingType(session);
}

export function getSessionTitle(session: CalendarSession) {
  return session.title || getSessionType(session);
}

export function getSessionStatusLabel(status?: string | null) {
  const labels: Record<string, string> = { planned: "Zaplanowana", active: "Aktywna", completed: "Zrealizowana", cancelled: "Anulowana" };
  return status ? labels[status.toLowerCase()] || "Status nierozpoznany" : "Status niedostępny";
}

export function getParticipantsLabel(session: CalendarSession) {
  if (isConsultationSession(session)) return "Bez klienta";
  if (isGroupTraining(session)) return groupSeatsLabel(session);
  const count = session.actualParticipantsCount ?? session.participantsCount ?? session.participants?.length;
  if (count === undefined) return "Brak danych";
  const limit = session.publicCapacity ?? session.locationLimit;
  return limit != null && limit > 0 ? count + "/" + limit : String(count);
}

export function isCancelledSession(session: CalendarSession) {
  return (session.status || "").toLowerCase() === "cancelled";
}

export function matchesStatusFilter(
  session: CalendarSession,
  statusFilter: SessionStatusFilter,
) {
  const normalizedStatus = (session.status || "").toLowerCase();

  if (statusFilter === "all") return true;
  if (statusFilter === "without-cancelled") return !isCancelledSession(session);
  if (statusFilter === "Cancelled") return isCancelledSession(session);
  if (statusFilter === "Completed") {
    return normalizedStatus === "completed";
  }

  return normalizedStatus === statusFilter.toLowerCase();
}

export function getSessionPackageName(session: CalendarSession) {
  const names = [...new Set(session.participants?.map(participant => participant.packageName?.trim()).filter((name): name is string => Boolean(name)) || [])];
  return names.length ? names.length === 1 ? names[0] : `${names[0]} +${names.length - 1}` : "Brak pakietu";
}

function getSessionTone(session: CalendarSession) {
  const status = (session.status || "").toLowerCase();

  if (status.includes("cancel")) return "danger";
  if (status.includes("complete") || status.includes("done")) return "success";
  if (status.includes("progress") || status.includes("active")) {
    return "primary";
  }

  return "neutral";
}

export function getToneClasses(session: CalendarSession) {
  const tone = getSessionTone(session);

  if (tone === "danger") {
    return "border-error/25 bg-error-container/20";
  }

  if (tone === "success") {
    return "border-tertiary/25 bg-tertiary-container/20";
  }

  if (tone === "primary") {
    return "border-info/35 bg-info/15";
  }

  return "border-white/8 bg-surface-container-low";
}

// Explicit group fields determine the displayed kind; preserve the original API value
// when the user saves without changing the kind.
export function getSessionFormType(session: SessionEditorSession) {
  if (isGroupTraining(session)) return "Group";
  return session.plannedSessionType || "";
}

export function getDefaultFormValues({
  session,
  date,
  trainers,
  locations,
  defaultTrainerId,
  startAt,
}: {
  session: SessionEditorSession | null;
  date: Date;
  trainers: Trainer[];
  locations: Location[];
  defaultTrainerId?: number | null;
  /** A time slot picked in the calendar; the session then lasts the default 60 minutes. */
  startAt?: Date | null;
}): SessionFormValues {
  if (session) {
    return {
      isPubliclyBookable: session.isPubliclyBookable ?? false,
      publicCapacity: (session.capacity ?? session.publicCapacity) == null ? "" : String(session.capacity ?? session.publicCapacity),
      publicSlug: session.publicSlug || "",
      participantsEdited: false,
      title: session.title || "",
      startAt: session.isPubliclyBookable ? publicDateTime(session.startAt) : toDateTimeLocalValue(new Date(session.startAt)),
      endAt: session.isPubliclyBookable ? publicDateTime(session.endAt) : toDateTimeLocalValue(new Date(session.endAt)),
      trainerId: String(session.trainerId || ""),
      locationId: String(session.locationId || ""),
      status: session.status || "",
      plannedSessionType: getSessionFormType(session),
      outlookCategories: session.outlookCategories?.join(", ") || "",
      participantIds:
        session.participants
          ?.map((participant) => String(participant.clientId))
          .filter(Boolean) || [],
      note: session.note || "",
      eventRules: session.eventRules || "",
      registrationClosesBeforeMinutes: String(session.registrationClosesBeforeMinutes ?? session.bookingRules?.registrationClosesBeforeMinutes ?? ""),
      cancellationClosesBeforeMinutes: String(session.cancellationClosesBeforeMinutes ?? session.bookingRules?.cancellationClosesBeforeMinutes ?? ""),
    };
  }

  const start = new Date(startAt ?? date);
  if (!startAt) start.setHours(10, 0, 0, 0);
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
    eventRules: "",
    registrationClosesBeforeMinutes: "30",
    cancellationClosesBeforeMinutes: "720",
  };
}

export function toSessionPayload(
  values: SessionFormValues,
  session: SessionEditorSession | null,
): SessionPayload {
  const trainerId = Number(values.trainerId);
  const locationId = Number(values.locationId);

  if (!trainerId) throw new Error("Wybierz trenera.");
  if (!locationId) throw new Error("Wybierz lokalizację.");
  if (!values.startAt || !values.endAt) {
    throw new Error("Uzupełnij czas sesji.");
  }

  const consultation = isConsultationForm(values);
  if (consultation && session?.status === "Completed" && session.participants?.length && !isConsultationSession(session)) {
    throw new Error("Zrealizowanych zajęć z klientami nie można zmienić na konsultację.");
  }
  const preserveParticipants = Boolean(session && !values.participantsEdited);
  const isGroupForm = !consultation && isGroupTraining({ ...session, isPubliclyBookable: values.isPubliclyBookable, plannedSessionType: values.plannedSessionType });
  if (isGroupForm && (!session ? values.participantIds.length > 0 : values.participantsEdited)) {
    throw new Error("Zapis na zajęcia grupowe potwierdź w zgłoszeniach po opłaceniu odpowiedniego pakietu.");
  }
  if (session?.status !== "Completed" && !consultation && !isGroupForm && !preserveParticipants && !values.participantIds.length) {
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

  if (isGroupForm) {
    if (!session || values.eventRules !== (session.eventRules || "")) payload.eventRules = values.eventRules.trim();
    for (const key of ["registrationClosesBeforeMinutes", "cancellationClosesBeforeMinutes"] as const) {
      const initial = session ? String(session[key] ?? session.bookingRules?.[key] ?? "") : "";
      if (values[key] === initial || !values[key].trim()) continue;
      const minutes = Number(values[key]);
      if (!Number.isInteger(minutes) || minutes < 0 || minutes > 525600) throw new Error("Termin musi wynosić od 0 do 525600 minut.");
      payload[key] = minutes;
    }
    const initialCapacity = session ? String(session.capacity ?? session.publicCapacity ?? "") : "";
    if (values.publicCapacity !== initialCapacity) {
      const capacity = Number(values.publicCapacity);
      if (values.publicCapacity.trim() && (!Number.isInteger(capacity) || capacity <= 0)) throw new Error("Limit miejsc musi być dodatnią liczbą całkowitą.");
      payload.publicCapacity = values.publicCapacity.trim() ? capacity : null;
    }
  }

  if (values.status) {
    payload.status = values.status;
  }

  if (values.plannedSessionType) {
    payload.plannedSessionType = session && values.plannedSessionType === getSessionFormType(session)
      ? session.plannedSessionType || undefined
      : values.plannedSessionType;
  }

  if (values.isPubliclyBookable) {
    if (!values.title.trim()) throw new Error("Podaj tytuł publicznych zajęć.");
    const capacity = Number(values.publicCapacity);
    if (!Number.isInteger(capacity) || capacity <= 0) throw new Error("Limit miejsc musi być dodatnią liczbą całkowitą.");
    const slug = values.publicSlug.trim();
    if (!slug) throw new Error("Podaj końcówkę linku.");
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error("Końcówka linku może zawierać małe litery a–z, cyfry i pojedyncze myślniki.");
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

  if (!preserveParticipants) {
    payload.participants = values.participantIds.map((clientId) =>
      getParticipantPayload(Number(clientId), session),
    );
  }

  // The backend rejects consultations with participants or public booking (400).
  if (consultation) {
    payload.plannedSessionType = CONSULTATION_SESSION_TYPE;
    payload.isPubliclyBookable = false;
    delete payload.publicSlug;
    delete payload.publicCapacity;
    payload.participants = [];
  }

  return payload;
}

export function isConsultationForm(values: Pick<SessionFormValues, "plannedSessionType">) {
  return values.plannedSessionType === CONSULTATION_SESSION_TYPE;
}

// Manual completion of a planned consultation: the backend sets the Consultation type and rejects participants.
export function completeConsultation(
  sessionId: number,
  complete: (id: number, payload: Parameters<typeof completeSession>[1]) => Promise<unknown> = completeSession,
) {
  return complete(sessionId, { participants: [] });
}

export const PRESENT_ATTENDANCE = "Present";

// Present and Absent are the attendance values the CRM sends; other stored values are kept as they are.
export const attendanceCorrectionOptions = [
  { value: PRESENT_ATTENDANCE, label: "Obecny" },
  { value: "Absent", label: "Nieobecny" },
];

type CorrectionSession = Pick<SessionEditorSession, "participants">;

export function getParticipantCorrection(clientId: string, session: CorrectionSession, values: Pick<SessionFormValues, "participantCorrections">): ParticipantCorrection {
  const edited = values.participantCorrections?.[clientId];
  if (edited) return edited;
  const existing = session.participants?.find(participant => String(participant.clientId) === clientId);
  return {
    attendanceStatus: existing?.attendanceStatus || PRESENT_ATTENDANCE,
    countsAgainstPackage: existing?.countsAgainstPackage ?? true,
    sessionsCharged: String(existing?.sessionsCharged ?? 1),
  };
}

// The backend takes an entry only from a present participant counted against a package.
export function chargesPackageEntry(correction: Pick<ParticipantCorrection, "attendanceStatus" | "countsAgainstPackage">) {
  return correction.attendanceStatus === PRESENT_ATTENDANCE && correction.countsAgainstPackage;
}

export function buildCorrectionParticipants(session: CorrectionSession, values: Pick<SessionFormValues, "participantIds" | "participantCorrections">) {
  return values.participantIds.map(id => {
    const correction = getParticipantCorrection(id, session, values);
    const sessionsCharged = Number(correction.sessionsCharged);
    if (!Number.isInteger(sessionsCharged) || sessionsCharged < 0 || sessionsCharged > 100) throw new Error("Liczba wejść musi być liczbą całkowitą od 0 do 100.");
    if (values.participantCorrections?.[id] && chargesPackageEntry(correction) && sessionsCharged === 0) throw new Error("Obecny uczestnik rozliczany z pakietu musi mieć co najmniej 1 wejście.");
    const existing = session.participants?.find(participant => String(participant.clientId) === id);
    return {
      clientId: Number(id),
      attendanceStatus: correction.attendanceStatus,
      countsAgainstPackage: correction.countsAgainstPackage,
      sessionsCharged,
      note: existing?.note ?? null,
    };
  });
}

export function correctionParticipantsChanged(session: CorrectionSession, values: Pick<SessionFormValues, "participantIds" | "participantCorrections">) {
  const current = session.participants ?? [];
  if (values.participantIds.length !== current.length || current.some(participant => !values.participantIds.includes(String(participant.clientId)))) return true;
  return current.some(participant => {
    const correction = getParticipantCorrection(String(participant.clientId), session, values);
    return correction.attendanceStatus !== (participant.attendanceStatus || PRESENT_ATTENDANCE)
      || correction.countsAgainstPackage !== participant.countsAgainstPackage
      || Number(correction.sessionsCharged) !== participant.sessionsCharged;
  });
}

// Without an explicit choice the mode follows what the owner changed.
export function resolveCorrectionMode(session: SessionEditorSession, values: SessionFormValues): CorrectionMode {
  if (values.correctionMode) return values.correctionMode;
  if (values.status !== "Completed") return "not-held";
  const actualSessionType = (values.actualSessionType ?? session.actualSessionType ?? session.plannedSessionType ?? "").trim();
  const typeChanged = actualSessionType !== (session.actualSessionType || session.plannedSessionType || "");
  return typeChanged || correctionParticipantsChanged(session, values) ? "participants" : "details";
}

export async function correctCompletedSession(session: SessionEditorSession, values: SessionFormValues, complete: (id: number, payload: Parameters<typeof completeSession>[1]) => Promise<unknown> = completeSession) {
  const correctionReason = values.correctionReason?.trim();
  if (!correctionReason) throw new Error("Podaj powód korekty.");
  if (correctionReason.length > 500) throw new Error("Powód korekty może mieć maksymalnie 500 znaków.");
  if (!session.participants && isConsultationSession(session)) session = { ...session, participants: [] };
  if (!session.participants) throw new Error("Odśwież szczegóły sesji przed korektą uczestników.");
  const mode = resolveCorrectionMode(session, values);

  if (mode === "participants") {
    const initial = getDefaultFormValues({ session, date: new Date(session.startAt), trainers: [], locations: [] });
    const payload = toSessionPayload({ ...values, status: "Completed", participantsEdited: false }, session);
    const initialPayload = toSessionPayload(initial, session);
    const metadataKeys = [...new Set([...Object.keys(payload), ...Object.keys(initialPayload)])]
      .filter((key) => key !== "participants") as (keyof SessionPayload)[];
    if (metadataKeys.some((key) => JSON.stringify(payload[key]) !== JSON.stringify(initialPayload[key]))) {
      throw new Error("Zapisz korektę uczestników lub typu rozliczenia osobno od zmian pozostałych danych sesji.");
    }
    const actualSessionType = (values.actualSessionType ?? session.actualSessionType ?? session.plannedSessionType ?? "").trim();
    if (!actualSessionType) throw new Error("Podaj typ rozliczenia sesji.");
    if (values.correctionMode && !correctionParticipantsChanged(session, values) && actualSessionType === (session.actualSessionType || session.plannedSessionType || "")) {
      throw new Error("Nie wprowadzono zmian w uczestnikach, obecności ani typie rozliczenia.");
    }
    // The backend replaces the whole list: a client left out is removed and gets the entry back.
    await complete(session.id, {
      actualSessionType,
      correctionReason,
      participants: isConsultationSession({ ...session, actualSessionType }) ? [] : buildCorrectionParticipants(session, values),
    });
    return mode;
  }

  if (mode === "not-held") {
    if (values.status !== "Cancelled" && values.status !== "Planned") throw new Error("Wybierz, czy sesję anulować, czy przywrócić do zaplanowanych.");
    if (correctionParticipantsChanged(session, values)) throw new Error("Zapisz zmianę uczestników osobno od zmiany statusu sesji.");
  }
  const payload = toSessionPayload(mode === "details" ? { ...values, status: "Completed" } : values, session);
  // Corrections through the session form never replace the billed participant list.
  delete payload.participants;
  await updateSession(session.id, { ...payload, correctionReason });
  return mode;
}

function getParticipantPayload(
  clientId: number,
  session: SessionEditorSession | null,
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

// changeType has no documented values, so only recognisable parts of the name are translated.
export function correctionChangeLabel(changeType: string | null | undefined) {
  const value = (changeType || "").toLowerCase();
  const labels: [RegExp, string][] = [
    [/cancel/, "Sesja oznaczona jako nieodbyta"],
    [/restor|planned|reopen/, "Przywrócenie sesji do zaplanowanych"],
    [/participant|attendance|attendee/, "Zmiana uczestników lub obecności"],
    [/type|billing/, "Zmiana typu rozliczenia"],
    [/trainer/, "Zmiana trenera"],
    [/location/, "Zmiana lokalizacji"],
    [/time|date|reschedul|term/, "Zmiana terminu"],
  ];
  return labels.find(([pattern]) => pattern.test(value))?.[1] ?? "Korekta sesji";
}

// Known reasons why the backend refuses a correction; the form keeps the entered data.
export function correctionErrorMessage(error: unknown) {
  const message = error && typeof error === "object" && typeof (error as { message?: unknown }).message === "string" ? (error as { message: string }).message : "";
  const text = message.toLowerCase();
  if (/settlement|rozliczeni/.test(text) && /paid|wypłac/.test(text)) return "Rozliczenie trenera za ten okres jest już wypłacone, więc tej sesji nie można przeliczyć. Sprawdź rozliczenie trenera, zanim poprawisz sesję.";
  if (/(next|later|subsequent|newer|kolejn|następn).*(package|pakiet)|(package|pakiet).*(next|later|subsequent|newer|kolejn|następn)/.test(text)) return "Klient korzysta już z kolejnego pakietu, więc wejścia z tej sesji nie można przenieść. Skontaktuj się z klientem i rozlicz zmianę ręcznie.";
  if (/(package|pakiet).*(closed|zamkni)|(closed|zamkni).*(package|pakiet)/.test(text)) return "Pakiet klienta jest zamknięty, więc nie można zmienić wejść z tej sesji.";
  if (/archiv|archiw/.test(text)) return "Klient jest w archiwum. Przywróć go, aby zmienić jego udział w tej sesji.";
  return userMessage(message, "Nie udało się zapisać korekty. Sprawdź dane i spróbuj ponownie.");
}
