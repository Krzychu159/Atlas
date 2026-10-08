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
import { trainerPortalClientToClient } from "@/app/lib/trainer/portal-mappers";

export default function TrainerClientDetailsPage() {
  const loadRevision = useRef(0);
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
    const clientId = Number(params.id);

    if (!Number.isSafeInteger(clientId) || clientId <= 0) {
      setClient(null);
      setLoadError("Nie można otworzyć tego klienta. Wróć do listy klientów i wybierz go ponownie.");
      showOwnerError(new Error("Nie można otworzyć tego klienta. Wróć do listy klientów i wybierz go ponownie."), "", {
        id: "trainer-client-invalid-id",
      });
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setLoadError(null);
      setBillingError(null);
      setSessionsError(null);
      setSectionErrors([]);
      setClient(null);
      setSubscription(null);
      setUsage(null);
      setSessions([]);
      setTrainingPlan(null);
      setBilling(null);
      setPayments([]);

      const meData = await getTrainerPortalMe().catch(() => null);
      if (revision !== loadRevision.current) return;
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
        getTrainerPortalClientSubscription(clientId),
        getTrainerPortalClientSubscriptionUsage(clientId),
        getClientSessions(clientId),
        getTrainerPortalClientTrainingPlan(clientId),
        getTrainerPortalClientBilling(clientId),
      ]);

      if (revision !== loadRevision.current) return;
      if (clientResult.status !== "fulfilled") {
        throw clientResult.reason;
      }

      setClient(clientResult.value);
      setSectionErrors([
        subscriptionResult.status === "rejected" ? trainerPaymentError(subscriptionResult.reason, "Nie udało się pobrać odnowień pakietu.") : null,
        usageResult.status === "rejected" ? trainerPaymentError(usageResult.reason, "Nie udało się pobrać wykorzystania pakietu.") : null,
        trainingPlanResult.status === "rejected" ? trainerPaymentError(trainingPlanResult.reason, "Nie udało się pobrać plików klienta.") : null,
      ].filter((message): message is string => message !== null));

      if (subscriptionResult.status === "fulfilled") {
        setSubscription(subscriptionResult.value);
      }

      if (usageResult.status === "fulfilled") {
        setUsage(usageResult.value);
      }

      if (sessionsResult.status === "fulfilled") {
        setSessions(sessionsResult.value);
      } else {
        setSessionsError(trainerPaymentError(sessionsResult.reason, "Nie udało się pobrać treningów klienta."));
      }

      if (trainingPlanResult.status === "fulfilled") {
        setTrainingPlan(trainingPlanResult.value);
      }

      if (paymentsResult.status === "fulfilled") {
        setBilling(paymentsResult.value);
        setPayments([...(paymentsResult.value.payments || [])].sort((first, second) => Date.parse(second.paymentDate || second.createdAt) - Date.parse(first.paymentDate || first.createdAt)));
      } else {
        setBilling(null);
        setPayments([]);
        setBillingError(trainerPaymentError(paymentsResult.reason, "Nie udało się pobrać rozliczeń klienta."));
      }
    } catch (err) {
      if (revision !== loadRevision.current) return;
      const message = trainerPaymentError(err, "Nie udało się pobrać klienta. Spróbuj ponownie.");
      setLoadError(message);
      showOwnerError(new Error(message), message, {
        id: "trainer-client-load-error",
      });
    } finally {
      if (revision === loadRevision.current) setIsLoading(false);
    }
  }

  async function getClientForTrainerView(
    clientId: number,
    meData: TrainerPortalMe | null,
  ) {
    const clientData = await getTrainerPortalClient(clientId);
    return trainerPortalClientToClient(clientData, meData);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadClientDetails();
    }, 0);

    return () => { window.clearTimeout(timer); loadRevision.current += 1; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      const plan = await getTrainerPortalClientTrainingPlan(client.id);
      setTrainingPlan(plan);
      url = getTrainingPlanUrl(plan);
    } catch (error) {
      pendingTab?.close();
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

      {client ? (
        <>
          <ClientProfileHero
            client={client}
            milestoneAccess="trainer"
            backHref="/trainer/clients"
            paymentsHref={`/trainer/clients/${client.id}/payments`}
            onEdit={() => setIsEditOpen(true)}
            onFiles={handleOpenTrainingPlan}
          />
          {sectionErrors.length ? <div role="alert" className="card-shell p-5 text-sm text-on-surface-variant">{sectionErrors.map((message, index) => <p key={index}>{message}</p>)}<Button variant="secondary" className="mt-3" onClick={() => void loadClientDetails()}>Spróbuj ponownie</Button></div> : null}
          <ClientMetricCards
            preserveMissingData
            client={client}
            subscription={subscription}
            usage={usage}
            billing={billing}
          />
          {billingError ? <div role="alert" className="card-shell p-5 text-on-surface-variant">{billingError}<Button variant="secondary" className="mt-3" onClick={() => void loadClientDetails()}>Spróbuj ponownie</Button></div> : <ClientPackagesSection packages={billing?.packages} activeClientPackageId={billing?.activeClientPackageId} />}
          {billing ? <section className="card-shell overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 p-5">
              <h2 className="text-section-title">Historia wpłat</h2>
              <Link className="text-sm font-semibold text-primary-light" href={"/trainer/clients/" + client.id + "/payments"}>Płatności i odnowienia pakietu</Link>
            </div>
            <PaymentsList payments={payments} isLoading={false} processingId={null} showClient={false} emptyTitle="Brak wpłat klienta" emptyMessage="Wpłaty pojawią się tutaj po ich dodaniu." />
          </section> : null}

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_330px]">
            {sessionsError ? <div role="alert" className="card-shell p-5 text-on-surface-variant">{sessionsError}</div> : <ClientSessionsPanel sessions={sessions} />}
            <ClientNotesPanel
              client={client}
              payments={payments}
              showPayments={false}
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
