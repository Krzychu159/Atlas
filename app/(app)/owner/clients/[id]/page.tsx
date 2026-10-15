"use client";

import { safeExternalUrl } from "@/app/lib/safe-url";

import { useSessionCorrectionRevision, usePaymentDateCorrectionRevision } from "@/app/lib/session-corrections";

import { useCallback, useEffect, useState } from "react";
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
  type ClientArchiveCheck,
  type ClientClosurePreview,
  type ClientRefund,
  type ClientTrainingPlan,
  type CloseCooperationPayload,
} from "@/app/lib/owner/clients";
import { getClientSessions } from "@/app/lib/owner/sessions";
import {
  getClientBilling,
  getClientPayments,
} from "@/app/lib/owner/billing";
// import ClientMetricCards from "./components/ClientMetricCards";
import { Banknote, CalendarRange, Dumbbell, FileCheck2, History, NotebookPen, Package } from "lucide-react";
import type { ClientPackageBilling } from "@/app/lib/owner/billing";
import ClientProfileCollapsible from "./components/ClientProfileCollapsible";
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
import ClientPeriodPackagesSection from "./components/ClientPeriodPackagesSection";
import RefundConfirmationModal from "./components/RefundConfirmationModal";
import ClientAuditSection from "./components/ClientAuditSection";
import { ApiError, isNotFoundError } from "@/app/lib/backend";
import { useOwnerRead } from "../../components/use-owner-read";
import { OwnerReadState } from "../../components/OwnerReadState";
import {
  showOwnerError,
  showOwnerInfo,
  showOwnerSuccess,
} from "../../components/owner-toast";

export default function OwnerClientDetailsPage() {
  const params = useParams<{ id: string }>();
  const clientId = Number(params.id);
  if (!Number.isSafeInteger(clientId) || clientId <= 0) return <p role="alert">Nie można otworzyć tego klienta. Wróć do listy klientów i wybierz go ponownie.</p>;
  return <ClientDetails key={clientId} clientId={clientId} />;
}

