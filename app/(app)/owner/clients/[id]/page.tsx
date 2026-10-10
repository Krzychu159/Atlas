"use client";

import { safeExternalUrl } from "@/app/lib/safe-url";

import { useSessionCorrectionRevision } from "@/app/lib/session-corrections";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  archiveClient,
  closeClientCooperation,
  confirmClientRefund,
  getClient,
  getClientArchiveCheck,
  getClientClosurePreview,
  getClientLegalConsents,
  getClientRefunds,
  getClientSubscription,
  getClientTrainingPlan,
  restoreClient,
  setClientPortalAccess,
  type Client,
  type ClientArchiveCheck,
  type ClientClosurePreview,
  type ClientLegalConsent,
  type ClientRefund,
  type ClientSubscription,
  type ClientTrainingPlan,
  type CloseCooperationPayload,
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
import ClientRefundsSection from "./components/ClientRefundsSection";
import RefundConfirmationModal from "./components/RefundConfirmationModal";
import ClientAuditSection from "./components/ClientAuditSection";
import { ApiError } from "@/app/lib/backend";
import {
  showOwnerError,
  showOwnerInfo,
  showOwnerSuccess,
} from "../../components/owner-toast";

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
  const [refunds, setRefunds] = useState<ClientRefund[]>([]);
  const [closurePreview, setClosurePreview] =
    useState<ClientClosurePreview | null>(null);
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
  const [isEndingCooperation, setIsEndingCooperation] = useState(false);
  const [isRefundsLoading, setIsRefundsLoading] = useState(true);
  const [refundToConfirm, setRefundToConfirm] = useState<ClientRefund | null>(
    null,
  );
  const [isConfirmingRefund, setIsConfirmingRefund] = useState(false);
  const [auditRevision, setAuditRevision] = useState(0);
  const groupLocationNames = getClientGroupLocationNames(
    billing?.packages,
    client?.locationName,
  );

  async function refreshClient() {
    if (!client) return;
    setAuditRevision((value) => value + 1);

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

    try {
      setClosurePreview(await getClientClosurePreview(client.id));
    } catch (err) {
      setClosurePreview(null);
      showOwnerError(err, "Nie udało się sprawdzić stanu współpracy.", {
        id: "owner-client-end-cooperation-load-error",
      });
    } finally {
      setIsEndCooperationLoading(false);
    }
  }

  async function handleEndCooperation(payload: CloseCooperationPayload) {
    if (!client) return;

    try {
      setIsEndingCooperation(true);
      const updatedPreview = await closeClientCooperation(client.id, payload);
      setClosurePreview(updatedPreview);
      setIsEndCooperationOpen(false);
      showOwnerSuccess("Współpraca z klientem została zakończona.", {
        id: "owner-client-end-cooperation-success",
      });
      await refreshCooperationData(client.id);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setClosurePreview(null);
        try {
          setClosurePreview(await getClientClosurePreview(client.id));
        } catch (refreshError) {
          showOwnerError(
            refreshError,
            "Nie udało się odświeżyć stanu współpracy.",
            { id: "owner-client-end-cooperation-refresh-error" },
          );
        }
        showOwnerInfo(
          "Dane klienta zmieniły się. Sprawdź je ponownie i wybierz sposób rozliczenia pakietów.",
          { id: "owner-client-end-cooperation-conflict" },
        );
      } else {
        showOwnerError(err, "Nie udało się zakończyć współpracy.", {
          id: "owner-client-end-cooperation-error",
        });
      }
    } finally {
      setIsEndingCooperation(false);
    }
  }

  async function handleConfirmRefund(reference: string) {
    if (!client || !refundToConfirm) return;

    try {
      setIsConfirmingRefund(true);
      await confirmClientRefund(client.id, refundToConfirm.clientPackageId, {
        amount: refundToConfirm.amount,
        reference,
      });
      setRefundToConfirm(null);
      showOwnerSuccess("Zwrot został potwierdzony.", {
        id: "owner-client-refund-confirm-success",
      });
      await refreshRefundData(client.id);
    } catch (err) {
      showOwnerError(err, "Nie udało się potwierdzić zwrotu.", {
        id: "owner-client-refund-confirm-error",
      });
    } finally {
      setIsConfirmingRefund(false);
    }
  }

  async function refreshCooperationData(clientId: number, propagateError = false) {
    setAuditRevision((value) => value + 1);
    const results = await Promise.allSettled([
      getClient(clientId),
      getClientSubscription(clientId),
      getClientBilling(clientId),
      getClientSessions(clientId),
      getClientPayments(clientId, { page: 1, pageSize: 3 }),
      getClientRefunds(clientId, { page: 1, pageSize: 25 }),
      getClientClosurePreview(clientId),
    ]);

    const [
      clientResult,
      subscriptionResult,
      billingResult,
      sessionsResult,
      paymentsResult,
      refundsResult,
      previewResult,
    ] = results;

    if (clientResult.status === "fulfilled") setClient(clientResult.value);
    if (subscriptionResult.status === "fulfilled") {
      setSubscription(subscriptionResult.value);
    }
    if (billingResult.status === "fulfilled") setBilling(billingResult.value);
    if (sessionsResult.status === "fulfilled") {
      setSessions(sessionsResult.value);
      setSessionsAvailable(true);
    }
    if (paymentsResult.status === "fulfilled") {
      setPayments(paymentsResult.value.items || []);
      setPaymentsAvailable(true);
    }
    if (refundsResult.status === "fulfilled") {
      setRefunds(refundsResult.value.items || []);
    }
    if (previewResult.status === "fulfilled") {
      setClosurePreview(previewResult.value);
    }

    const failedResult = results.find((result) => result.status === "rejected");
    if (failedResult?.status === "rejected") {
      showOwnerError(
        failedResult.reason,
        "Część danych klienta nie została odświeżona.",
        { id: "owner-client-cooperation-refresh-error" },
      );
      if (propagateError) throw failedResult.reason;
    }
  }

  async function refreshRefundData(clientId: number) {
    await refreshCooperationData(clientId);
  }

  useEffect(() => {
    async function loadClientDetails() {
      setAuditRevision((value) => value + 1);
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
        setIsRefundsLoading(true);

        const [
          clientResult,
          subscriptionResult,
          billingResult,
          sessionsResult,
          trainingPlanResult,
          paymentsResult,
          legalConsentsResult,
          refundsResult,
        ] = await Promise.allSettled([
          getClient(clientId),
          getClientSubscription(clientId),
          getClientBilling(clientId),
          getClientSessions(clientId),
          getClientTrainingPlan(clientId),
          getClientPayments(clientId, { page: 1, pageSize: 3 }),
          getClientLegalConsents(clientId),
          getClientRefunds(clientId, { page: 1, pageSize: 25 }),
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

        if (refundsResult.status === "fulfilled") {
          setRefunds(refundsResult.value.items || []);
        } else {
          showOwnerError(
            refundsResult.reason,
            "Nie udało się pobrać zwrotów klienta.",
            { id: "owner-client-refunds-load-error" },
          );
        }
      } catch (err) {
        showOwnerError(err, "Nie udało się pobrać klienta.", {
          id: "owner-client-load-error",
        });
      } finally {
        setIsLoading(false);
        setIsRefundsLoading(false);
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
              client.isArchived || client.status.toLowerCase() === "inactive"
                ? undefined
                : handleOpenEndCooperation
            }
            onRestore={client.isArchived ? handleRestore : undefined}
            isPortalActionPending={isPortalActionPending}
            isRestorePending={isRestoring}
          />
          <ClientMetricCards
            client={client}
            subscription={subscription}
            billing={billing}
          />
          <ClientPackagesSection key={client.id} packages={billing?.packages} activeClientPackageId={billing?.activeClientPackageId} clientId={!client.isArchived ? client.id : undefined} onSaved={() => refreshCooperationData(client.id, true)} />
          <ClientAuditSection key={client.id} clientId={client.id} revision={auditRevision} />

          {!client.isArchived ? (
            <ClientRefundsSection
              refunds={refunds}
              loading={isRefundsLoading}
              onConfirm={setRefundToConfirm}
            />
          ) : null}

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
              onClientChange={(updated) => { setClient(updated); setAuditRevision((value) => value + 1); }}
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
                onSaved={(updated) => { setClient(updated); setAuditRevision((value) => value + 1); }}
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
                submitting={isEndingCooperation}
                preview={closurePreview}
                onClose={() => setIsEndCooperationOpen(false)}
                onSubmit={handleEndCooperation}
              />
              <RefundConfirmationModal
                refund={refundToConfirm}
                submitting={isConfirmingRefund}
                onClose={() => setRefundToConfirm(null)}
                onConfirm={handleConfirmRefund}
              />
            </>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function getTrainingPlanUrl(plan: ClientTrainingPlan | null) {
  return safeExternalUrl(plan?.url || plan?.googleDriveFolderUrl) || "";
}
