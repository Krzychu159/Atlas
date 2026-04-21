import { Button } from "@/app/components/ui/button";
import {
  Search,
  SlidersHorizontal,
  Star,
  Clock3,
  Dumbbell,
  UserPlus,
  ChevronRight,
  Plus,
} from "lucide-react";

const trainers = [
  {
    name: "Sarah Jenkins",
    role: "Yoga & Mobility",
    sessions: 142,
    rating: "4.9",
    exp: "6y",
    status: "Active",
    badge: "SJ",
  },
  {
    name: "Marcus Thorne",
    role: "Strength & Conditioning",
    sessions: 318,
    rating: "5.0",
    exp: "12y",
    status: "Active",
    badge: "MT",
  },
  {
    name: "Elena Rossi",
    role: "HIIT & Cardio Engine",
    sessions: 89,
    rating: "4.7",
    exp: "3y",
    status: "On Leave",
    badge: "ER",
  },
  {
    name: "David Chen",
    role: "Rehabilitation & PT",
    sessions: 256,
    rating: "4.9",
    exp: "8y",
    status: "Active",
    badge: "DC",
  },
];

function getStatusStyles(status: string) {
  if (status === "Active") {
    return "bg-tertiary-container text-tertiary-light";
  }

  if (status === "On Leave") {
    return "bg-surface-container-high text-on-surface-variant";
  }

  return "bg-surface-container-high text-on-surface-variant";
}

