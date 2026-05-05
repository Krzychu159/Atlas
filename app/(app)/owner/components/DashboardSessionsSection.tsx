import Link from "next/link";
import type { OwnerSession } from "@/app/lib/owner/dashboard";
import DashboardSessionRow from "./DashboardSessionRow";

export default function DashboardSessionsSection({
  title,
  subtitle,
  sessions,
  muted = false,
  limit = 3,
}: {
  title: string;
  subtitle: string;
  sessions: OwnerSession[];
  muted?: boolean;
  limit?: number;
}) {
  const visibleSessions = sessions.slice(0, limit);

  return (
    <section>
      <div className="flex items-end justify-between gap-4">
        <div
          className={`border-l-4 pl-4 ${
            muted ? "border-on-surface-muted" : "border-primary-light"
          }`}
        >
          <p
            className={`text-section-title ${
              muted ? "text-on-surface-variant" : ""
            }`}
          >
            {title}
          </p>
          <p
            className={`text-label mt-1 ${
              muted ? "text-on-surface-muted" : "text-on-surface-variant"
            }`}
          >
            {subtitle}
          </p>
        </div>

        <Link href="/owner/schedule" className="text-label text-primary-light">
          Zobacz wszystkie
        </Link>
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {visibleSessions.length > 0 ? (
          visibleSessions.map((session, index) => (
            <DashboardSessionRow
              key={session.id ?? index}
              session={session}
              compact={muted}
            />
          ))
        ) : (
          <div className="card-shell p-5 text-on-surface-variant">
            Brak sesji.
          </div>
        )}
      </div>

      {sessions.length > limit ? (
        <p className="mt-3 text-sm text-on-surface-muted">
          +{sessions.length - limit} więcej w grafiku.
        </p>
      ) : null}
    </section>
  );
}
