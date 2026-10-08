import { ApiError, getErrorMessage } from "@/app/lib/backend";

export function trainerPaymentError(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    if (error.status === 401) return "Sesja wygasła. Zaloguj się ponownie.";
    if (error.status === 403) return "Nie masz uprawnień do przeglądania lub zmiany tych danych.";
    if (error.status === 404) return "Nie znaleziono tych danych. Odśwież widok i spróbuj ponownie.";
    if (error.status === 400 || error.status === 422) return getErrorMessage(error, "Sprawdź wpisane dane i spróbuj ponownie.");
  }
  return getErrorMessage(error, fallback);
}
