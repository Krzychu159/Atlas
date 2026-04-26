"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getTrainer, type Trainer } from "@/app/lib/owner/trainers";
import TrainerProfileHeader from "../components/TrainerProfileHeader";
import TrainerProfileStats from "../components/TrainerProfileStats";
import TrainerProfileDetails from "../components/TrainerProfileDetails";

export default function TrainerPage() {
  const params = useParams<{ id: string }>();

  const [trainer, setTrainer] = useState<Trainer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadTrainer() {
      try {
        setError("");

        const trainerId = Number(params.id);

        if (!trainerId) {
          setError("Nieprawidłowe ID trenera");
          return;
        }

        const data = await getTrainer(trainerId);
        setTrainer(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Nie udało się pobrać trenera",
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadTrainer();
  }, [params.id]);

  return (
    <div className="mx-auto w-full max-w-[1000px]">
      {isLoading ? (
        <div className="card-shell p-6 text-on-surface-variant">
          Ładowanie profilu trenera...
        </div>
      ) : null}

      {error ? (
        <div className="card-shell p-6 text-error-light">{error}</div>
      ) : null}

      {trainer ? (
        <div className="flex flex-col gap-5">
          <TrainerProfileHeader trainer={trainer} />
          <TrainerProfileStats trainer={trainer} />
          <TrainerProfileDetails trainer={trainer} />
        </div>
      ) : null}
    </div>
  );
}
