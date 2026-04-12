import Link from "next/link";

const todaySchedule = [
  {
    id: "1",
    title: "Cross Training",
    time: "08:00 - 09:00",
    trainer: "Marcus Chen",
    type: "Group",
  },
  {
    id: "2",
    title: "Yoga Flow",
    time: "10:00 - 11:00",
    trainer: "Sarah Jenkins",
    type: "Mobility",
  },
  {
    id: "3",
    title: "Personal Session",
    time: "12:30 - 13:30",
    trainer: "David Chen",
    type: "1:1",
  },
];

export default function TodayScheduleCard() {
  return (
    <div className="card-shell p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-section-title">Today Schedule</p>
          <p className="text-sm text-on-surface-variant mt-2">
            5 sessions planned for today
          </p>
        </div>

        <Link href="/schedule" className="text-label text-primary-light">
          View Full
        </Link>
      </div>

      <div className="mt-5 flex flex-col gap-3">
        {todaySchedule.map((session) => (
          <div
            key={session.id}
            className="bg-surface-container-low rounded-2xl px-4 py-3 flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-4 min-w-0">
              <div className="shrink-0 rounded-xl bg-surface-container-high px-3 py-2 min-w-[112px] text-center">
                <p className="text-xs text-primary-light font-medium">
                  {session.time}
                </p>
              </div>

              <div className="min-w-0">
                <p className="text-base font-semibold truncate">
                  {session.title}
                </p>
                <p className="text-sm text-on-surface-variant truncate">
                  {session.trainer}
                </p>
              </div>
            </div>

            <div className="shrink-0 px-3 py-1 rounded-full bg-surface-container-high text-on-surface-variant text-[11px] font-medium">
              {session.type}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
