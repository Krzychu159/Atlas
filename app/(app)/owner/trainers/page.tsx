"use client";

import { useEffect, useState } from "react";
import { UserPlus } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { getTrainers, type Trainer } from "@/app/lib/owner/trainers";
import { showOwnerError } from "../components/owner-toast";
import AddTrainerModal from "./components/AddTrainerModal";
import TrainerCard from "./components/TrainerCard";

function normalize(value: string) {
  return value.toLowerCase().trim();
}

export default function TrainersPage() {
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  async function loadTrainers() {
    try {
      setIsLoading(true);
      const data = await getTrainers();
      setTrainers(data);
    } catch (err) {
      showOwnerError(err, "Błąd ładowania trenerów", {
        id: "owner-trainers-load-error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadTrainers();
  }, []);

  const activeTrainers = trainers.filter((trainer) =>
    normalize(trainer.status || "").includes("active"),
  );

  return (
    <>
      <div className="max-w-[1400px] mx-auto">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-[560px]">
              <p className="text-label text-primary-light">Zespół trenerów</p>
              <h1 className="mt-2 mb-3 font-display text-[2.25rem] font-semibold leading-[0.95] tracking-tight">
                Lista <span className="text-primary-light">trenerów</span>
              </h1>
              <p className="text-on-surface-variant">
                Zarządzaj zespołem trenerów, dostępnością i wydajnością studia.
              </p>
            </div>

            <div className="flex shrink-0 gap-3">
              <div className="min-w-[130px] rounded-[var(--radius-lg)] bg-surface-container px-4 py-3">
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-semibold leading-none">
                    {activeTrainers.length}
                  </p>
                  <p className="text-sm text-on-surface-variant">
                    Aktywni
                  </p>
                </div>
              </div>

              <Button
                variant="primary"
                icon={<UserPlus size={16} />}
                className="h-14"
                onClick={() => setIsModalOpen(true)}
              >
                Dodaj trenera
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="card-shell p-5 text-on-surface-variant">
              Ładowanie trenerów...
            </div>
          ) : trainers.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {trainers.map((trainer) => (
                <TrainerCard key={trainer.id} trainer={trainer} />
              ))}
            </div>
          ) : (
            <div className="card-shell p-8 text-center text-on-surface-variant">
              Brak trenerów.
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
