# Publiczny moduł zajęć grupowych ATLAS

## A. Zakres zmian

Trasy mają angielskie nazwy zgodnie z ostatnią dyspozycją:

- `/classes` — lista zajęć, lokalizacje, termin i pakiety.
- `/classes/[slug]` — szczegóły wskazane przez backendowy `publicSlug`.
- `/api/auth/public-register` — rejestracja przez BFF, z cookies httpOnly.

Nie ma osobnej aplikacji ani publicznego sidebara CRM. Teksty interfejsu pozostają polskie. Wartość `publicSlug` pozostaje zgodna z API.

Nowe pliki:

- `app/(public)/layout.tsx` — publiczny layout i metadata.
- `app/(public)/classes/page.tsx` — listing.
- `app/(public)/classes/[slug]/page.tsx` — dynamiczna trasa szczegółów.
- `app/(public)/classes/components/PublicShell.tsx` — header, footer, stan sesji, koordynacja akcji.
- `app/(public)/classes/components/GroupClassListing.tsx` — lokalizacje, daty, zapytania i stany listy.
- `app/(public)/classes/components/GroupClassDetails.tsx` — szczegóły, lokalizacja, rezerwacja, powiązane zajęcia.
- `app/(public)/classes/components/GroupCards.tsx` — karty zajęć/pakietów, statusy, CTA i stany loading/empty/error.
- `app/(public)/classes/components/PublicActionModal.tsx` — logowanie, rejestracja, potwierdzenie zakupu/zapisu/anulowania i zgłoszenie wpłaty.
- `app/lib/public/group-classes.ts` — typy DTO i integracja API.
- `app/lib/public/studio-date.ts` — formatowanie czasu studia i dat.
- `app/lib/public/errors.ts` — czytelne komunikaty, tłumaczenia typowych błędów oraz odrzucanie HTML/stack trace.
- `app/api/auth/public-register/route.ts` — serwerowy zapis istniejących cookies.
- `tests/public-group-classes.test.mjs` — testy dat, wrappera i integracji BFF.
- `tests/public-group-classes.fixture.mjs` — odizolowany backend testowy, nieimportowany przez aplikację.
- `docs/public-group-classes.md` — ten raport.

Zmodyfikowany plik istniejącego modułu: `app/api/backend/[...path]/route.ts`.
Dodano ścisłą listę publicznych odczytów GET; operacje zapisu nadal wymagają tokena. Token jest opcjonalnie przekazywany w publicznych odczytach. Po 401 publiczny GET jest ponawiany anonimowo, a wygasłe cookies są usuwane.

Nie zmieniono helpera `backend.ts`, logowania CRM, layoutu `(app)` ani istniejącego proxy routingu CRM. Wcześniejsze zmiany z tej rozmowy pozostają w katalogu roboczym.

### Endpointy

Wykorzystywane przez UI:

- GET `/api/public/group-classes/locations`
- GET `/api/public/group-classes/packages?locationId=...`
- GET `/api/public/group-classes?locationId=...&from=...&to=...&limit=50`
- GET `/api/public/group-classes/by-slug/{slug}`
- POST `/api/public/group-classes/register` — wyłącznie za pośrednictwem serwerowej trasy rejestracji.
- POST `/api/public/group-classes/packages/{packageId}/purchases/me`
- POST oraz DELETE `/api/public/group-classes/{sessionId}/bookings/me`
- POST `/api/client-portal/payments`
- istniejące lokalne `/api/auth/login` i `/api/auth/me`.

Dodatkowo udostępniono typowane helpery GET szczegółów pakietu po slugu i zajęć po ID, zgodnie z przekazanym kontraktem. Nie są niepotrzebnie wywoływane przez obecne widoki.

## B. Zachowanie

- Publiczne strony działają bez logowania, bez sidebara CRM.
- Lokalizacja i wybrana data są zapamiętywane w adresie URL.
- Desktop ma listę i panel pakietów obok; mobile układa pakiety pod listą.
- Karty pokazują wolne miejsca, pełne zajęcia i własne rezerwacje.
- Pełne i rozpoczęte zajęcia nie mają aktywnego przycisku nowego zapisu; nie ma fikcyjnej listy rezerwowej.
- Kliknięcie zapisu lub zakupu bez sesji otwiera logowanie/rejestrację, a po uwierzytelnieniu pozostawia akcję do potwierdzenia.
- Konto owner/trainer otrzymuje informację, że zakup i zapis wymagają konta klienta.
- Po zapisie/anulowaniu dane są pobierane ponownie. Odpowiedź 204 nie jest parsowana jako JSON.
- Nieopłacony zakup pokazuje instrukcję kontaktu ze studiem i formularz zgłoszenia już wykonanej wpłaty. Formularz nie jest bramką płatniczą.
- Brak nowych tokenów w localStorage. Rejestracja zwraca do przeglądarki tylko dane użytkownika, bez tokenów.
- Kwoty i liczby wejść pochodzą z API; cena jednostkowa wynika z ceny pakietu i liczby wejść. Nie ma fikcyjnego oznaczenia „najczęściej wybierany”.
- Nazwy trenerów są prezentowane z inicjałami, ponieważ publiczne DTO nie zawiera zdjęć.