function ClientDetails({ clientId }: { clientId: number }) {
  const correctionRevision = useSessionCorrectionRevision();
  const paymentDateRevision = usePaymentDateCorrectionRevision(clientId);
  const router = useRouter();
  const revision = correctionRevision + ":" + paymentDateRevision;
  const loadClient = useCallback((signal: AbortSignal) => getClient(clientId, signal), [clientId]);
  const loadSubscription = useCallback((signal: AbortSignal) => getClientSubscription(clientId, signal), [clientId]);
  const loadBilling = useCallback((signal: AbortSignal) => getClientBilling(clientId, signal), [clientId]);
  const loadSessions = useCallback((signal: AbortSignal) => getClientSessions(clientId, signal), [clientId]);
  const loadPlan = useCallback(async (signal: AbortSignal) => {
    try { return await getClientTrainingPlan(clientId, signal); }
    catch (error) { if (isNotFoundError(error)) return null; throw error; }
  }, [clientId]);
  const loadPayments = useCallback((signal: AbortSignal) => getClientPayments(clientId, { page: 1, pageSize: 3 }, signal), [clientId]);
  const loadConsents = useCallback((signal: AbortSignal) => getClientLegalConsents(clientId, signal), [clientId]);
  const loadRefunds = useCallback((signal: AbortSignal) => getClientRefunds(clientId, { page: 1, pageSize: 25 }, signal), [clientId]);
  const profile = useOwnerRead(String(clientId), loadClient, "Nie udało się pobrać profilu klienta.", revision);
  const renewal = useOwnerRead(String(clientId), loadSubscription, "Nie udało się pobrać danych o przedłużaniu pakietu.", revision);
  const account = useOwnerRead(String(clientId), loadBilling, "Nie udało się pobrać rozliczeń i pakietów klienta.", revision);
  const history = useOwnerRead(String(clientId), loadSessions, "Nie udało się pobrać historii treningów.", revision);
  const plan = useOwnerRead<ClientTrainingPlan | null>(String(clientId), loadPlan, "Nie udało się pobrać folderu klienta.");
  const paymentList = useOwnerRead(String(clientId), loadPayments, "Nie udało się pobrać wpłat klienta.", revision);
  const consents = useOwnerRead(String(clientId), loadConsents, "Nie udało się pobrać zgód klienta.");
  const refundList = useOwnerRead(String(clientId), loadRefunds, "Nie udało się pobrać zwrotów klienta.", revision);
  const client = profile.data;
  const setClient = profile.setData;
  // const subscription = renewal.data ?? null;
  const billing = account.data ?? null;
  const trainingPlan = plan.data ?? null;
  const setTrainingPlan = plan.setData;
  const sessions = history.data ?? [];
  const payments = paymentList.data?.items ?? [];
  const legalConsents = consents.data ?? [];
  const refunds = refundList.data?.items ?? [];
  const [closurePreview, setClosurePreview] =
    useState<ClientClosurePreview | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [archiveCheck, setArchiveCheck] = useState<ClientArchiveCheck | null>(null);
  const [isPortalActionPending, setIsPortalActionPending] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isEndCooperationOpen, setIsEndCooperationOpen] = useState(false);
  const [isEndCooperationLoading, setIsEndCooperationLoading] = useState(false);
  const [isEndingCooperation, setIsEndingCooperation] = useState(false);
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
      await profile.reload();
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

  async function refreshCooperationData(id: number, propagateError = false) {
    if (id !== clientId) return;
    setAuditRevision(value => value + 1);
    // These reads may change after package closure, assignment or a refund.
    // Keep the same scope; each section publishes independently.
    const results = await Promise.allSettled([
      profile.reload(), renewal.reload(), account.reload(), history.reload(),
      paymentList.reload(), refundList.reload(), getClientClosurePreview(id),
    ]);
    const preview = results[6];
    if (preview.status === "fulfilled") setClosurePreview(preview.value ?? null);
    const failed = results.find(result => result.status === "rejected");
    if (failed?.status === "rejected") {
      showOwnerError(failed.reason, "Część danych klienta nie została odświeżona.", { id: "owner-client-cooperation-refresh-error" });
      if (propagateError) throw failed.reason;
    }
  }

  async function refreshRefundData(id: number) {
    await refreshCooperationData(id);
  }

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => { if (active) setAuditRevision(value => value + 1); });
    return () => { active = false; };
  }, [correctionRevision, paymentDateRevision]);

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
      const refreshedPlan = await plan.reload();
      url = getTrainingPlanUrl(refreshedPlan ?? null);
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
      <OwnerReadState loading={profile.loading && !client} error={profile.error} retry={profile.retry} label="Ładowanie klienta..." />

      {client ? (
        <>
          <ClientProfileHero
            client={client}
            groupLocationNames={groupLocationNames}
            billingSummary={billing ? {
              amountDue: billing.totalAmountDue,
              balance: billing.currentBalance,
              currency: billing.packages?.find((item) => item.clientPackageId === billing.activeClientPackageId)?.currency,
            } : null}
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
          <OwnerReadState loading={account.loading && account.data === undefined} error={account.error} retry={account.retry} label="Ładowanie rozliczeń i pakietów..." />
          <OwnerReadState loading={renewal.loading && renewal.data === undefined} error={renewal.error} retry={renewal.retry} label="Ładowanie danych o przedłużaniu pakietu..." />
          <OwnerReadState loading={plan.loading && plan.data === undefined} error={plan.error} retry={plan.retry} label="Ładowanie folderu klienta..." />
          {/* Kafelki podsumowania tymczasowo ukryte w nowym układzie karty klienta.
          <ClientMetricCards preserveMissingData
            client={client}
            subscription={subscription}
            billing={billing}
          />
          */}
          <div className="flex flex-col gap-2">
            {account.data !== undefined ? (
              <ClientProfileCollapsible title="Pakiety" icon={<Package size={15} />} meta={getActivePackagesMeta(billing?.packages)}>
                <ClientPackagesSection key={client.id} embedded packages={billing?.packages} activeClientPackageId={billing?.activeClientPackageId} clientId={!client.isArchived ? client.id : undefined} onSaved={() => refreshCooperationData(client.id, true)} />
              </ClientProfileCollapsible>
            ) : null}
            <ClientProfileCollapsible title="Usługi okresowe" icon={<CalendarRange size={15} />}>
              <ClientPeriodPackagesSection key={`period:${client.id}`} embedded clientId={client.id} canManage={!client.isArchived} onSaved={() => refreshCooperationData(client.id, true)} />
            </ClientProfileCollapsible>

            <OwnerReadState loading={history.loading} error={history.error} retry={history.retry} label="Ładowanie historii treningów...">
              {history.data !== undefined ? (
                <ClientProfileCollapsible title="Historia treningów" icon={<Dumbbell size={15} />} meta={sessions.length}>
                  <ClientSessionHistory embedded clientId={client.id} sessions={sessions} />
                </ClientProfileCollapsible>
              ) : null}
            </OwnerReadState>

            <OwnerReadState loading={paymentList.loading && paymentList.data === undefined} error={paymentList.error} retry={paymentList.retry} label="Ładowanie wpłat klienta..." />
            <ClientProfileCollapsible title="Notatki i ostatnie wpłaty" icon={<NotebookPen size={15} />}>
              <ClientNotesPanel
                embedded
                client={client}
                payments={payments}
                onClientChange={(updated) => { setClient(updated); setAuditRevision((value) => value + 1); }}
                readOnly={client.isArchived}
                showPayments={paymentList.data !== undefined}
              />
            </ClientProfileCollapsible>

            {!client.isArchived ? (
              <OwnerReadState loading={refundList.loading} error={refundList.error} retry={refundList.retry} label="Ładowanie zwrotów klienta...">
                {refundList.data !== undefined ? (
                  <ClientProfileCollapsible title="Zwroty" icon={<Banknote size={15} />} meta={refunds.length}>
                    <ClientRefundsSection embedded refunds={refunds} loading={refundList.loading} onConfirm={setRefundToConfirm} />
                  </ClientProfileCollapsible>
                ) : null}
              </OwnerReadState>
            ) : null}

            <OwnerReadState loading={consents.loading} error={consents.error} retry={consents.retry} label="Ładowanie zgód klienta...">
              {consents.data !== undefined ? (
                <ClientProfileCollapsible title="Historia zgód" icon={<FileCheck2 size={15} />} meta={legalConsents.length}>
                  <ClientLegalConsentsPanel embedded consents={legalConsents} />
                </ClientProfileCollapsible>
              ) : null}
            </OwnerReadState>

            <ClientProfileCollapsible title="Historia zmian" icon={<History size={15} />}>
              <ClientAuditSection key={client.id} embedded clientId={client.id} revision={auditRevision} />
            </ClientProfileCollapsible>
          </div>

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

function getActivePackagesMeta(packages: ClientPackageBilling[] | null | undefined) {
  if (!packages) return undefined;
  const active = packages.filter((item) => item.isActive === true).length;
  if (active === 1) return "1 aktywny";
  const lastDigit = active % 10;
  const lastTwoDigits = active % 100;
  return lastDigit >= 2 && lastDigit <= 4 && (lastTwoDigits < 12 || lastTwoDigits > 14) ? `${active} aktywne` : `${active} aktywnych`;
}

function getTrainingPlanUrl(plan: ClientTrainingPlan | null) {
  return safeExternalUrl(plan?.url || plan?.googleDriveFolderUrl) || "";
}
