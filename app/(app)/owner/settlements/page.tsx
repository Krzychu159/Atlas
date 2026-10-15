"use client";

import { useSessionCorrectionRevision } from "@/app/lib/session-corrections";
import { useTrainerRatesRevision } from "@/app/lib/owner/trainer-rates-changes";

import { NativeDateInput } from "@/app/components/ui/native-date-input";
import { Button } from "@/app/components/ui/button";
import { FilterSearchField, FilterToolbar } from "@/app/components/ui/list/FilterToolbar";
import { ListSection } from "@/app/components/ui/list/ListSection";
import { ListState } from "@/app/components/ui/list/ListState";

import { useOwnerLocationFilter } from "@/app/lib/owner/location-filter";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, SearchX, Users } from "lucide-react";
import {
  getOwnerTrainerSettlements,
} from "@/app/lib/owner/settlements";
import { useOwnerRead } from "../components/use-owner-read";
import { OwnerReadState } from "../components/OwnerReadState";
import { PaymentPagination } from "@/app/components/payments/PaymentPagination";
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
  return <OwnerSettlementsPageContent locationId={locationId} />;
}

function OwnerSettlementsPageContent({ locationId }: { locationId: number | null }) {
  const correctionRevision = useSessionCorrectionRevision();
  const ratesRevision = useTrainerRatesRevision();
  const [monthValue, setMonthValue] = useState("");
  const [search, setSearch] = useState("");
  const [pagination, setPagination] = useState({ page: 1, locationId });
  const page = pagination.locationId === locationId ? pagination.page : 1;
  const setPage = (next: number) => setPagination({ page: next, locationId });
  useEffect(() => { let active = true; void Promise.resolve().then(() => { if (active) setMonthValue(getMonthValueFromUrl()); }); return () => { active = false; }; }, []);
  const { year, month } = parseMonth(monthValue);
  const load = useCallback((signal: AbortSignal) => getOwnerTrainerSettlements(year, month, locationId, { search: search.trim(), page, pageSize: 25 }, signal), [year, month, locationId, search, page]);
  const valid = year >= 2000 && year <= 2100 && month >= 1 && month <= 12 && search.length <= 100;
  const list = useOwnerRead(JSON.stringify([year, month, locationId, search, page]), load, "Nie udało się pobrać rozliczeń.", correctionRevision + ":" + ratesRevision, 250, valid);
  const isLoading = list.loading;
  const loadFailed = Boolean(list.error) || !valid;
  const filteredSettlements = (list.data?.items ?? []).map(item => ({ ...item, year, month, items: null }));
  const refresh = list.retry;
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
                  setMonthValue(event.target.value); setPage(1);
                  updateUrlMonth(event.target.value);
                }}
                className="h-full w-full bg-transparent text-sm font-semibold text-on-surface outline-none"
              />
            </div>
          </label>
        }
        gridClassName="md:grid-cols-[220px_minmax(0,1fr)_auto]"
        canClear={Boolean(search)}
        onClear={() => (setSearch(""), setPage(1))}
      >
        <FilterSearchField
          value={search}
          onChange={(value) => { setSearch(value); setPage(1); }}
          placeholder="Imię i nazwisko trenera"
          label="Szukaj trenera"
        />
      </FilterToolbar>

      <OwnerReadState loading={isLoading} error={list.error || (!valid && monthValue ? "Wybierz poprawny miesiąc i wpisz maksymalnie 100 znaków wyszukiwania." : undefined)} retry={refresh} label="Ładowanie rozliczeń..." />
      {list.data && !loadFailed ? <SettlementSummary settlements={filteredSettlements} summary={list.data.summary} isLoading={isLoading} /> : null}

      <ListSection
        title="Lista trenerów"
        description="Szczegóły pracy i wypłat zespołu w wybranym miesiącu."
        meta={!isLoading && !loadFailed ? `${list.data?.totalCount ?? 0} ${pluralizeTrainers(list.data?.totalCount ?? 0)}` : null}
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
        {list.data && list.data.totalPages > 1 && !isLoading && !list.error ? <PaymentPagination page={list.data.page} pageSize={list.data.pageSize} totalItems={list.data.totalCount} totalPages={list.data.totalPages} onPageChange={setPage} itemLabel="trenerów" ariaLabel="Strony rozliczeń trenerów" /> : null}
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
