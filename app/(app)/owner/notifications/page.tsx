import NotificationItem, {
  type NotificationItemData,
} from "../components/Notification";

const todayNotifications: NotificationItemData[] = [
  {
    id: 1,
    type: "payment",
    title: "Płatność otrzymana",
    description:
      'Klient Marek Wiśniewski opłacił pakiet "Pro Athlete" 1200 PLN.',
    time: "14:20",
  },
  {
    id: 2,
    type: "schedule",
    title: "Zmiana w grafiku",
    description:
      "Trening personalny z Anią Kowalską został przesunięty na jutro o 18:00.",
    time: "11:05",
  },
];

const yesterdayNotifications: NotificationItemData[] = [
  {
    id: 3,
    type: "client",
    title: "Nowy klient",
    description:
      "Tomasz Nowak dołączył do Twojej bazy klientów przez portal Atlas.",
    time: "Wczoraj",
  },
  {
    id: 4,
    type: "system",
    title: "Aktualizacja systemu",
    description:
      "Wprowadziliśmy nowe widżety do Twojego Dashboardu. Sprawdź teraz.",
    time: "2 dni temu",
  },
];

function Section({
  title,
  items,
}: {
  title: string;
  items: NotificationItemData[];
}) {
  return (
    <section>
      <div className="flex items-center gap-4">
        <p className="text-label text-primary-light shrink-0">{title}</p>
        <div className="h-px bg-white/10 flex-1" />
      </div>

      <div className="mt-5 flex flex-col gap-4">
        {items.map((item) => (
          <NotificationItem key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}

export default function NotificationsPage() {
  return (
    <div className="max-w-[1000px] mx-auto">
      <div className=" px-1 pb-28">
        <div className="pt-2">
          <p className="text-page-title">Powiadomienia</p>
          <p className="mt-4 text-base leading-7 text-on-surface-variant">
            Twój dzienny raport aktywności Atlas.
          </p>
        </div>

        <div className="mt-10 flex flex-col gap-10">
          <Section title="Dzisiaj" items={todayNotifications} />
          <Section title="Wczoraj" items={yesterdayNotifications} />
          <Section title="Starsze" items={todayNotifications} />
        </div>
      </div>
    </div>
  );
}
