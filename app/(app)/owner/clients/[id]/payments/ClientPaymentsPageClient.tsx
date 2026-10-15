"use client";

import { getGroupEnrollment } from "@/app/lib/owner/group-enrollments";
import { notifyClientPaymentChanged } from "@/app/lib/session-corrections";

import { userTrainingType } from "@/app/lib/user-messages";
import { packageTrainingKind } from "@/app/lib/package-validity";

import { useSessionCorrectionRevision, usePaymentDateCorrectionRevision } from "@/app/lib/session-corrections";

import { useEffect, useMemo, useRef, useState } from "react";
import { createStaffPaymentIntent } from "@/app/lib/owner/staff-payment-intent";
import {
  Banknote,
  CalendarRange,
  Dumbbell,
  History,
  Info,
  Package as PackageIcon,
  PackagePlus,
  ReceiptText,
} from "lucide-react";
import { Tooltip } from "@/app/components/ui/tooltip";
import {
  profilePrimaryActionClassName,
} from "@/app/components/ui/profile-hero";
import { PaymentActionConfirmModal } from "@/app/components/payments/PaymentActionConfirmModal";
import { PaymentEntryModal } from "@/app/components/payments/PaymentEntryModal";
import { PaymentPagination } from "@/app/components/payments/PaymentPagination";
import { PaymentsList } from "@/app/components/payments/PaymentsList";
import { PaymentReasonModal } from "@/app/components/payments/PaymentReasonModal";
import { CustomSelect } from "@/app/components/ui/custom-select";
import {
  cancelClientSubscription,
  confirmClientRefund,
  getClientRefunds,
  getClient,
  getClientSubscription,
  getClientSubscriptionUsage,
  resumeClientSubscription,
  setClientNextPackage,
  type Client,
  type ClientSubscription,
  type ClientRefund,
  type SubscriptionUsage,
} from "@/app/lib/owner/clients";
import {
  activateClientPackage,
  cancelPaymentReceipt,
  confirmClientPayment,
  createClientPackage,
  getClientBilling,
  getClientPayments,
  getPackagePaymentStatusLabel,
  issuePaymentReceipt,
  isConfirmedPayment,
  isPendingPayment,
  paymentMethodOptions,
  reverseClientPayment,
  type ClientBillingSummary,
  type ClientPackageBilling,
  type ClientPayment,
  type PaymentMethod,
} from "@/app/lib/owner/billing";
import { getPackages, type Package } from "@/app/lib/owner/packages";
import {
  showOwnerError,
  showOwnerSuccess,
} from "@/app/(app)/owner/components/owner-toast";
import {
  cancelTrainerPortalClientSubscription,
  confirmTrainerPortalPayment,
  createTrainerPortalClientPayment,
  getTrainerPortalClient,
  getTrainerPortalClientBilling,
  getTrainerPortalClientSubscription,
  getTrainerPortalClientSubscriptionUsage,
  resumeTrainerPortalClientSubscription,
  setTrainerPortalClientNextPackage,
} from "@/app/lib/trainer/portal";
import { getTrainerPackages } from "@/app/lib/trainer/packages";
import { trainerPaymentError } from "@/app/lib/trainer/payment-errors";
import { trainerPortalClientToClient } from "@/app/lib/trainer/portal-mappers";
import ClientPackagesSection from "../components/ClientPackagesSection";
import ClientPeriodPackagesSection from "../components/ClientPeriodPackagesSection";
import { isSessionPackage } from "@/app/lib/period-packages";
import ClientAuditSection from "../components/ClientAuditSection";
import ClientRefundsSection from "../components/ClientRefundsSection";
import RefundConfirmationModal from "../components/RefundConfirmationModal";
import CollapsibleSection from "@/app/components/ui/collapsible-section";
import ClientProfileHero from "../components/ClientProfileHero";

type ClientPaymentsPageClientProps = {
  clientIdParam: string;
  basePath?: "/owner" | "/trainer";
};

type PaymentAction = "confirm" | "issueReceipt" | "cancelReceipt";

const CLIENT_PAYMENTS_PER_PAGE = 6;


