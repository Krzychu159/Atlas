# Flow danych i API

Ten plik opisuje obowiązujący sposób pobierania danych, wysyłania mutacji, proxy requestów i obsługi błędów w projekcie Atlas Studio CRM.

## Główna zasada

Frontend nie woła backendu bezpośrednio z komponentów. Komponenty używają funkcji domenowych z `app/lib/...`, a te funkcje przechodzą przez wspólny helper requestów.

Standardowy przepływ:

1. Komponent UI wywołuje funkcję domenową, np. `getClients()`.
2. Funkcja domenowa w `app/lib/owner/*` używa `backendGet`, `backendPost`, `backendPut`, `backendPatch` albo `backendDelete`.
3. `app/lib/backend.ts` buduje request do `/api/backend/...`.
4. `app/api/backend/[...path]/route.ts` dopina token z cookie `accessToken` i przekazuje request do backendu `BACKEND_API_URL`.
5. Backend odpowiada JSON-em.
6. Proxy zwraca odpowiedź do frontu bez cache.
7. `backendFetch` parsuje odpowiedź, a błędy zamienia na `ApiError`.
8. UI pokazuje błąd przez `showOwnerError` albo sukces przez `showOwnerSuccess`.

## Warstwa domenowa

Pliki typu `app/lib/owner/clients.ts`, `app/lib/owner/packages.ts`, `app/lib/owner/sessions.ts` są jedynym miejscem, gdzie opisujemy endpointy ownera.

Zasady:

- `GET` używa `backendGet<T>(path, query?)`.
- `POST` używa `backendPost<T>(path, payload?, query?)`.
- `PUT` używa `backendPut<T>(path, payload?, query?)`.
- `PATCH` używa `backendPatch<T>(path, payload?, query?)`.
- `DELETE` używa `backendDelete<T>(path, query?)`.
- Query parametry przekazujemy jako obiekt, nie składamy ręcznie stringów.
- Payload przekazujemy jako obiekt, nie robimy ręcznie `JSON.stringify` w modułach domenowych.

Przykład:

```ts
export function getOwnerSessions(params?: SessionFilterParams) {
  return backendGet<OwnerSession[]>("sessions/filter", {
    TrainerId: params?.trainerId,
    Status: params?.status,
    From: params?.from,
    To: params?.to,
  });
}
```

## Proxy backendu

Proxy znajduje się w `app/api/backend/[...path]/route.ts`.

Jego odpowiedzialność:

- odczytać `accessToken` z httpOnly cookie,
- zbudować URL backendu na bazie `BACKEND_API_URL`,
- przenieść query parametry z requestu frontu,
- przekazać metodę HTTP i body,
- dodać `Authorization: Bearer <token>`,
- wymusić `Cache-Control: no-store`,
- przy braku tokena zwrócić `401` i wyczyścić auth cookies,
- przy braku połączenia z backendem zwrócić stabilny JSON `{ message }` ze statusem `502`.

Komponenty nie powinny znać `BACKEND_API_URL` ani tokenów.

## Auth i 401

Auth cookies są obsługiwane wspólnie przez `app/lib/server/auth-cookies.ts`.

Server-side sprawdzanie sesji w layoucie aplikacji jest wydzielone do
`app/lib/server/session.ts`. Ten moduł może bezpośrednio sprawdzić
`BACKEND_API_URL/api/Auth/me`, bo działa po stronie serwera i służy tylko do
walidacji sesji przed renderem panelu. Nie jest to wzorzec do pobierania danych
biznesowych w komponentach.

Używane cookies:

- `accessToken`,
- `refreshToken`,
- `role`,
- `userId`,
- kompatybilnościowo także `refresh_token` i `user_role`.

Gdy `backendFetch` dostanie `401`:

1. wywołuje `/api/auth/logout`,
2. czyści cookies,
3. przekierowuje użytkownika do `/login?reason=session-expired&next=<aktualny-url>`,
4. rzuca `ApiError` z komunikatem `Sesja wygasła. Zaloguj się ponownie.`.

