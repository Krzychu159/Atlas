import { ApiError } from "../backend";
import { trainerPaymentError } from "./payment-errors";

export const TRAINER_SERIES_ONLY_INDIVIDUAL =
  "Serie możesz tworzyć z treningów indywidualnych i semi. Zajęcia grupowe i zajęcia z publicznym zapisem planuje właściciel studia.";
export const TRAINER_SERIES_OUTLOOK_REQUIRED =
  "Seria nie powstała, bo nie udało się zapisać jej w Twoim kalendarzu Outlook. Podłącz Outlook w ustawieniach i spróbuj ponownie.";

const GROUP_CATEGORY = "zajęcia grupowe";

/** Returns a Polish reason why the trainer cannot create this series, or null when it is allowed. */
export function trainerSeriesBlocker(values: { plannedSessionType?: string | null; isPubliclyBookable?: boolean; outlookCategories?: string | string[] }) {
  const categories = Array.isArray(values.outlookCategories)
    ? values.outlookCategories
    : (values.outlookCategories ?? "").split(",");
  if (values.isPubliclyBookable || values.plannedSessionType === "Group") return TRAINER_SERIES_ONLY_INDIVIDUAL;
  if (categories.some(category => category.trim().toLocaleLowerCase("pl-PL") === GROUP_CATEGORY)) {
    return "Usuń kategorię Outlook „Zajęcia grupowe”. Serie trenera mogą obejmować tylko treningi indywidualne i semi.";
  }
  return null;
}

/** Maps series errors from the trainer portal to product messages without exposing raw backend text. */
export function trainerSeriesError(error: unknown, fallback: string) {
  if (error instanceof ApiError && error.status === 400) {
    const message = error.message || "";
    if (/outlook/i.test(message)) return TRAINER_SERIES_OUTLOOK_REQUIRED;
    if (/individual or semi|group|public/i.test(message)) return TRAINER_SERIES_ONLY_INDIVIDUAL;
    if (/location/i.test(message)) return "Wybierz lokalizację, w której prowadzisz zajęcia.";
    if (/client|participant/i.test(message)) return "Do serii możesz dodać tylko swoich klientów.";
    if (/collision|conflict|overlap|busy/i.test(message)) return "Któryś termin z serii koliduje z innymi zajęciami. Zmień godzinę lub dni i spróbuj ponownie.";
    if (/occurrence|interval|recurrence|end ?date/i.test(message)) return "Sprawdź ustawienia powtarzania: seria może mieć od 2 do 104 terminów, a odstęp od 1 do 12.";
  }
  if (error instanceof ApiError && error.status === 404) return "Nie znaleziono tej serii albo nie należy ona w całości do Ciebie. Odśwież grafik.";
  return trainerPaymentError(error, fallback);
}
