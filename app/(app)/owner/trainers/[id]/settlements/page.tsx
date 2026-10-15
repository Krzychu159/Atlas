"use client";

import { userTrainingType } from "@/app/lib/user-messages";

import { useSessionCorrectionRevision } from "@/app/lib/session-corrections";
import { useTrainerRatesRevision } from "@/app/lib/owner/trainer-rates-changes";

import { NativeDateInput } from "@/app/components/ui/native-date-input";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  normalizeOwnerLocationFilterValue,
  useOwnerLocationFilter,
} from "@/app/lib/owner/location-filter";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileCheck2,
  FileDown,
  FileX2,
  Info,
  ReceiptText,
  RotateCcw,
  Wallet,
} from "lucide-react";
import { CustomSelect } from "@/app/components/ui/custom-select";
import CollapsibleSection from "@/app/components/ui/collapsible-section";
import { Tooltip } from "@/app/components/ui/tooltip";
import {
  ProfileInfoStat,
  profilePrimaryActionClassName,
  profileSecondaryActionClassName,
} from "@/app/components/ui/profile-hero";
import SettlementItems from "@/app/components/settlements/SettlementItems";
import {
  formatSettlementDate,
  formatSettlementMoney,
  formatSettlementNumber,
  moveTrainerMonth,
  parseTrainerMonth,
} from "@/app/lib/trainer/settlement-display";
import TrainerProfileHeader from "../../components/TrainerProfileHeader";
import {
  downloadTrainerWorkHoursDocument,
  getTrainerRates,
  getTrainerSettlement,
  markTrainerSettlementAsPaid,
  reopenTrainerSettlement,
  type TrainerMonthlySettlement,
  type TrainerRate,
} from "@/app/lib/owner/settlements";
import { getTrainer, type Trainer } from "@/app/lib/owner/trainers";
import {
  showOwnerError,
  showOwnerSuccess,
} from "../../../components/owner-toast";

function getCurrentMonthValue() {
  const now = new Date();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");

  return `${now.getFullYear()}-${month}`;
}

function getMonthValueFromUrl() {
  if (typeof window === "undefined") return getCurrentMonthValue();

  const params = new URLSearchParams(window.location.search);
  const year = Number(params.get("year"));
  const month = Number(params.get("month"));

  if (!year || !month) return getCurrentMonthValue();

  return `${year}-${`${month}`.padStart(2, "0")}`;
}

function parseMonth(value: string) {
  const [year, month] = value.split("-").map(Number);

  return { year, month };
}

function updateUrlMonth(value: string) {
  if (typeof window === "undefined") return;

  const { year, month } = parseMonth(value);

  if (!year || !month) return;

  const url = new URL(window.location.href);
  url.searchParams.set("year", String(year));
  url.searchParams.set("month", String(month));
  window.history.replaceState(window.history.state, "", url.toString());
}




