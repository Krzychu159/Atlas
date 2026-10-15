"use client";

import { useCallback, useState } from "react";
import { useParams } from "next/navigation";
import { getClientsByTrainer } from "@/app/lib/owner/clients";
import { getTrainerRates, type TrainerRate } from "@/app/lib/owner/settlements";
import {
  getOwnerSessionPage,
} from "@/app/lib/owner/sessions";
import { getTrainer, type Trainer } from "@/app/lib/owner/trainers";
import EditTrainerModal from "../components/EditTrainerModal";
import TrainerContractsModal from "../components/TrainerContractsModal";
import TrainerProfileClients from "../components/TrainerProfileClients";
import TrainerProfileHeader from "../components/TrainerProfileHeader";
import TrainerSchedulePanel from "../components/TrainerSchedulePanel";
import { useOwnerRead } from "../../components/use-owner-read";
import { OwnerReadState } from "../../components/OwnerReadState";

export default function TrainerPage() {
  const params = useParams<{ id: string }>();
  const trainerId = Number(params.id);
  if (!Number.isSafeInteger(trainerId) || trainerId <= 0) return <p role="alert">Nie można otworzyć tego trenera. Wróć do listy trenerów i wybierz go ponownie.</p>;
  return <TrainerProfile key={trainerId} trainerId={trainerId} />;
}

function TrainerProfile({ trainerId }: { trainerId: number }) {
  const loadTrainer = useCallback((signal: AbortSignal) => getTrainer(trainerId, signal), [trainerId]);
  const loadClients = useCallback((signal: AbortSignal) => getClientsByTrainer(trainerId, signal), [trainerId]);
  const loadRates = useCallback((signal: AbortSignal) => getTrainerRates(trainerId, signal), [trainerId]);
  const [sessionPage, setSessionPage] = useState(1);
  const loadSessions = useCallback((signal: AbortSignal) => getOwnerSessionPage({ trainerId, page: sessionPage, pageSize: 4, order: "asc" }, signal), [trainerId, sessionPage]);
  const profile = useOwnerRead(String(trainerId), loadTrainer, "Nie udało się pobrać profilu trenera.");
  const clientList = useOwnerRead(String(trainerId), loadClients, "Nie udało się pobrać klientów trenera.");
  const rateList = useOwnerRead(String(trainerId), loadRates, "Nie udało się pobrać stawek trenera.");
  const sessionList = useOwnerRead(`${trainerId}:${sessionPage}`, loadSessions, "Nie udało się pobrać grafiku trenera.");
  const trainer = profile.data;
  const rates = rateList.data ?? [];
  const setTrainer = profile.setData;
  const setRates = rateList.setData;
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editContext, setEditContext] = useState<{ trainer: Trainer; rates: TrainerRate[] } | null>(null);
  const [isContractsOpen, setIsContractsOpen] = useState(false);

  return (
    <div className="mx-auto w-full max-w-[1400px] pb-10">
      <OwnerReadState loading={profile.loading && !trainer} error={profile.error} retry={profile.retry} label="Ładowanie profilu trenera..." />

      {trainer ? (
        <>
          <div className="flex flex-col gap-5">
            <TrainerProfileHeader
              trainer={trainer}
              rates={rates}
              ratesAvailable={rateList.data !== undefined}
              onEdit={() => {
                if (rateList.data === undefined) return;
                setEditContext({ trainer, rates });
                setIsEditOpen(true);
              }}
              onContracts={() => setIsContractsOpen(true)}
            />

            <OwnerReadState loading={rateList.loading && rateList.data === undefined} error={rateList.error} retry={rateList.retry} label="Ładowanie stawek trenera..." />
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <OwnerReadState loading={clientList.loading} error={clientList.error} retry={clientList.retry} label="Ładowanie klientów trenera...">{clientList.data !== undefined ? <TrainerProfileClients clients={clientList.data} /> : null}</OwnerReadState>
              <OwnerReadState loading={sessionList.loading} error={sessionList.error} retry={sessionList.retry} label="Ładowanie grafiku trenera...">{sessionList.data !== undefined ? <TrainerSchedulePanel sessions={sessionList.data.items ?? []} pagination={{ ...sessionList.data, onPageChange: setSessionPage }} /> : null}</OwnerReadState>
            </div>
          </div>

          <EditTrainerModal
            open={isEditOpen}
            trainer={editContext?.trainer ?? trainer}
            rates={editContext?.rates ?? rates}
            onClose={() => setIsEditOpen(false)}
            onAvatarChanged={(avatarUrl) =>
              setTrainer((current) =>
                current ? { ...current, avatarUrl } : current,
              )
            }
            onSaved={(updatedTrainer, updatedRates) => {
              setTrainer(updatedTrainer);
              setRates(updatedRates);
            }}
          />

          <TrainerContractsModal
            open={isContractsOpen}
            trainerId={trainer.id}
            trainerName={
              trainer.fullName || `${trainer.firstName} ${trainer.lastName}`
            }
            onClose={() => setIsContractsOpen(false)}
          />
        </>
      ) : null}
    </div>
  );
}