Dzięki temu komponenty nie muszą ręcznie obsługiwać wylogowania po wygasłej sesji.

## Publiczne akcje auth

Logowanie i odzyskiwanie hasła nie przechodzą przez `app/api/backend/[...path]`,
bo użytkownik nie ma jeszcze ważnego `accessToken`.

Używane route handlery:

- `app/api/auth/login/route.ts` - logowanie, zapis tokenów do httpOnly cookies,
- `app/api/auth/forgot-password/route.ts` - wysłanie instrukcji resetu hasła,
- `app/api/auth/reset-password/route.ts` - zapis nowego hasła na podstawie tokenu.

`forgot-password` i `reset-password` używają wspólnego helpera
`app/api/auth/_utils/public-auth-proxy.ts`. Helper wysyła request bez
autoryzacji do `BACKEND_API_URL/api/auth/...`, wymusza `no-store` i zwraca
frontendowi stabilną odpowiedź JSON.

Ekran `app/(auth)/login/page.tsx` obsługuje trzy tryby w jednym miejscu:

- logowanie,
- wysłanie instrukcji resetu,
- ustawienie nowego hasła z tokenem.

Link resetujący może kierować na `/login?token=<token>`,
`/login?resetToken=<token>` albo `/reset-password?token=<token>`. Ścieżka
`/reset-password` nie ma osobnego UI - przekierowuje do ekranu logowania z
trybem resetu.

## Podział lokalizacji ownera

Wybrana lokalizacja ownera jest globalnym stanem frontu obsługiwanym przez
`app/lib/owner/location-filter.ts`.

Zasady:

- `locationId = null` oznacza widok wszystkich lokalizacji,
- `locationId = 1` oznacza widok jednej lokalizacji,
- wybór jest zapisywany w `localStorage` pod kluczem
  `atlas-owner-location-id`,
- zmiana emituje event `atlas-owner-location-changed`, więc inne komponenty
  reagują bez odświeżenia strony,
- filtrowanie lokalne używa `matchesOwnerLocationId(entity, selectedLocationId)`.

Obecnie ten mechanizm ogranicza:

- globalną wyszukiwarkę w headerze,
- listę klientów,
- listę trenerów,
- grafik ownera,
- listę pakietów.

Grafik dodatkowo wysyła `locationId` do endpointu sesji, bo sesje mogą być
filtrowane po stronie backendu. Listy klientów, trenerów i pakietów filtrują
dane po stronie frontu na podstawie pól `locationId` albo `locationIds`
zwracanych przez API.

## Błędy

Wspólny typ błędu to `ApiError` z `app/lib/backend.ts`.

Zawiera:

- `message`,
- `status`,
- `payload`,
- `path`,
- `isUnauthorized`.

`backendFetch` próbuje wyciągnąć komunikat w tej kolejności:

1. tekstowy body,
2. `message`,
3. `detail`,
4. `title` plus walidacyjne `errors`,
5. domyślne `Nie udało się wykonać operacji.`

W ownerze nie używamy bezpośrednio `toast.error` i `toast.success`. Zamiast tego:

- błędy: `showOwnerError(error, fallback, { id })`,
- sukcesy: `showOwnerSuccess(message, { id })`,
- informacje: `showOwnerInfo(message, { id })`.

Te helpery są w `app/(app)/owner/components/owner-toast.ts`.

## Dane częściowe

Jeżeli ekran ma dane krytyczne i opcjonalne, wolno używać `Promise.allSettled`.

Przykład:

- profil klienta musi mieć `getClient(id)`,
- subskrypcja, użycie pakietu i sesje mogą się nie załadować bez blokowania całej strony.

Zasada:

- jeżeli główny zasób nie przyjdzie, rzucamy błąd i pokazujemy toast,
- jeżeli dane poboczne nie przyjdą, ustawiamy bezpieczny fallback (`null`, `[]`) i nie rozbijamy widoku.

