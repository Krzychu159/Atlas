"use client";

import { useSessionCorrectionRevision } from "@/app/lib/session-corrections";

import { NativeDateInput } from "@/app/components/ui/native-date-input";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";

import { useOwnerLocationFilter } from "@/app/lib/owner/location-filter";

import { useEffect, useMemo, useState } from "react";
import { LoaderCircle, RefreshCw, Search, Users } from "lucide-react";
import {
  getOwnerTrainerSettlements,
  type TrainerMonthlySettlement,
} from "@/app/lib/owner/settlements";
import { showOwnerError } from "../components/owner-toast";
import SettlementSummary from "./components/SettlementSummary";
import SettlementTrainerRow, { settlementGridClass } from "./components/SettlementTrainerRow";

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

  return `${year}-${String(month).padStart(2, "0")}`;
}

function parseMonth(value: string) {
  const [year, month] = value.split("-").map(Number);

  return { year, month };
}



function updateUrlMonth(value: string) {
  const { year, month } = parseMonth(value);

  if (!year || !month) return;

  const url = new URL(window.location.href);
  url.searchParams.set("year", String(year));
  url.searchParams.set("month", String(month));
  window.history.replaceState(null, "", url.toString());
}

function normalize(value: string) {
  return value.toLowerCase().trim();
}

export default function OwnerSettlementsPage() {
  const { selectedLocationId } = useOwnerLocationFilter();
  const locationId = selectedLocationId;
  return <OwnerSettlementsPageContent key={locationId ?? "all"} locationId={locationId} />;
}

