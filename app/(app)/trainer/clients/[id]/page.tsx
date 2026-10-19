"use client";

import { useSessionCorrectionRevision, usePaymentDateCorrectionRevision } from "@/app/lib/session-corrections";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { CalendarRange, Dumbbell, NotebookPen, Package } from "lucide-react";
import ClientPackagesSection, {
  getActivePackagesMeta,
  getClientGroupLocationNames,
} from "@/app/(app)/owner/clients/[id]/components/ClientPackagesSection";
import ClientPeriodPackagesSection from "@/app/(app)/owner/clients/[id]/components/ClientPeriodPackagesSection";
import ClientNotesPanel from "@/app/(app)/owner/clients/[id]/components/ClientNotesPanel";
import ClientProfileHero from "@/app/(app)/owner/clients/[id]/components/ClientProfileHero";
import ClientSessionsPanel from "@/app/(app)/owner/clients/[id]/components/ClientSessionsPanel";
import EditClientModal from "@/app/(app)/owner/clients/[id]/components/EditClientModal";
import { showOwnerError } from "@/app/(app)/owner/components/owner-toast";
import CollapsibleSection from "@/app/components/ui/collapsible-section";
import { Button } from "@/app/components/ui/button";
import {
  type Client,
  type ClientTrainingPlan,
} from "@/app/lib/owner/clients";
import { type ClientBillingSummary, type ClientPayment } from "@/app/lib/owner/billing";
import { getTrainerRecentSessions, getTrainerBillingTotals, type ClientBillingTotals, type RecentClientSession } from "@/app/lib/trainer/optimized";
import { trainerPaymentError } from "@/app/lib/trainer/payment-errors";
import {
  getTrainerPortalClient,
  getTrainerPortalClientBilling,
  getTrainerPortalClientTrainingPlan,
  getTrainerPortalMe,
  type TrainerPortalMe,
} from "@/app/lib/trainer/portal";
import { safeExternalUrl } from "@/app/lib/safe-url";
import { trainerPortalClientToClient } from "@/app/lib/trainer/portal-mappers";

