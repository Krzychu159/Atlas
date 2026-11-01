import { ApiError, getErrorMessage } from "../backend";
import type { CreateTrainerClientPayload } from "./portal";

export type TrainerClientForm = {
  firstName: string;
  lastName: string;
  locationId: string;
  email: string;
  phoneNumber: string;
  goal: string;
  notes: string;
  trainingStartDate: string;
};

export type TrainerClientFieldErrors = Partial<Record<"firstName" | "lastName" | "locationId" | "email", string>>;

export const emptyTrainerClientForm: TrainerClientForm = {
  firstName: "",
  lastName: "",
  locationId: "",
  email: "",
  phoneNumber: "",
  goal: "",
  notes: "",
  trainingStartDate: "",
};

export const TRAINER_CLIENT_FIX_FIELDS = "Popraw zaznaczone pola.";
const FIRST_NAME_REQUIRED = "Podaj imię klienta.";
const LAST_NAME_REQUIRED = "Podaj nazwisko klienta.";
const LOCATION_REQUIRED = "Wybierz lokalizację klienta.";
const LOCATION_NOT_ALLOWED = "Klienta możesz dodać tylko w lokalizacji, w której pracujesz.";
const EMAIL_INVALID = "Podaj poprawny adres e-mail albo zostaw to pole puste.";
const CREATE_FALLBACK = "Nie udało się dodać klienta. Sprawdź wpisane dane i spróbuj ponownie.";

export function isValidTrainerClientEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validateTrainerClientForm(form: TrainerClientForm): TrainerClientFieldErrors {
  const email = form.email.trim();
  return {
    ...(form.firstName.trim() ? {} : { firstName: FIRST_NAME_REQUIRED }),
    ...(form.lastName.trim() ? {} : { lastName: LAST_NAME_REQUIRED }),
    ...(Number(form.locationId) > 0 ? {} : { locationId: LOCATION_REQUIRED }),
    ...(!email || isValidTrainerClientEmail(email) ? {} : { email: EMAIL_INVALID }),
  };
}

export function toCreateTrainerClientPayload(form: TrainerClientForm): CreateTrainerClientPayload {
  return {
    firstName: form.firstName.trim(),
    lastName: form.lastName.trim(),
    locationId: Number(form.locationId),
    email: form.email.trim() || null,
    phoneNumber: form.phoneNumber.trim() || null,
    goal: form.goal.trim() || null,
    notes: form.notes.trim() || null,
    trainingStartDate: form.trainingStartDate || null,
    nextSessionAt: null,
  };
}

/** Maps a failed save to Polish messages; backend text only selects the message and is never shown. */
export function trainerClientCreateError(error: unknown): { message: string; fields: TrainerClientFieldErrors } {
  if (!(error instanceof ApiError)) return { message: getErrorMessage(error, CREATE_FALLBACK), fields: {} };
  if (error.status === 401) return { message: "Sesja wygasła. Zaloguj się ponownie.", fields: {} };
  if (error.status === 403) return { message: "Nie masz uprawnień do dodawania klientów.", fields: {} };
  if (error.status === 409) return { message: "Te dane kolidują z inną kartoteką. Sprawdź listę klientów i spróbuj ponownie.", fields: {} };
  if (error.status !== 400 && error.status !== 422) return { message: CREATE_FALLBACK, fields: {} };

  const text = error.message || "";
  const fields: TrainerClientFieldErrors = {
    ...(/first\s*name|imi[eęa]/i.test(text) ? { firstName: FIRST_NAME_REQUIRED } : {}),
    ...(/last\s*name|nazwisk/i.test(text) ? { lastName: LAST_NAME_REQUIRED } : {}),
    ...(/location|lokalizacj/i.test(text) ? { locationId: LOCATION_NOT_ALLOWED } : {}),
    ...(/e-?mail/i.test(text) ? { email: EMAIL_INVALID } : {}),
  };
  if (Object.keys(fields).length) return { message: TRAINER_CLIENT_FIX_FIELDS, fields };
  if (/trainer|trener/i.test(text)) return { message: "Klienta możesz dodać tylko do swojej listy. Odśwież stronę i spróbuj ponownie.", fields: {} };
  return { message: CREATE_FALLBACK, fields: {} };
}
