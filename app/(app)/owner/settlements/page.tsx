"use client";

import { useSessionCorrectionRevision } from "@/app/lib/session-corrections";

import { NativeDateInput } from "@/app/components/ui/native-date-input";

import { useOwnerLocationFilter } from "@/app/lib/owner/location-filter";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import {
  getOwnerTrainerSettlements,
  type TrainerMonthlySettlement,
} from "@/app/lib/owner/settlements";
import { showOwnerError } from "../components/owner-toast";
import SettlementSummary from "./components/SettlementSummary";
import SettlementTrainerRow from "./components/SettlementTrainerRow";

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
  }, [monthValue, locationId, correctionRevision]);

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
          <p className="mt-3 max-w-[620px] text-on-surface-variant">
            Miesięczny widok wypłat, roboczogodzin i sesji dla całego zespołu.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-[220px_260px]">
          <label className="relative block min-h-[68px] cursor-pointer rounded-[var(--radius-lg)] bg-surface-container px-4 py-2.5 shadow-soft transition hover:bg-surface-container-high">
            <span className="block text-label text-primary-light">Miesiąc rozliczenia</span>
            <NativeDateInput
              type="month"
              value={monthValue}
              aria-label="Wybierz miesiąc rozliczenia"
              onChange={(event) => {
                setMonthValue(event.target.value);
                updateUrlMonth(event.target.value);
              }}
              className="h-8 w-full bg-transparent text-sm font-semibold"
            />
          </label>

          <label className="flex min-h-[68px] items-center gap-3 rounded-[var(--radius-lg)] bg-surface-container px-4 py-3 shadow-soft transition focus-within:bg-surface-container-high hover:bg-surface-container-high">
            <Search size={18} className="text-on-surface-muted" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Szukaj trenera..."
              className="w-full bg-transparent text-sm text-on-surface outline-none placeholder:text-on-surface-muted"
            />
          </label>
        </div>
      </div>

      <SettlementSummary settlements={settlements} />

      <section className="card-shell p-4 md:p-5">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-section-title">Lista trenerów</p>
            <p className="mt-2 text-sm text-on-surface-variant">
              Szybkie wejście prowadzi do szczegółów miesięcznego rozliczenia.
            </p>
          </div>
          <p className="text-label text-on-surface-muted">
            {filteredSettlements.length} pozycji
          </p>
        </div>

        {isLoading ? (
          <div className="rounded-[var(--radius-lg)] bg-surface-container-low p-5 text-on-surface-variant">
            Ładowanie rozliczeń...
          </div>
        ) : filteredSettlements.length > 0 ? (
          <div className="flex flex-col gap-3">
            {filteredSettlements.map((settlement) => (
              <SettlementTrainerRow
                key={settlement.trainerId}
                settlement={settlement}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-[var(--radius-lg)] bg-surface-container-low p-8 text-center text-on-surface-variant">
            Brak rozliczeń dla wybranych kryteriów.
          </div>
        )}
      </section>
    </div>
  );
}
