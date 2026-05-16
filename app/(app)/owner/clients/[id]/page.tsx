"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  getClient,
  getClientSubscription,
  getClientSubscriptionUsage,
  getClientTrainingPlan,
  type Client,
  type ClientSubscription,
  type ClientTrainingPlan,
  type SubscriptionUsage,
} from "@/app/lib/owner/clients";
import { getClientSessions, type OwnerSession } from "@/app/lib/owner/sessions";
import ClientMetricCards from "./components/ClientMetricCards";
import ClientNotesPanel from "./components/ClientNotesPanel";
import ClientProfileHero from "./components/ClientProfileHero";
import ClientSessionsPanel from "./components/ClientSessionsPanel";
import EditClientModal from "./components/EditClientModal";
import { showOwnerError, showOwnerInfo } from "../../components/owner-toast";

export default function OwnerClientDetailsPage() {
  const params = useParams<{ id: string }>();
  const [client, setClient] = useState<Client | null>(null);
  const [subscription, setSubscription] = useState<ClientSubscription | null>(
    null,
  );
  const [usage, setUsage] = useState<SubscriptionUsage | null>(null);
  const [trainingPlan, setTrainingPlan] = useState<ClientTrainingPlan | null>(
    null,
  );
  const [sessions, setSessions] = useState<OwnerSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditOpen, setIsEditOpen] = useState(false);

  useEffect(() => {
    async function loadClientDetails() {
      const clientId = Number(params.id);

      if (!clientId) {
        showOwnerError(new Error("Nieprawidłowe ID klienta."), "", {
          id: "owner-client-invalid-id",
        });
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);

        const [
          clientResult,
          subscriptionResult,
          usageResult,
          sessionsResult,
          trainingPlanResult,
        ] = await Promise.allSettled([
          getClient(clientId),
          getClientSubscription(clientId),
          getClientSubscriptionUsage(clientId),
          getClientSessions(clientId),
          getClientTrainingPlan(clientId),
        ]);

        if (clientResult.status !== "fulfilled") {
          throw clientResult.reason;
        }

        setClient(clientResult.value);

        if (subscriptionResult.status === "fulfilled") {
          setSubscription(subscriptionResult.value);
        }

        if (usageResult.status === "fulfilled") {
          setUsage(usageResult.value);
        }

        if (sessionsResult.status === "fulfilled") {
          setSessions(sessionsResult.value);
        }

        if (trainingPlanResult.status === "fulfilled") {
          setTrainingPlan(trainingPlanResult.value);
        }
      } catch (err) {
        showOwnerError(err, "Nie udało się pobrać klienta.", {
          id: "owner-client-load-error",
        });
      } finally {
        setIsLoading(false);
      }
    }

    loadClientDetails();
  }, [params.id]);

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-5 pb-10">
      {isLoading ? (
        <div className="card-shell p-6 text-on-surface-variant">
          Ładowanie klienta...
        </div>
      ) : null}

      {client ? (
        <>
          <ClientProfileHero
            client={client}
            onEdit={() => setIsEditOpen(true)}
            onFiles={() => openTrainingPlan(trainingPlan)}
          />
          <ClientMetricCards
            client={client}
            subscription={subscription}
            usage={usage}
          />

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_330px]">
            <ClientSessionsPanel sessions={sessions} />
            <ClientNotesPanel
              client={client}
              onClientChange={setClient}
            />
          </div>

          <EditClientModal
            open={isEditOpen}
            client={client}
            onClose={() => setIsEditOpen(false)}
            onSaved={setClient}
            onTrainingPlanSaved={setTrainingPlan}
          />
        </>
      ) : null}
    </div>
  );
}

function openTrainingPlan(plan: ClientTrainingPlan | null) {
  const url = plan?.url || plan?.googleDriveFolderUrl;

  if (!url) {
    showOwnerInfo("Nie dodano jeszcze linku do plików klienta.", {
      id: "owner-client-files-missing",
    });
    return;
  }

  window.open(url, "_blank", "noopener,noreferrer");
}
