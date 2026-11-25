"use client";

import { useCallback, useState } from "react";
import { PencilLine } from "lucide-react";
import { ModalHeader, ModalOverlay } from "@/app/components/ui/modal";
import { AvailabilityWeekEditor } from "@/app/components/availability/AvailabilityWeekEditor";
import { AvailabilityTemplateEditor } from "@/app/components/availability/AvailabilityTemplateEditor";
import { WeekStepper } from "@/app/components/availability/WeekStepper";
import { getAvailabilityTemplates } from "@/app/lib/availability";
import { addDaysIso, mondayOf, studioToday } from "@/app/lib/availability-time";
import { OwnerReadState } from "../../../components/OwnerReadState";
import { useOwnerRead } from "../../../components/use-owner-read";

type Tab = "week" | "template";

/**
 * The owner manages one trainer's availability: the week (changed directly, also when locked, and
 * confirmed if needed) and the regular schedule. For an owner who also trains, `isSelf` opens their own.
 */
export function TrainerWeekDrawer({
  trainerId,
  trainerName,
  initialWeek,
  isSelf = false,
  onClose,
  onChanged,
}: {
  trainerId: number;
  trainerName: string;
  initialWeek: string;
  isSelf?: boolean;
  onClose: () => void;
  onChanged: () => void;
}) {
  const minWeek = mondayOf(studioToday());
  const [weekStart, setWeekStart] = useState(initialWeek < minWeek ? minWeek : initialWeek);
  const [tab, setTab] = useState<Tab>("week");
  const loadTemplates = useCallback((signal: AbortSignal) => getAvailabilityTemplates(trainerId, signal), [trainerId]);
  const templates = useOwnerRead(`availability-templates:${trainerId}`, loadTemplates, "Nie udało się wczytać stałego grafiku.");
  const maxWeek = templates.data ? mondayOf(templates.data.lastPlannableDate) : addDaysIso(minWeek, 26 * 7);
  const hasTemplate = templates.data ? templates.data.templates.some((template) => template.validUntil >= weekStart) : true;

  return (
    <ModalOverlay onClose={onClose} className="md:justify-end">
      <div role="dialog" aria-modal="true" aria-label={isSelf ? "Moja dyspozycja" : `Dyspozycja: ${trainerName}`}
        className="relative z-10 flex max-h-[calc(100dvh-1.5rem)] w-full max-w-3xl flex-col overflow-hidden rounded-[var(--radius-xl)] bg-surface-container shadow-ambient md:!my-0 md:h-[calc(100dvh-2rem)]">
        <div className="space-y-4 p-5 pb-3 md:p-6 md:pb-4">
          <ModalHeader
            eyebrow={isSelf ? "Prowadzisz też zajęcia" : "Dyspozycja trenera"}
            title={isSelf ? "Moja dyspozycja" : trainerName}
            description={isSelf
              ? "Twoje godziny do prowadzenia zajęć i konsultacji. Widać je w grafiku i w Twoim kalendarzu Outlook."
              : "Zmiany zapisują się od razu i trafiają do kalendarza trenera."}
            icon={<PencilLine size={20} />}
            onClose={onClose}
          />
          <div className="flex flex-wrap items-center gap-2">
            <div role="tablist" aria-label="Widok dyspozycji" className="flex gap-1 rounded-[var(--radius-lg)] bg-surface-container-low p-1">
              {([["week", "Tydzień"], ["template", "Stały grafik"]] as const).map(([value, label]) => (
                <button key={value} type="button" role="tab" aria-selected={tab === value} onClick={() => setTab(value)}
                  className={[
                    "h-10 rounded-[var(--radius-default)] px-4 text-sm font-semibold transition focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--color-primary-light)]",
                    tab === value ? "bg-primary text-on-primary shadow-soft" : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface",
                  ].join(" ")}>
                  {label}
                </button>
              ))}
            </div>
            {tab === "week" ? (
              <WeekStepper weekStart={weekStart} minWeek={minWeek} maxWeek={maxWeek} onChange={setWeekStart} className="flex-1 bg-surface-container-low" />
            ) : null}
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 md:px-6">
          {tab === "week" ? (
            <AvailabilityWeekEditor key={`${trainerId}-${weekStart}`} weekStart={weekStart} trainerId={trainerId} ownerMode isSelf={isSelf}
              hasTemplate={hasTemplate} onOpenTemplate={() => setTab("template")} onChanged={onChanged} />
          ) : templates.data ? (
            <AvailabilityTemplateEditor data={templates.data} trainerId={trainerId} isSelf={isSelf}
              onSaved={(next) => { templates.setData(next); onChanged(); }} />
          ) : (
            <OwnerReadState loading={templates.loading} error={templates.error} retry={templates.retry} label="Wczytywanie stałego grafiku..." />
          )}
        </div>
      </div>
    </ModalOverlay>
  );
}
