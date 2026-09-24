"use client";
import type { NotificationCategory, UnreadCountResponse } from "@/app/lib/notifications";

export function markAllLabel(category: string, categories: NotificationCategory[]) {
  const names: Record<string, string> = { payments: "Płatnościach", packages: "Pakietach", schedule: "Grafiku", invitations: "Zaproszeniach", trainers: "Trenerach", group_classes: "Zajęciach grupowych", registrations: "Rejestracjach", system: "Systemie" };
  return category ? `Oznacz wszystkie w ${names[category] ?? categories.find(item => item.key === category)?.label ?? category} jako przeczytane` : "Oznacz wszystkie jako przeczytane";
}

export default function NotificationFilters({ category, setCategory, readFilter, setReadFilter, categories, counts }: {
  category: string; setCategory: (value: string) => void;
  readFilter: string; setReadFilter: (value: string) => void;
  categories: NotificationCategory[]; counts: UnreadCountResponse;
}) {
  const pill = (active: boolean) => `shrink-0 rounded-full px-3 py-2 text-sm transition focus-visible:outline-2 focus-visible:outline-primary-light ${active ? "bg-primary/25 text-primary-light font-semibold ring-1 ring-primary-light/40" : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"}`;
  return <div className="my-3 min-w-0 space-y-3">
    <div role="group" aria-label="Kategoria powiadomień" className="flex gap-2 overflow-x-auto p-1">
      {[{ key: "", label: "Wszystkie" }, ...categories].map(item => {
        const count = item.key ? counts.unreadByCategory[item.key] ?? 0 : counts.unreadCount;
        return <button key={item.key} type="button" aria-pressed={category === item.key} onClick={() => setCategory(item.key)} className={pill(category === item.key)}>{item.label}{count > 0 && <span className="ml-2 rounded-full bg-primary/20 px-1.5 text-xs">{count}</span>}</button>;
      })}
    </div>
    <div role="group" aria-label="Stan przeczytania" className="flex gap-2 overflow-x-auto p-1">
      {[["", "Wszystkie"], ["false", "Nieprzeczytane"], ["true", "Przeczytane"]].map(([key, label]) => <button key={key} type="button" aria-pressed={readFilter === key} onClick={() => setReadFilter(key)} className={pill(readFilter === key)}>{label}</button>)}
    </div>
  </div>;
}
