"use client";

import { useState } from "react";
import { PencilLine } from "lucide-react";
import { ModalHeader, ModalOverlay } from "@/app/components/ui/modal";
import { AvailabilityWeekEditor } from "@/app/components/availability/AvailabilityWeekEditor";
import { WeekStepper } from "@/app/components/availability/WeekStepper";
import { addDaysIso, mondayOf, studioToday } from "@/app/lib/availability-time";

const MAX_WEEKS_AHEAD = 26;

/** The owner changes one trainer's week directly, including weeks the trainer has already confirmed. */
export function TrainerWeekDrawer({
  trainerId,
  trainerName,
  initialWeek,
  onClose,
  onChanged,
}: {
  trainerId: number;
  trainerName: string;
  initialWeek: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const minWeek = mondayOf(studioToday());
  const [weekStart, setWeekStart] = useState(initialWeek < minWeek ? minWeek : initialWeek);

  return (
    <ModalOverlay onClose={onClose} className="md:justify-end">
      <div role="dialog" aria-modal="true" aria-label={`Dyspozycja: ${trainerName}`}
        className="relative z-10 flex max-h-[calc(100dvh-1.5rem)] w-full max-w-3xl flex-col overflow-hidden rounded-[var(--radius-xl)] bg-surface-container shadow-ambient md:!my-0 md:h-[calc(100dvh-2rem)]">
        <div className="space-y-4 p-5 pb-3 md:p-6 md:pb-4">
          <ModalHeader
            eyebrow="Dyspozycja trenera"
            title={trainerName}
            description="Zmiany zapisują się od razu i trafiają do kalendarza trenera."
            icon={<PencilLine size={20} />}
            onClose={onClose}
          />
          <WeekStepper weekStart={weekStart} minWeek={minWeek} maxWeek={addDaysIso(minWeek, MAX_WEEKS_AHEAD * 7)} onChange={setWeekStart} className="bg-surface-container-low" />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 md:px-6">
          <AvailabilityWeekEditor key={`${trainerId}-${weekStart}`} weekStart={weekStart} trainerId={trainerId} ownerMode onChanged={onChanged} />
        </div>
      </div>
    </ModalOverlay>
  );
}