export default function TrainersPage() {
  return (
    <div className="max-w-[1000px] mx-auto">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="max-w-[560px]">
            <p className="text-label text-primary-light">Coaching Staff</p>
            <h1 className="mt-2 text-[2.25rem] leading-[0.95] mb-3 font-semibold font-display tracking-tight">
              Trainer <span className="text-primary-light">Directory</span>
            </h1>
          </div>

          <div className="flex gap-3 shrink-0">
            <div className="bg-surface-container rounded-[var(--radius-lg)] px-4 py-3 min-w-[130px]">
              <div className="flex items-center gap-2">
                <p className="text-2xl font-semibold leading-none">12</p>
                <p className="text-sm text-on-surface-variant">Active Staff</p>
              </div>
            </div>

            <div className="bg-tertiary-container/70 rounded-[var(--radius-lg)] px-4 py-3 min-w-[150px]">
              <div className="flex items-center gap-2">
                <p className="text-2xl font-semibold leading-none text-tertiary-light">
                  98%
                </p>
                <p className="text-sm text-on-surface-variant">Rating Avg</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-surface-container rounded-[var(--radius-lg)] p-3 flex items-center gap-3">
          <div className="flex-1 flex items-center gap-3 bg-surface-container-low rounded-[var(--radius-lg)] px-4 py-3">
            <Search size={16} className="text-on-surface-variant shrink-0" />
            <input
              placeholder="Search trainers, certifications..."
              className="w-full bg-transparent outline-none text-sm text-on-surface placeholder:text-on-surface-muted"
            />
          </div>

          <Button variant="secondary" icon={<SlidersHorizontal size={14} />}>
            Filters
          </Button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_290px] gap-4 items-start">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {trainers.map((trainer) => (
              <div
                key={trainer.name}
                className="bg-surface-container rounded-[var(--radius-lg)] p-5"
              >
                <div className="flex items-start gap-4">
                  <div className="h-14 w-14 rounded-[var(--radius-md)] bg-surface-container-low flex items-center justify-center shrink-0">
                    <div className="h-9 w-9 rounded-[var(--radius-md)] bg-surface-container-high flex items-center justify-center text-xs font-semibold text-primary-light">
                      {trainer.badge}
                    </div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="text-[17px] leading-6 font-semibold truncate">
                      {trainer.name}
                    </h3>

                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                      <span
                        className={`px-2 py-1 rounded-full text-[11px] font-medium leading-none ${getStatusStyles(
                          trainer.status,
                        )}`}
                      >
                        {trainer.status}
                      </span>
                    </div>

                    <p className="mt-2 text-on-surface-variant text-sm leading-5">
                      {trainer.role}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mt-3">
                  <div className="bg-surface-container-low rounded-[var(--radius-md)] px-3 py-3">
                    <div className="flex items-center gap-1.5 text-on-surface-muted">
                      <Dumbbell size={12} />
                      <p className="text-[11px] uppercase tracking-wide">
                        Sessions
                      </p>
                    </div>
                    <p className="mt-3 text-[18px] font-semibold leading-none">
                      {trainer.sessions}
                    </p>
                  </div>

                  <div className="bg-surface-container-low rounded-[var(--radius-md)] px-3 py-3">
                    <div className="flex items-center gap-1.5 text-on-surface-muted">
                      <Star size={12} />
                      <p className="text-[11px] uppercase tracking-wide">
                        Rating
                      </p>
                    </div>
                    <p className="mt-3 text-[18px] font-semibold leading-none text-tertiary-light">
                      {trainer.rating}
                    </p>
                  </div>

                  <div className="bg-surface-container-low rounded-[var(--radius-md)] px-3 py-3">
                    <div className="flex items-center gap-1.5 text-on-surface-muted">
                      <Clock3 size={12} />
                      <p className="text-[11px] uppercase tracking-wide">
                        Exp.
                      </p>
                    </div>
                    <p className="mt-3 text-[18px] font-semibold leading-none">
                      {trainer.exp}
                    </p>
                  </div>
                </div>

                <button className="w-full mt-3 rounded-[var(--radius-md)] bg-surface-container-low hover:bg-surface-container-high transition-colors px-4 py-3 flex items-center justify-center gap-2 text-sm font-medium">
                  View Profile
                  <ChevronRight size={14} />
                </button>
              </div>
            ))}
          </div>

          <div className="bg-surface-container rounded-[var(--radius-lg)] p-5">
            <div>
              <h2 className="text-[18px] leading-6 font-semibold">
                Onboard Staff
              </h2>
              <p className="mt-3 text-sm leading-6 text-on-surface-variant">
                Add a new professional to your studio directory.
              </p>
            </div>

            <div className="mt-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-2 text-[11px] uppercase tracking-[0.05em] text-on-surface-variant">
                    First Name
                  </label>
                  <input
                    placeholder="e.g. John"
                    className="w-full bg-surface-container-low rounded-[var(--radius-md)] px-4 py-3 text-sm outline-none placeholder:text-on-surface-muted"
                  />
                </div>

                <div>
                  <label className="block mb-2 text-[11px] uppercase tracking-[0.05em] text-on-surface-variant">
                    Last Name
                  </label>
                  <input
                    placeholder="e.g. Doe"
                    className="w-full bg-surface-container-low rounded-[var(--radius-md)] px-4 py-3 text-sm outline-none placeholder:text-on-surface-muted"
                  />
                </div>
              </div>

              <div>
                <label className="block mb-2 text-[11px] uppercase tracking-[0.05em] text-on-surface-variant">
                  Email Address
                </label>
                <input
                  placeholder="trainer@atlas-crm.com"
                  className="w-full bg-surface-container-low rounded-[var(--radius-md)] px-4 py-3 text-sm outline-none placeholder:text-on-surface-muted"
                />
              </div>

              <div>
                <label className="block mb-2 text-[11px] uppercase tracking-[0.05em] text-on-surface-variant">
                  Department
                </label>
                <select className="w-full bg-surface-container-low rounded-[var(--radius-md)] px-4 py-3 text-sm outline-none">
                  <option>Personal Training</option>
                  <option>Strength & Conditioning</option>
                  <option>Mobility</option>
                  <option>Rehabilitation</option>
                </select>
              </div>

              <Button
                variant="primary"
                icon={<UserPlus size={14} />}
                className="w-full justify-center"
              >
                Create Trainer Profile
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
