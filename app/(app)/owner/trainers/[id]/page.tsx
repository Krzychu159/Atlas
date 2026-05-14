"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { getClientsByTrainer, type Client } from "@/app/lib/owner/clients";
import { getTrainerRates, type TrainerRate } from "@/app/lib/owner/settlements";
import {
  getTrainerSessions,
  type OwnerSession,
} from "@/app/lib/owner/sessions";
import { getTrainer, type Trainer } from "@/app/lib/owner/trainers";
import EditTrainerModal from "../components/EditTrainerModal";
import TrainerProfileClients from "../components/TrainerProfileClients";
import TrainerProfileHeader from "../components/TrainerProfileHeader";
import TrainerProfileRates from "../components/TrainerProfileRates";
import TrainerSchedulePanel from "../components/TrainerSchedulePanel";

export default function TrainerPage() {
  const params = useParams<{ id: string }>();
  const [trainer, setTrainer] = useState<Trainer | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [rates, setRates] = useState<TrainerRate[]>([]);
  const [sessions, setSessions] = useState<OwnerSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditOpen, setIsEditOpen] = useState(false);

  useEffect(() => {
    async function loadTrainer() {
      try {
        const trainerId = Number(params.id);

        if (!trainerId) {
          toast.error("Nieprawidłowe ID trenera.", {
            id: "owner-trainer-invalid-id",
          });
          return;
        }

        const [trainerResult, clientsResult, ratesResult, sessionsResult] =
          await Promise.allSettled([
            getTrainer(trainerId),
            getClientsByTrainer(trainerId),
            getTrainerRates(trainerId),
            getTrainerSessions(trainerId),
          ]);

        if (trainerResult.status !== "fulfilled") {
          throw trainerResult.reason;
        }

        setTrainer(trainerResult.value);
        setClients(
          clientsResult.status === "fulfilled" ? clientsResult.value : [],
        );
        setRates(ratesResult.status === "fulfilled" ? ratesResult.value : []);
        setSessions(
          sessionsResult.status === "fulfilled" ? sessionsResult.value : [],
        );
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Nie udało się pobrać trenera.",
          { id: "owner-trainer-load-error" },
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadTrainer();
  }, [params.id]);

  return (
    <div className="mx-auto w-full max-w-[1000px] pb-10">
      {isLoading ? (
        <div className="card-shell p-6 text-on-surface-variant">
          Ładowanie profilu trenera...
        </div>
      ) : null}

      {trainer ? (
        <>
          <div className="flex flex-col gap-5">
            <TrainerProfileHeader
              trainer={trainer}
              rates={rates}
              onEdit={() => setIsEditOpen(true)}
            />

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <TrainerProfileClients clients={clients} />
              <TrainerSchedulePanel sessions={sessions} />
            </div>
          </div>

          <EditTrainerModal
            open={isEditOpen}
            trainer={trainer}
            rates={rates}
            onClose={() => setIsEditOpen(false)}
            onSaved={(updatedTrainer, updatedRates) => {
              setTrainer(updatedTrainer);
              setRates(updatedRates);
            }}
          />
        </>
      ) : null}
    </div>
  );
}
