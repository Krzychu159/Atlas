import {
  Search,
  Plus,
  MoreVertical,
  CalendarDays,
  ShieldAlert,
  UserPlus,
} from "lucide-react";

const clients = [
  {
    name: "Adrian Kowalski",
    goal: "Reduction",
    trainer: "Marek W.",
    progress: 72,
    billing: "Paid",
    status: "active",
    initials: "AK",
    next: "Today, 18:30",
  },
  {
    name: "Marta Nowak",
    goal: "Muscle Gain",
    trainer: "Anna K.",
    progress: 45,
    billing: "Overdue",
    status: "warning",
    initials: "MN",
    next: "Tomorrow, 08:00",
  },
  {
    name: "Tomasz Bąk",
    goal: "Endurance",
    trainer: "Marek W.",
    progress: 88,
    billing: "Paid",
    status: "active",
    initials: "TB",
    next: "Fri, 17:15",
  },
  {
    name: "Karolina Lis",
    goal: "Post Injury",
    trainer: "Anna K.",
    progress: 12,
    billing: "Pending",
    status: "pending",
    initials: "KL",
    next: "Status: Pending",
  },
];

const mobileClients = [
  {
    name: "Adam Marciniak",
    goal: "Strength",
    tag: "Pro",
    status: "normal",
    initials: "AM",
    next: "Next: Today, 18:30",
    icon: "calendar",
  },
  {
    name: "Ewa Kowalska",
    goal: "Reduction",
    tag: "",
    status: "normal",
    initials: "EK",
    next: "Next: Tomorrow, 07:00",
    icon: "calendar",
  },
  {
    name: "Tomasz Rybak",
    goal: "Mass",
    tag: "Injury",
    status: "danger",
    initials: "TR",
    next: "Status: Suspended",
    icon: "alert",
  },
  {
    name: "Piotr Nowak",
    goal: "Mobility",
    tag: "",
    status: "normal",
    initials: "PN",
    next: "Next: Fri, 16:00",
    icon: "calendar",
  },
];

function getBillingStyles(billing: string) {
  if (billing === "Paid") {
    return "bg-tertiary-container text-tertiary-light";
  }

  if (billing === "Overdue") {
    return "bg-error-container text-error-light";
  }

  return "bg-surface-container-high text-on-surface-variant";
}

function getGoalStyles(goal: string) {
  if (
    goal === "Reduction" ||
    goal === "Strength" ||
    goal === "Mass" ||
    goal === "Mobility"
  ) {
    return "bg-tertiary-container text-tertiary-light";
  }

  return "bg-surface-container-high text-on-surface-variant";
}

