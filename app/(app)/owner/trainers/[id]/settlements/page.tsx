"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Dumbbell,
  ReceiptText,
  Wallet,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import {
  getTrainerRates,
  getTrainerSettlement,
  markTrainerSettlementAsPaid,
  type TrainerMonthlySettlement,
  type TrainerRate,
  type TrainerSettlementItem,
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
  window.history.replaceState(null, "", url.toString());
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("pl-PL", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatSessionType(value: string | null) {
  if (!value) return "Sesja";

  return value.replace(/([a-z])([A-Z])/g, "$1 $2");
}

export default function TrainerSettlementPage() {
  const params = useParams<{ id: string }>();
  const trainerId = Number(params.id);
  const [monthValue, setMonthValue] = useState(getCurrentMonthValue);
  const [trainer, setTrainer] = useState<Trainer | null>(null);
  const [rates, setRates] = useState<TrainerRate[]>([]);
  const [settlement, setSettlement] = useState<TrainerMonthlySettlement | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isMarkingPaid, setIsMarkingPaid] = useState(false);

  useEffect(() => {
    setMonthValue(getMonthValueFromUrl());
  }, []);

  useEffect(() => {
    async function loadSettlement() {
      const { year, month } = parseMonth(monthValue);

      if (!trainerId || !year || !month) {
        showOwnerError(new Error("Nieprawidłowe dane rozliczenia."), "", {
          id: "owner-trainer-settlement-invalid",
        });
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const [trainerResult, ratesResult, settlementResult] =
          await Promise.allSettled([
            getTrainer(trainerId),
            getTrainerRates(trainerId),
            getTrainerSettlement(trainerId, year, month),
          ]);

        if (trainerResult.status !== "fulfilled") {
          throw trainerResult.reason;
        }

        setTrainer(trainerResult.value);
        setRates(ratesResult.status === "fulfilled" ? ratesResult.value : []);
        setSettlement(
          settlementResult.status === "fulfilled"
            ? settlementResult.value
            : null,
        );
      } catch (err) {
        showOwnerError(err, "Nie udało się pobrać rozliczenia trenera.", {
          id: "owner-trainer-settlement-load-error",
        });
      } finally {
        setIsLoading(false);
      }
    }

    loadSettlement();
  }, [monthValue, trainerId]);

  const activeRates = useMemo(
    () => rates.filter((rate) => rate.isActive),
    [rates],
  );
  const items = settlement?.items ?? [];
  const trainerName =
    trainer?.fullName ||
    `${trainer?.firstName ?? ""} ${trainer?.lastName ?? ""}`.trim();

  async function handleMarkAsPaid() {
    if (!settlement) return;

    try {
      setIsMarkingPaid(true);
      const data = await markTrainerSettlementAsPaid(
        settlement.trainerId,
        settlement.year,
        settlement.month,
      );
      setSettlement(data);
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

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-5 pb-10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Link
            href={`/owner/trainers/${trainerId || ""}`}
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary-light"
          >
            <ArrowLeft size={17} />
            Profil trenera
          </Link>
          <p className="mt-6 text-label text-primary-light">Rozliczenia</p>
          <h1 className="mt-2 font-display text-[2.25rem] font-semibold leading-[0.95] tracking-tight">
            {trainerName || "Trener"}
          </h1>
          <p className="mt-3 text-on-surface-variant">
            Stawki, sesje i kwota do wypłaty za wybrany miesiąc.
          </p>
        </div>

        <label className="flex w-full max-w-[220px] items-center gap-3 rounded-[var(--radius-lg)] bg-surface-container px-4 py-3">
          <CalendarDays size={18} className="text-primary-light" />
          <input
            type="month"
            value={monthValue}
            onChange={(event) => {
              setMonthValue(event.target.value);
              updateUrlMonth(event.target.value);
            }}
            className="w-full bg-transparent text-sm font-semibold text-on-surface outline-none"
          />
        </label>
      </div>

      {isLoading ? (
        <div className="card-shell p-6 text-on-surface-variant">
          Ładowanie rozliczenia...
        </div>
      ) : null}

      {settlement ? (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <SummaryCard
              label="Sesje"
              value={settlement.totalSessions}
              icon={<ReceiptText size={20} />}
            />
            <SummaryCard
              label="Roboczogodziny"
              value={`${settlement.totalHours.toFixed(1)} h`}
              icon={<Clock3 size={20} />}
            />
            <SummaryCard
              label="Do wypłaty"
              value={formatMoney(settlement.totalAmount)}
              icon={<Wallet size={20} />}
              highlight
            />
            <SummaryCard
              label="Status"
              value={settlement.isPaid ? "Paid" : "Unpaid"}
              icon={<CheckCircle2 size={20} />}
            />
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[0.85fr_1.15fr]">
            <section className="card-shell p-6">
              <p className="text-section-title">Stawka</p>
              <p className="mt-2 text-sm text-on-surface-variant">
                Aktualna stawka godzinowa trenera.
              </p>

              <div className="mt-5 flex flex-col gap-3">
                {(activeRates.length ? activeRates : rates).length > 0 ? (
                  (activeRates.length ? activeRates : rates).map((rate) => (
                    <div
                      key={rate.id}
                      className="rounded-[var(--radius-lg)] bg-surface-container-low p-4"
                    >
                      <p className="text-sm font-semibold text-on-surface">
                        {rate.sessionType || "Stawka domyślna"}
                      </p>
                      <p className="mt-2 text-2xl font-semibold text-tertiary-light">
                        {formatMoney(rate.rate)}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[var(--radius-lg)] bg-surface-container-low p-5 text-on-surface-variant">
                    Brak stawek z API.
                  </div>
                )}
              </div>

              <div className="mt-5 rounded-[var(--radius-lg)] bg-surface-container-low p-4">
                <p className="text-label text-on-surface-muted">
                  Status płatności
                </p>
                <span
                  className={[
                    "mt-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold",
                    settlement.isPaid
                      ? "bg-tertiary-container text-tertiary-light"
                      : "bg-warning-container text-warning-light",
                  ].join(" ")}
                >
                  <CheckCircle2 size={14} />
                  {settlement.isPaid ? "Wypłacone" : "Niewypłacone"}
                </span>

                <Button
                  className="mt-4 h-12 w-full justify-center rounded-[var(--radius-lg)]"
                  onClick={handleMarkAsPaid}
                  disabled={settlement.isPaid || isMarkingPaid}
                >
                  {settlement.isPaid
                    ? "Już wypłacone"
                    : isMarkingPaid
                      ? "Zapisywanie..."
                      : "Oznacz jako wypłacone"}
                </Button>
              </div>
            </section>

            <section className="card-shell p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-section-title">Lista sesji</p>
                  <p className="mt-2 text-sm text-on-surface-variant">
                    Typ sesji, przeliczone godziny i kwota.
                  </p>
                </div>
                <Dumbbell className="text-primary-light" size={22} />
              </div>

              <div className="mt-5 flex flex-col gap-3">
                {items.length > 0 ? (
                  items.map((item) => (
                    <SettlementItemRow key={item.sessionId} item={item} />
                  ))
                ) : (
                  <div className="rounded-[var(--radius-lg)] bg-surface-container-low p-8 text-center text-on-surface-variant">
                    Brak sesji w wybranym miesiącu.
                  </div>
                )}
              </div>
            </section>
          </div>
        </>
      ) : !isLoading ? (
        <div className="card-shell p-8 text-center text-on-surface-variant">
          Brak danych rozliczenia dla tego miesiąca.
        </div>
      ) : null}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon,
  highlight,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div className="card-shell p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-label text-on-surface-variant">{label}</p>
        <span className="text-primary-light">{icon}</span>
      </div>
      <p
        className={[
          "mt-5 text-xl font-semibold leading-tight md:text-2xl",
          highlight ? "text-tertiary-light" : "text-on-surface",
        ].join(" ")}
      >
        {value}
      </p>
    </div>
  );
}

function SettlementItemRow({ item }: { item: TrainerSettlementItem }) {
  return (
    <div className="grid gap-3 rounded-[var(--radius-lg)] bg-surface-container-low p-4 md:grid-cols-[1fr_0.65fr_0.65fr_0.7fr] md:items-center">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-on-surface">
          {item.title || formatSessionType(item.sessionType)}
        </p>
        <p className="mt-1 text-xs text-on-surface-muted">
          {formatDateTime(item.startAt)} · {formatSessionType(item.sessionType)}
        </p>
      </div>
      <Metric label="Godziny" value={`${item.hours.toFixed(1)} h`} />
      <Metric label="Stawka" value={formatMoney(item.rate)} />
      <div>
        <p className="text-label text-on-surface-muted">Kwota</p>
        <p className="mt-1 text-base font-semibold text-tertiary-light">
          {formatMoney(item.amount)}
        </p>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-label text-on-surface-muted">{label}</p>
      <p className="mt-1 text-sm font-semibold text-on-surface">{value}</p>
    </div>
  );
}