## Stan komponentów

Komponenty ekranowe trzymają tylko stan UI i wynik danych:

- `isLoading`,
- `isSaving`,
- filtry/sortowanie,
- otwarcie modala,
- aktualnie wybrany rekord.

Komponenty nie powinny:

- składać URL-i backendu,
- dopinać tokenów,
- parsować błędów backendu,
- robić `JSON.stringify` dla requestów domenowych,
- znać `BACKEND_API_URL`.

## Wspólne komponenty UI

Nowe formularze, modale i akcje powinny używać wspólnych komponentów:

- przyciski: `app/components/ui/button.tsx`,
- pola tekstowe i textarea: `app/components/ui/input.tsx`,
- selecty: `app/components/ui/custom-select.tsx`,
- zakres dat: `app/components/ui/date-range-filter.tsx`,
- wrapper modala, nagłówek i sticky footer: `app/components/ui/modal.tsx`,
- upload avatara: `app/components/ui/avatar-file-picker.tsx`.

Ekrany ownera mogą dalej importować kompatybilnościowe aliasy z
`app/(app)/owner/components/OwnerFormControls.tsx`, ale nowe wspólne
komponenty powinny trafiać do `app/components/ui` albo do domenowego folderu
`app/components/<domain>`.

Jeżeli dany wzorzec występuje w ownerze i trenerze, nie duplikujemy go w dwóch
folderach paneli. Przykłady obecnego współdzielenia:

- lista i podział płatności: `app/components/payments/*`,
- karty i filtry pakietów: `app/components/packages/*`,
- kontrolki grafiku: `app/components/schedule/*` oraz komponenty grafiku
  ownera używane też przez panel trenera.

Widoczne teksty w komponentach muszą być po polsku i nie powinny ujawniać
technicznych szczegółów typu "backend", "API", "mock" albo "tymczasowo".

## Mutacje

Po mutacji są dwa dopuszczalne wzorce:

1. Backend zwraca zaktualizowany obiekt: aktualizujemy lokalny stan tym obiektem.
2. Mutacja zmienia listę lub zależne dane: po sukcesie odpalamy ponownie funkcję `load...()`.

Toast sukcesu pokazujemy dopiero po zakończeniu mutacji i odświeżenia stanu.

## Cache

Requesty danych aplikacyjnych są zawsze świeże:

- `backendFetch` używa `cache: "no-store"`,
- proxy ustawia `Cache-Control: no-store`,
- route handlery auth też ustawiają `Cache-Control: no-store`.

Nie zakładamy cache dla panelu ownera, bo dane operacyjne szybko się zmieniają.

## Upload plików

Upload avatara jest wyjątkiem od `backendFetch`, bo wysyła `FormData` do lokalnego route handlera:

- UI używa `AvatarFilePicker`,
- plik idzie do `/api/uploads/avatar`,
- route handler sprawdza auth cookie,
- zapisuje skompresowany plik w `public/uploads/avatars`,
- zwraca `{ url }`.

Nie ustawiamy ręcznie `Content-Type` dla `FormData`.

## Dodawanie nowego endpointu

Nowy endpoint dodajemy tak:

1. Dodaj typ response/payload w odpowiednim pliku `app/lib/owner/*`.
2. Dodaj funkcję domenową używającą `backendGet/Post/Put/Patch/Delete`.
3. Query przekaż jako obiekt.
4. Payload przekaż jako obiekt.
5. W komponencie użyj funkcji domenowej.
6. Błąd pokaż przez `showOwnerError`.
7. Sukces pokaż przez `showOwnerSuccess`.
8. Nie dodawaj bezpośredniego `fetch` do komponentu, chyba że to upload pliku lub lokalny endpoint auth.

## Nazewnictwo

Kod, pliki i foldery pozostają po angielsku.

Teksty widoczne dla użytkownika są po polsku i powinny brzmieć naturalnie.