export default function ClientPaymentsPageClient({
  clientIdParam,
  basePath = "/owner",
}: ClientPaymentsPageClientProps) {
  const mutationLock = useRef(false);
  const paymentIntent = useRef<ReturnType<typeof createStaffPaymentIntent> | null>(null);
  const [paymentUnresolved, setPaymentUnresolved] = useState(false);
  const loadRevision = useRef(0);
  const trainerLoad = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [subscriptionError, setSubscriptionError] = useState<string | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [confirmablePaymentIds, setConfirmablePaymentIds] = useState<Set<number>>(new Set());
  const [pendingPaymentsError, setPendingPaymentsError] = useState<string | null>(null);
  const [usageError, setUsageError] = useState<string | null>(null);
  const correctionRevision = useSessionCorrectionRevision();
  const paymentDateRevision = usePaymentDateCorrectionRevision(Number(clientIdParam));
  const [clientId, setClientId] = useState<number | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [billing, setBilling] = useState<ClientBillingSummary | null>(null);
  const [auditRevision, setAuditRevision] = useState(0);
  const [refunds, setRefunds] = useState<ClientRefund[]>([]);
  const [refundToConfirm, setRefundToConfirm] = useState<ClientRefund | null>(null);
  const [isConfirmingRefund, setIsConfirmingRefund] = useState(false);
  const [subscription, setSubscription] = useState<ClientSubscription | null>(
    null,
  );
  const [usage, setUsage] = useState<SubscriptionUsage | null>(null);
  const [clientPayments, setClientPayments] = useState<ClientPayment[]>([]);
  const [paymentPage, setPaymentPage] = useState(1);
  const [packages, setPackages] = useState<Package[]>([]);
  const [selectedPackageId, setSelectedPackageId] = useState("");
  const [selectedNextPackageId, setSelectedNextPackageId] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentPackageId, setPaymentPackageId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("2");
  const [paymentNote, setPaymentNote] = useState("");
  const [paymentDate, setPaymentDate] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [processingPaymentId, setProcessingPaymentId] = useState<number | null>(
    null,
  );
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentToReverse, setPaymentToReverse] =
    useState<ClientPayment | null>(null);
  const [paymentAction, setPaymentAction] = useState<{
    type: PaymentAction;
    payment: ClientPayment;
  } | null>(null);
  const paymentLinkHandled = useRef("");
  const [reversalReason, setReversalReason] = useState("");
  useEffect(() => {
    mounted.current = true;
    const timer = window.setTimeout(() => {
      const parsedId = Number(clientIdParam);

      if (!Number.isSafeInteger(parsedId) || parsedId <= 0) {
        setBilling(null);
        setClient(null);
        setClientId(null);
        setLoadError("Nie można otworzyć tego klienta. Wróć do listy klientów i wybierz go ponownie.");
        showOwnerError(new Error("Nie można otworzyć tego klienta. Wróć do listy klientów i wybierz go ponownie."), "", {
          id: "owner-client-payments-invalid-id",
        });
        setIsLoading(false);
        return;
      }

      setClientId(parsedId);
      void loadClientPayments(parsedId);
    }, 0);

    return () => { window.clearTimeout(timer); mounted.current = false; loadRevision.current += 1; trainerLoad.current?.abort(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientIdParam, correctionRevision, paymentDateRevision]);

  async function loadClientPayments(id = clientId, propagateError = false) {
    if (!id) return;
    const revision = ++loadRevision.current;

    try {
      setIsLoading(true);
      setLoadError(null);
      if (basePath === "/trainer") {
        await loadTrainerClientPayments(id, revision);
        return;
      }
      setAuditRevision((value) => value + 1);

      const billingRequest = getClientBilling(id);
      const [
        clientData,
        billingData,
        subscriptionData,
        packagesData,
        usageData,
        paymentsData,
        refundsData,
      ] = await Promise.all([
        getClient(id),
        billingRequest,
        getClientSubscription(id),
        getPackages(),
        getClientSubscriptionUsage(id).catch(() => null),
        billingRequest.then(async data => Array.isArray(data.payments)
          ? data.payments
          : (await getClientPayments(id, { page: 1, pageSize: 1000 })).items),
        getClientRefunds(id, { page: 1, pageSize: 25 }),
      ]);

      if (revision !== loadRevision.current || !mounted.current) return;
      setClient(clientData);
      setRefunds(refundsData.items || []);
      setBilling(billingData);
      setSubscription(subscriptionData);
      setUsage(usageData);
      setClientPayments(billingData.payments || paymentsData || []);
      setPaymentPage(1);
      setPackages(
        packagesData.filter(
          (item) =>
            item.isActive &&
            packageMatchesClientLocation(item, clientData.locationId),
        ),
      );
      setPaymentAmount(String(Math.max(billingData.activePackageAmountDue, 0)));

      const activeClientPackageId = billingData.activeClientPackageId
        ? String(billingData.activeClientPackageId)
        : "";

      setPaymentPackageId(activeClientPackageId);
      const query = new URLSearchParams(window.location.search);
      const requestedId = Number(query.get("clientPackageId"));
      const linkKey = `${id}:${requestedId}`;
      if (query.get("addPayment") === "1" && Number.isSafeInteger(requestedId) && requestedId > 0 && paymentLinkHandled.current !== linkKey) {
        paymentLinkHandled.current = linkKey;
        const target = billingData.packages?.find(item => item.clientPackageId === requestedId);
        if (target) {
          setPaymentPackageId(String(target.clientPackageId));
          setPaymentAmount(typeof target.amountDue === "number" ? String(Math.max(target.amountDue, 0)) : "");
          setPaymentDate(localToday());
          setIsPaymentModalOpen(true);
        } else {
          showOwnerError(new Error("Nie znaleziono pakietu przypisanego do zgłoszenia. Sprawdź aktualne dane klienta."), "");
        }
      } else if (query.get("addPayment") === "1" && !query.get("clientPackageId") && paymentLinkHandled.current !== `${id}:new`) {
        paymentLinkHandled.current = `${id}:new`;
        setPaymentDate(localToday());
        setIsPaymentModalOpen(true);
      }
      setSelectedPackageId("");
      setSelectedNextPackageId(
        subscriptionData.nextPackage?.packageId
          ? String(subscriptionData.nextPackage.packageId)
          : "",
      );
    } catch (err) {
      if (revision !== loadRevision.current) return;
      setLoadError(basePath === "/trainer" ? trainerPaymentError(err, "Nie udało się pobrać płatności klienta.") : "Nie udało się pobrać płatności klienta.");
      if (basePath === "/trainer") setBilling(null);
      showOwnerError(err, "Nie udało się pobrać płatności klienta.", {
        id: "owner-client-payments-load-error",
      });
      if (propagateError) throw err;
    } finally {
      if (revision === loadRevision.current) setIsLoading(false);
    }
  }

  async function loadTrainerClientPayments(id: number, revision: number) {
    const controller = new AbortController();
    trainerLoad.current?.abort(); trainerLoad.current = controller;
    const signal = controller.signal;
    const [clientResult, billingResult, subscriptionResult, usageResult, catalogResult] = await Promise.allSettled([
      getTrainerPortalClient(id, signal), getTrainerPortalClientBilling(id, signal),
      getTrainerPortalClientSubscription(id, signal), getTrainerPortalClientSubscriptionUsage(id, signal),
      getTrainerPackages(signal, { isActive: true }),
    ]);
    if (revision !== loadRevision.current || signal.aborted) return;
    if (clientResult.status === "rejected") throw clientResult.reason;
    if (billingResult.status === "rejected") throw billingResult.reason;
    const billingData = billingResult.value;
    const subscriptionData = subscriptionResult.status === "fulfilled" ? subscriptionResult.value : null;
    const mappedClient = trainerPortalClientToClient(clientResult.value, null);
    setSubscriptionError(subscriptionResult.status === "rejected" ? trainerPaymentError(subscriptionResult.reason, "Nie udało się pobrać odnowień pakietu.") : null);
    setUsageError(usageResult.status === "rejected" ? trainerPaymentError(usageResult.reason, "Nie udało się pobrać wykorzystania pakietu.") : null);
    setCatalogError(catalogResult.status === "rejected" ? trainerPaymentError(catalogResult.reason, "Nie udało się pobrać oferty pakietów.") : null);
    setConfirmablePaymentIds(new Set((billingResult.value.payments || []).filter(payment => payment.clientId === id && payment.canConfirm === true).map(payment => payment.id)));
    setPendingPaymentsError(null);
    setClient(mappedClient); setBilling(billingData); setSubscription(subscriptionData);
    setUsage(usageResult.status === "fulfilled" ? usageResult.value : null);
    setClientPayments(billingData.payments || []); setPaymentPage(1);
    setPackages(catalogResult.status === "fulfilled" ? catalogResult.value.filter(item => item.isActive && packageMatchesClientLocation(item, mappedClient.locationId)) : []);
    setPaymentAmount(typeof billingData.activePackageAmountDue === "number" ? String(Math.max(billingData.activePackageAmountDue, 0)) : "");
    setPaymentPackageId(billingData.activeClientPackageId ? String(billingData.activeClientPackageId) : "");
    setSelectedPackageId(""); setSelectedNextPackageId(subscriptionData?.nextPackage?.packageId ? String(subscriptionData.nextPackage.packageId) : "");
  }

  async function refreshTrainerBilling(id: number) {
    if (!mounted.current) return;
    const revision = ++loadRevision.current;
    trainerLoad.current?.abort();
    const controller = new AbortController(); trainerLoad.current = controller;
    setIsLoading(true); setLoadError(null);
    const signal = controller.signal;
    try {
      const [billingResult, subscriptionResult, usageResult] = await Promise.allSettled([
        getTrainerPortalClientBilling(id, signal), getTrainerPortalClientSubscription(id, signal),
        getTrainerPortalClientSubscriptionUsage(id, signal),
      ]);
      if (revision !== loadRevision.current || signal.aborted) return;
      if (billingResult.status === "rejected") throw billingResult.reason;
      setBilling(billingResult.value); setClientPayments(billingResult.value.payments || []);
      setPaymentPackageId(billingResult.value.activeClientPackageId ? String(billingResult.value.activeClientPackageId) : "");
      setPaymentPage(1);
      setSubscription(subscriptionResult.status === "fulfilled" ? subscriptionResult.value : null);
      setSubscriptionError(subscriptionResult.status === "rejected" ? trainerPaymentError(subscriptionResult.reason, "Nie udało się pobrać odnowień pakietu.") : null);
      setUsage(usageResult.status === "fulfilled" ? usageResult.value : null);
      setUsageError(usageResult.status === "rejected" ? trainerPaymentError(usageResult.reason, "Nie udało się pobrać wykorzystania pakietu.") : null);
      setConfirmablePaymentIds(new Set((billingResult.value.payments || []).filter(payment => payment.clientId === id && payment.canConfirm === true).map(payment => payment.id)));
      setPendingPaymentsError(null);
      setPaymentAmount(typeof billingResult.value.activePackageAmountDue === "number" ? String(Math.max(billingResult.value.activePackageAmountDue, 0)) : "");
    } catch (error) {
      if (revision === loadRevision.current && !signal.aborted) { setBilling(null); setLoadError(trainerPaymentError(error, "Nie udało się odświeżyć rozliczeń klienta.")); }
    } finally { if (revision === loadRevision.current) setIsLoading(false); }
  }

  async function handleConfirmRefund(reference: string) {
    if (!clientId || !refundToConfirm || basePath !== "/owner" || isConfirmingRefund) return;
    let committed = false;
    try {
      setIsConfirmingRefund(true);
      await confirmClientRefund(clientId, refundToConfirm.clientPackageId, { amount: refundToConfirm.amount, reference });
      committed = true;
      setRefundToConfirm(null);
      await loadClientPayments(clientId, true);
      showOwnerSuccess("Zwrot został potwierdzony.");
    } catch (err) {
      showOwnerError(err, committed ? "Zwrot został potwierdzony, ale nie udało się odświeżyć danych klienta." : "Nie udało się potwierdzić zwrotu.");
    } finally { setIsConfirmingRefund(false); }
  }

  async function handleAssignPackage() {
    if (!clientId || !selectedPackageId || basePath !== "/owner" || mutationLock.current || isLoading) return;

    const selectedPackage = packages.find(
      (item) => item.id === Number(selectedPackageId),
    );

    if (!selectedPackage || !isSessionPackage(selectedPackage) || packageTrainingKind(selectedPackage.packageType, selectedPackage.billingType) !== "individual" || !Number.isInteger(selectedPackage.billingType)) {
      showOwnerError(new Error("Wybierz pakiet indywidualny z lokalizacji klienta."), "", {
        id: "owner-client-package-location-required",
      });
      return;
    }

    mutationLock.current = true;
    try {
      setIsSaving(true);
      const existingPackageIds = new Set(
        (billing?.packages || []).map((item) => item.clientPackageId),
      );
      const purchaseDate = new Date();
      const validUntil = new Date(purchaseDate);

      validUntil.setDate(validUntil.getDate() + selectedPackage.durationDays);

      await createClientPackage({
        clientId,
        packageId: selectedPackage.id,
        name: selectedPackage.name,
        totalSessions: selectedPackage.sessionsLimit,
        totalPrice: selectedPackage.price,
        expectedBillingType: selectedPackage.billingType!,
        purchaseDate: purchaseDate.toISOString(),
        validUntil: validUntil.toISOString(),
        paymentDueDate: null,
      });

      const refreshedBilling = await getClientBilling(clientId);
      const createdPackage = (refreshedBilling.packages || [])
        .filter(
          (item) =>
            item.packageId === selectedPackage.id &&
            !existingPackageIds.has(item.clientPackageId),
        )
        .sort((first, second) => second.clientPackageId - first.clientPackageId)[0];

      if (createdPackage && !createdPackage.isActive) {
        await activateClientPackage(clientId, createdPackage.clientPackageId);
      }

      await loadClientPayments(clientId);
      showOwnerSuccess("Pakiet klienta został ustawiony.", {
        id: "owner-client-package-set",
      });
    } catch (err) {
      showOwnerError(err, "Nie udało się ustawić pakietu klienta.", {
        id: "owner-client-package-error",
      });
    } finally {
      mutationLock.current = false;
      setIsSaving(false);
    }
  }

  async function handleSetNextPackage() {
    if (!clientId || !selectedNextPackageId || mutationLock.current || isLoading || (basePath === "/trainer" && (!subscription || catalogError))) return;

    const selectedPackage = packages.find(
      (item) => item.id === Number(selectedNextPackageId),
    );

    if (!selectedPackage || !isSessionPackage(selectedPackage) || packageTrainingKind(selectedPackage.packageType, selectedPackage.billingType) !== "individual") {
      showOwnerError(new Error("Wybierz pakiet indywidualny z lokalizacji klienta."), "", {
        id: "owner-client-next-package-location-required",
      });
      return;
    }

    mutationLock.current = true;
    try {
      setIsSaving(true);
      const data = basePath === "/trainer"
        ? await setTrainerPortalClientNextPackage(clientId, selectedPackage.id)
        : await setClientNextPackage(clientId, selectedPackage.id);

      if (!mounted.current) return;
      setSubscription(data);
      setSubscriptionError(null);
      if (basePath === "/owner") await loadClientPayments(clientId);
      setSelectedNextPackageId(
        data.nextPackage?.packageId
          ? String(data.nextPackage.packageId)
          : "",
      );
      showOwnerSuccess("Kolejny pakiet klienta został zapisany.", {
        id: "owner-client-next-package-set",
      });
    } catch (err) {
      showOwnerError(basePath === "/trainer" ? new Error(trainerPaymentError(err, "Nie udało się zapisać zmian. Spróbuj ponownie.")) : err, "Nie udało się ustawić kolejnego pakietu.", {
        id: "owner-client-next-package-error",
      });
    } finally {
      mutationLock.current = false;
      setIsSaving(false);
    }
  }

  async function handleRequestCancelAfterCycle() {
    if (!clientId || !subscription || mutationLock.current || isLoading) return;

    if (subscription.cancelRenewalRequested) {
      showOwnerSuccess("Zakończenie po obecnym pakiecie jest już ustawione.", {
        id: "owner-client-cancel-after-cycle-already-set",
      });
      return;
    }

    mutationLock.current = true;
    try {
      setIsSaving(true);
      const data =
        basePath === "/trainer"
          ? await cancelTrainerPortalClientSubscription(clientId)
          : await cancelClientSubscription(clientId);
      if (!mounted.current) return;
      setSubscription(data);
      setSubscriptionError(null);
      if (basePath === "/owner") await loadClientPayments(clientId);
      showOwnerSuccess("Zakończenie po pakiecie zostało ustawione.", {
        id: "owner-client-cancel-after-cycle-updated",
      });
    } catch (err) {
      showOwnerError(basePath === "/trainer" ? new Error(trainerPaymentError(err, "Nie udało się zapisać zmian. Spróbuj ponownie.")) : err, "Nie udało się ustawić zakończenia po pakiecie.", {
        id: "owner-client-cancel-after-cycle-error",
      });
    } finally {
      mutationLock.current = false;
      setIsSaving(false);
    }
  }

  async function handleResumeAutoRenew() {
    if (!clientId || !subscription || mutationLock.current || isLoading) return;

    if (subscription.autoRenewEnabled && !subscription.cancelRenewalRequested) {
      showOwnerSuccess("Automatyczne przedłużanie jest już aktywne.", {
        id: "owner-client-autorenew-already-active",
      });
      return;
    }

    mutationLock.current = true;
    try {
      setIsSaving(true);
      const data =
        basePath === "/trainer"
          ? await resumeTrainerPortalClientSubscription(clientId)
          : await resumeClientSubscription(clientId);
      if (!mounted.current) return;
      setSubscription(data);
      setSubscriptionError(null);
      if (basePath === "/owner") await loadClientPayments(clientId);
      showOwnerSuccess("Automatyczne przedłużanie zostało wznowione.", {
        id: "owner-client-autorenew-resumed",
      });
    } catch (err) {
      showOwnerError(basePath === "/trainer" ? new Error(trainerPaymentError(err, "Nie udało się zapisać zmian. Spróbuj ponownie.")) : err, "Nie udało się wznowić automatycznego przedłużania.", {
        id: "owner-client-autorenew-resume-error",
      });
    } finally {
      mutationLock.current = false;
      setIsSaving(false);
    }
  }

  async function handleCreatePayment() {
    if (!clientId || mutationLock.current || isLoading || !billing || loadError) return;

    const amount = Number(paymentAmount.replace(",", "."));
    const selectedPackage = packagesBilling.find(
      (item) => item.clientPackageId === Number(paymentPackageId),
    );

    if (!paymentPackageId) {
      showOwnerError(new Error("Wybierz pakiet, którego dotyczy wpłata."), "", {
        id: "owner-client-payment-package-required",
      });
      return;
    }

    if (!selectedPackage) {
      showOwnerError(new Error("Nie znaleziono wybranego pakietu."), "", {
        id: "owner-client-payment-package-missing",
      });
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0 || !/^\d+(?:[.,]\d{1,2})?$/.test(paymentAmount.trim())) {
      showOwnerError(new Error("Podaj poprawną kwotę wpłaty."), "", {
        id: "owner-client-payment-amount-invalid",
      });
      return;
    }

    if (!paymentMethodOptions.some((option) => option.value === paymentMethod)) {
      showOwnerError(new Error("Wybierz sposób płatności."), "");
      return;
    }

    const paymentDateTime = localPaymentDateToIso(paymentDate);
    if (!paymentDateTime) {
      showOwnerError(new Error("Wybierz poprawną datę wpłaty."), "");
      return;
    }

    mutationLock.current = true;
    try {
      setIsSaving(true);
      const paymentPayload = {
        clientId,
        clientPackageId: Number(paymentPackageId),
        amount,
        method: Number(paymentMethod) as PaymentMethod,
        paymentDate: paymentDateTime,
        note: paymentNote.trim() || null,
      };
      if (!paymentIntent.current) paymentIntent.current = createStaffPaymentIntent();
      const outcome =
        basePath === "/trainer"
          ? { recovered: false as const, payment: await createTrainerPortalClientPayment(clientId, paymentPayload) }
          : await paymentIntent.current.execute(paymentPayload);

      notifyClientPaymentChanged(clientId);
      void refreshLinkedEnrollment();
      showOwnerSuccess(outcome.recovered ? "Wpłata została odnaleziona. Sprawdź jej aktualny stan w historii." : getCreatedPaymentMessage(outcome.payment), {
        id: "owner-client-payment-created",
      });
      setPaymentNote("");
      setIsPaymentModalOpen(false);
      paymentIntent.current = null;
      if (basePath === "/trainer") await refreshTrainerBilling(clientId);
      else await loadClientPayments(clientId);
    } catch (err) {
      showOwnerError(basePath === "/trainer" ? new Error(trainerPaymentError(err, "Nie udało się zapisać zmian. Spróbuj ponownie.")) : err, "Nie udało się dodać wpłaty.", {
        id: "owner-client-payment-create-error",
      });
    } finally {
      setPaymentUnresolved(paymentIntent.current?.unresolved ?? false);
      mutationLock.current = false;
      setIsSaving(false);
    }
  }

  async function refreshLinkedEnrollment() {
    if (basePath !== "/owner") return;
    const id = Number(new URLSearchParams(window.location.search).get("groupEnrollmentId"));
    if (!Number.isSafeInteger(id) || id <= 0) return;
    try { await getGroupEnrollment(id); }
    catch { showOwnerError(new Error("Wpłata została zapisana, ale nie udało się odświeżyć zgłoszenia na zajęcia. Sprawdź zgłoszenie przed potwierdzeniem udziału."), "Nie udało się odświeżyć zgłoszenia."); }
  }

  async function handleConfirmPayment(payment: ClientPayment) {
    if (!clientId || mutationLock.current || isLoading || !billing || loadError) return;

    if (basePath === "/trainer" && (payment.canConfirm !== true || !confirmablePaymentIds.has(payment.id))) return;

    if (!isPendingPayment(payment)) {
      showOwnerSuccess("Ta wpłata nie wymaga potwierdzenia.", {
        id: `owner-client-payment-not-pending-${payment.id}`,
      });
      return;
    }

    mutationLock.current = true;
    try {
      setProcessingPaymentId(payment.id);
      if (basePath === "/trainer") {
        await confirmTrainerPortalPayment(payment.id);
      } else {
        await confirmClientPayment(payment.id);
      }
      notifyClientPaymentChanged(payment.clientId);
      void refreshLinkedEnrollment();
      showOwnerSuccess("Wpłata została potwierdzona.", {
        id: `owner-client-payment-confirmed-${payment.id}`,
      });
      if (basePath === "/trainer") await refreshTrainerBilling(clientId);
      else await loadClientPayments(clientId);
    } catch (err) {
      showOwnerError(basePath === "/trainer" ? new Error(trainerPaymentError(err, "Nie udało się zapisać zmian. Spróbuj ponownie.")) : err, "Nie udało się potwierdzić wpłaty.", {
        id: `owner-client-payment-confirm-error-${payment.id}`,
      });
    } finally {
      mutationLock.current = false;
      setProcessingPaymentId(null);
    }
  }

  async function handleIssueReceipt(payment: ClientPayment) {
    if (!clientId || basePath !== "/owner") return;

    try {
      setProcessingPaymentId(payment.id);
      await issuePaymentReceipt(payment.id);
      showOwnerSuccess("Paragon został wystawiony.", {
        id: `owner-client-payment-receipt-issued-${payment.id}`,
      });
      await loadClientPayments(clientId);
    } catch (err) {
      showOwnerError(err, "Nie udało się wystawić paragonu.", {
        id: `owner-client-payment-receipt-issue-error-${payment.id}`,
      });
    } finally {
      setProcessingPaymentId(null);
    }
  }

  async function handleCancelReceipt(payment: ClientPayment) {
    if (!clientId || basePath !== "/owner") return;

    try {
      setProcessingPaymentId(payment.id);
      await cancelPaymentReceipt(payment.id);
      showOwnerSuccess("Paragon został cofnięty.", {
        id: `owner-client-payment-receipt-cancelled-${payment.id}`,
      });
      await loadClientPayments(clientId);
    } catch (err) {
      showOwnerError(err, "Nie udało się cofnąć paragonu.", {
        id: `owner-client-payment-receipt-cancel-error-${payment.id}`,
      });
    } finally {
      setProcessingPaymentId(null);
    }
  }

  async function handleReversePayment() {
    if (!clientId || !paymentToReverse || basePath !== "/owner") return;

    const reason = reversalReason.trim();

    if (!reason) {
      showOwnerError(new Error("Podaj powód cofnięcia wpłaty."), "", {
        id: "owner-client-payment-reverse-reason-required",
      });
      return;
    }

    try {
      setProcessingPaymentId(paymentToReverse.id);
      await reverseClientPayment(paymentToReverse.id, reason);
      setPaymentToReverse(null);
      setReversalReason("");
      showOwnerSuccess("Wpłata została cofnięta.", {
        id: `owner-client-payment-reversed-${paymentToReverse.id}`,
      });
      await loadClientPayments(clientId);
    } catch (err) {
      showOwnerError(err, "Nie udało się cofnąć wpłaty.", {
        id: `owner-client-payment-reverse-error-${paymentToReverse.id}`,
      });
    } finally {
      setProcessingPaymentId(null);
    }
  }

  function handlePaymentPackageChange(value: string) {
    setPaymentPackageId(value);

    const selectedPackage = packagesBilling.find(
      (item) => item.clientPackageId === Number(value),
    );

    if (selectedPackage) {
      setPaymentAmount(typeof selectedPackage.amountDue === "number" ? String(Math.max(selectedPackage.amountDue, 0)) : "");
    }
  }

  const packageOptions = useMemo(
    () => [
      { value: "", label: "Wybierz pakiet" },
      ...packages.filter(item => isSessionPackage(item) && packageTrainingKind(item.packageType, item.billingType) === "individual" && Number.isInteger(item.billingType)).map((item) => ({
        value: String(item.id),
        label: `${item.name} · ${formatMoney(item.price, item.currency)}`,
      })),
    ],
    [packages],
  );

  const packagesBilling = useMemo(
    () =>
      [...(billing?.packages || [])].sort(
        (first, second) => Number(second.isActive) - Number(first.isActive),
      ),
    [billing?.packages],
  );

  const clientPackageOptions = useMemo(
    () => [
      ...packagesBilling.map((item) => ({
        value: String(item.clientPackageId),
        label: `${item.packageName || `Pakiet #${item.clientPackageId}`} · ${
          typeof item.amountDue !== "number" ? "kwota niedostępna" : item.amountDue > 0
            ? `${formatMoney(item.amountDue, item.currency)} do zapłaty`
            : "opłacony"
        }`,
        amountDue: item.amountDue,
        currency: item.currency,
      })),
    ],
    [packagesBilling],
  );

  const payments = useMemo(
    () =>
      [...clientPayments].sort(
        (first, second) =>
          new Date(second.paymentDate).getTime() -
          new Date(first.paymentDate).getTime(),
      ),
    [clientPayments],
  );
  const mainPackage = packagesBilling.find((item) => isSessionPackage(item) && item.clientPackageId === billing?.activeClientPackageId) || null;
  const mainUsage = usage?.clientPackageId === mainPackage?.clientPackageId ? usage : null;
  const mainSubscription = subscription;
  const activeCurrency = mainPackage?.currency || "PLN";
  const nextPackageOptions = [{ value: "", label: "Wybierz pakiet" }, ...packages.filter((item) => isSessionPackage(item) && packageTrainingKind(item.packageType, item.billingType) === "individual").map((item) => ({ value: String(item.id), label: item.name }))];
  const paymentTotalPages = Math.max(
    1,
    Math.ceil(payments.length / CLIENT_PAYMENTS_PER_PAGE),
  );
  const currentPaymentPage = Math.min(paymentPage, paymentTotalPages);
  const visiblePayments = payments.slice(
    (currentPaymentPage - 1) * CLIENT_PAYMENTS_PER_PAGE,
    currentPaymentPage * CLIENT_PAYMENTS_PER_PAGE,
  );

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-3 pb-10">
      {client ? (
        <ClientProfileHero
          client={client}
          activeTab="payments"
          milestoneAccess={basePath === "/trainer" ? "trainer" : "owner"}
          backHref={client.isArchived && basePath === "/owner" ? "/owner/clients/archived" : `${basePath}/clients`}
          paymentsHref={`${basePath}/clients/${client.id}/payments`}
          onAddPayment={() => {
            setPaymentDate(localToday());
            setIsPaymentModalOpen(true);
          }}
          addPaymentDisabled={!billing || isSaving || processingPaymentId !== null || isLoading || packagesBilling.length === 0}
          onRefresh={() => loadClientPayments()}
          isRefreshing={isLoading}
          refreshDisabled={isLoading || isSaving || processingPaymentId !== null || !clientId}
          billingSummary={billing ? { amountDue: billing.totalAmountDue, balance: billing.currentBalance, currency: activeCurrency } : null}
        />
      ) : null}

      {isLoading ? (
        <div role="status" className="card-shell p-4 text-sm text-on-surface-variant">
          Ładowanie płatności klienta...
        </div>
      ) : null}

      {!isLoading && loadError ? <div role="alert" className="card-shell p-4 text-sm text-on-surface-variant">{loadError}</div> : null}

      {billing && !isLoading && !(basePath === "/trainer" && loadError) ? (
        <>
          {catalogError ? <div role="alert" className="card-shell p-4 text-sm text-on-surface-variant">{catalogError}</div> : null}
          {subscriptionError ? <div role="alert" className="card-shell p-4 text-sm text-on-surface-variant">{subscriptionError}</div> : <SubscriptionPanel
            subscription={mainSubscription}
            activePackage={mainPackage}
            isGroup={false}
            selectedPackageId={selectedPackageId}
            selectedNextPackageId={selectedNextPackageId}
            packageOptions={packageOptions}
            nextPackageOptions={nextPackageOptions}
            clientLocationName={client?.locationName || "lokalizacji klienta"}
            canAssignPackage={basePath === "/owner"}
            canSetNextPackage={basePath === "/owner" || !catalogError}
            isSaving={isSaving || processingPaymentId !== null}
            onPackageChange={setSelectedPackageId}
            onNextPackageChange={setSelectedNextPackageId}
            onAssignPackage={handleAssignPackage}
            onSetNextPackage={handleSetNextPackage}
            onCancelAfterCycle={handleRequestCancelAfterCycle}
            onResumeAutoRenew={handleResumeAutoRenew}
          />}

          <CollapsibleSection title="Historia wpłat" icon={<ReceiptText size={15} />} meta={payments.length} defaultOpen flush>
            {pendingPaymentsError ? <p role="alert" className="px-4 pt-3 text-sm text-on-surface-variant">{pendingPaymentsError}</p> : null}
            <PaymentsList
              dateCorrectionPortal={basePath === "/trainer" ? "trainer" : "owner"}
              payments={visiblePayments}
              isLoading={false}
              processingId={processingPaymentId}
              showClient={false}
              canConfirm={basePath === "/trainer" ? (payment) => payment.canConfirm === true && confirmablePaymentIds.has(payment.id) : undefined}
              emptyTitle="Brak wpłat klienta"
              emptyMessage="Pierwsza wpłata pojawi się tutaj po jej dodaniu."
              onConfirm={(payment) =>
                setPaymentAction({ type: "confirm", payment })
              }
              onIssueReceipt={basePath === "/owner" ? (payment) =>
                setPaymentAction({ type: "issueReceipt", payment })
              : undefined}
              onCancelReceipt={basePath === "/owner" ? (payment) =>
                setPaymentAction({ type: "cancelReceipt", payment })
              : undefined}
              onReverse={basePath === "/owner" ? (payment) => {
                setPaymentToReverse(payment);
                setReversalReason("");
              } : undefined}
            />
            {payments.length > 0 ? (
              <PaymentPagination
                page={currentPaymentPage}
                pageSize={CLIENT_PAYMENTS_PER_PAGE}
                totalItems={payments.length}
                onPageChange={setPaymentPage}
              />
            ) : null}
          </CollapsibleSection>

          {usageError ? <div role="alert" className="card-shell p-4 text-sm text-on-surface-variant">{usageError}</div> : null}
          {mainUsage ? (
            <CollapsibleSection
              title="Wykorzystanie pakietu"
              icon={<Dumbbell size={15} />}
              meta={typeof mainUsage.usedSessions === "number" && typeof mainUsage.totalSessions === "number" ? `${mainUsage.usedSessions}/${mainUsage.totalSessions}` : undefined}
            >
              <UsageCard usage={mainUsage} />
            </CollapsibleSection>
          ) : null}

          <CollapsibleSection title="Pakiety" icon={<PackageIcon size={15} />}>
            <ClientPackagesSection key={`${basePath}:${clientId}`} embedded packages={billing.packages} activeClientPackageId={billing.activeClientPackageId} clientId={basePath === "/owner" ? clientId || undefined : undefined} onSaved={() => loadClientPayments(clientId, true)} />
          </CollapsibleSection>

          {clientId ? (
            <CollapsibleSection title="Usługi okresowe" icon={<CalendarRange size={15} />}>
              <ClientPeriodPackagesSection key={`period:${basePath}:${clientId}`} embedded clientId={clientId} portal={basePath === "/trainer" ? "trainer" : "owner"} packages={billing.packages} canManage={basePath === "/owner" && !client?.isArchived} onSaved={() => loadClientPayments(clientId, true)} onPayment={item => {
                if (mutationLock.current || isSaving || processingPaymentId !== null) return;
                setPaymentPackageId(String(item.clientPackageId)); setPaymentAmount(String(Math.max(item.amountDue, 0))); setPaymentDate(localToday()); setPaymentNote(""); setIsPaymentModalOpen(true);
              }} />
            </CollapsibleSection>
          ) : null}

          {basePath === "/owner" && clientId ? (
            <>
              <CollapsibleSection title="Zwroty" icon={<Banknote size={15} />} meta={refunds.length}>
                <ClientRefundsSection embedded refunds={refunds} loading={isLoading} onConfirm={setRefundToConfirm} />
              </CollapsibleSection>
              <CollapsibleSection title="Historia zmian" icon={<History size={15} />}>
                <ClientAuditSection key={clientId} embedded clientId={clientId} revision={auditRevision} />
              </CollapsibleSection>
            </>
          ) : null}
        </>
      ) : null}

      <PaymentEntryModal
        open={isPaymentModalOpen}
        eyebrow="Wpłata klienta"
        title="Dodaj wpłatę"
        description="Wybierz pakiet i wpisz kwotę. Po potwierdzeniu wpłaty nadpłata zasili saldo klienta."
        amount={paymentAmount}
        packageId={paymentPackageId}
        method={paymentMethod}
        note={paymentNote}
        paymentDate={paymentDate}
        onPaymentDateChange={setPaymentDate}
        packageOptions={clientPackageOptions}
        methodOptions={paymentMethodOptions}
        isSubmitting={isSaving}
        unresolved={paymentUnresolved}
        submitLabel="Dodaj wpłatę"
        submittingLabel="Dodawanie..."
        emptyPackagesMessage="Klient nie ma pakietu, do którego można przypisać wpłatę."
        notePlaceholder="Np. przelew za pakiet 8 treningów"
        onAmountChange={setPaymentAmount}
        onPackageChange={handlePaymentPackageChange}
        onMethodChange={setPaymentMethod}
        onNoteChange={setPaymentNote}
        onClose={() => { if (!mutationLock.current && !paymentIntent.current?.unresolved) { paymentIntent.current = null; setIsPaymentModalOpen(false); } }}
        onSubmit={handleCreatePayment}
      />
      {basePath === "/owner" ? <RefundConfirmationModal refund={refundToConfirm} submitting={isConfirmingRefund} onClose={() => setRefundToConfirm(null)} onConfirm={handleConfirmRefund} /> : null}

      {paymentAction ? (
        <PaymentActionConfirmModal
          payment={paymentAction.payment}
          processing={processingPaymentId === paymentAction.payment.id}
          {...getPaymentActionModalCopy(paymentAction.type)}
          onClose={() => { if (!mutationLock.current) setPaymentAction(null); }}
          onConfirm={async () => {
            if (paymentAction.type === "confirm") {
              await handleConfirmPayment(paymentAction.payment);
            }
            if (paymentAction.type === "issueReceipt") {
              await handleIssueReceipt(paymentAction.payment);
            }
            if (paymentAction.type === "cancelReceipt") {
              await handleCancelReceipt(paymentAction.payment);
            }
            setPaymentAction(null);
          }}
        />
      ) : null}

      {paymentToReverse ? (
        <PaymentReasonModal
          payment={paymentToReverse}
          title="Cofnąć wpłatę?"
          description="Podaj powód cofnięcia. System zapisze korektę zamiast usuwać historię płatności."
          reasonLabel="Powód cofnięcia"
          reason={reversalReason}
          placeholder="Np. błędnie zaksięgowana wpłata."
          confirmLabel="Cofnij wpłatę"
          processing={processingPaymentId === paymentToReverse.id}
          action="reverse"
          onReasonChange={setReversalReason}
          onClose={() => {
            setPaymentToReverse(null);
            setReversalReason("");
          }}
          onConfirm={handleReversePayment}
        />
      ) : null}

    </div>
  );
}

function getPaymentActionModalCopy(type: PaymentAction) {
  if (type === "issueReceipt") {
    return {
      title: "Wystawić paragon?",
      description:
        "Po potwierdzeniu płatność będzie oznaczona jako rozliczona fiskalnie.",
      confirmLabel: "Wystaw paragon",
      icon: "receipt" as const,
    };
  }

  if (type === "cancelReceipt") {
    return {
      title: "Cofnąć paragon?",
      description:
        "Status paragonu zostanie cofnięty, a przy płatności ponownie pojawi się możliwość wystawienia paragonu.",
      confirmLabel: "Cofnij paragon",
      tone: "danger" as const,
      icon: "receipt" as const,
    };
  }

  return {
    title: "Potwierdzić wpłatę?",
    description:
      "Wpłata zostanie zaksięgowana na wybranym pakiecie, a ewentualna nadpłata trafi na saldo klienta.",
    confirmLabel: "Potwierdź wpłatę",
    icon: "confirm" as const,
  };
}

function SubscriptionPanel({
  subscription,
  activePackage,
  isGroup,
  selectedPackageId,
  selectedNextPackageId,
  packageOptions,
  nextPackageOptions,
  clientLocationName,
  canAssignPackage,
  canSetNextPackage,
  isSaving,
  onPackageChange,
  onNextPackageChange,
  onAssignPackage,
  onSetNextPackage,
  onCancelAfterCycle,
  onResumeAutoRenew,
}: {
  subscription: ClientSubscription | null;
  activePackage: ClientPackageBilling | null;
  isGroup: boolean;
  selectedPackageId: string;
  selectedNextPackageId: string;
  packageOptions: Array<{ value: string; label: string }>;
  nextPackageOptions: Array<{ value: string; label: string }>;
  clientLocationName: string;
  canAssignPackage: boolean;
  canSetNextPackage: boolean;
  isSaving: boolean;
  onPackageChange: (value: string) => void;
  onNextPackageChange: (value: string) => void;
  onAssignPackage: () => void;
  onSetNextPackage: () => void;
  onCancelAfterCycle: () => void;
  onResumeAutoRenew: () => void;
}) {
  const cancelRequested = Boolean(subscription?.cancelRenewalRequested);
  const willRenew = Boolean(subscription?.autoRenewEnabled && !cancelRequested);
  const activePackageName =
    activePackage?.packageName || "Brak aktywnego pakietu";
  const amountDue = activePackage?.amountDue;
  const amountPaid = activePackage?.amountPaid;
  const currency = activePackage?.currency || "PLN";
  const totalSessions = activePackage?.totalSessions;
  const usedSessions = activePackage?.usedSessions;
  const progress = typeof totalSessions === "number" && totalSessions > 0 && typeof usedSessions === "number"
    ? Math.min(100, Math.round((usedSessions / totalSessions) * 100))
    : null;
  const hasActivePackage = Boolean(activePackage);
  const savedNextPackageId = subscription?.nextPackage?.packageId
    ? String(subscription.nextPackage.packageId)
    : "";
  const nextPackageUnchanged =
    Boolean(selectedNextPackageId) &&
    selectedNextPackageId === savedNextPackageId;
  const noPackagesInLocation = packageOptions.length <= 1;

  if (!hasActivePackage) {
    return (
      <section className="card-shell p-4 md:p-5">
        <PanelTitle icon={<PackagePlus size={15} />} title={canAssignPackage ? "Ustaw pakiet klienta" : "Brak aktywnego pakietu"}>
          {canAssignPackage ? `Pakiety dostępne w lokalizacji ${clientLocationName}.` : "Klient nie ma obecnie aktywnego pakietu indywidualnego. Pakiet może ustawić właściciel studia."}
        </PanelTitle>

        {canAssignPackage ? (
          <div className="mt-3 grid max-w-2xl gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
            <CustomSelect
              label="Pakiet"
              value={selectedPackageId}
              onChange={onPackageChange}
              options={packageOptions}
            />
            <button
              type="button"
              onClick={onAssignPackage}
              disabled={isSaving || !selectedPackageId || noPackagesInLocation}
              className={profilePrimaryActionClassName}
            >
              <PackagePlus size={15} />
              {isSaving ? "Ustawianie..." : "Ustaw pakiet"}
            </button>
          </div>
        ) : null}

        {canAssignPackage && noPackagesInLocation ? (
          <p className="mt-2 text-xs font-semibold text-warning-light">
            Brak aktywnych pakietów dla tej lokalizacji.
          </p>
        ) : null}
      </section>
    );
  }

  return (
    <section className="card-shell p-4 md:p-5">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div className="min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-muted">
                {isGroup ? "Pakiet grupowy" : "Aktualny pakiet"}
              </p>
              <h2 className="mt-0.5 break-words text-base font-semibold text-on-surface">
                {activePackageName}
              </h2>
            </div>
            <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
              <StatusPill label={getPackagePaymentStatusLabel(activePackage?.paymentStatus)} muted />
              <StatusPill label={typeof activePackage?.isActive === "boolean" ? activePackage.isActive ? "Aktywny" : "Nieaktywny" : "Niedostępne"} muted={activePackage?.isActive !== true} />
            </div>
          </div>
          {progress !== null ? (
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-container-high">
              <div className="h-full rounded-full bg-tertiary-light" style={{ width: `${progress}%` }} />
            </div>
          ) : null}
          <div className="mt-3 grid grid-cols-3 gap-2">
            <SmallMetric label="Wejścia" value={usedSessions !== undefined && totalSessions !== undefined ? `${usedSessions}/${totalSessions}` : "Niedostępne"} />
            <SmallMetric label="Zapłacono" value={formatMoney(amountPaid, currency)} />
            <SmallMetric label="Do zapłaty" value={formatMoney(amountDue, currency)} />
          </div>
        </div>

        {!isGroup && subscription ? (
          <div className="flex min-w-0 flex-col gap-3 border-t border-white/5 pt-3 lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-1.5">
                <p className="text-sm text-on-surface-variant">
                  Przedłużanie:{" "}
                  <span className={`font-semibold ${willRenew ? "text-tertiary-light" : "text-on-surface"}`}>
                    {willRenew ? "włączone" : "wyłączone"}
                  </span>
                </p>
                <HintIcon
                  label={willRenew
                    ? "Po wykorzystaniu aktualnego pakietu subskrypcja przedłuży się automatycznie."
                    : "Po wykorzystaniu aktualnego pakietu subskrypcja klienta zostanie zakończona."}
                />
              </div>
              {willRenew ? (
                <button type="button" onClick={onCancelAfterCycle} disabled={isSaving || !subscription} className={compactSecondaryClassName}>
                  Zakończ po pakiecie
                </button>
              ) : (
                <button type="button" onClick={onResumeAutoRenew} disabled={isSaving || !subscription} className={compactSecondaryClassName}>
                  Włącz przedłużanie
                </button>
              )}
            </div>

            {canSetNextPackage ? (
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-muted">Kolejny pakiet</p>
                  <HintIcon
                    label={willRenew
                      ? "Zostanie użyty po wykorzystaniu aktualnego pakietu."
                      : "Wybór zacznie obowiązywać po ponownym włączeniu przedłużania."}
                  />
                </div>
                <div className="mt-1.5 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                  <CustomSelect
                    value={selectedNextPackageId}
                    onChange={onNextPackageChange}
                    options={nextPackageOptions}
                  />
                  <button
                    type="button"
                    onClick={onSetNextPackage}
                    disabled={isSaving || !selectedNextPackageId || nextPackageUnchanged || noPackagesInLocation}
                    className={compactSecondaryClassName}
                  >
                    {nextPackageUnchanged ? "Zapisano" : "Zapisz"}
                  </button>
                </div>
                {noPackagesInLocation ? (
                  <p className="mt-1.5 text-xs text-warning-light">
                    Brak aktywnych pakietów dla lokalizacji {clientLocationName}.
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}

const compactSecondaryClassName = "inline-flex h-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-surface-container-low px-3 text-xs font-semibold text-primary-light transition hover:bg-surface-container-high disabled:cursor-not-allowed disabled:opacity-55 focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-primary)_35%,transparent)]";

function PanelTitle({ icon, title, children }: { icon: React.ReactNode; title: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-surface-container-lowest text-primary-light">
        {icon}
      </span>
      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-on-surface">{title}</h2>
        {children ? <p className="text-xs text-on-surface-muted">{children}</p> : null}
      </div>
    </div>
  );
}

function HintIcon({ label }: { label: string }) {
  return (
    <Tooltip label={label} align="start">
      <span tabIndex={0} className="inline-flex text-on-surface-muted transition hover:text-primary-light focus-visible:text-primary-light focus-visible:outline-none">
        <Info size={13} aria-hidden="true" />
        <span className="sr-only">{label}</span>
      </span>
    </Tooltip>
  );
}

function localToday() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
}

function localPaymentDateToIso(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (year < 1000) return null;
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  // The input is a local calendar day; serialize its local midnight as an instant.
  // Do not parse YYYY-MM-DD directly, which would interpret it as UTC.
  return date.toISOString();
}

function UsageCard({ usage }: { usage: SubscriptionUsage | null }) {
  const [showAllSessions, setShowAllSessions] = useState(false);
  const totalSessions = usage?.totalSessions;
  const usedSessions = usage?.usedSessions;
  const progress = typeof totalSessions === "number" && totalSessions > 0 && typeof usedSessions === "number"
    ? Math.min(100, Math.round((usedSessions / totalSessions) * 100))
    : null;
  const allSessions = [...(usage?.sessions || [])].sort(
    (first, second) =>
      new Date(second.date).getTime() - new Date(first.date).getTime(),
  );
  const sessions = showAllSessions ? allSessions : allSessions.slice(0, 3);
  const hiddenSessionsCount = Math.max(allSessions.length - sessions.length, 0);

  if (!usage?.clientPackageId) {
    return <EmptyState label="Brak aktywnego pakietu do policzenia wykorzystania." />;
  }

  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm text-on-surface-variant">
          Użyte wejścia: <span className="font-semibold text-on-surface">{usedSessions ?? "—"}/{totalSessions ?? "—"}</span>
        </p>
        <p className="text-xs font-semibold text-tertiary-light">
          zostało {usage.remainingSessions ?? "—"}
        </p>
      </div>
      {progress !== null ? (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-container-high">
          <div className="h-full rounded-full bg-tertiary-light" style={{ width: `${progress}%` }} />
        </div>
      ) : null}

      <div className="mt-3 grid grid-cols-3 gap-2">
        <SmallMetric label="Planowany typ" value={userTrainingType(usage.expectedBillingType, "Brak danych")} />
        <SmallMetric label="Inny typ" value={String(usage.differentThanExpectedCount)} />
        <SmallMetric label="Suma korekt" value={formatMoney(usage.adjustmentsTotal, "PLN")} />
      </div>

      {sessions.length > 0 ? (
        <div className="mt-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-muted">
              Treningi rozliczone z pakietu
            </p>
            <p className="text-[11px] text-on-surface-muted">
              {sessions.length} z {allSessions.length}
            </p>
          </div>
          <ul className="mt-1.5 flex flex-col gap-1">
            {sessions.map((session) => (
              <li
                key={session.sessionId}
                className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] bg-surface-container-low px-3 py-1.5 text-xs"
              >
                <span className="min-w-0">
                  <span className="font-semibold text-on-surface">{formatDate(session.date)}</span>
                  <span className="ml-2 text-on-surface-muted">
                    {userTrainingType(session.plannedBillingType, "brak danych")} → {userTrainingType(session.actualBillingType, "brak danych")}
                  </span>
                </span>
                <span className="shrink-0 text-on-surface-muted">{formatMoney(session.balanceDifference, "PLN")}</span>
              </li>
            ))}
          </ul>
          {allSessions.length > 3 ? (
            <button
              type="button"
              onClick={() => setShowAllSessions((current) => !current)}
              className="mt-2 text-xs font-semibold text-primary-light hover:underline"
            >
              {showAllSessions
                ? "Pokaż mniej"
                : `Pokaż wszystkie (${hiddenSessionsCount} więcej)`}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function getCreatedPaymentMessage(payment: ClientPayment) {
  const breakdown = payment;

  if (isPendingPayment(payment)) {
    return "Wpłata została dodana i oczekuje na potwierdzenie.";
  }

  if (isConfirmedPayment(payment)) {
    if (breakdown.balanceCreditAmount > 0) {
      return `Wpłata rozliczona: ${formatMoney(
        breakdown.appliedToPackageAmount,
        payment.currency,
      )} na pakiet i ${formatMoney(
        breakdown.balanceCreditAmount,
        payment.currency,
      )} na saldo.`;
    }

    return "Wpłata została dodana i rozliczona.";
  }

  return "Wpłata została dodana.";
}

function StatusPill({ label, muted }: { label: string; muted?: boolean }) {
  return (
    <span
      className={[
        "rounded-full px-2 py-0.5 text-[10px] font-semibold",
        muted
          ? "bg-surface-container text-on-surface-muted"
          : "bg-tertiary-light/15 text-tertiary-light",
      ].join(" ")}
    >
      {label}
    </span>
  );
}

function SmallMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-[var(--radius-md)] bg-surface-container-lowest px-2.5 py-1.5">
      <p className="truncate text-[10px] font-semibold uppercase tracking-wider text-on-surface-muted">
        {label}
      </p>
      <p className="mt-0.5 truncate text-sm font-semibold text-on-surface">{value}</p>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-[var(--radius-md)] bg-surface-container-low px-3 py-4 text-sm text-on-surface-variant">
      {label}
    </div>
  );
}

function packageMatchesClientLocation(
  item: Package,
  clientLocationId: number,
) {
  if (!clientLocationId) return false;

  return (
    item.locationId === clientLocationId ||
    Boolean(item.locationIds?.includes(clientLocationId))
  );
}

function formatMoney(amount: number | null | undefined, currency?: string | null) {
  if (typeof amount !== "number" || !Number.isFinite(amount)) return "Niedostępne";
  return `${amount.toLocaleString("pl-PL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency || "PLN"}`;
}

function formatDate(value?: string | null) {
  if (!value) return "Brak daty";

  return new Intl.DateTimeFormat("pl-PL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}