## C. Braki w danych backendu względem projektów

Poniższe pola to propozycje rozszerzeń kontraktu, nie założenia istniejącej implementacji.

| Potrzeba | Miejsce i powód | Oczekiwane dane / kontrakt |
| --- | --- | --- |
| Publiczne dane do uruchomienia | Aktualne GET lokalizacji zwraca pustą tablicę; użytkownik nie ma czego wybrać | Skonfigurować aktywne lokalizacje z publicznymi pakietami lub przyszłymi publicznymi zajęciami, tak aby istniejący endpoint zwracał rekordy |
| Zdjęcie i opis trenera | Karty i szczegóły ze screenshotów | W publicznym DTO zajęć np. `trainerAvatarUrl`, `trainerBio`, `trainerSpecialization` |
| Sala / strefa studia | Stopka karty oraz szczegóły lokalizacji | `roomName` w DTO zajęć; obecnie dostępne jest tylko `locationName` |
| Typ, poziom i intensywność | Badges oraz filtr typu zajęć | `classTypeId`, `classTypeName`, `difficultyLevel`, `intensity`; do pełnego filtrowania dokumentacja dozwolonych wartości i parametru GET. Obecnie filtr typu jest pominięty |
| Kalorie | Kafelki w szczegółach | Np. `estimatedCaloriesMin`, `estimatedCaloriesMax`; nie należy zgadywać wartości |
| Co zabrać | Sekcja przygotowania do zajęć | `preparationInstructions` w szczegółowym DTO zajęć |
| Regulamin anulowania i zwrot wejść | Komunikat przy zapisie i anulowaniu | `cancellationPolicyText`, `cancellationDeadlineAt`, `canCancel`, `refundEntryOnCancellation`; potrzebne do poprawnego wyświetlania rzeczywistych zasad |
| Zamknięcie zapisów przed startem | Dostępność CTA | `bookingClosesAt`, `canBook`, `bookingUnavailableReason`; obecnie frontend zna miejsca/czas, pozostałe warunki weryfikuje POST |
| Instrukcja płatności | Ekran po zakupie | W odpowiedzi zakupu lub publicznej konfiguracji lokalizacji: `paymentInstructions`, `allowedPaymentMethods`, opcjonalnie rachunek i odbiorca; obecnie prosimy o uzgodnienie płatności ze studiem |
| Automatyczny checkout | Płatność online | Brak wspieranego kontraktu. Potrzebne udokumentowane utworzenie checkoutu, URL, status i potwierdzenie płatności. Nie zaimplementowano fikcyjnej integracji |
| Lista rezerwowa | CTA pełnych zajęć ze screenshotu | Udokumentowane endpointy dołączenia/rezygnacji oraz pola `isOnWaitlist`, `waitlistPosition`. Nie zgadujemy adresów; obecnie pełne zajęcia pokazują „Brak miejsc” |
| Popularny/rekomendowany pakiet | Oznaczenie pakietu w projekcie | `isFeatured` albo wiarygodny ranking popularności; nie oznaczamy żadnego pakietu arbitralnie |
| Dodatkowe informacje lokalne | Pomoc, adres, parking, kontakt i footer | `phoneNumber`, `contactEmail`, `directions`, `parkingInfo`; adres już korzysta z obecnego `address` |
| Materiały prawne i FAQ | Footer i ewentualne zgody przy rejestracji | Docelowe URL/treści regulaminu i prywatności, FAQ oraz wymagana treść i wersja zgód. Puste/fikcyjne odnośniki są pominięte |

Przykład proponowanego rozszerzenia istniejącego GET szczegółów (do uzgodnienia):

```json
{
  "trainerAvatarUrl": "https://.../trainer.jpg",
  "trainerBio": "...",
  "roomName": "Sala główna",
  "classTypeId": 1,
  "classTypeName": "Trening siłowy",
  "difficultyLevel": "Intermediate",
  "preparationInstructions": "...",
  "cancellationPolicyText": "...",
  "canCancel": true,
  "canBook": true
}
```

Nie proponuję nieznanych adresów endpointów listy rezerwowej ani checkoutu. Ich kontrakty powinien określić backend.

## D. Decyzje do doprecyzowania

Nie blokowały implementacji:

1. Jakie dokładnie instrukcje wpłaty, dane odbiorcy i metody ma widzieć klient po zakupie w każdej lokalizacji?
2. Jak brzmią zasady anulowania, zwrotu wejścia i ewentualny termin zamknięcia zapisów?
3. Gdzie mają prowadzić regulamin, polityka prywatności i kontakt oraz jakie zgody są wymagane przy publicznej rejestracji?
4. Czy konto `GroupOnly` ma docelowo dostawać osobny widok „Moje konto”, czy obecny panel klienta? Obecnie link prowadzi do istniejącego `/client`.

## E. Ograniczenia i ryzyka

- Prawdziwy backend zwrócił `[]` dla lokalizacji. Widok pusty sprawdzono na rzeczywistym API; przepływy z danymi sprawdzono z lokalnym backendem testowym. Nie wykonano prawdziwego zakupu, zgłoszenia wpłaty ani rezerwacji w produkcyjnych danych.
- Dostępność opłaconego pakietu, zgodność lokalizacji, liczba wejść i uprawnienie do anulowania są ostatecznie egzekwowane przez backend. Publiczne DTO listy nie zawiera kompletu uprawnień, więc odmowa jest pokazywana po POST/DELETE.
- Nie ma odświeżania tokena dodanego specjalnie dla publicznego modułu. Po wygaśnięciu sesji publiczny GET nadal działa; chroniona akcja pozwala ponownie się zalogować.
- Istniejące `/api/auth/me` sprawdza obecność cookies, nie ważność tokena w backendzie. To wskazówka dla interfejsu, nie mechanizm autoryzacji.
- Formularz zgłoszenia płatności nie potwierdza faktycznego otrzymania środków. Obsługa studia nadal musi potwierdzić wpłatę.
- Backend nie określa idempotency key dla zakupu. Po niejednoznacznym błędzie sieci należy sprawdzić pakiety klienta przed ponowieniem zakupu.
- Bezoffsetowe daty interpretowane są jako lokalny czas Warszawy. Daty z `Z`/offsetem formatowane są w `Europe/Warsaw`. Frontend nie zamienia godzin studia na lokalny czas przeglądarki.
- Listing pobiera maksymalnie 50 zajęć dla wybranego dnia, zgodnie z API. Przy osiągnięciu limitu pokazuje informację. Kontrakt paginacji nie został dostarczony.
- Publiczne szczegóły są pobierane po stronie klienta. Link działa bez wejścia przez listing; metadata jest obecnie ogólna dla modułu, bez dedykowanego obrazka Open Graph i metadanych pojedynczych zajęć.

## F. Weryfikacja

- `node node_modules/typescript/bin/tsc --noEmit` — przechodzi.
- `npm run lint` — kod wyjścia 0; 0 błędów i 18 istniejących ostrzeżeń poza nowym modułem (`img`, niewykorzystane importy/zmienne CRM).
- ESLint ograniczony do publicznego modułu, BFF i testów — 0 błędów, 0 ostrzeżeń.
- `npm run build` — przechodzi; manifest zawiera `/classes`, `/classes/[slug]` i `/api/auth/public-register`.
- `node --test tests/public-group-classes.test.mjs` — testy dat i wrappera przechodzą; test HTTP wymaga `PUBLIC_TEST_ORIGIN`.
- Test HTTP z `PUBLIC_TEST_ORIGIN=http://127.0.0.1:3002` — wszystkie trzy testy przeszły (podczas pierwszego uruchomienia plik miał rozszerzenie `.cjs`, następnie został przeniesiony na importy ESM `.mjs`). Sprawdza publiczny GET, 401 mutacji bez cookies, rejestrację bez ujawniania tokena, HttpOnly/SameSite, zapis, spadek liczby miejsc, anulowanie 204, nieopłacony zakup, pełne zajęcia i fallback wygasłego tokena.
- Przeglądarka: desktop i viewport 390×844; lista, szczegóły, auth modal, powrót do rozpoczętej rezerwacji, zapis/anulowanie, zakup i zgłoszenie płatności przetestowane na fixture. Szerokość dokumentu nie przekracza szerokości viewportu.
- Testowy backend działa wyłącznie lokalnie i nie jest importowany przez produkcyjny kod.

Powtórzenie testów integracyjnych w trzech terminalach PowerShell po `npm run build`:

```powershell
node tests/public-group-classes.fixture.mjs
```

```powershell
$env:BACKEND_API_URL = 'http://127.0.0.1:4010'
node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3002
```

```powershell
$env:PUBLIC_TEST_ORIGIN = 'http://127.0.0.1:3002'
node --test tests/public-group-classes.test.mjs
```

Konto fixture: `fixture@example.test` / `FixtureOnly123!`. To wyłącznie dane fikcyjne obsługiwane przez lokalny skrypt testowy, nie konto w prawdziwym ATLAS.
