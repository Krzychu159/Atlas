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
  getClientTrainingPlan,
  restoreClient,
  setClientPortalAccess,
  type Client,
  type ClientArchiveCheck,
  type ClientLegalConsent,
  type ClientSubscription,
  type ClientTrainingPlan,
} from "@/app/lib/owner/clients";
import { getClientSessions, type OwnerSession } from "@/app/lib/owner/sessions";
import {
  getClientBilling,
  getClientPayments,
  type ClientBillingSummary,
  type ClientPayment,
} from "@/app/lib/owner/billing";
import ClientMetricCards from "./components/ClientMetricCards";
import ClientNotesPanel from "./components/ClientNotesPanel";
import ClientProfileHero from "./components/ClientProfileHero";
import ClientSessionHistory from "./components/ClientSessionHistory";
import ClientLegalConsentsPanel from "./components/ClientLegalConsentsPanel";
import EditClientModal from "./components/EditClientModal";
import ArchiveClientModal from "./components/ArchiveClientModal";
import InviteClientPortalModal from "./components/InviteClientPortalModal";
import ClientPackagesSection, {
  getClientGroupLocationNames,
} from "./components/ClientPackagesSection";
import EndCooperationModal from "./components/EndCooperationModal";
import { showOwnerError, showOwnerSuccess } from "../../components/owner-toast";