function OwnerSettlementsPageContent({ locationId }: { locationId: number | null }) {
  const correctionRevision = useSessionCorrectionRevision();
  const [monthValue, setMonthValue] = useState("");
  const [search, setSearch] = useState("");
  const [settlements, setSettlements] = useState<TrainerMonthlySettlement[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(true);
  const [refreshRevision, setRefreshRevision] = useState(0);

  useEffect(() => {
    void Promise.resolve().then(() => setMonthValue(getMonthValueFromUrl()));
  }, []);

  useEffect(() => {
    async function loadSettlements() {
      if (!monthValue) return;

      const { year, month } = parseMonth(monthValue);

      if (!year || !month) return;

      try {
        setIsLoading(true);
        const data = await getOwnerTrainerSettlements(year, month, locationId);
        setSettlements(data);
      } catch (err) {
        showOwnerError(err, "Nie udało się pobrać rozliczeń.", {
          id: "owner-settlements-load-error",
        });
      } finally {
        setIsLoading(false);
      }
    }

    loadSettlements();
  }, [monthValue, locationId, correctionRevision, refreshRevision]);

  const filteredSettlements = useMemo(() => {
    const query = normalize(search);

    if (!query) return settlements;

    return settlements.filter((settlement) =>
      normalize(settlement.trainerFullName || "").includes(query),
    );
  }, [settlements, search]);

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-5 pb-10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-label text-primary-light">Panel ownera</p>
          <h1 className="mt-2 font-display text-[2.25rem] font-semibold leading-[0.95] tracking-tight">
            Rozliczenia trenerów
          </h1>
          <p className="mt-3 max-w-[720px] text-sm leading-6 text-on-surface-variant">
            Miesięczny widok wypłat, roboczogodzin i sesji dla całego zespołu.
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          icon={<RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />}
          onClick={() => {
            setIsLoading(true);
            setRefreshRevision((revision) => revision + 1);
          }}
          disabled={isLoading || !monthValue}
          className="self-start lg:self-auto"
        >
          Odśwież
        </Button>
      </div>

      <section className="card-shell p-3 md:p-4" aria-label="Wybór miesiąca i wyszukiwanie trenerów">
        <div className="grid gap-3 sm:grid-cols-[220px_minmax(0,1fr)_auto] sm:items-center">
          <div className="min-w-0 rounded-[var(--radius-lg)] bg-surface-container-lowest px-3 py-2 transition focus-within:shadow-[0_0_0_2px_color-mix(in_srgb,var(--color-primary)_30%,transparent)]">
            <label htmlFor="settlement-month" className="block text-[10px] font-semibold uppercase tracking-wider text-on-surface-muted">Miesiąc rozliczenia</label>
            <NativeDateInput
              id="settlement-month"
              type="month"
              value={monthValue}
              aria-label="Wybierz miesiąc rozliczenia"
              onChange={(event) => {
                if (!event.target.value || event.target.value === monthValue) return;
                setIsLoading(true);
                setMonthValue(event.target.value);
                updateUrlMonth(event.target.value);
              }}
              className="h-7 w-full bg-transparent text-sm font-semibold focus-visible:outline-2 focus-visible:outline-primary-light"
            />
          </div>

          <Input
            type="search"
            icon={<Search size={17} />}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Szukaj trenera..."
            aria-label="Szukaj trenera"
            className="h-12"
          />
          <Button variant="ghost" size="sm" onClick={() => setSearch("")} disabled={!search}>
            Wyczyść
          </Button>
        </div>
      </section>

      <SettlementSummary settlements={settlements} isLoading={isLoading} />

      <section className="overflow-hidden rounded-[var(--radius-xl)] bg-surface-container-low shadow-soft" aria-label="Lista trenerów" aria-busy={isLoading}>
        <div className="flex flex-col gap-3 px-4 py-5 sm:flex-row sm:items-center sm:justify-between md:px-5">
          <div>
            <h2 className="font-display text-xl font-semibold tracking-tight">Lista trenerów</h2>
            <p className="mt-2 text-sm text-on-surface-variant">
              Szczegóły pracy i wypłat zespołu w wybranym miesiącu.
            </p>
          </div>
          {!isLoading ? (
            <span className="self-start whitespace-nowrap rounded-[var(--radius-md)] bg-surface-container-lowest px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant sm:self-auto">
              {filteredSettlements.length} {pluralizeTrainers(filteredSettlements.length)}
            </span>
          ) : null}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 bg-surface-container-lowest px-5 py-10 text-sm text-on-surface-muted" role="status">
            <LoaderCircle size={18} className="animate-spin" aria-hidden="true" />
            Ładowanie rozliczeń...
          </div>
        ) : filteredSettlements.length > 0 ? (
          <div className="bg-surface-container-lowest">
            <div className={`hidden items-center gap-3 bg-surface-container-low px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-on-surface-muted xl:grid ${settlementGridClass}`} aria-hidden="true">
              <span>Trener</span>
              <span>Sesje</span>
              <span>Roboczogodziny</span>
              <span className="text-right">Do wypłaty</span>
              <span>Status</span>
              <span className="text-right">Akcje</span>
            </div>
            <ul className="flex flex-col gap-3 p-3 xl:block xl:p-0">
              {filteredSettlements.map((settlement) => (
                <SettlementTrainerRow key={settlement.trainerId} settlement={settlement} />
              ))}
            </ul>
          </div>
        ) : (
          <div className="flex flex-col items-center bg-surface-container-lowest px-5 py-8 text-center" role="status">
            <Users size={24} className="text-on-surface-muted" aria-hidden="true" />
            <p className="mt-3 text-sm font-semibold text-on-surface">
              {normalize(search) ? "Nie znaleziono trenerów" : "Brak rozliczeń w tym miesiącu"}
            </p>
            <p className="mt-1 text-sm text-on-surface-muted">
              {normalize(search) ? "Sprawdź imię i nazwisko lub wyczyść wyszukiwanie." : "Wybierz inny miesiąc lub lokalizację."}
            </p>
            {normalize(search) ? (
              <Button variant="ghost" size="sm" className="mt-3" onClick={() => setSearch("")}>Wyczyść wyszukiwanie</Button>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}

function pluralizeTrainers(count: number) {
  if (count === 1) return "trener";
  const last = count % 10;
  const lastTwo = count % 100;
  return last >= 2 && last <= 4 && !(lastTwo >= 12 && lastTwo <= 14) ? "trenerzy" : "trenerów";
}