export default function TrainerSettlementPage() {
  const { selectedLocationId, selectedLocationValue, setSelectedLocationValue } = useOwnerLocationFilter();
  const [locationReady, setLocationReady] = useState(false);
  const correctionRevision = useSessionCorrectionRevision();
  const ratesRevision = useTrainerRatesRevision();
  const params = useParams<{ id: string }>();
  const trainerId = Number(params.id);
  const [monthValue, setMonthValue] = useState("");
  const [trainer, setTrainer] = useState<Trainer | null>(null);
  const [rates, setRates] = useState<TrainerRate[]>([]);
  const [settlement, setSettlement] = useState<TrainerMonthlySettlement | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isMarkingPaid, setIsMarkingPaid] = useState(false);
  const [isUndoingPaid, setIsUndoingPaid] = useState(false);
  const [isGeneratingDocument, setIsGeneratingDocument] = useState(false);

  useEffect(() => {
    function readUrlFilters() {
      setMonthValue(getMonthValueFromUrl());
      const query = new URLSearchParams(window.location.search);
      setSelectedLocationValue(normalizeOwnerLocationFilterValue(query.get("locationId")));
      setLocationReady(true);
    }
    void Promise.resolve().then(readUrlFilters);
    window.addEventListener("popstate", readUrlFilters);
    return () => window.removeEventListener("popstate", readUrlFilters);
  }, [setSelectedLocationValue]);

  useEffect(() => {
    if (!locationReady) return;
    const url = new URL(window.location.href);
    if (selectedLocationId == null) url.searchParams.delete("locationId");
    else url.searchParams.set("locationId", String(selectedLocationId));
    window.history.replaceState(window.history.state, "", url.toString());
  }, [locationReady, selectedLocationId]);

  useEffect(() => {
    let active = true;
    async function loadSettlement() {
      await Promise.resolve();

      const { year, month } = parseMonth(monthValue);

      if (!active || !locationReady || !monthValue) return;

      if (!trainerId || !year || !month) {
        showOwnerError(new Error("Nieprawidłowe dane rozliczenia."), "", {
          id: "owner-trainer-settlement-invalid",
        });
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setSettlement(null);
        const [trainerResult, ratesResult, settlementResult] =
          await Promise.allSettled([
            getTrainer(trainerId),
            getTrainerRates(trainerId),
            getTrainerSettlement(trainerId, year, month, selectedLocationId ?? undefined),
          ]);

        if (!active) return;
        if (settlementResult.status !== "fulfilled") throw settlementResult.reason;
        if (trainerResult.status !== "fulfilled") {
          throw trainerResult.reason;
        }

        setTrainer(trainerResult.value);
        setRates(ratesResult.status === "fulfilled" ? ratesResult.value : []);
        setSettlement(settlementResult.value);
      } catch (err) {
        if (!active) return;
        showOwnerError(err, "Nie udało się pobrać rozliczenia trenera.", {
          id: "owner-trainer-settlement-load-error",
        });
      } finally {
        if (active) setIsLoading(false);
      }
    }

    void loadSettlement();
    return () => { active = false; };
  }, [monthValue, trainerId, correctionRevision, ratesRevision, locationReady, selectedLocationId]);

  const activeRates = useMemo(
    () => rates.filter((rate) => rate.isActive),
    [rates],
  );
  const items = settlement?.items ?? [];

  function changeMonth(value: string) {
    if (!parseTrainerMonth(value)) return;
    setMonthValue(value);
    updateUrlMonth(value);
  }

  async function handleMarkAsPaid() {
    if (!settlement) return;

    try {
      setIsMarkingPaid(true);
      const data = await markTrainerSettlementAsPaid(
        settlement.trainerId,
        settlement.year,
        settlement.month,
      );
      setSettlement((current) => current &&
        current.trainerId === data.trainerId && current.year === data.year && current.month === data.month
        ? { ...current, isPaid: data.isPaid, paidAt: data.paidAt }
        : current);
      showOwnerSuccess("Rozliczenie oznaczone jako wypłacone.", {
        id: "owner-trainer-settlement-paid",
      });
    } catch (err) {
      showOwnerError(
        err,
        "Nie udało się oznaczyć rozliczenia jako wypłacone.",
        { id: "owner-trainer-settlement-paid-error" },
      );
    } finally {
      setIsMarkingPaid(false);
    }
  }

  async function handleUndoMarkAsPaid() {
    if (!settlement) return;

    try {
      setIsUndoingPaid(true);
      const data = await reopenTrainerSettlement(
        settlement.trainerId,
        settlement.year,
        settlement.month,
      );
      setSettlement((current) => current &&
        current.trainerId === data.trainerId && current.year === data.year && current.month === data.month
        ? { ...current, isPaid: data.isPaid, paidAt: data.paidAt }
        : current);
      showOwnerSuccess("Rozliczenie ponownie oznaczone jako niewypłacone.", {
        id: "owner-trainer-settlement-reopened",
      });
    } catch (err) {
      showOwnerError(
        err,
        "Nie udało się cofnąć oznaczenia wypłaty.",
        { id: "owner-trainer-settlement-reopen-error" },
      );
    } finally {
      setIsUndoingPaid(false);
    }
  }

  async function handleGenerateDocument() {
    if (!settlement) return;

    try {
      setIsGeneratingDocument(true);
      const { blob, fileName } = await downloadTrainerWorkHoursDocument(
        settlement.trainerId,
        settlement.year,
        settlement.month,
        selectedLocationId ?? undefined,
      );
      const objectUrl = URL.createObjectURL(blob);
      const downloadLink = document.createElement("a");

      downloadLink.href = objectUrl;
      downloadLink.download =
        fileName ||
        `ewidencja-godzin-${settlement.trainerId}-${settlement.year}-${String(
          settlement.month,
        ).padStart(2, "0")}.docx`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      downloadLink.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1_000);

      showOwnerSuccess("Dokument ewidencji godzin został wygenerowany.", {
        id: "owner-trainer-work-hours-document-success",
      });
    } catch (err) {
      showOwnerError(err, "Nie udało się wygenerować ewidencji godzin.", {
        id: "owner-trainer-work-hours-document-error",
      });
    } finally {
      setIsGeneratingDocument(false);
    }
  }

  const nonContractedItems = settlement?.nonContractedItems ?? [];
  const visibleRates = activeRates.length ? activeRates : rates;
  const isBusy = isMarkingPaid || isUndoingPaid || isGeneratingDocument;

  const headerActions = settlement ? (
    <>
      {settlement.isPaid ? (
        <button
          type="button"
          onClick={handleUndoMarkAsPaid}
          disabled={isBusy}
          className={profileSecondaryActionClassName}
        >
          <RotateCcw size={14} className="text-primary-light" />
          {isUndoingPaid ? "Cofanie..." : "Cofnij wypłatę"}
        </button>
      ) : (
        <button
          type="button"
          onClick={handleMarkAsPaid}
          disabled={isBusy}
          className={profilePrimaryActionClassName}
        >
          <CheckCircle2 size={15} />
          {isMarkingPaid ? "Zapisywanie..." : "Oznacz jako wypłacone"}
        </button>
      )}
      <button
        type="button"
        onClick={handleGenerateDocument}
        disabled={isBusy}
        className={profileSecondaryActionClassName}
      >
        <FileDown size={14} className="text-primary-light" />
        {isGeneratingDocument ? "Generowanie..." : "Ewidencja godzin"}
      </button>
    </>
  ) : <></>;

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-3 pb-10">
      {trainer ? (
        <TrainerProfileHeader
          trainer={trainer}
          rates={rates}
          activeTab="settlements"
          actions={headerActions}
        />
      ) : null}

      <section className="card-shell p-4 md:p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="flex items-end gap-2">
            <button
              type="button"
              aria-label="Poprzedni miesiąc"
              onClick={() => changeMonth(moveTrainerMonth(monthValue, -1))}
              disabled={!monthValue || isLoading}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-surface-container-low text-primary-light transition hover:bg-surface-container-high disabled:opacity-50"
            >
              <ChevronLeft size={17} />
            </button>
            <label className="min-w-0 flex-1 sm:w-52 sm:flex-none">
              <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-on-surface-muted">Miesiąc</span>
              <NativeDateInput
                type="month"
                value={monthValue}
                onChange={(event) => {
                  if (parseTrainerMonth(event.target.value)) changeMonth(event.target.value);
                }}
                className="h-10 w-full rounded-[var(--radius-md)] bg-surface-container-low px-3 text-sm font-semibold"
              />
            </label>
            <button
              type="button"
              aria-label="Następny miesiąc"
              onClick={() => changeMonth(moveTrainerMonth(monthValue, 1))}
              disabled={!monthValue || isLoading}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-surface-container-low text-primary-light transition hover:bg-surface-container-high disabled:opacity-50"
            >
              <ChevronRight size={17} />
            </button>
          </div>

          <div className="xl:hidden md:w-64">
            <CustomSelect
              label="Lokalizacja"
              value={selectedLocationValue}
              onChange={setSelectedLocationValue}
              options={[
                { value: "all", label: "Wszystkie lokalizacje" },
                ...(trainer?.locationIds ?? []).map((id, index) => ({
                  value: String(id),
                  label: trainer?.locationNames?.[index] || `Lokalizacja ${id}`,
                })),
                ...(selectedLocationId != null && !trainer?.locationIds?.includes(selectedLocationId)
                  ? [{ value: String(selectedLocationId), label: `Lokalizacja ${selectedLocationId}` }]
                  : []),
              ]}
            />
          </div>

          {settlement && !isLoading ? (
            <div className="flex items-center gap-2 md:ml-auto">
              <span
                className={[
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
                  settlement.isPaid ? "bg-tertiary/15 text-tertiary-light" : "bg-warning-light/15 text-warning-light",
                ].join(" ")}
              >
                <CheckCircle2 size={13} />
                {settlement.isPaid
                  ? settlement.paidAt ? `Wypłacone ${formatSettlementDate(settlement.paidAt)}` : "Wypłacone"
                  : "Niewypłacone"}
              </span>
              <HintIcon label="Status wypłaty dotyczy całego miesiąca, we wszystkich lokalizacjach." />
            </div>
          ) : null}
        </div>

        {settlement && !isLoading ? (
          <>
            <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-white/5 pt-4 lg:grid-cols-4">
              <ProfileInfoStat icon={<Wallet size={13} />} label="Do wypłaty">
                <span className="text-lg text-tertiary-light">{formatSettlementMoney(settlement.totalAmount)}</span>
              </ProfileInfoStat>
              <ProfileInfoStat icon={<ReceiptText size={13} />} label="Sesje w rozliczeniu">
                <span className="text-lg">{formatSettlementNumber(settlement.totalSessions)}</span>
              </ProfileInfoStat>
              <ProfileInfoStat icon={<Clock3 size={13} />} label="Godziny rozliczeniowe">
                <span className="inline-flex items-center gap-1.5 text-lg">
                  {formatSettlementNumber(settlement.totalHours)} h
                  <HintIcon label="Godziny rozliczeniowe wynikają z zasad rozliczenia i mogą różnić się od czasu trwania zajęć." />
                </span>
              </ProfileInfoStat>
              <ProfileInfoStat icon={<FileX2 size={13} />} label="Poza umową" muted={!settlement.nonContractedTotalSessions}>
                <span className="inline-flex items-center gap-1.5 text-lg">
                  {formatSettlementNumber(settlement.nonContractedTotalSessions)} sesji · {formatSettlementNumber(settlement.nonContractedTotalHours)} h
                  <HintIcon label="Sesje bez umowy są pokazane osobno i nie są doliczane do kwoty rozliczenia." />
                </span>
              </ProfileInfoStat>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-white/5 pt-3">
              <span className="mr-1 text-[10px] font-semibold uppercase tracking-wider text-on-surface-muted">Stawki</span>
              {visibleRates.length ? (
                visibleRates.map((rate) => (
                  <span key={rate.id} className="inline-flex items-center gap-1.5 rounded-full bg-surface-container-low px-2.5 py-1 text-xs">
                    <span className="text-on-surface-variant">{userTrainingType(rate.sessionType, "Stawka domyślna")}</span>
                    <span className="font-semibold text-on-surface">
                      {formatSettlementMoney(rate.rate)}{rate.sessionType === "Group" ? "/zajęcia" : "/h"}
                    </span>
                  </span>
                ))
              ) : (
                <span className="text-xs text-on-surface-muted">Nie ustawiono stawek dla tego trenera.</span>
              )}
            </div>
          </>
        ) : null}
      </section>

      {isLoading ? (
        <div role="status" className="card-shell p-4 text-sm text-on-surface-variant">
          Ładowanie rozliczenia...
        </div>
      ) : null}

      {settlement && !isLoading ? (
        <>
          <CollapsibleSection
            title="Sesje objęte umową"
            icon={<FileCheck2 size={15} />}
            meta={`${formatSettlementNumber(settlement.contractedTotalSessions)} · ${formatSettlementMoney(settlement.contractedTotalAmount)}`}
            defaultOpen
            flush
          >
            <SettlementItems title="Sesje objęte umową" items={items} />
          </CollapsibleSection>
          <CollapsibleSection
            title="Sesje poza umową"
            icon={<FileX2 size={15} />}
            meta={formatSettlementNumber(settlement.nonContractedTotalSessions)}
            defaultOpen={nonContractedItems.length > 0}
            flush
          >
            <SettlementItems title="Sesje poza umową" items={nonContractedItems} muteAmounts />
          </CollapsibleSection>
        </>
      ) : !isLoading ? (
        <div className="card-shell p-6 text-center text-sm text-on-surface-variant">
          Brak danych rozliczenia dla tego miesiąca.
        </div>
      ) : null}
    </div>
  );
}

function HintIcon({ label }: { label: string }) {
  return (
    <Tooltip label={label} align="end">
      <span tabIndex={0} className="inline-flex text-on-surface-muted transition hover:text-primary-light focus-visible:text-primary-light focus-visible:outline-none">
        <Info size={13} aria-hidden="true" />
        <span className="sr-only">{label}</span>
      </span>
    </Tooltip>
  );
}