function ClientDesktopCard({
  name,
  goal,
  trainer,
  progress,
  billing,
  initials,
}: {
  name: string;
  goal: string;
  trainer: string;
  progress: number;
  billing: string;
  initials: string;
}) {
  return (
    <div className="card-shell p-5">
      <div className="flex gap-4">
        <div className="h-24 w-24 rounded-[var(--radius-lg)] bg-surface-container-low flex items-center justify-center shrink-0">
          <div className="h-14 w-14 rounded-[var(--radius-md)] bg-primary/15 flex items-center justify-center text-primary-light text-xl font-semibold">
            {initials}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[1.75rem] leading-none font-semibold truncate">
                {name}
              </p>

              <div className="flex flex-wrap gap-2 mt-3">
                <span
                  className={`px-2.5 py-1 rounded-full text-[11px] font-medium leading-none ${getGoalStyles(
                    goal,
                  )}`}
                >
                  Goal: {goal}
                </span>

                <span className="px-2.5 py-1 rounded-full text-[11px] font-medium leading-none bg-surface-container-high text-on-surface-variant">
                  Trainer: {trainer}
                </span>
              </div>
            </div>

            <span
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium leading-none shrink-0 ${getBillingStyles(
                billing,
              )}`}
            >
              {billing}
            </span>
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-label text-on-surface-variant">Progress</p>
              <p className="text-base font-semibold">{progress}%</p>
            </div>

            <div className="h-2 w-full rounded-full bg-surface-container-lowest overflow-hidden">
              <div
                className="h-full rounded-full bg-primary-gradient"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ClientMobileCard({
  name,
  goal,
  tag,
  status,
  initials,
  next,
  icon,
}: {
  name: string;
  goal: string;
  tag: string;
  status: string;
  initials: string;
  next: string;
  icon: "calendar" | "alert";
}) {
  return (
    <div className="card-shell p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex gap-4 min-w-0">
          <div className="h-16 w-16 rounded-[var(--radius-lg)] bg-surface-container-low flex items-center justify-center shrink-0">
            <div className="text-primary-light text-2xl font-semibold">
              {initials}
            </div>
          </div>

          <div className="min-w-0">
            <p className="text-[1.05rem] leading-6 font-semibold truncate">
              {name}
            </p>

            <div className="flex flex-wrap gap-2 mt-3">
              <span
                className={`px-3 py-1 rounded-full text-[11px] font-medium leading-none ${getGoalStyles(
                  goal,
                )}`}
              >
                {goal}
              </span>

              {tag ? (
                <span
                  className={`px-3 py-1 rounded-full text-[11px] font-medium leading-none ${
                    status === "danger"
                      ? "bg-error text-white"
                      : "bg-surface-container-high text-on-surface-variant"
                  }`}
                >
                  {tag}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <button className="text-on-surface-muted shrink-0">
          <MoreVertical size={18} />
        </button>
      </div>

      <div className="mt-5 h-px bg-white/5" />

      <div className="mt-4 flex items-center gap-3 text-on-surface-variant">
        {icon === "calendar" ? (
          <CalendarDays size={16} className="shrink-0" />
        ) : (
          <ShieldAlert size={16} className="shrink-0" />
        )}

        <p className="text-sm">{next}</p>
      </div>
    </div>
  );
}

export default function ClientsPage() {
  return (
    <div className="max-w-[1000px] mx-auto">
      {/* Desktop */}
      <div className="hidden md:block">
        <div className="flex flex-col gap-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <p className="text-page-title">Clients</p>
                <span className="px-3 py-1 rounded-full bg-surface-container text-on-surface-variant text-sm">
                  1,248 total
                </span>
              </div>

              <p className="mt-2 text-base text-on-surface-variant">
                Manage your athletes, track their goals, and monitor client
                momentum.
              </p>
            </div>

            <button className="bg-primary text-on-primary rounded-[var(--radius-lg)] px-6 py-4 font-semibold shadow-ambient flex items-center gap-3 shrink-0">
              <UserPlus size={18} />
              Add Client
            </button>
          </div>

          <div className="flex items-center gap-4">
            <div className="card-shell p-3 flex items-center gap-3 flex-1">
              <Search size={18} className="text-on-surface-variant shrink-0" />
              <input
                placeholder="Search by surname, email, or goal..."
                className="w-full bg-transparent outline-none text-sm text-on-surface placeholder:text-on-surface-muted"
              />
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button className="h-14 px-6 rounded-[var(--radius-lg)] bg-surface-container-low text-on-primary ghost-border">
                Active
              </button>
              <button className="h-14 px-6 rounded-[var(--radius-lg)] bg-surface-container text-on-surface-variant">
                Suspended
              </button>
              <button className="h-14 px-6 rounded-[var(--radius-lg)] bg-surface-container text-on-surface-variant">
                New
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {clients.map((client) => (
              <ClientDesktopCard
                key={client.name}
                name={client.name}
                goal={client.goal}
                trainer={client.trainer}
                progress={client.progress}
                billing={client.billing}
                initials={client.initials}
              />
            ))}
          </div>

          <div className="grid grid-cols-[330px_1fr] gap-4">
            <div className="card-shell p-6">
              <p className="text-section-title">Recent Activity</p>

              <div className="mt-5 flex flex-col gap-5">
                <div className="flex gap-3">
                  <div className="w-1 rounded-full bg-tertiary-light" />
                  <div>
                    <p className="text-base">Adrian K. completed training</p>
                    <p className="text-label text-on-surface-muted mt-1">
                      15 min ago
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-1 rounded-full bg-primary-light" />
                  <div>
                    <p className="text-base">New payment from Marta N.</p>
                    <p className="text-label text-on-surface-muted mt-1">
                      2 hours ago
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="card-shell p-6 flex items-center justify-between gap-6">
              <div>
                <p className="text-section-title">Database Performance</p>
                <p className="mt-4 text-[3.5rem] leading-none font-semibold font-display text-primary-light">
                  84%
                </p>
                <p className="mt-3 text-base text-on-surface-variant max-w-[340px] leading-7">
                  Average progress of your clients increased by 12% this month.
                </p>
              </div>

              <div className="flex items-end gap-2 shrink-0 self-end">
                <div className="w-4 h-8 rounded-full bg-primary/40" />
                <div className="w-4 h-12 rounded-full bg-primary/50" />
                <div className="w-4 h-16 rounded-full bg-primary/65" />
                <div className="w-4 h-20 rounded-full bg-primary/80" />
                <div className="w-4 h-24 rounded-full bg-primary" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile */}
      <div className="md:hidden px-1 pb-6">
        <div className="flex flex-col gap-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-page-title">Clients</p>
              <div className="mt-3 h-1 w-24 rounded-full bg-primary" />
            </div>

            <div className="pt-3 text-right">
              <p className="text-label text-on-surface-variant">24 active</p>
            </div>
          </div>

          <div className="card-shell p-4 flex items-center gap-3">
            <Search size={18} className="text-on-surface-variant shrink-0" />
            <input
              placeholder="Search client..."
              className="w-full bg-transparent outline-none text-sm text-on-surface placeholder:text-on-surface-muted"
            />
          </div>

          <div className="flex flex-col gap-4">
            {mobileClients.map((client) => (
              <ClientMobileCard
                key={client.name}
                name={client.name}
                goal={client.goal}
                tag={client.tag}
                status={client.status}
                initials={client.initials}
                next={client.next}
                icon={client.icon as "calendar" | "alert"}
              />
            ))}
          </div>

          <button className="fixed right-5 bottom-24 h-20 w-20 rounded-[24px] bg-primary-gradient text-white shadow-ambient flex items-center justify-center z-20">
            <Plus size={32} />
          </button>
        </div>
      </div>
    </div>
  );
}
