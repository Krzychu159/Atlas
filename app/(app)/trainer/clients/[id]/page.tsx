"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import ClientMetricCards from "@/app/(app)/owner/clients/[id]/components/ClientMetricCards";
import ClientNotesPanel from "@/app/(app)/owner/clients/[id]/components/ClientNotesPanel";
import ClientProfileHero from "@/app/(app)/owner/clients/[id]/components/ClientProfileHero";
import ClientSessionsPanel from "@/app/(app)/owner/clients/[id]/components/ClientSessionsPanel";
import EditClientModal from "@/app/(app)/owner/clients/[id]/components/EditClientModal";
import { showOwnerError } from "@/app/(app)/owner/components/owner-toast";
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
import { getClientPayments, type ClientPayment } from "@/app/lib/owner/billing";
import { getClientSessions, type OwnerSession } from "@/app/lib/owner/sessions";
import { isForbiddenError } from "@/app/lib/backend";
import {
  getTrainerPortalClient,
  getTrainerPortalClientBilling,
  getTrainerPortalClientSubscription,
  getTrainerPortalClientSubscriptionUsage,
  getTrainerPortalClientTrainingPlan,
  getTrainerPortalMe,
  type TrainerPortalMe,
} from "@/app/lib/trainer/portal";
import { trainerPortalClientToClient } from "@/app/lib/trainer/portal-mappers";

export default function TrainerClientDetailsPage() {
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
  const [payments, setPayments] = useState<ClientPayment[]>([]);
  const [me, setMe] = useState<TrainerPortalMe | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditOpen, setIsEditOpen] = useState(false);

  async function loadClientDetails() {
    const clientId = Number(params.id);

    if (!clientId) {
      showOwnerError(new Error("Nieprawidłowe ID klienta."), "", {
        id: "trainer-client-invalid-id",
      });
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      const meData = await getTrainerPortalMe().catch(() => null);
      setMe(meData);

      const [
        clientResult,
        subscriptionResult,
        usageResult,
        sessionsResult,
        trainingPlanResult,
        paymentsResult,
      ] = await Promise.allSettled([
        getClientForTrainerView(clientId, meData),
        getSubscriptionForTrainerView(clientId),
        getUsageForTrainerView(clientId),
        getClientSessions(clientId),
        getTrainingPlanForTrainerView(clientId),
        getPaymentsForTrainerView(clientId),
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

      if (paymentsResult.status === "fulfilled") {
        setPayments(paymentsResult.value.items || []);
      }
    } catch (err) {
      showOwnerError(err, "Nie udało się pobrać klienta.", {
        id: "trainer-client-load-error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function getClientForTrainerView(
    clientId: number,
    meData: TrainerPortalMe | null,
  ) {
    try {
      return await getClient(clientId);
    } catch (err) {
      if (!isForbiddenError(err)) throw err;

      const clientData = await getTrainerPortalClient(clientId);

      return trainerPortalClientToClient(clientData, meData);
    }
  }

  async function getSubscriptionForTrainerView(clientId: number) {
    try {
      return await getClientSubscription(clientId);
    } catch (err) {
      if (!isForbiddenError(err)) throw err;

      return getTrainerPortalClientSubscription(clientId);
    }
  }

  async function getUsageForTrainerView(clientId: number) {
    try {
      return await getClientSubscriptionUsage(clientId);
    } catch (err) {
      if (!isForbiddenError(err)) throw err;

      return getTrainerPortalClientSubscriptionUsage(clientId);
    }
  }

  async function getTrainingPlanForTrainerView(clientId: number) {
    try {
      return await getClientTrainingPlan(clientId);
    } catch (err) {
      if (!isForbiddenError(err)) throw err;

      return getTrainerPortalClientTrainingPlan(clientId);
    }
  }

  async function getPaymentsForTrainerView(clientId: number) {
    try {
      return await getClientPayments(clientId, { page: 1, pageSize: 3 });
    } catch (err) {
      if (!isForbiddenError(err)) throw err;

      const billing = await getTrainerPortalClientBilling(clientId);

      return {
        page: 1,
        pageSize: 3,
        totalCount: billing.payments?.length || 0,
        totalPages: 1,
        items: billing.payments?.slice(0, 3) || [],
      };
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadClientDetails();
    }, 0);

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function handleOpenTrainingPlan() {
    if (!client) return;

    const cachedUrl = getTrainingPlanUrl(trainingPlan);

    if (cachedUrl) {
      window.open(cachedUrl, "_blank", "noopener,noreferrer");
      return;
    }

    const pendingTab = window.open("", "_blank");

    if (pendingTab) {
      pendingTab.opener = null;
    }

    let url = "";

    try {
      const plan = await getTrainingPlanForTrainerView(client.id);
      setTrainingPlan(plan);
      url = getTrainingPlanUrl(plan);
    } catch {
      url = "";
    }

    if (!url) {
      pendingTab?.close();
      showOwnerError(new Error("Najpierw dodaj link do folderu klienta."), "", {
        id: "trainer-client-files-missing",
      });
      return;
    }

    if (pendingTab) {
      pendingTab.location.href = url;
      return;
    }

    window.open(url, "_blank", "noopener,noreferrer");
  }

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
            backHref="/trainer/clients"
            paymentsHref={`/trainer/clients/${client.id}/payments`}
            onEdit={() => setIsEditOpen(true)}
            onFiles={handleOpenTrainingPlan}
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
              payments={payments}
              access="trainer"
              trainerMe={me}
              onClientChange={setClient}
            />
          </div>

          <EditClientModal
            open={isEditOpen}
            client={client}
            access="trainer"
            trainerMe={me}
            onClose={() => setIsEditOpen(false)}
            onSaved={setClient}
            onAvatarChanged={(avatarUrl) =>
              setClient((current) =>
                current ? { ...current, avatarUrl } : current,
              )
            }
            onTrainingPlanSaved={setTrainingPlan}
          />
        </>
      ) : null}
    </div>
  );
}

function getTrainingPlanUrl(plan: ClientTrainingPlan | null) {
  return plan?.url || plan?.googleDriveFolderUrl || "";
}
