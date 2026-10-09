export type GroupBookingRules = {
  registrationClosesBeforeMinutes: number;
  cancellationClosesBeforeMinutes: number;
  registrationClosesAtUtc: string;
  cancellationClosesAtUtc: string;
  lateCancellationPolicy: string | null;
};

export type GroupSessionFields = {
  isGroupSession?: boolean;
  capacity?: number | null;
  bookedSeats?: number;
  availableSeats?: number | null;
  isFullyBooked?: boolean;
  eventRules?: string | null;
  registrationClosesBeforeMinutes?: number | null;
  cancellationClosesBeforeMinutes?: number | null;
  bookingRules?: GroupBookingRules | null;
};

export type GroupSessionSettings = {
  eventRules?: string | null;
  registrationClosesBeforeMinutes?: number | null;
  cancellationClosesBeforeMinutes?: number | null;
};

export function groupSeatsLabel(session: GroupSessionFields) {
  if (session.bookedSeats == null) return "Liczba zapisanych niedostępna";
  return session.capacity != null ? `${session.bookedSeats}/${session.capacity}` : `${session.bookedSeats} zapisanych`;
}

export function isCancelledParticipant(status?: string | null) {
  return ["cancelledintime", "cancelledlate", "cancelled"].includes((status || "").toLowerCase());
}

export function attendanceLabel(status?: string | null) {
  const labels: Record<string, string> = { booked: "Zapisany", registered: "Zapisany", present: "Obecny", attended: "Obecny", absent: "Nieobecny", noshow: "Nieobecny", excused: "Nieobecność usprawiedliwiona", cancelledintime: "Anulowano w terminie", cancelledlate: "Anulowano po terminie", cancelled: "Anulowany udział", pending: "Niepotwierdzony", unknown: "Nieokreślony", notmarked: "Nieodnotowany" };
  return labels[(status || "").toLowerCase()] || "Status uczestnictwa niedostępny";
}

export function groupDateLabel(value: string) {
  const utc = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value) ? value : `${value}Z`;
  const date = new Date(utc);
  return Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat("pl-PL", { timeZone: "Europe/Warsaw", dateStyle: "medium", timeStyle: "short" }).format(date) : "Termin niedostępny";
}
