"use client";

import { CircleDot, SlidersHorizontal, UserRound } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { CustomSelect } from "@/app/components/ui/custom-select";
import type { Trainer } from "@/app/lib/owner/trainers";
import { scheduleStatusFilterOptions } from "../options";
import type { SessionStatusFilter } from "../types";

export const DEFAULT_SCHEDULE_STATUS_FILTER: SessionStatusFilter = "without-cancelled";
export const SCHEDULE_FILTERS_PANEL_ID = "schedule-filters";

export function countScheduleFilters(statusFilter: SessionStatusFilter, trainerFilter: string) {
  return (statusFilter !== DEFAULT_SCHEDULE_STATUS_FILTER ? 1 : 0) + (trainerFilter ? 1 : 0);
}

/** Phone-only toggle; on larger screens the filters are always visible. */
export function ScheduleFiltersToggle({
  open,
  activeCount,
  onOpenChange,
}: {
  open: boolean;
  activeCount: number;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpenChange(!open)}
      aria-expanded={open}
      aria-controls={SCHEDULE_FILTERS_PANEL_ID}
      className={[
        "flex h-12 shrink-0 items-center gap-2 rounded-[var(--radius-lg)] px-4 text-sm font-semibold transition focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--color-primary-light)] md:hidden",
        open ? "bg-primary text-on-primary" : "bg-surface-container text-on-surface hover:bg-surface-container-high",
      ].join(" ")}
    >
      <SlidersHorizontal size={16} aria-hidden="true" />
      Filtry
      {activeCount > 0 ? (
        <span className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${open ? "bg-on-primary/20 text-on-primary" : "bg-primary text-on-primary"}`}>
          {activeCount}
          <span className="sr-only"> aktywne</span>
        </span>
      ) : null}
    </button>
  );
}

export default function ScheduleFilters({
  statusFilter,
  trainerFilter,
  trainers,
  visibleCount,
  mobileOpen,
  onStatusFilterChange,
  onTrainerFilterChange,
  onClear,
}: {
  statusFilter: SessionStatusFilter;
  trainerFilter: string;
  trainers: Trainer[];
  visibleCount: number;
  mobileOpen: boolean;
  onStatusFilterChange: (value: SessionStatusFilter) => void;
  onTrainerFilterChange: (value: string) => void;
  onClear: () => void;
}) {
  const activeCount = countScheduleFilters(statusFilter, trainerFilter);
  const trainerFilterOptions = [
    { value: "", label: "Wszyscy trenerzy" },
    ...trainers.map((trainer) => ({
      value: String(trainer.id),
      label: trainer.fullName || `${trainer.firstName} ${trainer.lastName}`,
    })),
  ];

  return (
    <div
      id={SCHEDULE_FILTERS_PANEL_ID}
      className={`card-shell grid gap-2 p-2 sm:grid-cols-2 lg:grid-cols-[minmax(220px,280px)_minmax(220px,280px)_1fr] lg:items-center ${mobileOpen ? "" : "max-md:hidden"}`}
    >
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
      <div className="flex items-center justify-between gap-3 px-2 sm:col-span-2 lg:col-span-1 lg:justify-end">
        <p className="text-sm text-on-surface-variant">
          Widoczne sesje: <span className="font-semibold text-on-surface">{visibleCount}</span>
        </p>
        {activeCount > 0 ? (
          <Button variant="ghost" size="sm" onClick={onClear}>
            Wyczyść filtry
          </Button>
        ) : null}
      </div>
    </div>
  );
}
