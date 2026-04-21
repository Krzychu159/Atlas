import { Button } from "@/app/components/ui/button";
import {
  Download,
  CalendarDays,
  Banknote,
  Users,
  UserPlus,
  CirclePlus,
  CalendarPlus,
  CircleDollarSign,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import TrainingCalendar from "@/app/components/TrainingCalendar";
import TodayScheduleCard from "@/app/components/TodayScheduleCard";
import { LogoutButton } from "@/app/components/logoutButton";

const boxes = [
  {
    title: "Monthly Revenue",
    value: "$24,500",
    change: "+12.5%",
    subtitle: "+$4.2k from last month",
    icon: <Banknote size={22} />,
  },
  {
    title: "Active Members",
    value: "48",
    change: "+5.2%",
    subtitle: "Current active clients",
    icon: <Users size={22} />,
  },
  {
    title: "New Signups",
    value: "12",
    change: "+2.1%",
    subtitle: "Last 30 days",
    icon: <UserPlus size={22} />,
  },
];

const topTrainers = [
  {
    name: "Jordan Davis",
    role: "HIIT & Strength",
    sessions: 142,
  },
  {
    name: "Sarah Rivera",
    role: "Yoga & Mobility",
    sessions: 128,
  },
  {
    name: "Marcus Chen",
    role: "Boxing & Cardio",
    sessions: 115,
  },
];

const quickActions = [
  {
    title: "Add New Member",
    description: "Register client to the system",
    icon: <CirclePlus size={18} />,
  },
  {
    title: "Schedule Session",
    description: "Open training calendar",
    icon: <CalendarPlus size={18} />,
  },
  {
    title: "Change Packages",
    description: "Update client subscription",
    icon: <CircleDollarSign size={18} />,
  },
];

function DashboardStatCard({
  title,
  value,
  change,
  subtitle,
  icon,
}: {
  title: string;
  value: string;
  change: string;
  subtitle: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="card-shell p-5 md:p-6 h-full">
      <div className="flex justify-between items-start">
        <div className="text-primary-light bg-surface-container-low p-3 rounded-2xl h-fit">
          {icon}
        </div>

        <p className="text-success-toast-text text-label-sm bg-green-900/70 rounded-full px-2.5 py-1 h-fit">
          {change}
        </p>
      </div>

      <div className="flex flex-col gap-2 mt-5">
        <p className="text-sm md:text-base text-on-surface-variant">{title}</p>
        <p className="text-[2rem] md:text-4xl font-semibold leading-none tracking-tight">
          {value}
        </p>
        <p className="text-label text-primary-light mt-1">{subtitle}</p>
      </div>
    </div>
  );
}

function MobileMiniStat({
  title,
  value,
  change,
}: {
  title: string;
  value: string;
  change: string;
}) {
  return (
    <div className="card-shell p-5">
      <p className="text-label text-on-surface-variant">{title}</p>
      <div className="mt-4 flex items-end justify-between gap-3">
        <p className="text-[2.4rem] font-semibold leading-none tracking-tight">
          {value}
        </p>
        <p className="text-sm font-medium text-success-toast-text">{change}</p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <div className="max-w-[1000px] mx-auto">
      {/* Desktop */}
      <div className="hidden md:block">
        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-5">
          <div className="max-w-[560px]">
            <p className="text-label text-primary-light">Performance Hub</p>
            <h1 className="mt-2 text-[2.25rem] leading-[0.95] mb-3 font-semibold font-display tracking-tight">
              Dashboard <span className="text-primary-light">Overview</span>
            </h1>
            <LogoutButton />
          </div>

          <div className="flex gap-4 ">
            <Button
              variant="secondary"
              icon={<CalendarDays size={16} />}
              className="h-16"
            >
              Last 30 Days
            </Button>

            <Button
              variant="primary"
              icon={<Download size={16} className="h-16" />}
            >
              Export Reports
            </Button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-4">
          {boxes.map((box, index) => (
            <DashboardStatCard
              key={index}
              title={box.title}
              value={box.value}
              change={box.change}
              subtitle={box.subtitle}
              icon={box.icon}
            />
          ))}

          <div className="col-span-2">
            <TodayScheduleCard />
          </div>

          <div className="card-shell p-6">
            <p className="text-section-title">Quick Actions</p>

            <div className="flex flex-col gap-4 mt-5">
              {quickActions.map((action) => (
                <div
                  key={action.title}
                  className="bg-surface-container-low rounded-2xl p-3 flex gap-3 items-center"
                >
                  <div className="bg-surface-container p-3 rounded-xl text-primary-light shrink-0">
                    {action.icon}
                  </div>

                  <div className="min-w-0">
                    <p className="text-base font-medium truncate">
                      {action.title}
                    </p>
                    <p className="text-xs text-on-surface-variant truncate">
                      {action.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="col-span-2 card-shell p-6">
            <div className="flex items-center justify-between">
              <p className="text-section-title">Top Trainers</p>
              <Link href="/trainers" className="text-label text-primary-light">
                View All
              </Link>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-3">
              {topTrainers.map((trainer) => (
                <div
                  key={trainer.name}
                  className="bg-surface-container-low rounded-2xl px-4 py-4"
                >
                  <p className="text-base font-semibold">{trainer.name}</p>
                  <p className="text-sm text-on-surface-variant mt-1">
                    {trainer.role}
                  </p>

                  <div className="mt-4">
                    <p className="text-2xl font-semibold leading-none">
                      {trainer.sessions}
                    </p>
                    <p className="text-label text-on-surface-muted mt-1">
                      Sessions
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card-shell p-6 bg-tertiary-container">
            <p className="text-section-title text-tertiary-light">Retention</p>
            <p className="text-sm text-green-100/80 mt-3 leading-6">
              Your studio retention is up by 4.2% this month.
            </p>

            <div className="mt-5 h-2 w-full rounded-full bg-white/15 overflow-hidden">
              <div className="h-full w-[78%] rounded-full bg-tertiary-light" />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile */}
      <div className="md:hidden px-1 pb-6">
        <div className="flex flex-col gap-5">
          <div>
            <p className="text-label text-primary-light">Morning, Coach</p>
            <p className="text-page-title mt-2">Atlas Dashboard</p>
          </div>

          <div className="flex flex-col gap-3">
            <Button
              variant="secondary"
              icon={<CalendarDays size={16} />}
              className="w-fit"
            >
              Last 30 Days
            </Button>

            <Button
              variant="primary"
              icon={<Download size={16} />}
              className="w-fit"
            >
              Generate Report
            </Button>
          </div>

          <div className="space-y-4">
            <MobileMiniStat
              title="Total Revenue"
              value="$42.8k"
              change="+12%"
            />

            <div className="card-shell p-5">
              <p className="text-label text-on-surface-variant">
                Active Members
              </p>

              <div className="mt-4 flex items-end gap-2">
                <p className="text-[2.4rem] font-semibold leading-none tracking-tight">
                  1,284
                </p>
                <p className="text-sm text-on-surface-variant mb-1">
                  / 1,500 cap
                </p>
              </div>

              <div className="mt-5 h-1.5 w-full rounded-full bg-surface-container-lowest overflow-hidden">
                <div className="h-full w-[82%] rounded-full bg-primary" />
              </div>
            </div>

            <div className="card-shell p-5">
              <p className="text-label text-on-surface-variant">New Signups</p>

              <div className="mt-4 flex items-end gap-3">
                <p className="text-[2.4rem] font-semibold leading-none tracking-tight">
                  84
                </p>
                <div className="flex -space-x-2 mb-1">
                  <div className="h-8 w-8 rounded-full bg-surface-container-high border-2 border-surface" />
                  <div className="h-8 w-8 rounded-full bg-surface-container-high border-2 border-surface" />
                  <div className="h-8 w-8 rounded-full bg-surface-container-high border-2 border-surface" />
                  <div className="h-8 min-w-8 px-2 rounded-full bg-surface-container-high border-2 border-surface text-[10px] flex items-center justify-center text-on-surface-variant">
                    +12
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <p className="text-section-title">Top Trainers</p>
              <Link href="/trainers" className="text-label text-primary-light">
                View All
              </Link>
            </div>

            <div className="card-shell p-4 mt-4">
              {topTrainers.map((trainer, index) => (
                <div
                  key={trainer.name}
                  className={`flex items-center justify-between gap-3 py-3 ${
                    index !== topTrainers.length - 1
                      ? "border-b border-white/5"
                      : ""
                  }`}
                >
                  <div className="min-w-0">
                    <p className="text-base font-semibold truncate">
                      {trainer.name}
                    </p>
                    <p className="text-sm text-on-surface-variant truncate">
                      {trainer.role}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-2xl font-semibold leading-none">
                      {trainer.sessions}
                    </p>
                    <p className="text-label text-on-surface-muted mt-1">
                      Sessions
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-section-title">Quick Actions</p>

            <div className="mt-4 flex flex-col gap-4">
              {quickActions.map((action) => (
                <button
                  key={action.title}
                  className="card-shell p-4 flex items-center justify-between gap-4 text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-12 w-12 rounded-full bg-surface-container-high flex items-center justify-center text-primary-light shrink-0">
                      {action.icon}
                    </div>

                    <div className="min-w-0">
                      <p className="text-base font-medium truncate">
                        {action.title}
                      </p>
                      <p className="text-sm text-on-surface-variant truncate">
                        {action.description}
                      </p>
                    </div>
                  </div>

                  <ChevronRight
                    size={18}
                    className="text-on-surface-variant shrink-0"
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="card-shell p-5 bg-tertiary-container">
            <p className="text-section-title text-tertiary-light">
              Member Retention
            </p>
            <p className="mt-3 text-sm leading-6 text-green-100/80">
              Your studio retention is up by 4.2% this month.
            </p>

            <div className="mt-5 h-2 w-full rounded-full bg-white/15 overflow-hidden">
              <div className="h-full w-[93%] rounded-full bg-tertiary-light" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
