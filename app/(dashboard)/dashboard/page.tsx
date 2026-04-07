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
} from "lucide-react";
import Link from "next/link";
import TrainingCalendar from "@/app/components/TrainingCalendar";

const boxes = [
  {
    title: "Monthly Revenue",
    value: "$24,500",
    change: "+12.5%",
    icon: <Banknote size={24} />,
  },
  {
    title: "Active Members",
    value: "48",
    change: "+5.2%",
    icon: <Users size={24} />,
  },
  {
    title: "New Signups",
    value: "12",
    change: "+2.1%",
    icon: <UserPlus size={24} />,
  },
];

export default function DashboardPage() {
  return (
    <div className="max-w-[1000px] mx-auto ">
      <div className="flex flex-col md:flex-row md:justify-between">
        <div>
          <p className="text-label text-primary-light">Performance Hub</p>
          <p className="text-3xl font-semibold">Dashboard Overview</p>
        </div>
        <div className="flex gap-5 mt-4 md:mt-0">
          <Button variant="secondary" icon={<CalendarDays size={16} />}>
            Last 30 Days
          </Button>

          <Button variant="primary" icon={<Download size={16} />}>
            Export Reports
          </Button>
        </div>
      </div>

      {/* Desktop */}
      {/* Desktop */}
      <div className="hidden md:block">
        <div className="mt-6 grid grid-cols-3 gap-4">
          {boxes.slice(0, 3).map((box, index) => (
            <div
              className="bg-surface-container p-6 shadow-soft w-full rounded-2xl"
              key={index}
            >
              <div className="flex justify-between">
                <div className="text-primary-light bg-surface-container-low p-3 rounded-2xl h-fit">
                  {box.icon}
                </div>
                <p className="text-success-toast-text text-label-sm bg-green-900 rounded-2xl p-1 px-2 h-fit">
                  {box.change}
                </p>
              </div>

              <div className=" flex flex-col gap-2">
                <p className="text-headline-md text-on-surface-muted mt-4">
                  {box.title}
                </p>
                <p className="text-4xl font-semibold mt-1">{box.value}</p>
                <p className="text-label text-primary-light mt-2">
                  {box.change} from last month
                </p>
              </div>
            </div>
          ))}

          {/* Week Overview */}
          <div className="col-span-2 bg-surface-container p-6 shadow-soft rounded-2xl">
            <div className="flex justify-between">
              <div>
                <p className="text-headline-sm">Week Overview</p>
              </div>
              <Link
                href="/schedule"
                className="text-label text-primary-light h-fit"
              >
                Check more
              </Link>
            </div>

            <div className="mt-2 text-sm text-on-surface-variant ">
              <TrainingCalendar />
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-surface-container p-6 shadow-soft rounded-2xl">
            <p className="text-headline-sm">Quick Actions</p>
            <div className="flex flex-col gap-5 mt-5">
              <div className="bg-surface-container-low rounded-2xl p-3 flex gap-3 items-center">
                <div className="bg-surface-container p-3 rounded-xl text-primary-light">
                  <CirclePlus size={24} />
                </div>
                <div>
                  <p className="text-lg">Add new member</p>
                  <p className="text-xs text-on-surface-variant">
                    Register client to the system
                  </p>
                </div>
              </div>
              <div className="bg-surface-container-low rounded-2xl p-3 flex gap-3 items-center">
                <div className="bg-surface-container p-3 rounded-xl text-primary-light">
                  <CalendarPlus size={24} />
                </div>
                <div>
                  <p className="text-lg">Schedule Session</p>
                  <p className="text-xs text-on-surface-variant">
                    Add a new session in calendar
                  </p>
                </div>
              </div>
              <div className="bg-surface-container-low rounded-2xl p-3 flex gap-3 items-center">
                <div className="bg-surface-container p-3 rounded-xl text-primary-light">
                  <CircleDollarSign size={24} />
                </div>
                <div>
                  <p className="text-lg">Change packages</p>
                  <p className="text-xs text-on-surface-variant">
                    Update client subscription
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile */}
      <div className="md:hidden">
        <div className="flex w100% gap-4 mt-6">
          {boxes.map((box, index) => (
            <div
              className="bg-surface-container px-6 py-8 shadow-soft w-full rounded-2xl"
              key={index}
            >
              <div className="flex justify-between">
                <div className="text-primary-light bg-surface-container-low p-3 rounded-2xl h-fit">
                  {" "}
                  {box.icon}
                </div>
                <p className="text-success-toast-text text-label-sm bg-green-900 rounded-2xl p-1 px-2 h-fit">
                  {box.change}
                </p>
              </div>
              <div className="mt-6 flex flex-col gap-2">
                <p className="text-xl text-on-surface-muted mt-4">
                  {box.title}
                </p>
                <p className="text-4xl font-semibold mt-1">{box.value}</p>
                <p className="text-label text-primary-light mt-2">
                  {box.change} from last month
                </p>
              </div>
            </div>
          ))}
        </div>
        <div>
          <div></div>
        </div>
      </div>
    </div>
  );
}