export default function OwnerClientDetailsPage() {
  const correctionRevision = useSessionCorrectionRevision();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [client, setClient] = useState<Client | null>(null);
  const [subscription, setSubscription] = useState<ClientSubscription | null>(
    null,
  );
  const [billing, setBilling] = useState<ClientBillingSummary | null>(null);
  const [trainingPlan, setTrainingPlan] = useState<ClientTrainingPlan | null>(
    null,
  );
  const [sessions, setSessions] = useState<OwnerSession[]>([]);
  const [payments, setPayments] = useState<ClientPayment[]>([]);
  const [legalConsents, setLegalConsents] = useState<ClientLegalConsent[]>([]);
  const [sessionsAvailable, setSessionsAvailable] = useState(false);
  const [paymentsAvailable, setPaymentsAvailable] = useState(false);
  const [legalConsentsAvailable, setLegalConsentsAvailable] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [archiveCheck, setArchiveCheck] = useState<ClientArchiveCheck | null>(null);
  const [isPortalActionPending, setIsPortalActionPending] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isEndCooperationOpen, setIsEndCooperationOpen] = useState(false);
  const [isEndCooperationLoading, setIsEndCooperationLoading] = useState(false);
  const groupLocationNames = getClientGroupLocationNames(
    billing?.packages,
    client?.locationName,
  );

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

    if (
      client.portalAccessStatus === "NoAccount" ||
      client.portalAccessStatus === "Invited"
    ) {
      setIsInviteOpen(true);
      return;
    }

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

  async function handleRestore() {
    if (!client) return;

    try {
      setIsRestoring(true);
      await restoreClient(client.id);
      const restoredClient = await getClient(client.id);
      setClient(restoredClient);
      showOwnerSuccess("Klient został przywrócony.", {
        id: "owner-client-restore-success",
      });
      router.replace("/owner/clients");
    } catch (err) {
      showOwnerError(err, "Nie udało się przywrócić klienta.", {
        id: "owner-client-restore-error",
      });
    } finally {
      setIsRestoring(false);
    }
  }

  async function handleOpenEndCooperation() {
    if (!client) return;

    setIsEndCooperationOpen(true);
    setIsEndCooperationLoading(true);

    const [subscriptionResult, billingResult, sessionsResult] =
      await Promise.allSettled([
        getClientSubscription(client.id),
        getClientBilling(client.id),
        getClientSessions(client.id),
      ]);

    if (subscriptionResult.status === "fulfilled") {
      setSubscription(subscriptionResult.value);
    }
    if (billingResult.status === "fulfilled") {
      setBilling(billingResult.value);
    }
    if (sessionsResult.status === "fulfilled") {
      setSessions(sessionsResult.value);
      setSessionsAvailable(true);
    }

    const failedResult = [
      subscriptionResult,
      billingResult,
      sessionsResult,
    ].find((result) => result.status === "rejected");

    if (failedResult?.status === "rejected") {
      showOwnerError(
        failedResult.reason,
        "Nie udało się pobrać wszystkich danych rozliczenia.",
        { id: "owner-client-end-cooperation-load-error" },
      );
    }

    setIsEndCooperationLoading(false);
  }

  useEffect(() => {
    async function loadClientDetails() {
      const clientId = Number(params.id);

      if (!clientId) {
        showOwnerError(new Error("Nie można otworzyć tego klienta. Wróć do listy klientów i wybierz go ponownie."), "", {
          id: "owner-client-invalid-id",
        });
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setSessionsAvailable(false);
        setPaymentsAvailable(false);
        setLegalConsentsAvailable(false);

        const [
          clientResult,
          subscriptionResult,
          billingResult,
          sessionsResult,
          trainingPlanResult,
          paymentsResult,
          legalConsentsResult,
        ] = await Promise.allSettled([
          getClient(clientId),
          getClientSubscription(clientId),
          getClientBilling(clientId),
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

        if (billingResult.status === "fulfilled") {
          setBilling(billingResult.value);
        }

        if (sessionsResult.status === "fulfilled") {
          setSessions(sessionsResult.value);
          setSessionsAvailable(true);
        }

        if (trainingPlanResult.status === "fulfilled") {
          setTrainingPlan(trainingPlanResult.value);
        }

        if (paymentsResult.status === "fulfilled") {
          setPayments(paymentsResult.value.items || []);
          setPaymentsAvailable(true);
        }

        if (legalConsentsResult.status === "fulfilled") {
          setLegalConsents(legalConsentsResult.value || []);
          setLegalConsentsAvailable(true);
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
            groupLocationNames={groupLocationNames}
            backHref={client.isArchived ? "/owner/clients/archived" : "/owner/clients"}
            onEdit={client.isArchived ? undefined : () => setIsEditOpen(true)}
            onFiles={client.isArchived ? undefined : handleOpenTrainingPlan}
            onPortalAction={client.isArchived ? undefined : handlePortalAction}
            onArchive={client.isArchived ? undefined : handleArchiveCheck}
            onEndCooperation={
              client.isArchived ? undefined : handleOpenEndCooperation
            }
            onRestore={client.isArchived ? handleRestore : undefined}
            isPortalActionPending={isPortalActionPending}
            isRestorePending={isRestoring}
          />
          <ClientMetricCards
            client={client}
            subscription={subscription}
          />
          <ClientPackagesSection packages={billing?.packages} />

          {client.isArchived &&
          (!sessionsAvailable ||
            !paymentsAvailable ||
            !legalConsentsAvailable) ? (
            <div className="card-shell p-5 text-sm text-on-surface-variant">
              Nie udało się wyświetlić części historii archiwalnego klienta.
              Spróbuj odświeżyć profil.
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_330px]">
            {sessionsAvailable ? (
              <ClientSessionHistory clientId={client.id} sessions={sessions} />
            ) : (
              <div className="card-shell p-5 text-sm text-on-surface-variant">
                Historia treningów jest obecnie niedostępna. Spróbuj odświeżyć profil.
              </div>
            )}
            <ClientNotesPanel
              client={client}
              payments={payments}
              onClientChange={setClient}
              readOnly={client.isArchived}
              showPayments={!client.isArchived || paymentsAvailable}
            />
          </div>

          {!client.isArchived || legalConsentsAvailable ? (
            <ClientLegalConsentsPanel consents={legalConsents} />
          ) : null}

          {!client.isArchived ? (
            <>
              <EditClientModal
                open={isEditOpen}
                client={client}
                groupLocationNames={groupLocationNames}
                groupLocationsAvailable={billing !== null}
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
              <EndCooperationModal
                open={isEndCooperationOpen}
                loading={isEndCooperationLoading}
                subscription={subscription}
                billing={billing}
                sessions={sessions}
                onClose={() => setIsEndCooperationOpen(false)}
              />
            </>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function getTrainingPlanUrl(plan: ClientTrainingPlan | null) {
  return plan?.url || plan?.googleDriveFolderUrl || "";
}
