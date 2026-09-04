"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CalendarDays,
  Check,
  ChevronRight,
  CircleAlert,
  Gift,
  LoaderCircle,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { TextArea } from "@/app/components/ui/input";
import { ModalFooter, ModalHeader, ModalOverlay } from "@/app/components/ui/modal";
import { showAppError, showAppSuccess } from "@/app/components/ui/app-toast";
import { getClientRewardProgress } from "@/app/lib/clients/rewards";
import {
  claimClientMilestone,
  getClientMilestones,
  getDtoCompletedMonths,
  getMilestoneId,
  isMilestoneClaimed,
  isMilestoneReached,
  unclaimClientMilestone,
  type ClientMilestone,
  type ClientMilestonesResponse,
  type MilestoneAccess,
} from "@/app/lib/milestones";

type Props = {
  access: MilestoneAccess;
  clientId?: number;
  trainingStartDate?: string | null;
  variant?: "compact" | "full";
};

export default function ClientRewardProgress({
  access,
  clientId,
  trainingStartDate,
  variant = "compact",
}: Props) {
  const [progressData, setProgressData] = useState<ClientMilestonesResponse | null>(null);
  const [selected, setSelected] = useState<ClientMilestone | null>(null);
  const [note, setNote] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const loadMilestones = useCallback(async () => {
    if (access !== "client" && !clientId) return null;

    try {
      setIsLoading(true);
      const data = await getClientMilestones(access, clientId);
      const sorted = {
        ...data,
        milestones: [...data.milestones].sort(
          (first, second) => first.requiredMonths - second.requiredMonths,
        ),
      };
      setProgressData(sorted);
      return sorted;
    } catch (error) {
      showAppError(error, "Nie udało się pobrać postępu nagród.", {
        id: `${access}-milestones-load-error-${clientId || "me"}`,
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [access, clientId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadMilestones(), 0);
    return () => window.clearTimeout(timer);
  }, [loadMilestones]);

  const milestones = progressData?.milestones ?? [];
  const effectiveStartDate = trainingStartDate || progressData?.trainingStartDate;
  const { completedMonths: dateMonths, hasTrainingStartDate } =
    getClientRewardProgress(effectiveStartDate);
  const completedMonths = Math.max(
    dateMonths,
    progressData?.trainingMonths ?? 0,
    getDtoCompletedMonths(milestones),
  );
  const maxMonths = Math.max(1, ...milestones.map((item) => item.requiredMonths));
  const progressPercent = Math.min(100, (completedMonths / maxMonths) * 100);
  const claimedCount = milestones.filter(isMilestoneClaimed).length;

  function openOverview() {
    const initial =
      milestones.find(
        (milestone) =>
          isMilestoneReached(milestone, completedMonths) &&
          !isMilestoneClaimed(milestone),
      ) || milestones[0] || null;
    selectMilestone(initial);
    setIsOpen(true);
  }

  function selectMilestone(milestone: ClientMilestone | null) {
    setSelected(milestone);
    setNote(getRewardNote(milestone));
  }

  async function refreshSelected(milestoneId: number) {
    const updated = await loadMilestones();
    selectMilestone(
      updated?.milestones.find(
        (milestone) => getMilestoneId(milestone) === milestoneId,
      ) || null,
    );
  }

  async function handleClaim() {
    if (!selected || access === "client" || !clientId) return;
    const milestoneId = getMilestoneId(selected);
    if (!milestoneId) return;

    try {
      setIsSaving(true);
      await claimClientMilestone(access, clientId, milestoneId, note);
      await refreshSelected(milestoneId);
      showAppSuccess("Nagroda została oznaczona jako wydana.");
    } catch (error) {
      showAppError(error, "Nie udało się oznaczyć nagrody jako wydanej.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleUnclaim() {
    if (!selected || access === "client" || !clientId) return;
    const milestoneId = getMilestoneId(selected);
    if (!milestoneId) return;

    try {
      setIsSaving(true);
      await unclaimClientMilestone(access, clientId, milestoneId);
      await refreshSelected(milestoneId);
      showAppSuccess("Cofnięto oznaczenie wydania nagrody.");
    } catch (error) {
      showAppError(error, "Nie udało się cofnąć wydania nagrody.");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-16 items-center gap-2 text-sm text-on-surface-muted">
        <LoaderCircle size={16} className="animate-spin" />
        Nagrody...
      </div>
    );
  }

  if (!milestones.length) {
    return (
      <div className="min-w-0">
        <p className="text-label text-on-surface-muted">Nagrody</p>
        <p className="mt-2 text-sm text-on-surface-variant">Brak aktywnych progów.</p>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={openOverview}
        aria-haspopup="dialog"
        className={[
          "group block w-full min-w-0 text-left",
          variant === "full"
            ? "card-shell p-5 transition hover:bg-surface-container-high md:p-7"
            : "rounded-[var(--radius-lg)] focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-primary)_25%,transparent)]",
        ].join(" ")}
      >
        {variant === "full" ? (
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <p className="text-label text-primary-light">Staż treningowy</p>
              <h2 className="mt-2 font-display text-[1.8rem] font-semibold">
                Twój postęp i nagrody
              </h2>
            </div>
            <ChevronRight className="mt-2 text-primary-light transition group-hover:translate-x-1" />
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CalendarDays size={14} className="text-primary-light" />
            <p className="text-label text-on-surface-muted">Nagrody</p>
          </div>
          <p className="shrink-0 text-xs font-semibold text-on-surface">
            {completedMonths} mies.
          </p>
        </div>

        <RewardTimeline
          milestones={milestones}
          completedMonths={completedMonths}
          maxMonths={maxMonths}
          progressPercent={progressPercent}
          size="small"
        />
      </button>

      {isOpen ? (
        <RewardsOverviewModal
          access={access}
          progressData={progressData}
          milestones={milestones}
          completedMonths={completedMonths}
          maxMonths={maxMonths}
          progressPercent={progressPercent}
          claimedCount={claimedCount}
          hasTrainingStartDate={hasTrainingStartDate}
          selected={selected}
          note={note}
          isSaving={isSaving}
          onSelect={selectMilestone}
          onNoteChange={setNote}
          onClaim={handleClaim}
          onUnclaim={handleUnclaim}
          onClose={() => setIsOpen(false)}
        />
      ) : null}
    </>
  );
}

function RewardTimeline({
  milestones,
  completedMonths,
  maxMonths,
  progressPercent,
  size,
}: {
  milestones: ClientMilestone[];
  completedMonths: number;
  maxMonths: number;
  progressPercent: number;
  size: "small" | "large";
}) {
  const large = size === "large";

  return (
    <div className={large ? "mt-8 px-2 pb-8" : "mt-4 px-1 pb-5"}>
      <div className="relative">
        <div className={large ? "h-2 rounded-full bg-surface-container-lowest" : "h-1.5 rounded-full bg-surface-container-lowest"}>
          <div
            className="h-full rounded-full bg-primary-gradient transition-[width]"
            style={{ width: `${progressPercent}%` }}
            role="progressbar"
            aria-label="Postęp nagród"
            aria-valuemin={0}
            aria-valuemax={maxMonths}
            aria-valuenow={Math.min(completedMonths, maxMonths)}
          />
        </div>

        {milestones.map((milestone) => {
          const claimed = isMilestoneClaimed(milestone);
          const left = Math.min(97, Math.max(3, (milestone.requiredMonths / maxMonths) * 100));

          return (
            <span
              key={getMilestoneId(milestone)}
              className={[
                "absolute top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-surface-container font-bold shadow-soft",
                claimed
                  ? "bg-tertiary text-on-tertiary"
                  : "bg-warning-container text-warning-light",
                large ? "h-8 w-8 text-sm" : "h-5 w-5 text-[10px]",
              ].join(" ")}
              style={{ left: `${left}%` }}
              title={`${milestone.requiredMonths} mies. — ${claimed ? "odebrana" : "nieodebrana"}`}
            >
              {claimed ? <Check size={large ? 17 : 11} strokeWidth={3} /> : "!"}
            </span>
          );
        })}

        {milestones.map((milestone) => {
          const left = Math.min(97, Math.max(3, (milestone.requiredMonths / maxMonths) * 100));
          return (
            <span
              key={`label-${getMilestoneId(milestone)}`}
              className={[
                "absolute top-4 -translate-x-1/2 whitespace-nowrap font-semibold uppercase tracking-wider text-on-surface-muted",
                large ? "mt-2 text-[10px]" : "text-[8px]",
              ].join(" ")}
              style={{ left: `${left}%` }}
            >
              {milestone.requiredMonths} mies.
            </span>
          );
        })}
      </div>
    </div>
  );
}

function RewardsOverviewModal({
  access,
  progressData,
  milestones,
  completedMonths,
  maxMonths,
  progressPercent,
  claimedCount,
  hasTrainingStartDate,
  selected,
  note,
  isSaving,
  onSelect,
  onNoteChange,
  onClaim,
  onUnclaim,
  onClose,
}: {
  access: MilestoneAccess;
  progressData: ClientMilestonesResponse | null;
  milestones: ClientMilestone[];
  completedMonths: number;
  maxMonths: number;
  progressPercent: number;
  claimedCount: number;
  hasTrainingStartDate: boolean;
  selected: ClientMilestone | null;
  note: string;
  isSaving: boolean;
  onSelect: (milestone: ClientMilestone) => void;
  onNoteChange: (value: string) => void;
  onClaim: () => void;
  onUnclaim: () => void;
  onClose: () => void;
}) {
  return (
    <ModalOverlay
      onClose={isSaving ? undefined : onClose}
      className="items-start overflow-y-auto py-5 md:py-8"
    >
      <div className="relative z-10 w-full max-w-[920px] overflow-hidden rounded-[var(--radius-xl)] border border-white/10 bg-surface-container shadow-ambient">
        <div className="p-5 md:p-7">
          <ModalHeader
            eyebrow="Nagrody klienta"
            title={progressData?.clientFullName || "Postęp i nagrody"}
            description={`${completedMonths} mies. stażu${progressData?.trainingDays ? ` (${progressData.trainingDays} dni)` : ""} · ${claimedCount} z ${milestones.length} nagród odebranych`}
            icon={<Gift size={21} />}
            onClose={onClose}
          />

          <div className="mt-7 rounded-[var(--radius-xl)] bg-surface-container-low p-5 md:p-6">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-label text-on-surface-muted">Postęp treningowy</p>
                <p className="mt-2 text-2xl font-semibold">{completedMonths} miesięcy</p>
              </div>
              <p className="text-sm font-semibold text-primary-light">
                {Math.round(progressPercent)}%
              </p>
            </div>
            <RewardTimeline
              milestones={milestones}
              completedMonths={completedMonths}
              maxMonths={maxMonths}
              progressPercent={progressPercent}
              size="large"
            />
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {milestones.map((milestone) => {
              const claimed = isMilestoneClaimed(milestone);
              const reached = isMilestoneReached(milestone, completedMonths);
              const active = selected
                ? getMilestoneId(selected) === getMilestoneId(milestone)
                : false;

              return (
                <button
                  key={getMilestoneId(milestone)}
                  type="button"
                  onClick={() => onSelect(milestone)}
                  className={[
                    "flex min-w-0 items-start gap-3 rounded-[var(--radius-lg)] border p-4 text-left transition",
                    active
                      ? "border-primary-light/50 bg-primary/10"
                      : "border-white/5 bg-surface-container-low hover:border-white/15",
                  ].join(" ")}
                >
                  <span className={[
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                    claimed
                      ? "bg-tertiary text-on-tertiary"
                      : "bg-warning-container text-warning-light",
                  ].join(" ")}>
                    {claimed ? <Check size={18} strokeWidth={3} /> : <CircleAlert size={18} />}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-on-surface">
                      {milestone.rewardName || "Nagroda"}
                    </span>
                    <span className="mt-1 block text-xs text-on-surface-muted">
                      {milestone.requiredMonths} mies. · {claimed ? "odebrana" : reached ? "do odbioru" : "jeszcze nieosiągnięta"}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          {selected ? (
            <RewardEditor
              access={access}
              milestone={selected}
              completedMonths={completedMonths}
              note={note}
              isSaving={isSaving}
              onNoteChange={onNoteChange}
              onClaim={onClaim}
              onUnclaim={onUnclaim}
            />
          ) : null}

          {!hasTrainingStartDate && completedMonths === 0 && access !== "client" ? (
            <p className="mt-5 text-xs text-on-surface-muted">
              Ustaw datę rozpoczęcia treningów, aby naliczać staż klienta.
            </p>
          ) : null}
        </div>

        <ModalFooter>
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSaving}>
            Zamknij
          </Button>
        </ModalFooter>
      </div>
    </ModalOverlay>
  );
}

function RewardEditor({
  access,
  milestone,
  completedMonths,
  note,
  isSaving,
  onNoteChange,
  onClaim,
  onUnclaim,
}: {
  access: MilestoneAccess;
  milestone: ClientMilestone;
  completedMonths: number;
  note: string;
  isSaving: boolean;
  onNoteChange: (value: string) => void;
  onClaim: () => void;
  onUnclaim: () => void;
}) {
  const claimed = isMilestoneClaimed(milestone);
  const reached = isMilestoneReached(milestone, completedMonths);
  const issuer = milestone.rewardClaimedByUserName || milestone.rewardClaimedByTrainerName;
  const savedNote = getRewardNote(milestone);

  return (
    <div className="mt-6 rounded-[var(--radius-xl)] border border-white/5 bg-surface-container-low p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-label text-primary-light">Wybrana nagroda</p>
          <h3 className="mt-2 text-xl font-semibold">
            {milestone.rewardName || milestone.name || "Nagroda"}
          </h3>
          <p className="mt-2 max-w-[620px] text-sm leading-6 text-on-surface-variant">
            {milestone.description || milestone.name || "Brak dodatkowego opisu."}
          </p>
        </div>
        <span className={[
          "inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold",
          claimed
            ? "bg-tertiary-container/45 text-tertiary-light"
            : "bg-warning-container/45 text-warning-light",
        ].join(" ")}>
          {claimed ? <Check size={15} /> : <CircleAlert size={15} />}
          {claimed ? "Odebrana" : reached ? "Do odbioru" : "Nieosiągnięta"}
        </span>
      </div>

      {claimed ? (
        <div className="mt-5 rounded-[var(--radius-lg)] bg-surface-container-lowest p-4 text-sm">
          <p className="font-semibold text-on-surface">
            {issuer ? `Wydał(a): ${issuer}` : "Wydanie nagrody zostało zapisane."}
          </p>
          {milestone.rewardClaimedAt ? (
            <p className="mt-1 text-xs text-on-surface-muted">
              {formatDate(milestone.rewardClaimedAt)}
            </p>
          ) : null}
          {savedNote ? (
            <p className="mt-3 text-sm text-on-surface-variant">{savedNote}</p>
          ) : null}
        </div>
      ) : access === "client" ? (
        <p className="mt-5 text-sm text-on-surface-variant">
          {reached
            ? "Zgłoś się do swojego trenera po odbiór nagrody."
            : `Do tego progu brakuje ${Math.max(0, milestone.requiredMonths - completedMonths)} mies.`}
        </p>
      ) : (
        <TextArea
          label="Notatka przy wydaniu (opcjonalnie)"
          value={note}
          onChange={onNoteChange}
          placeholder="np. Wydano po treningu"
          rows={3}
          className="mt-5 block"
        />
      )}

      {access !== "client" ? (
        <div className="mt-5 flex justify-end">
          {claimed ? (
            <Button
              type="button"
              variant="danger"
              icon={<RotateCcw size={16} />}
              onClick={onUnclaim}
              disabled={isSaving}
            >
              Cofnij wydanie
            </Button>
          ) : (
            <Button
              type="button"
              icon={isSaving ? <LoaderCircle size={16} className="animate-spin" /> : <Check size={16} />}
              onClick={onClaim}
              disabled={isSaving || !reached}
            >
              Oznacz jako wydaną
            </Button>
          )}
        </div>
      ) : null}
    </div>
  );
}

function getRewardNote(milestone: ClientMilestone | null) {
  return (
    milestone?.rewardClaimNote ||
    milestone?.rewardClaimedNote ||
    milestone?.note ||
    ""
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium" }).format(date);
}
