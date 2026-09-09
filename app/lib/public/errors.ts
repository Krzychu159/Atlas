import { getErrorMessage } from "../backend";

export function publicErrorMessage(error: unknown) {
  const message = getErrorMessage(error, "Nie udało się połączyć ze studiem. Spróbuj ponownie.");
  const normalized = message.toLowerCase();
  const translations: [RegExp, string][] = [
    [/email.*(?:exist|taken|registered)/, "Ten e-mail jest już używany. Zaloguj się lub odzyskaj hasło."],
    [/(?:fully booked|no (?:available )?seats|capacity.*reached)/, "Brak wolnych miejsc. Wybierz inne zajęcia."],
    [/(?:already booked|already registered|already.*participant)/, "Masz już rezerwację na te zajęcia."],
    [/(?:wrong location|location.*(?:match|different)|different.*location)/, "Pakiet musi być przypisany do tej samej lokalizacji co zajęcia."],
    [/(?:no.*remaining.*entr|no.*entr.*left|insufficient.*entr)/, "W pakiecie nie ma już wolnych wejść. Wybierz nowy pakiet."],
    [/(?:no.*paid.*package|paid.*package.*required|no.*active.*package|unpaid)/, "Potrzebujesz aktywnego, opłaconego pakietu grupowego. Wybierz pakiet lub poczekaj na potwierdzenie wpłaty."],
    [/(?:past|already started|not.*future)/, "Nie można zapisać się na zajęcia, które już się rozpoczęły."],
    [/package.*not found/, "Ten pakiet nie jest już dostępny. Odśwież listę pakietów."],
    [/(?:invalid.*credentials|invalid.*password|incorrect.*password)/, "Nieprawidłowy e-mail lub hasło."],
    [/(?:failed to fetch|network|fetch failed)/, "Nie udało się połączyć ze studiem. Sprawdź połączenie i spróbuj ponownie."],
  ];
  for (const [pattern, translation] of translations) if (pattern.test(normalized)) return translation;
  if (message.length > 500 || /(?:<html|<!doctype|<body|\[object Object\]|stack trace|exception|\bat \S+\()/i.test(message)) {
    return "Wystąpił błąd po stronie studia. Spróbuj ponownie za chwilę.";
  }
  return message;
}
