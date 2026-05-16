"use client";

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
    <div className="card-shell grid gap-3 p-3 md:grid-cols-2 xl:grid-cols-[minmax(220px,280px)_minmax(220px,280px)_1fr] xl:items-center">
      <CustomSelect
        label="Status sesji"
        value={statusFilter}
        options={scheduleStatusFilterOptions}
        onChange={(value) => onStatusFilterChange(value as SessionStatusFilter)}
      />
      <CustomSelect
        label="Trener"
        value={trainerFilter}
        options={trainerFilterOptions}
        onChange={onTrainerFilterChange}
      />
      <div className="flex items-center justify-between rounded-[var(--radius-lg)] bg-surface-container-lowest px-4 py-3 text-sm text-on-surface-variant">
        <span>Widoczne sesje</span>
        <span className="font-semibold text-primary-light">{visibleCount}</span>
      </div>
    </div>
  );
}
