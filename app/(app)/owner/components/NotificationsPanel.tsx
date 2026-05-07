"use client";

import Link from "next/link";
import { ExternalLink, X } from "lucide-react";
import NotificationItem, { type NotificationItemData } from "./Notification";
const notifications: NotificationItemData[] = [
  {
    id: 1,
    type: "client",
    title: "Nowy klient: Anna Nowak",
    description:
      "Anna właśnie wykupiła pakiet Summer Shred 90 na okres 3 miesięcy.",
    time: "2 min temu",
    isUnread: true,
  },
  {
    id: 2,
    type: "payment",
    title: "Płatność otrzymana",
    description: "Przelew od Jan Kowalski, 1200 PLN, został zaksięgowany.",
    time: "1h temu",
  },
  {
    id: 3,
    type: "schedule",
    title: "Nadchodzący trening",
    description: "Masz zaplanowaną sesję z Adamem o godzinie 16:00.",
    time: "2h temu",
  },
  {
    id: 4,
    type: "system",
    title: "Aktualizacja systemu",
    description: "Nowe funkcje analityczne są już dostępne w zakładce Raporty.",
    time: "Wczoraj",
  },
];

export default function NotificationsPanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 hidden md:block">
      <button
        aria-label="Zamknij powiadomienia"
        onClick={onClose}
        className="absolute inset-0 bg-black/65 backdrop-blur-[6px]"
      />

      <aside className="absolute right-5 top-5 bottom-5 w-[390px] rounded-[28px] bg-surface-container-low shadow-ambient overflow-hidden">
        <div className="p-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-[1.35rem] font-semibold">Powiadomienia</p>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={onClose}
              className="h-9 w-9 rounded-full bg-surface-container-lowest flex items-center justify-center text-on-surface-variant hover:text-on-surface"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="px-6 mb-4">
          <button className="text-label text-primary-light text-right leading-4">
            Oznacz wszystkie jako przeczytane
          </button>
        </div>

        <div className="px-5 flex flex-col gap-4">
          {notifications.map((item) => (
            <NotificationItem key={item.id} item={item} variant="panel" />
          ))}
        </div>

        <div className="absolute left-0 right-0 bottom-0 p-5 bg-gradient-to-t from-surface-container-low via-surface-container-low to-transparent">
          <Link
            href="/owner/notifications"
            onClick={onClose}
            className="h-14 rounded-[var(--radius-lg)] bg-surface-container-high flex items-center justify-center gap-2 text-sm font-semibold"
          >
            Zobacz wszystkie
            <ExternalLink size={15} />
          </Link>
        </div>
      </aside>
    </div>
  );
}
