# ATLAS / StudioCRM — Project Knowledge Base

## 1. Cel projektu

ATLAS / StudioCRM to webowa aplikacja CRM dla studia treningowego. System ma obsługiwać właściciela studia, trenerów oraz klientów. Główne cele aplikacji:

- zarządzanie klientami studia,
- zarządzanie trenerami,
- zarządzanie pakietami treningowymi,
- obsługa zaproszeń użytkowników przez e-mail,
- dashboard operacyjny ownera,
- docelowo grafik/schedule i integracja z Outlook,
- oddzielne panele dla Ownera, Trainera i Clienta.

Aktualnie największy nacisk jest na panel Ownera. Schedule tymczasowo odkładamy, ponieważ backend grafiku i integracje są jeszcze rozwijane.

## 2. Linki projektu

GitHub:
https://github.com/Krzychu159/Atlas

Backend publiczny:
https://studiocrm-backend.onrender.com

Swagger:
https://studiocrm-backend.onrender.com/swagger

Frontend lokalny:
http://localhost:3000

Backend API proxy we frontendzie:
`/api/backend/...`

Przykład:
Frontend woła:
`/api/backend/Clients`

Next proxy przekazuje do:
`https://studiocrm-backend.onrender.com/api/Clients`

## 3. Stack technologiczny

Frontend:

- Next.js App Router
- TypeScript
- Tailwind CSS v4
- lucide-react
- komponenty własne w `app/components`
- layout z route group `(app)`

Backend:

- ASP.NET / .NET API
- JWT auth
- Swagger
- Render deployment

Auth:

- token `accessToken` trzymany w cookies
- frontend nie woła backendu bezpośrednio
- frontend woła `/api/backend/...`
- proxy Next dokleja `Authorization: Bearer TOKEN`

## 4. Struktura proxy backendu

Plik:

`app/api/backend/[...path]/route.ts`

Idea:

- pobiera token z cookies,
- składa URL backendu,
- przekazuje metodę, query params i body,
- zwraca odpowiedź z backendu.

Środowisko:
`BACKEND_API_URL=https://studiocrm-backend.onrender.com`

## 5. Struktura helperów API

Preferowana struktura:

