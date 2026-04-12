import { Button } from "@/app/components/ui/button";
import {
  Plus,
  Pencil,
  Trash2,
  CalendarRange,
  Users,
  ClipboardList,
} from "lucide-react";

const personalPackages = [
  {
    name: "Standard 12",
    description: "1:1 individual training",
    price: "1800 PLN",
    unit: "150 PLN / session",
    volume: "12",
    volumeLabel: "sessions",
    tag: "Premium",
    accent: "neutral",
  },
  {
    name: "Intro 4",
    description: "Starter pack for new clients",
    price: "640 PLN",
    unit: "160 PLN / session",
    volume: "4",
    volumeLabel: "sessions",
    tag: "Popular",
    accent: "neutral",
  },
  {
    name: "Pro 24",
    description: "Maximum progression plan",
    price: "3120 PLN",
    unit: "130 PLN / session",
    volume: "24",
    volumeLabel: "sessions",
    tag: "Elite",
    accent: "neutral",
  },
];

const semiPackages = [
  {
    name: "Squad 8",
    description: "Small training group",
    price: "800 PLN",
    unit: "100 PLN / session",
    volume: "8",
    volumeLabel: "sessions",
    tag: "Group Max 4",
    accent: "success",
  },
  {
    name: "Squad 12",
    description: "Full month in group",
    price: "1080 PLN",
    unit: "90 PLN / session",
    volume: "12",
    volumeLabel: "sessions",
    tag: "Group Max 4",
    accent: "success",
  },
];

const consultationPackages = [
  {
    name: "FMS Assessment",
    description: "Movement pattern analysis",
    price: "250 PLN",
    unit: "One-time",
    volume: "1",
    volumeLabel: "session",
    tag: "Diagnostics",
    accent: "muted",
  },
  {
    name: "Nutrition Plan",
    description: "Custom diet strategy",
    price: "400 PLN",
    unit: "Project",
    volume: "∞",
    volumeLabel: "access",
    tag: "Diet",
    accent: "muted",
  },
];

function getTagStyles(accent: string) {
  if (accent === "success") {
    return "bg-tertiary-container text-tertiary-light";
  }

  if (accent === "muted") {
    return "bg-surface-container-high text-on-surface-variant";
  }

  return "bg-surface-container-high text-on-surface-variant";
}

function getVolumeStyles(accent: string) {
  if (accent === "success") {
    return "text-tertiary-light";
  }

  return "text-primary-light";
}

function SectionHeader({ title, label }: { title: string; label?: string }) {
  return (
    <div className="flex items-center gap-4">
      <p className="text-section-title shrink-0">{title}</p>
      <div className="h-px bg-white/10 flex-1" />
      {label ? (
        <span className="text-label text-on-surface-muted shrink-0">
          {label}
        </span>
      ) : null}
    </div>
  );
}

function PackageCard({
  item,
}: {
  item: {
    name: string;
    description: string;
    price: string;
    unit: string;
    volume: string;
    volumeLabel: string;
    tag: string;
    accent: string;
  };
}) {
  return (
    <div className="card-shell p-5 min-h-[228px] flex flex-col">
      <div className="flex items-start justify-between gap-3">
        <span
          className={`px-2.5 py-1 rounded-full text-[10px] font-medium leading-none ${getTagStyles(
            item.accent,
          )}`}
        >
          {item.tag}
        </span>

        <div className="flex items-center gap-3 text-on-surface-variant shrink-0">
          <button className="hover:text-on-surface transition-colors">
            <Pencil size={14} />
          </button>
          <button className="hover:text-on-surface transition-colors">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="mt-6">
        <p className="text-[1.1rem] leading-7 font-semibold">{item.name}</p>
        <p className="text-sm text-on-surface-variant mt-1 leading-6">
          {item.description}
        </p>
      </div>

      <div className="mt-auto pt-7 flex items-end justify-between gap-4">
        <div>
          <p className="text-[2rem] leading-none font-semibold tracking-tight">
            {item.price}
          </p>
          <p className="text-label text-on-surface-muted mt-2">{item.unit}</p>
        </div>

        <div className="text-right shrink-0">
          <p
            className={`text-[1.75rem] leading-none font-semibold ${getVolumeStyles(
              item.accent,
            )}`}
          >
            {item.volume}
          </p>
          <p className="text-label text-on-surface-muted mt-2">
            {item.volumeLabel}
          </p>
        </div>
      </div>
    </div>
  );
}

