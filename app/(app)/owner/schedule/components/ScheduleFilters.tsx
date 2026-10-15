"use client";

import { CircleDot, UserRound } from "lucide-react";
import { CustomSelect } from "@/app/components/ui/custom-select";
import type { Trainer } from "@/app/lib/owner/trainers";
import { scheduleStatusFilterOptions } from "../options";
import type { SessionStatusFilter } from "../types";

export default function ScheduleFilters({
  statusFilter,
  trainerFilter,
  trainers,
  visibleCount,
  onStatusFilterChange,
  onTrainerFilterChange,
}: {
  statusFilter: SessionStatusFilter;
  trainerFilter: string;
  trainers: Trainer[];
  visibleCount: number;
  onStatusFilterChange: (value: SessionStatusFilter) => void;
  onTrainerFilterChange: (value: string) => void;
}) {
  const trainerFilterOptions = [
    { value: "", label: "Wszyscy trenerzy" },
    ...trainers.map((trainer) => ({
      value: String(trainer.id),
      label: trainer.fullName || `${trainer.firstName} ${trainer.lastName}`,
    })),
  ];

  return (
    <div className="card-shell grid gap-2 p-2 sm:grid-cols-2 lg:grid-cols-[minmax(220px,280px)_minmax(220px,280px)_1fr] lg:items-center">
      <CustomSelect
        label="Status sesji"
        icon={<CircleDot size={16} />}
        value={statusFilter}
        options={scheduleStatusFilterOptions}
        onChange={(value) => onStatusFilterChange(value as SessionStatusFilter)}
      />
      <CustomSelect
        label="Trener"
        icon={<UserRound size={16} />}
        value={trainerFilter}
        options={trainerFilterOptions}
        onChange={onTrainerFilterChange}
      />
      <p className="px-2 text-sm text-on-surface-variant sm:col-span-2 lg:col-span-1 lg:text-right">
        Widoczne sesje: <span className="font-semibold text-on-surface">{visibleCount}</span>
      </p>
    </div>
  );
}