```txt
app
└── lib
    ├── backend.ts
    └── owner
        ├── dashboard.ts
        ├── clients.ts
        ├── trainers.ts
        ├── packages.ts
        └── invitations.ts

Nie mieszać helperów ownera z globalnymi helperami.
Dla owner panelu importy mają wyglądać np.:

import { getClients } from "@/app/lib/owner/clients";
import { createTrainer } from "@/app/lib/owner/trainers";
import { createInvitation } from "@/app/lib/owner/invitations";

backend.ts zawiera wspólny backendFetch.

Ważne:

backendFetch powinien bezpiecznie obsługiwać pustą odpowiedź,
powinien próbować parsować JSON,
przy błędzie rzucać Error.
6. Role aplikacji
Owner

Owner zarządza studiem. Aktualnie priorytet.

Widoki Ownera:

/owner — dashboard operacyjny,
/owner/clients — lista klientów,
/owner/clients/[id] — docelowo profil klienta,
/owner/trainers — lista trenerów,
/owner/trainers/[id] — profil trenera,
/owner/packages — pakiety,
/owner/settings — ustawienia,
/owner/notifications — mobile page powiadomień,
desktop notifications jako prawy panel z headera.
Trainer

Na razie odkładamy. Docelowo:

dashboard trenera,
jego klienci,
jego sesje,
widok klienta pod opieką trenera.
Client

Na razie odkładamy. Docelowo:

dashboard klienta,
jego treningi,
jego pakiet,
płatności,
trener.
7. Aktualna strategia pracy

Najpierw dopieszczamy Ownera, ponieważ jest głównym panelem i wzorcem dla całej aplikacji.
Trainer i Client będą później prostszymi, zawężonymi wariantami tych samych wzorców UI/API.

Aktualny priorytet:

Owner dashboard.
Owner clients.
Owner trainers.
Trainer profile.
Owner packages.
Owner settings.
Notifications.
Invitations.
Dopiero potem Trainer/Client.
Schedule odkładamy do czasu gotowości backendu.
8. Design System

Nazwa kierunku: Kinetic Editorial

Charakter:

premium fitness CRM,
ciemny interfejs,
mocny kontrast,
dużo przestrzeni,
editorial typography,
komponenty kompaktowe, ale czytelne,
max szerokość contentu: max-w-[1000px] mx-auto,
desktop ma mieścić dużo danych bez przesadnie dużych elementów,
mobile ma być osobno dopracowany, mobile-first tam gdzie trzeba.
Kolory

Global CSS zawiera tokeny:

--color-surface: #121416;
--color-surface-container-low: #1a1c1e;
--color-surface-container: #222426;
--color-surface-container-high: #282a2c;
--color-surface-container-lowest: #0c0e10;
--color-surface-bright: #2f3133;

--color-primary: #0052ff;
--color-primary-light: #b7c4ff;
--color-primary-container: #0036b3;

--color-tertiary: #4ae176;
--color-tertiary-container: #007633;
--color-tertiary-light: #78ff96;

--color-on-surface: #ffffff;
--color-on-surface-variant: #c3c5d9;
--color-on-surface-muted: #8a8f98;
Zasady wizualne
Nie używać klasycznego border: 1px solid do dzielenia sekcji.
Separacja przez tonalne warstwy: surface, surface-container-low, surface-container.
Dopuszczalny delikatny ghost-border.
Primary actions: bg-primary-gradient.
Karty: card-shell, bg-surface-container, rounded-[var(--radius-lg)].
Inputy: bg-surface-container-lowest.
Status pozytywny: tertiary.
Nie używać pełnej bieli do drugorzędnych tekstów — stosować text-on-surface-variant albo text-on-surface-muted.
Typografia
Display/headlines: Manrope.
Body/data: Inter.
Labelki: .text-label, uppercase, letter spacing.
Nagłówki stron konsekwentnie:
<p className="text-label text-primary-light">...</p>
<h1 className="mt-2 text-[2.25rem] leading-[0.95] font-semibold font-display tracking-tight">
  Status <span className="text-primary-light">Operacyjny</span>
</h1>
Wspólne klasy utility

W global CSS istnieją:

.bg-primary-gradient
.bg-frosted-charcoal
.ghost-border
.text-label

Często używane:

card-shell
text-page-title
text-section-title

Jeśli ich nie ma, należy dodać do global CSS, a nie tworzyć losowych klas lokalnych.

9. Ważne zasady implementacji
Nie używać mocków tam, gdzie backend już istnieje.
Mocki tylko tam, gdzie backend nie zwraca jeszcze danych, np. dzisiejszy przychód.
Komponenty dzielić na mniejsze pliki.
Modale trzymać w folderze components danej domeny albo wspólne w owner/components.
API helpery trzymać w app/lib/owner/....
Komponenty powinny mieć jawne typy i unikać any.
Nie używać importu Link z lucide-react. Link zawsze z next/link.
Dynamiczne route w Next muszą mieć nazwę pliku page.tsx, małymi literami.
Przykład:
app/(app)/owner/trainers/[id]/page.tsx
10. Owner Dashboard

Endpoint:

GET /api/Dashboard/owner

Helper:
app/lib/owner/dashboard.ts

Typ:

export type OwnerDashboard = {
  trainersCount: number;
  activeClientsCount: number;
  plannedSessionsCount: number;
  activePackagesCount: number;
  todaySessions: OwnerSession[];
  tomorrowSessions: OwnerSession[];
  recentClients: RecentClient[];
};

Dashboard:

desktop: 4 stat cards,
dzisiejsze sesje: maksymalnie 3,
jutrzejsze sesje: maksymalnie 2,
prawy box zamiast “najbliższe treningi”: dzisiejszy przychód,
najnowsi klienci z poprawnie sformatowaną datą.

Wspólne formatowanie dat:
app/lib/formatters/date.ts

Funkcje:

formatDateTime
formatRelativeDate
formatSessionTime
11. Clients

Endpointy:

GET /api/Clients

POST /api/Clients

Aktualnie dodawanie klienta ma zostać zmienione na zaproszenie przez Invitations, a nie tworzenie pełnego klienta ręcznie.

Lista klientów:

kompaktowa,
header zostawić zgodny ze stylem,
wyszukiwarka i filtry,
dane z backendu,
bez niepotrzebnych mocków.

Folder:

app/(app)/owner/clients
├── page.tsx
└── components
    ├── AddClientModal.tsx
    └── ...
12. Trainers

Endpointy:

GET /api/Trainers

GET /api/Trainers/{id}

POST /api/Trainers

Aktualnie dodawanie trenera również przez Invitations, nie przez pełny formularz tworzenia trenera.

Folder:

app/(app)/owner/trainers
├── page.tsx
├── [id]
│   └── page.tsx
└── components
    ├── AddTrainerModal.tsx
    ├── TrainerCard.tsx
    ├── TrainerProfileHeader.tsx
    ├── TrainerProfileStats.tsx
    └── TrainerProfileDetails.tsx

Profil trenera:

/owner/trainers/[id]
pobiera dane przez getTrainer(id)
pokazuje header, statystyki, szczegóły.
Nie używać mocków w profilu.
13. Packages

Endpointy:

GET /api/Packages

POST /api/Packages

DELETE /api/Packages/{id}

Helper:
app/lib/owner/packages.ts

Widok:

bez hero “VIP” na górze,
bez dolnych boxów statystycznych,
lista pakietów,
filtry: wszystkie / aktywne / archiwalne,
wyszukiwarka,
modal dodawania pakietu,
usuwanie pakietu.

Folder:

app/(app)/owner/packages
├── page.tsx
└── components
    ├── AddPackageModal.tsx
    ├── PackageCard.tsx
    └── PackageFilters.tsx
14. Invitations

Endpointy:

POST /api/Invitations

Body:

{
  "email": "string",
  "role": "string",
  "locationId": 0
}

GET /api/Invitations

Query:

Status
Role
LocationId
Search

POST /api/Invitations/{id}/resend

POST /api/Invitations/{id}/cancel

GET /api/Invitations/validate?token=...

POST /api/Invitations/accept

Aktualna decyzja:

AddClientModal wysyła invitation z role: "Client".
AddTrainerModal wysyła invitation z role: "Trainer".
Modal przyjmuje tylko e-mail.
Role ustawiane automatycznie zależnie od modala.
Pokazywać tylko zaproszenia wysłane, niezaakceptowane i niewycofane.
W modalu można zaproszenie wycofać.
Tymczasowo locationId ustawione sztywno na 2.

Helper:
app/lib/owner/invitations.ts

Ważne:
Jeśli backend zwraca 500, ale operacja wykonuje się w bazie, to prawdopodobnie błąd backendu po zapisie, np. mailer/serializacja/response DTO. Front nie powinien udawać sukcesu dla HTTP 500, ale można tymczasowo odświeżać listę po błędzie.

15. Notifications

Na desktop:

kliknięcie dzwonka w headerze otwiera panel po prawej stronie.

Na mobile:

kliknięcie dzwonka prowadzi na pełną stronę:
/owner/notifications

Folder:

app/(app)/owner/notifications/page.tsx
app/(app)/owner/components/NotificationsPanel.tsx
app/(app)/owner/components/NotificationItem.tsx

Na razie powiadomienia mogą być mockowane, jeśli backend ich nie ma.

16. Outlook

Endpointy istnieją, ale odkładamy temat.

Docelowy flow:

w Settings sekcja Integracje,
owner klika Połącz Outlook,
frontend woła GET /api/outlook/connect-url,
przekierowanie do Microsoft,
backend obsługuje callback,
status przez GET /api/outlook/status,
eventy przez GET /api/outlook/imported-events.

Na razie nie implementować.

17. Schedule

Schedule odkładamy całkowicie na później, bo backend jest rozwijany. Nie tracić czasu na dopieszczanie kalendarza w tym momencie.

18. 404

Globalna strona:
app/not-found.tsx

Jeśli route group ma swój layout, można dodać też:
app/(app)/not-found.tsx

Przycisk powinien prowadzić do:
/owner

19. Znane problemy / uwagi
POST /api/Invitations/{id}/cancel może zwracać 500 mimo że operacja wykonuje się w bazie. To prawdopodobnie backend.
Podobny problem może dotyczyć create/resend invitation.
Jeśli rekord powstaje, a odpowiedź to 500, podejrzane są:
wysyłka maila po zapisie,
serializacja response,
mapowanie DTO,
null w LocationName/InviteLink,
błąd po SaveChanges.
locationId: 2 jest tymczasowym hardcodem.
20. Preferencje odpowiedzi AI w tym projekcie

Odpowiadaj po polsku.

Dawaj gotowy kod do wklejenia.

Przy większych zmianach podawaj:

strukturę folderów,
pliki do utworzenia,
pełny kod każdego pliku,
zmiany w istniejących plikach,
krótkie wyjaśnienie co i dlaczego.

Nie pisz zbyt dużo teorii, chyba że użytkownik prosi o projektowanie flow.

Trzymaj się istniejącego design systemu:

max width 1000px,
card-shell,
surface-container,
primary-light,
tertiary-light,
kompaktowe elementy,
premium dark UI.

Nie psuj headerów, jeśli użytkownik mówi, żeby ich nie ruszać.

Nie dodawaj mocków, jeśli istnieje endpoint backendowy.

Jeśli endpoint istnieje, przygotuj helper w app/lib/owner/....

Jeśli trzeba użyć komponentów, dziel kod na komponenty.

Zawsze unikaj any.
```