function MobilePackageCard({
  item,
  icon,
}: {
  item: {
    name: string;
    description: string;
    price: string;
    unit: string;
    volume: string;
    volumeLabel: string;
    tag: string;
    accent: string;
  };
  icon: React.ReactNode;
}) {
  return (
    <div className="card-shell p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p
            className={`text-label ${
              item.accent === "success"
                ? "text-tertiary-light"
                : "text-primary-light"
            }`}
          >
            {item.tag}
          </p>

          <p className="text-[1.9rem] leading-[1.05] font-semibold mt-3 max-w-[230px]">
            {item.name}
          </p>
        </div>

        <div className="h-12 w-12 rounded-[var(--radius-md)] bg-surface-container-high flex items-center justify-center text-on-surface-variant shrink-0">
          {icon}
        </div>
      </div>

      <div className="mt-6 flex items-end justify-between gap-4">
        <div>
          <p
            className={`text-[2.2rem] leading-none font-semibold tracking-tight ${
              item.accent === "success" ? "text-tertiary-light" : ""
            }`}
          >
            {item.price}
          </p>
          <p className="text-sm text-on-surface-variant mt-2">{item.unit}</p>
        </div>

        <div className="px-4 py-3 rounded-[var(--radius-md)] bg-surface-container-high text-right shrink-0 min-w-[110px]">
          <p className="text-[1.1rem] leading-none font-semibold">
            {item.volume} {item.volumeLabel}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function PackagesPage() {
  return (
    <div className="max-w-[1000px] mx-auto">
      {/* Desktop */}
      <div className="hidden md:block">
        <div className="flex flex-col gap-6">
          <div className="flex items-start justify-between gap-4">
            <div className="max-w-[560px]">
              <p className="text-label text-primary-light">
                Define your studio offer
              </p>
              <h1 className="mt-2 text-[2.25rem] leading-[0.95] mb-3 font-semibold font-display tracking-tight">
                Pakiety <span className="text-primary-light">Treningowe</span>
              </h1>
            </div>

            <Button
              variant="primary"
              icon={<Plus size={16} />}
              className="h-24"
            >
              Add New Package
            </Button>
          </div>

          <div className="flex flex-col gap-6">
            <section>
              <SectionHeader title="Personal" />
              <div className="mt-4 grid grid-cols-3 gap-4">
                {personalPackages.map((item) => (
                  <PackageCard key={item.name} item={item} />
                ))}
              </div>
            </section>

            <section>
              <SectionHeader title="Semi-personal" />
              <div className="mt-4 grid grid-cols-3 gap-4">
                {semiPackages.map((item) => (
                  <PackageCard key={item.name} item={item} />
                ))}

                <div className="opacity-0 pointer-events-none">
                  <div className="card-shell p-5 min-h-[228px]" />
                </div>
              </div>
            </section>

            <section>
              <SectionHeader title="Consultations" />
              <div className="mt-4 grid grid-cols-3 gap-4">
                {consultationPackages.map((item) => (
                  <PackageCard key={item.name} item={item} />
                ))}

                <div className="opacity-0 pointer-events-none">
                  <div className="card-shell p-5 min-h-[228px]" />
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* Mobile */}
      <div className="md:hidden px-1 pb-6">
        <div className="flex flex-col gap-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-page-title">Packages</p>
            </div>

            <div className="pt-2">
              <p className="text-label text-primary-light">Atlas</p>
            </div>
          </div>

          <button className="w-full bg-primary text-on-primary rounded-[var(--radius-lg)] px-5 py-5 font-semibold shadow-ambient flex items-center justify-between">
            <span className="text-lg">Add New Package</span>
            <span className="h-9 w-9 rounded-full bg-white/15 flex items-center justify-center">
              <Plus size={20} />
            </span>
          </button>

          <section>
            <div className="flex items-center justify-between">
              <p className="text-section-title">Personal Training</p>
              <p className="text-label text-primary-light">Prime</p>
            </div>

            <div className="mt-4 flex flex-col gap-4">
              {personalPackages.slice(0, 2).map((item) => (
                <MobilePackageCard
                  key={item.name}
                  item={item}
                  icon={<CalendarRange size={18} />}
                />
              ))}
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between">
              <p className="text-section-title">Semi-personal</p>
              <p className="text-label text-tertiary-light">Team</p>
            </div>

            <div className="mt-4 flex flex-col gap-4">
              {semiPackages.map((item) => (
                <MobilePackageCard
                  key={item.name}
                  item={item}
                  icon={<Users size={18} />}
                />
              ))}
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between">
              <p className="text-section-title">Consultations</p>
              <p className="text-label text-on-surface-muted">Support</p>
            </div>

            <div className="mt-4 flex flex-col gap-4">
              {consultationPackages.slice(0, 1).map((item) => (
                <MobilePackageCard
                  key={item.name}
                  item={item}
                  icon={<ClipboardList size={18} />}
                />
              ))}
            </div>
          </section>

          <button className="fixed right-5 bottom-24 h-16 w-16 rounded-[20px] bg-primary text-white shadow-ambient flex items-center justify-center z-20">
            <Plus size={28} />
          </button>
        </div>
      </div>
    </div>
  );
}
