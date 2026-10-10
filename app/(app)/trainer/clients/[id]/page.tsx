"use client";

import { useSessionCorrectionRevision } from "@/app/lib/session-corrections";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import ClientMetricCards from "@/app/(app)/owner/clients/[id]/components/ClientMetricCards";
import ClientPackagesSection from "@/app/(app)/owner/clients/[id]/components/ClientPackagesSection";
import ClientNotesPanel from "@/app/(app)/owner/clients/[id]/components/ClientNotesPanel";
import ClientProfileHero from "@/app/(app)/owner/clients/[id]/components/ClientProfileHero";
import ClientSessionsPanel from "@/app/(app)/owner/clients/[id]/components/ClientSessionsPanel";
import EditClientModal from "@/app/(app)/owner/clients/[id]/components/EditClientModal";
import { showOwnerError } from "@/app/(app)/owner/components/owner-toast";
import {
  type Client,
  type ClientSubscription,
  type ClientTrainingPlan,
  type SubscriptionUsage,
} from "@/app/lib/owner/clients";
import { type ClientBillingSummary, type ClientPayment } from "@/app/lib/owner/billing";
import { getClientSessions, type OwnerSession } from "@/app/lib/owner/sessions";
import { trainerPaymentError } from "@/app/lib/trainer/payment-errors";
import Link from "next/link";
import { PaymentsList } from "@/app/components/payments/PaymentsList";
import { Button } from "@/app/components/ui/button";
import {
  getTrainerPortalClient,
  getTrainerPortalClientBilling,
  getTrainerPortalClientSubscription,
  getTrainerPortalClientSubscriptionUsage,
  getTrainerPortalClientTrainingPlan,
  getTrainerPortalMe,
  type TrainerPortalMe,
} from "@/app/lib/trainer/portal";
import { safeExternalUrl } from "@/app/lib/safe-url";
import { trainerPortalClientToClient } from "@/app/lib/trainer/portal-mappers";

export default function TrainerClientDetailsPage() {
  const loadRevision = useRef(0);
  const loadController = useRef<AbortController | null>(null);
  const [sectionLoading, setSectionLoading] = useState({ subscription: true, usage: true, sessions: true, billing: true });
  const [editingLoading, setEditingLoading] = useState(false);
  const [sectionErrors, setSectionErrors] = useState<string[]>([]);
  const correctionRevision = useSessionCorrectionRevision();
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
    setBillingError(null); setSessionsError(null); setSectionErrors([]);
    setSubscription(null); setUsage(null); setSessions([]); setBilling(null); setPayments([]);
    setSectionLoading({ subscription: true, usage: true, sessions: true, billing: true });
    async function section<T>(key: keyof typeof sectionLoading, request: Promise<T>, apply: (value: T) => void, fallback: string) {
      try { const value = await request; if (active()) apply(value); }
      catch (error) {
        if (!active()) return;
        const message = trainerPaymentError(error, fallback);
        if (key === "billing") setBillingError(message);
        else if (key === "sessions") setSessionsError(message);
        else setSectionErrors(errors => [...errors, message]);
      } finally { if (active()) setSectionLoading(current => ({ ...current, [key]: false })); }
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
      section("subscription", getTrainerPortalClientSubscription(clientId, signal), setSubscription, "Nie udało się pobrać odnowień pakietu."),
      section("usage", getTrainerPortalClientSubscriptionUsage(clientId, signal), setUsage, "Nie udało się pobrać wykorzystania pakietu."),
      section("sessions", getClientSessions(clientId, signal), setSessions, "Nie udało się pobrać treningów klienta."),
      section("billing", getTrainerPortalClientBilling(clientId, signal), data => {
        setBilling(data);
        setPayments([...(data.payments || [])].sort((a, b) => Date.parse(b.paymentDate || b.createdAt) - Date.parse(a.paymentDate || a.createdAt)));
      }, "Nie udało się pobrać rozliczeń klienta."),
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
  }, [params.id, correctionRevision]);

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

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-5 pb-10">
      {isLoading ? (
        <div className="card-shell p-6 text-on-surface-variant">
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
            backHref="/trainer/clients"
            paymentsHref={`/trainer/clients/${client.id}/payments`}
            onEdit={() => void handleOpenEdit()}
            onFiles={handleOpenTrainingPlan}
          />
          {sectionErrors.length ? <div role="alert" className="card-shell p-5 text-sm text-on-surface-variant">{sectionErrors.map((message, index) => <p key={index}>{message}</p>)}<Button variant="secondary" className="mt-3" onClick={() => void loadClientDetails()}>Spróbuj ponownie</Button></div> : null}
          {sectionLoading.subscription || sectionLoading.usage ? <p role="status" className="text-sm text-on-surface-variant">Pobieranie wykorzystania pakietu…</p> : null}
          <ClientMetricCards
            preserveMissingData
            client={client}
            subscription={subscription}
            usage={usage}
            billing={billing}
          />
          {sectionLoading.billing ? <p role="status" className="card-shell p-5">Pobieranie rozliczeń klienta…</p> : billingError ? <div role="alert" className="card-shell p-5 text-on-surface-variant">{billingError}<Button variant="secondary" className="mt-3" onClick={() => void loadClientDetails()}>Spróbuj ponownie</Button></div> : <ClientPackagesSection packages={billing?.packages} activeClientPackageId={billing?.activeClientPackageId} />}
          {billing ? <section className="card-shell overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 p-5">
              <h2 className="text-section-title">Historia wpłat</h2>
              <Link className="text-sm font-semibold text-primary-light" href={"/trainer/clients/" + client.id + "/payments"}>Płatności i odnowienia pakietu</Link>
            </div>
            <PaymentsList payments={payments} isLoading={false} processingId={null} showClient={false} emptyTitle="Brak wpłat klienta" emptyMessage="Wpłaty pojawią się tutaj po ich dodaniu." />
          </section> : null}

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_330px]">
            {sectionLoading.sessions ? <p role="status" className="card-shell p-5">Pobieranie treningów klienta…</p> : sessionsError ? <div role="alert" className="card-shell p-5 text-on-surface-variant">{sessionsError}</div> : <ClientSessionsPanel sessions={sessions} />}
            <ClientNotesPanel
              key={client.id}
              client={client}
              payments={payments}
              showPayments={false}
              access="trainer"
              trainerMe={me}
              onClientChange={setClient}
            />
          </div>

          <EditClientModal
            key={client.id}
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
  return safeExternalUrl(plan?.url || plan?.googleDriveFolderUrl) || "";
}
