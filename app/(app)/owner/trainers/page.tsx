"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SearchX, UserPlus, UsersRound } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { ListSection } from "@/app/components/ui/list/ListSection";
import { ListState } from "@/app/components/ui/list/ListState";
import {
  matchesOwnerLocationId,
  useOwnerLocationFilter,
} from "@/app/lib/owner/location-filter";
import { getTrainers, type Trainer } from "@/app/lib/owner/trainers";
import { showOwnerError } from "../components/owner-toast";
import AddTrainerModal from "./components/AddTrainerModal";
import TrainerList from "./components/TrainerList";
import TrainerListFilters from "./components/TrainerListFilters";
import {
  defaultTrainerListFilters,
  filterTrainers,
  pluralizeTrainers,
  trainerStatus,
  type TrainerListFiltersValue,
} from "./trainer-list-display";

export default function TrainersPage() {
  return <Suspense><TrainersContent /></Suspense>;
}

function TrainersContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const showInvitations = searchParams.get("invitations") === "true";
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const { selectedLocationId } = useOwnerLocationFilter();
  const [filters, setFilters] = useState<TrainerListFiltersValue>(defaultTrainerListFilters);
  const [isLoading, setIsLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (showInvitations) void Promise.resolve().then(() => setIsModalOpen(true));
  }, [showInvitations]);

  async function loadTrainers() {
    try {
      setIsLoading(true);
      const data = await getTrainers();
      setTrainers(data);
      setLoadFailed(false);
    } catch (err) {
      setLoadFailed(true);
      showOwnerError(err, "Błąd ładowania trenerów", {
        id: "owner-trainers-load-error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void Promise.resolve().then(() => loadTrainers());
  }, []);

  const scopedTrainers = useMemo(
    () =>
      trainers.filter((trainer) =>
        matchesOwnerLocationId(trainer, selectedLocationId),
      ),
    [selectedLocationId, trainers],
  );

  const filteredTrainers = useMemo(
    () => filterTrainers(scopedTrainers, filters),
    [scopedTrainers, filters],
  );

  const activeTrainersCount = scopedTrainers.filter(
    (trainer) => trainerStatus(trainer) === "active",
  ).length;

  function renderList() {
    if (isLoading && trainers.length === 0) {
      return <ListState variant="loading" label="Ładowanie trenerów..." />;
    }

    if (loadFailed && trainers.length === 0) {
      return (
        <ListState
          variant="error"
          icon={<UsersRound size={28} />}
          title="Nie udało się wczytać trenerów"
          message="Sprawdź połączenie i spróbuj ponownie."
          action={
            <Button variant="secondary" size="sm" onClick={() => void loadTrainers()} disabled={isLoading}>
              Spróbuj ponownie
            </Button>
          }
        />
      );
    }

    if (scopedTrainers.length === 0) {
      return (
        <ListState
          variant="empty"
          icon={<UsersRound size={28} />}
          title="Brak trenerów"
          message="Zaproś trenera, aby mógł prowadzić zajęcia i klientów w Twoim studiu."
          action={
            <Button size="sm" icon={<UserPlus size={15} />} onClick={() => setIsModalOpen(true)}>
              Dodaj trenera
            </Button>
          }
        />
      );
    }

    if (filteredTrainers.length === 0) {
      return (
        <ListState
          variant="empty"
          icon={<SearchX size={28} />}
          title="Brak trenerów spełniających wybrane kryteria"
          message="Zmień lub wyczyść filtry, aby zobaczyć więcej wyników."
          action={
            <Button variant="secondary" size="sm" onClick={() => setFilters(defaultTrainerListFilters)}>
              Wyczyść filtry
            </Button>
          }
        />
      );
    }

    return <TrainerList trainers={filteredTrainers} />;
  }

  return (
    <>
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-5 pb-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-[560px]">
            <p className="text-label text-primary-light">Zespół trenerów</p>
            <h1 className="mt-2 font-display text-[2.25rem] font-semibold leading-[0.95] tracking-tight">
              Lista <span className="text-primary-light">trenerów</span>
            </h1>
            <p className="mt-3 text-sm leading-6 text-on-surface-variant">
              Zarządzaj zespołem trenerów, dostępnością i wydajnością studia.
            </p>
          </div>

          <div className="flex shrink-0 gap-3">
            <div className="flex min-w-[120px] items-center gap-2 rounded-[var(--radius-lg)] bg-surface-container px-4">
              <p className="text-2xl font-semibold leading-none">
                {isLoading && trainers.length === 0 ? "–" : activeTrainersCount}
              </p>
              <p className="text-sm text-on-surface-variant">Aktywni</p>
            </div>

            <Button
              variant="primary"
              icon={<UserPlus size={16} />}
              className="flex-1 sm:flex-none"
              onClick={() => setIsModalOpen(true)}
            >
              Dodaj trenera
            </Button>
          </div>
        </div>

        <TrainerListFilters value={filters} onChange={setFilters} />

        <ListSection
          title="Zespół"
          description="Specjalizacja, liczba sesji, doświadczenie i status w jednym wierszu."
          meta={!isLoading && !loadFailed ? pluralizeTrainers(filteredTrainers.length) : null}
        >
          {renderList()}
        </ListSection>
      </div>

      <AddTrainerModal
        open={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          if (showInvitations) {
            const params = new URLSearchParams(searchParams.toString());
            params.delete("invitations");
            router.replace(`/owner/trainers${params.size ? `?${params}` : ""}`, { scroll: false });
          }
        }}
      />
    </>
  );
}