export default function TrainerClientDetailsPage() {
  const loadRevision = useRef(0);
  const loadController = useRef<AbortController | null>(null);
  const [sectionLoading, setSectionLoading] = useState({ sessions: true, billing: true, totals: true });
  const [editingLoading, setEditingLoading] = useState(false);
  const correctionRevision = useSessionCorrectionRevision();
  const params = useParams<{ id: string }>();
  const paymentDateRevision = usePaymentDateCorrectionRevision(Number(params.id));
  const [client, setClient] = useState<Client | null>(null);
  const [trainingPlan, setTrainingPlan] = useState<ClientTrainingPlan | null>(
    null,
  );
  const [sessions, setSessions] = useState<RecentClientSession[]>([]);
  const [sessionsTotal, setSessionsTotal] = useState(0);
  const [payments, setPayments] = useState<ClientPayment[]>([]);
  const [billingTotals, setBillingTotals] = useState<ClientBillingTotals | null>(null);
  const [billing, setBilling] = useState<ClientBillingSummary | null>(null);
  const [me, setMe] = useState<TrainerPortalMe | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [billingError, setBillingError] = useState<string | null>(null);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);

  async function loadClientDetails() {
    const revision = ++loadRevision.current;
    loadController.current?.abort();
    const controller = new AbortController();
    loadController.current = controller;
    const signal = controller.signal;
    const active = () => revision === loadRevision.current && !signal.aborted;
    const clientId = Number(params.id);
    setIsEditOpen(false);
    setMe(null);
    setEditingLoading(false);
    setTrainingPlan(null);
    if (!Number.isSafeInteger(clientId) || clientId <= 0) {
      setClient(null);
      setLoadError("Nie można otworzyć tego klienta. Wróć do listy klientów i wybierz go ponownie.");
      setIsLoading(false);
      return;
    }
    setIsLoading(true); setLoadError(null); setClient(null);
    setBillingError(null); setSessionsError(null);
    setSessions([]); setBilling(null); setBillingTotals(null); setPayments([]);
    setSectionLoading({ sessions: true, billing: true, totals: true });
    async function section<T>(key: keyof typeof sectionLoading, request: Promise<T>, apply: (value: T) => void, onError?: (message: string) => void, fallback = "") {
      try { const value = await request; if (active()) apply(value); }
      catch (error) { if (active()) onError?.(trainerPaymentError(error, fallback)); }
      finally { if (active()) setSectionLoading(current => ({ ...current, [key]: false })); }
    }
    // Each section publishes its own result; the hero never waits for billing/history.
    const profile = getTrainerPortalClient(clientId, signal).then(data => {
      if (active()) setClient(trainerPortalClientToClient(data, null));
    }).catch(error => {
      if (!active()) return;
      setLoadError(trainerPaymentError(error, "Nie udało się pobrać klienta. Spróbuj ponownie."));
      controller.abort();
    }).finally(() => { if (revision === loadRevision.current) setIsLoading(false); });
    await Promise.all([
      profile,
      section("sessions", getTrainerRecentSessions(clientId, signal), data => { setSessions(data.items || []); setSessionsTotal(data.totalCount); }, setSessionsError, "Nie udało się pobrać treningów klienta."),
      // Totals only feed the hero summary; without them the hero shows no amounts instead of zeros.
      section("totals", getTrainerBillingTotals(clientId, signal), setBillingTotals),
      section("billing", getTrainerPortalClientBilling(clientId, signal), data => { setBilling(data); setPayments(newestFirst(data.payments || [])); }, setBillingError, "Nie udało się pobrać pakietów i rozliczeń klienta."),
    ]);
  }

  async function handleOpenEdit() {
    if (editingLoading) return;
    if (me) { setIsEditOpen(true); return; }
    const revision = loadRevision.current;
    setEditingLoading(true);
    try {
      const data = await getTrainerPortalMe(loadController.current?.signal);
      if (revision === loadRevision.current) { setMe(data); setIsEditOpen(true); }
    } catch (error) {
      if (revision === loadRevision.current && !loadController.current?.signal.aborted) showOwnerError(error, "Nie udało się otworzyć edycji klienta.");
    } finally { if (revision === loadRevision.current) setEditingLoading(false); }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadClientDetails();
    }, 0);

    return () => { window.clearTimeout(timer); loadRevision.current += 1; loadController.current?.abort(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id, correctionRevision, paymentDateRevision]);

  async function handleOpenTrainingPlan() {
    if (!client) return;
    const revision = loadRevision.current;

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
      const plan = await getTrainerPortalClientTrainingPlan(client.id, loadController.current?.signal);
      if (revision !== loadRevision.current) { pendingTab?.close(); return; }
      setTrainingPlan(plan);
      url = getTrainingPlanUrl(plan);
    } catch (error) {
      pendingTab?.close();
      if (revision !== loadRevision.current || loadController.current?.signal.aborted) return;
      const message = trainerPaymentError(error, "Nie udało się otworzyć plików klienta. Spróbuj ponownie.");
      showOwnerError(new Error(message), message);
      return;
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

  const groupLocationNames = getClientGroupLocationNames(billing?.packages, client?.locationName);

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-5 pb-10">
      {isLoading ? (
        <div role="status" className="card-shell p-6 text-on-surface-variant">
          Ładowanie klienta...
        </div>
      ) : null}

      {!isLoading && loadError ? (
        <div role="alert" className="card-shell p-6 text-on-surface-variant">
          {loadError}
        </div>
      ) : null}

      {client && client.id === Number(params.id) ? (
        <>
          <ClientProfileHero
            client={client}
            milestoneAccess="trainer"
            groupLocationNames={groupLocationNames}
            billingSummary={billingTotals ? {
              amountDue: billingTotals.totalAmountDue,
              balance: billingTotals.currentBalance,
              currency: billing?.packages?.find((item) => item.clientPackageId === billingTotals.activeClientPackageId)?.currency,
            } : null}
            backHref="/trainer/clients"
            paymentsHref={`/trainer/clients/${client.id}/payments`}
            onEdit={() => void handleOpenEdit()}
            onFiles={handleOpenTrainingPlan}
          />

          {sectionLoading.billing ? <p role="status" className="card-shell p-4 text-sm text-on-surface-variant">Ładowanie pakietów i rozliczeń...</p> : null}
          {billingError ? (
            <div role="alert" className="card-shell flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-on-surface-variant">{billingError}</p>
              <Button variant="secondary" onClick={() => void loadClientDetails()}>Spróbuj ponownie</Button>
            </div>
          ) : null}

          <div className="flex flex-col gap-2">
            {billing ? (
              <>
                <CollapsibleSection title="Pakiety" icon={<Package size={15} />} meta={getActivePackagesMeta(billing.packages)}>
                  <ClientPackagesSection key={client.id} embedded packages={billing.packages} activeClientPackageId={billing.activeClientPackageId} />
                </CollapsibleSection>
                <CollapsibleSection title="Usługi okresowe" icon={<CalendarRange size={15} />}>
                  <ClientPeriodPackagesSection key={`period:${client.id}`} embedded clientId={client.id} portal="trainer" packages={billing.packages} />
                </CollapsibleSection>
              </>
            ) : null}

            {sectionLoading.sessions ? (
              <p role="status" className="card-shell p-4 text-sm text-on-surface-variant">Ładowanie treningów klienta...</p>
            ) : sessionsError ? (
              <div role="alert" className="card-shell p-4 text-sm text-on-surface-variant">{sessionsError}</div>
            ) : (
              <CollapsibleSection title="Ostatnie treningi" icon={<Dumbbell size={15} />} meta={sessionsTotal}>
                <ClientSessionsPanel embedded totalCount={sessionsTotal} sessions={sessions.map(session => ({ id: session.sessionId, title: session.title, startAt: session.startAt, status: session.status, trainerFullName: session.trainerName }))} />
              </CollapsibleSection>
            )}

            <CollapsibleSection title={billing ? "Notatki i ostatnie wpłaty" : "Notatki"} icon={<NotebookPen size={15} />}>
              <ClientNotesPanel
                key={client.id}
                embedded
                client={client}
                payments={payments}
                showPayments={billing !== null}
                access="trainer"
                trainerMe={me}
                onClientChange={setClient}
              />
            </CollapsibleSection>
          </div>

          <EditClientModal
            key={client.id}
            open={isEditOpen}
            client={client}
            access="trainer"
            trainerMe={me}
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
        </>
      ) : null}
    </div>
  );
}

// The notes panel shows the three newest payments.
function newestFirst(payments: ClientPayment[]) {
  return [...payments].sort((first, second) => paymentTime(second) - paymentTime(first));
}

function paymentTime(payment: ClientPayment) {
  const time = new Date(payment.paymentDate || payment.createdAt).getTime();
  return Number.isFinite(time) ? time : 0;
}

function getTrainingPlanUrl(plan: ClientTrainingPlan | null) {
  return safeExternalUrl(plan?.url || plan?.googleDriveFolderUrl) || "";
}
