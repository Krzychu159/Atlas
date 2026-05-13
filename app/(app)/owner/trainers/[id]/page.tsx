"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { getClientsByTrainer, type Client } from "@/app/lib/owner/clients";
import {
  getTrainerRates,
  getTrainerSettlement,
  type TrainerMonthlySettlement,
  type TrainerRate,
} from "@/app/lib/owner/settlements";
import { getTrainerSessions, type OwnerSession } from "@/app/lib/owner/sessions";
import { getTrainer, type Trainer } from "@/app/lib/owner/trainers";
import EditTrainerModal from "../components/EditTrainerModal";
import TrainerProfileClients from "../components/TrainerProfileClients";
import TrainerProfileHeader from "../components/TrainerProfileHeader";
import TrainerProfileDetails from "../components/TrainerProfileDetails";
import TrainerProfileRates from "../components/TrainerProfileRates";
import TrainerProfileSettlementPreview from "../components/TrainerProfileSettlementPreview";
import TrainerSchedulePanel from "../components/TrainerSchedulePanel";

function getCurrentSettlementPeriod() {
  const now = new Date();

  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
  };
}

export default function TrainerPage() {
  const params = useParams<{ id: string }>();
  const [trainer, setTrainer] = useState<Trainer | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [rates, setRates] = useState<TrainerRate[]>([]);
  const [settlement, setSettlement] = useState<TrainerMonthlySettlement | null>(
    null,
  );
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

        const { year, month } = getCurrentSettlementPeriod();
        const [
          trainerResult,
          clientsResult,
          ratesResult,
          settlementResult,
          sessionsResult,
        ] = await Promise.allSettled([
          getTrainer(trainerId),
          getClientsByTrainer(trainerId),
          getTrainerRates(trainerId),
          getTrainerSettlement(trainerId, year, month),
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
        setSettlement(
          settlementResult.status === "fulfilled"
            ? settlementResult.value
            : null,
        );
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
    <div className="mx-auto w-full max-w-[1200px] pb-10">
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

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.1fr_0.9fr]">
              <TrainerProfileClients clients={clients} />
              <TrainerSchedulePanel sessions={sessions} />
            </div>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_360px]">
              <TrainerProfileDetails trainer={trainer} />
              <div className="flex flex-col gap-5">
                <TrainerProfileRates rates={rates} />
                <TrainerProfileSettlementPreview settlement={settlement} />
              </div>
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
