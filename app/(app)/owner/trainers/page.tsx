"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/app/components/ui/button";
import { getTrainers, type Trainer } from "@/app/lib/owner/trainers";
import { getTrainerSessions } from "@/app/lib/owner/sessions";
import AddTrainerModal from "./components/AddTrainerModal";
import TrainerCard, {
  type TrainerSessionTrend,
} from "./components/TrainerCard";

function normalize(value: string) {
  return value.toLowerCase().trim();
}

export default function TrainersPage() {
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [sessionTrends, setSessionTrends] = useState<
    Record<number, TrainerSessionTrend>
  >({});
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  async function loadTrainers() {
    try {
      const data = await getTrainers();
      setTrainers(data);
      loadSessionTrends(data);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Błąd ładowania trenerów",
        { id: "owner-trainers-load-error" },
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function loadSessionTrends(items: Trainer[]) {
    const now = new Date();
    const currentStart = new Date(now);
    currentStart.setDate(currentStart.getDate() - 30);
    const previousStart = new Date(now);
    previousStart.setDate(previousStart.getDate() - 60);

    const results = await Promise.allSettled(
      items.map((trainer) => getTrainerSessions(trainer.id)),
    );

    const trends: Record<number, TrainerSessionTrend> = {};

    items.forEach((trainer, index) => {
      const result = results[index];

      if (result.status !== "fulfilled") return;

      const sessions = result.value;
      const current = sessions.filter((session) => {
        const time = new Date(session.startAt).getTime();
        return time >= currentStart.getTime() && time <= now.getTime();
      }).length;
      const previous = sessions.filter((session) => {
        const time = new Date(session.startAt).getTime();
        return time >= previousStart.getTime() && time < currentStart.getTime();
      }).length;
      const percent =
        previous > 0
          ? Math.round(((current - previous) / previous) * 100)
          : current > 0
            ? 100
            : 0;

      trends[trainer.id] = { current, previous, percent };
    });

    setSessionTrends(trends);
  }

  useEffect(() => {
    loadTrainers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredTrainers = useMemo(() => {
    const query = normalize(search);

    if (!query) return trainers;

    return trainers.filter((trainer) => {
      const fullName = normalize(
        trainer.fullName || `${trainer.firstName} ${trainer.lastName}`,
      );
      const email = normalize(trainer.email || "");
      const bio = normalize(trainer.bio || "");
      const role = normalize(trainer.role || "");

      return (
        fullName.includes(query) ||
        email.includes(query) ||
        bio.includes(query) ||
        role.includes(query)
      );
    });
  }, [trainers, search]);

  const activeTrainers = trainers.filter((trainer) =>
    normalize(trainer.status || "").includes("active"),
  );

  return (
    <>
      <div className="max-w-[1000px] mx-auto">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div className="max-w-[560px]">
              <p className="text-label text-primary-light">Coaching Staff</p>
              <h1 className="mt-2 text-[2.25rem] leading-[0.95] mb-3 font-semibold font-display tracking-tight">
                Trainer <span className="text-primary-light">Directory</span>
              </h1>
              <p className="text-on-surface-variant">
                Zarządzaj zespołem trenerów, dostępnością i wydajnością studia.
              </p>
            </div>

            <div className="flex gap-3 shrink-0">
              <div className="bg-surface-container rounded-[var(--radius-lg)] px-4 py-3 min-w-[130px]">
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-semibold leading-none">
                    {activeTrainers.length}
                  </p>
                  <p className="text-sm text-on-surface-variant">
                    Active Staff
                  </p>
                </div>
              </div>

              <Button
                variant="primary"
                icon={<UserPlus size={16} />}
                className="h-14"
                onClick={() => setIsModalOpen(true)}
              >
                Dodaj Trenera
              </Button>
            </div>
          </div>

          <div className="bg-surface-container rounded-[var(--radius-lg)] p-3 flex items-center gap-3">
            <div className="flex-1 flex items-center gap-3 bg-surface-container-low rounded-[var(--radius-lg)] px-4 py-3">
              <Search size={16} className="text-on-surface-variant shrink-0" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Szukaj trenerów, specjalizacji, maili..."
                className="w-full bg-transparent outline-none text-sm text-on-surface placeholder:text-on-surface-muted"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="card-shell p-5 text-on-surface-variant">
              Ładowanie trenerów...
            </div>
          ) : filteredTrainers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredTrainers.map((trainer) => (
                <TrainerCard
                  key={trainer.id}
                  trainer={trainer}
                  trend={sessionTrends[trainer.id]}
                />
              ))}
            </div>
          ) : (
            <div className="card-shell p-8 text-center text-on-surface-variant">
              Brak trenerów dla podanych kryteriów.
            </div>
          )}
        </div>
      </div>

      <AddTrainerModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
