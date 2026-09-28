"use client";

import { useSessionCorrectionRevision } from "@/app/lib/session-corrections";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  archiveClient,
  getClient,
  getClientArchiveCheck,
  getClientLegalConsents,
  getClientSubscription,
  getClientSubscriptionUsage,
  getClientTrainingPlan,
  setClientPortalAccess,
  type Client,
  type ClientArchiveCheck,
  type ClientLegalConsent,
  type ClientSubscription,
  type ClientTrainingPlan,
  type SubscriptionUsage,
} from "@/app/lib/owner/clients";
import { getClientSessions, type OwnerSession } from "@/app/lib/owner/sessions";
import { getClientPayments, type ClientPayment } from "@/app/lib/owner/billing";
import ClientMetricCards from "./components/ClientMetricCards";
import ClientNotesPanel from "./components/ClientNotesPanel";
import ClientProfileHero from "./components/ClientProfileHero";
import ClientSessionsPanel from "./components/ClientSessionsPanel";
import ClientLegalConsentsPanel from "./components/ClientLegalConsentsPanel";
import EditClientModal from "./components/EditClientModal";
import ArchiveClientModal from "./components/ArchiveClientModal";
import InviteClientPortalModal from "./components/InviteClientPortalModal";
import { showOwnerError, showOwnerSuccess } from "../../components/owner-toast";

export default function OwnerClientDetailsPage() {
  const correctionRevision = useSessionCorrectionRevision();
  const params = useParams<{ id: string }>();
  const router = useRouter();
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
  const [legalConsents, setLegalConsents] = useState<ClientLegalConsent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [archiveCheck, setArchiveCheck] = useState<ClientArchiveCheck | null>(null);
  const [isPortalActionPending, setIsPortalActionPending] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);

  async function refreshClient() {
    if (!client) return;

    try {
      setClient(await getClient(client.id));
    } catch (err) {
      showOwnerError(err, "Nie udało się odświeżyć danych klienta.", {
        id: "owner-client-refresh-error",
      });
    }
  }

  async function handlePortalAction() {
    if (!client) return;

    if (client.portalAccessStatus === "NoAccount") {
      setIsInviteOpen(true);
      return;
    }

    if (client.portalAccessStatus === "Invited") return;

    const blocked = client.portalAccessStatus !== "Blocked";

    try {
      setIsPortalActionPending(true);
      await setClientPortalAccess(client.id, blocked);
      showOwnerSuccess(blocked ? "Dostęp do panelu został zablokowany." : "Dostęp do panelu został odblokowany.", {
        id: "owner-client-portal-access-success",
      });
      await refreshClient();
    } catch (err) {
      showOwnerError(err, "Nie udało się zmienić dostępu do panelu.", {
        id: "owner-client-portal-access-error",
      });
    } finally {
      setIsPortalActionPending(false);
    }
  }

  async function handleArchiveCheck() {
    if (!client) return;

    try {
      setArchiveCheck(await getClientArchiveCheck(client.id));
    } catch (err) {
      showOwnerError(err, "Nie udało się sprawdzić możliwości archiwizacji.", {
        id: "owner-client-archive-check-error",
      });
    }
  }

  async function handleArchive() {
    if (!client) return;

    try {
      setIsArchiving(true);
      await archiveClient(client.id);
      showOwnerSuccess("Klient został zarchiwizowany.", {
        id: "owner-client-archive-success",
      });
      setArchiveCheck(null);
      router.push("/owner/clients");
    } catch (err) {
      showOwnerError(err, "Nie udało się zarchiwizować klienta.", {
        id: "owner-client-archive-error",
      });
    } finally {
      setIsArchiving(false);
    }
  }

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
          paymentsResult,
          legalConsentsResult,
        ] = await Promise.allSettled([
          getClient(clientId),
          getClientSubscription(clientId),
          getClientSubscriptionUsage(clientId),
          getClientSessions(clientId),
          getClientTrainingPlan(clientId),
          getClientPayments(clientId, { page: 1, pageSize: 3 }),
          getClientLegalConsents(clientId),
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

        if (legalConsentsResult.status === "fulfilled") {
          setLegalConsents(legalConsentsResult.value || []);
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
  }, [params.id, correctionRevision]);

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
      const plan = await getClientTrainingPlan(client.id);
      setTrainingPlan(plan);
      url = getTrainingPlanUrl(plan);
    } catch {
      url = "";
    }

    if (!url) {
      pendingTab?.close();
      showOwnerError(new Error("Najpierw dodaj link do folderu klienta."), "", {
        id: "owner-client-files-missing",
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
            onEdit={() => setIsEditOpen(true)}
            onFiles={handleOpenTrainingPlan}
            onPortalAction={handlePortalAction}
            onArchive={handleArchiveCheck}
            isPortalActionPending={isPortalActionPending}
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
              onClientChange={setClient}
            />
          </div>

          <ClientLegalConsentsPanel consents={legalConsents} />

          <EditClientModal
            open={isEditOpen}
            client={client}
            onClose={() => setIsEditOpen(false)}
            onSaved={setClient}
            onAvatarChanged={(avatarUrl) =>
              setClient((current) =>
                current ? { ...current, avatarUrl } : current,
              )
            }
            onTrainingPlanSaved={setTrainingPlan}
          />
          <InviteClientPortalModal
            client={client}
            open={isInviteOpen}
            onClose={() => setIsInviteOpen(false)}
            onInvited={refreshClient}
          />
          <ArchiveClientModal
            check={archiveCheck}
            isArchiving={isArchiving}
            onClose={() => setArchiveCheck(null)}
            onConfirm={handleArchive}
          />
        </>
      ) : null}
    </div>
  );
}

function getTrainingPlanUrl(plan: ClientTrainingPlan | null) {
  return plan?.url || plan?.googleDriveFolderUrl || "";
}
