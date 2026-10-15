"use client";
import type { NotificationCategory, UnreadCountResponse } from "@/app/lib/notifications";

export function markAllLabel(category: string, categories: NotificationCategory[]) {
  const names: Record<string, string> = { payments: "Płatnościach", packages: "Pakietach", schedule: "Grafiku", invitations: "Zaproszeniach", trainers: "Trenerach", group_classes: "Zajęciach grupowych", registrations: "Rejestracjach", system: "Systemie" };
  return category ? `Oznacz wszystkie w ${names[category] ?? categories.find(item => item.key === category)?.label ?? category} jako przeczytane` : "Oznacz wszystkie jako przeczytane";
}

const readOptions = [["", "Wszystkie"], ["false", "Nieprzeczytane"], ["true", "Przeczytane"]] as const;

export default function NotificationFilters({ category, setCategory, readFilter, setReadFilter, categories, counts }: {
  category: string; setCategory: (value: string) => void;
  readFilter: string; setReadFilter: (value: string) => void;
  categories: NotificationCategory[]; counts: UnreadCountResponse;
}) {
  return (
    <section className="card-shell flex min-w-0 flex-col gap-3 p-3 md:p-4 xl:flex-row xl:items-center xl:justify-between" aria-label="Filtry powiadomień">
      <div role="group" aria-label="Kategoria powiadomień" className="-mx-1 flex min-w-0 gap-1.5 overflow-x-auto px-1 pb-0.5" style={{ scrollbarWidth: "none" }}>
        {[{ key: "", label: "Wszystkie" }, ...categories].map(item => {
          const active = category === item.key;
          const count = item.key ? counts.unreadByCategory[item.key] ?? 0 : counts.unreadCount;
          return (
            <button
              key={item.key}
              type="button"
              aria-pressed={active}
              onClick={() => setCategory(item.key)}
              className={`inline-flex h-9 shrink-0 items-center gap-2 rounded-full px-3.5 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-primary-light ${active ? "bg-primary text-on-primary" : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"}`}
            >
              {item.label}
              {count > 0 ? <span className={`rounded-full px-1.5 text-[11px] font-semibold leading-5 ${active ? "bg-on-primary/20" : "bg-primary/20 text-primary-light"}`}>{count}</span> : null}
            </button>
          );
        })}
      </div>
      <div role="group" aria-label="Stan przeczytania" className="grid shrink-0 grid-cols-3 gap-1 rounded-full bg-surface-container-low p-1 xl:w-[360px]">
        {readOptions.map(([key, label]) => (
          <button
            key={key}
            type="button"
            aria-pressed={readFilter === key}
            onClick={() => setReadFilter(key)}
            className={`h-8 rounded-full px-2 text-xs font-semibold transition focus-visible:outline-2 focus-visible:outline-primary-light ${readFilter === key ? "bg-primary/20 text-on-surface" : "text-on-surface-variant hover:text-on-surface"}`}
          >
            {label}
          </button>
        ))}
      </div>
    </section>
  );
}
