import { BadgeCheck, Clock3, Dumbbell, Star, Users } from "lucide-react";
import type { Trainer } from "@/app/lib/owner/trainers";

function StatBox({
  label,
  value,
  icon,
  highlight = false,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div className="bg-surface-container rounded-[var(--radius-lg)] p-5">
      <div className="text-on-surface-muted">{icon}</div>
      <p
        className={`mt-5 text-[2rem] leading-none font-semibold ${
          highlight ? "text-tertiary-light" : "text-on-surface"
        }`}
      >
        {value}
      </p>
      <p className="mt-3 text-label text-on-surface-variant">{label}</p>
    </div>
  );
}

export default function TrainerProfileStats({ trainer }: { trainer: Trainer }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
      <StatBox
        label="Sesje"
        value={trainer.sessionsCount ?? 0}
        icon={<Dumbbell size={22} />}
      />

      <StatBox
        label="Ocena"
        value={trainer.ratingAverage ? trainer.ratingAverage.toFixed(1) : "0.0"}
        icon={<Star size={22} />}
        highlight
      />

      <StatBox
        label="Doświadczenie"
        value={`${trainer.experienceYears ?? 0} lat`}
        icon={<Clock3 size={22} />}
      />

      <StatBox
        label="Aktywni klienci"
        value={trainer.activeClientsCount ?? 0}
        icon={<Users size={22} />}
      />

      <StatBox
        label="Stawka"
        value={`${trainer.hourlyRate ?? 0} zł`}
        icon={<BadgeCheck size={22} />}
      />
    </div>
  );
}
