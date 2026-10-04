const knownMessages: Record<string, string> = {
  "current terms for this location must be accepted before continuing": "Przed kontynuowaniem zaakceptuj aktualny regulamin studia.",
  "client profile not found": "Nie znaleziono Twojego profilu klienta. Skontaktuj się ze studiem.",
  "invalid credentials": "Nieprawidłowy e-mail lub hasło. Sprawdź dane i spróbuj ponownie.",
  "invalid email or password": "Nieprawidłowy e-mail lub hasło. Sprawdź dane i spróbuj ponownie.",
  "email is not verified": "Potwierdź adres e-mail, aby kontynuować. Otwórz link z wiadomości od studia.",
};

// Formats display text only. Keep the original error and payload for existing error handling.
export function userMessage(value: unknown, fallback = "Nie udało się wykonać tej czynności. Spróbuj ponownie."): string {
  if (typeof value !== "string" || !value.trim()) return fallback;
  const message = value.trim();
  const normalized = message.toLowerCase().replace(/[.!]+$/, "");
  if (Object.hasOwn(knownMessages, normalized)) return knownMessages[normalized];
  if (/^(?:failed to fetch|fetch failed|network error|networkerror.*|load failed)$/.test(normalized)) {
    return "Nie udało się połączyć ze studiem. Sprawdź połączenie z internetem i spróbuj ponownie.";
  }
  if (/\b(?:failed|failure|unable|invalid|exception|error|not found|does not exist|expired|required|must|cannot|could not|not allowed|not configured)\b/i.test(message)) return fallback;
  if (message.length > 500 || /(?:<[^>]+>|\[object Object\]|[{}]|backend|frontend|endpoint|\b(?:request|response|API|DTO|JSON|HTTP|enum|exception|stack trace)\b|rekord|encj[aię]|\bat \S+\()/i.test(message)) return fallback;
  // Unknown English and diagnostic messages get a safe fallback, without guessing the cause.
  return /[ąćęłńóśźż]|\b(?:nie|brak|ten|ta|pakiet|klient|trener|konto|dane|wybierz|podaj|sprawdź|zapisz|masz|jest|został|została|zostały|płatność|sesja|regulamin|zdjęcie|hasło)\b/i.test(message) ? message : fallback;
}

export function userStatus(value: string | null | undefined, fallback = "Status niedostępny") {
  const labels: Record<string, string> = {
    Planned: "Zaplanowany", Completed: "Zrealizowany", Cancelled: "Anulowany",
    Confirmed: "Potwierdzony", Active: "Aktywny", Paid: "Opłacony", Unpaid: "Nieopłacony",
    Pending: "Oczekuje", PendingConfirmation: "Oczekuje na potwierdzenie",
    Rejected: "Odrzucony", Reversed: "Cofnięty",
    Closed: "Zamknięty", Exhausted: "Wykorzystany", Expired: "Wygasły",
    PartiallyPaid: "Częściowo opłacony", RefundPending: "Zwrot oczekuje",
    RefundConfirmed: "Zwrot potwierdzony",
  };
  return value ? (Object.hasOwn(labels, value) ? labels[value] : userMessage(value, "Status niedostępny")) : fallback;
}

export function userTrainingType(value: string | null | undefined, fallback = "Typ treningu niedostępny") {
  const labels: Record<string, string> = {
    PersonalTraining: "Trening personalny", DuoTraining: "Trening 2:1",
    GroupTraining: "Trening grupowy", Consultation: "Konsultacja",
    Group: "Trening grupowy", TwoToOne: "Trening 2:1",
  };
  return value ? (Object.hasOwn(labels, value) ? labels[value] : userMessage(value, fallback)) : fallback;
}
