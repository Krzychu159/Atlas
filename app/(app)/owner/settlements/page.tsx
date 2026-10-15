"use client";

import { useSessionCorrectionRevision } from "@/app/lib/session-corrections";
import { useTrainerRatesRevision } from "@/app/lib/owner/trainer-rates-changes";

import { NativeDateInput } from "@/app/components/ui/native-date-input";
import { Button } from "@/app/components/ui/button";
import { FilterSearchField, FilterToolbar } from "@/app/components/ui/list/FilterToolbar";
import { ListSection } from "@/app/components/ui/list/ListSection";
import { ListState } from "@/app/components/ui/list/ListState";

import { useOwnerLocationFilter } from "@/app/lib/owner/location-filter";

import { useEffect, useMemo, useState } from "react";
import { RefreshCw, SearchX, Users } from "lucide-react";
import {
  getOwnerTrainerSettlements,
  type TrainerMonthlySettlement,
} from "@/app/lib/owner/settlements";
import { showOwnerError } from "../components/owner-toast";
import SettlementSummary from "./components/SettlementSummary";
import SettlementTrainerRow, { settlementGridClass, settlementGridStyle } from "./components/SettlementTrainerRow";

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
  const ratesRevision = useTrainerRatesRevision();
  const [monthValue, setMonthValue] = useState("");
  const [search, setSearch] = useState("");
  const [settlements, setSettlements] = useState<TrainerMonthlySettlement[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [refreshRevision, setRefreshRevision] = useState(0);

  useEffect(() => {
    void Promise.resolve().then(() => setMonthValue(getMonthValueFromUrl()));
  }, []);

  useEffect(() => {
    // A slower response for a previous month must not replace the current one.
    let stale = false;

    async function loadSettlements() {
      if (!monthValue) return;

      const { year, month } = parseMonth(monthValue);

      if (!year || !month) return;

      try {
        setIsLoading(true);
        const data = await getOwnerTrainerSettlements(year, month, locationId);
        if (stale) return;
        setSettlements(data);
        setLoadFailed(false);
      } catch (err) {
        if (stale) return;
        setSettlements([]);
        setLoadFailed(true);
        showOwnerError(err, "Nie udało się pobrać rozliczeń.", {
          id: "owner-settlements-load-error",
        });
      } finally {
        if (!stale) setIsLoading(false);
      }
    }

    loadSettlements();
    return () => {
      stale = true;
    };
  }, [monthValue, locationId, correctionRevision, refreshRevision, ratesRevision]);

  function refresh() {
    setIsLoading(true);
    setRefreshRevision((revision) => revision + 1);
  }

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
          <p className="text-label text-primary-light">Panel właściciela</p>
          <h1 className="mt-2 font-display text-[1.75rem] md:text-[2.25rem] font-semibold leading-[0.95] tracking-tight">
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
          onClick={refresh}
          disabled={isLoading || !monthValue}
          className="self-start lg:self-auto"
        >
          Odśwież
        </Button>
      </div>

      {/* The month is the primary selector, so it stays visible on phones; the search sits behind "Filtry". */}
      <FilterToolbar
        search={
          <label className="min-w-0">
            <span className="text-label text-on-surface-muted max-md:sr-only">Miesiąc rozliczenia</span>
            <div className="flex h-11 items-center rounded-[var(--radius-lg)] bg-surface-container-lowest px-3 transition focus-within:shadow-[0_0_0_2px_color-mix(in_srgb,var(--color-primary)_30%,transparent)] md:mt-2 md:h-12 md:px-4">
              <NativeDateInput
                type="month"
                value={monthValue}
                aria-label="Wybierz miesiąc rozliczenia"
                onChange={(event) => {
                  if (!event.target.value || event.target.value === monthValue) return;
                  setIsLoading(true);
                  setMonthValue(event.target.value);
                  updateUrlMonth(event.target.value);
                }}
                className="h-full w-full bg-transparent text-sm font-semibold text-on-surface outline-none"
              />
            </div>
          </label>
        }
        gridClassName="md:grid-cols-[220px_minmax(0,1fr)_auto]"
        canClear={Boolean(search)}
        onClear={() => setSearch("")}
      >
        <FilterSearchField
          value={search}
          onChange={setSearch}
          placeholder="Imię i nazwisko trenera"
          label="Szukaj trenera"
        />
      </FilterToolbar>

      <SettlementSummary settlements={settlements} isLoading={isLoading} />

      <ListSection
        title="Lista trenerów"
        description="Szczegóły pracy i wypłat zespołu w wybranym miesiącu."
        meta={!isLoading && !loadFailed ? `${filteredSettlements.length} ${pluralizeTrainers(filteredSettlements.length)}` : null}
        busy={isLoading}
      >
        {isLoading ? (
          <ListState variant="loading" label="Ładowanie rozliczeń..." />
        ) : loadFailed ? (
          <ListState
            variant="error"
            icon={<Users size={28} />}
            title="Nie udało się wczytać rozliczeń"
            message="Sprawdź połączenie i spróbuj ponownie."
            action={
              <Button variant="secondary" size="sm" onClick={refresh}>
                Spróbuj ponownie
              </Button>
            }
          />
        ) : filteredSettlements.length > 0 ? (
          <div className="bg-surface-container-lowest">
            <div
              style={settlementGridStyle}
              className={`hidden items-center gap-3 bg-surface-container-low px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-on-surface-muted xl:grid ${settlementGridClass}`}
              aria-hidden="true"
            >
              <span>Trener</span>
              <span>Sesje</span>
              <span>Roboczogodziny</span>
              <span className="text-right">Do wypłaty</span>
              <span>Status</span>
              <span className="text-right">Akcje</span>
            </div>
            <ul className="flex flex-col gap-3 p-3 xl:block xl:p-0">
              {filteredSettlements.map((settlement) => (
                <SettlementTrainerRow key={settlement.trainerId} settlement={settlement} locationId={locationId} />
              ))}
            </ul>
          </div>
        ) : normalize(search) ? (
          <ListState
            variant="empty"
            icon={<SearchX size={28} />}
            title="Nie znaleziono trenerów"
            message="Sprawdź imię i nazwisko lub wyczyść wyszukiwanie."
            action={
              <Button variant="secondary" size="sm" onClick={() => setSearch("")}>
                Wyczyść wyszukiwanie
              </Button>
            }
          />
        ) : (
          <ListState
            variant="empty"
            icon={<Users size={28} />}
            title="Brak rozliczeń w tym miesiącu"
            message="Wybierz inny miesiąc lub lokalizację."
          />
        )}
      </ListSection>
    </div>
  );
}

function pluralizeTrainers(count: number) {
  if (count === 1) return "trener";
  const last = count % 10;
  const lastTwo = count % 100;
  return last >= 2 && last <= 4 && !(lastTwo >= 12 && lastTwo <= 14) ? "trenerzy" : "trenerów";
}
