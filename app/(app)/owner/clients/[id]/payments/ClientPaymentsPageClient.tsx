"use client";

import { userTrainingType } from "@/app/lib/user-messages";

import { useSessionCorrectionRevision } from "@/app/lib/session-corrections";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  PackagePlus,
  ReceiptText,
  RefreshCw,
  WalletCards,
} from "lucide-react";
import { PaymentActionConfirmModal } from "@/app/components/payments/PaymentActionConfirmModal";
import { PaymentEntryModal } from "@/app/components/payments/PaymentEntryModal";
import { PaymentPagination } from "@/app/components/payments/PaymentPagination";
import { PaymentsList } from "@/app/components/payments/PaymentsList";
import { PaymentReasonModal } from "@/app/components/payments/PaymentReasonModal";
import { Button } from "@/app/components/ui/button";
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
  createClientPayment,
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
  getTrainerPortalMe,
  getTrainerPortalPendingPayments,
  resumeTrainerPortalClientSubscription,
  setTrainerPortalClientNextPackage,
} from "@/app/lib/trainer/portal";
import { getTrainerPackages } from "@/app/lib/trainer/packages";
import { trainerPaymentError } from "@/app/lib/trainer/payment-errors";
import { trainerPortalClientToClient } from "@/app/lib/trainer/portal-mappers";
import ClientPackagesSection from "../components/ClientPackagesSection";
import ClientAuditSection from "../components/ClientAuditSection";
import ClientRefundsSection from "../components/ClientRefundsSection";
import RefundConfirmationModal from "../components/RefundConfirmationModal";

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
  const loadRevision = useRef(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [subscriptionError, setSubscriptionError] = useState<string | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [confirmablePaymentIds, setConfirmablePaymentIds] = useState<Set<number>>(new Set());
  const [pendingPaymentsError, setPendingPaymentsError] = useState<string | null>(null);
  const [usageError, setUsageError] = useState<string | null>(null);
  const correctionRevision = useSessionCorrectionRevision();
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
  const [reversalReason, setReversalReason] = useState("");
  useEffect(() => {
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

    return () => { window.clearTimeout(timer); loadRevision.current += 1; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientIdParam, correctionRevision]);

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
        getClientBilling(id),
        getClientSubscription(id),
        getPackages(),
        getClientSubscriptionUsage(id).catch(() => null),
        getClientPayments(id, { page: 1, pageSize: 1000 }),
        getClientRefunds(id, { page: 1, pageSize: 25 }),
      ]);

      setClient(clientData);
      setRefunds(refundsData.items || []);
      setBilling(billingData);
      setSubscription(subscriptionData);
      setUsage(usageData);
      setClientPayments(billingData.payments || paymentsData.items || []);
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
    const [clientData, meData] = await Promise.all([
      getTrainerPortalClient(id), getTrainerPortalMe().catch(() => null),
    ]);
    const [billingResult, subscriptionResult, usageResult, catalogResult, pendingResult] = await Promise.allSettled([
      getTrainerPortalClientBilling(id),
      getTrainerPortalClientSubscription(id),
      getTrainerPortalClientSubscriptionUsage(id),
      getTrainerPackages(),
      getTrainerPortalPendingPayments(),
    ]);
    if (revision !== loadRevision.current) return;
    if (billingResult.status === "rejected") throw billingResult.reason;
    const billingData = billingResult.value;
    const subscriptionData = subscriptionResult.status === "fulfilled" ? subscriptionResult.value : null;
    const mappedClient = trainerPortalClientToClient(clientData, meData);
    setSubscriptionError(subscriptionResult.status === "rejected" ? trainerPaymentError(subscriptionResult.reason, "Nie udało się pobrać odnowień pakietu.") : null);
    setUsageError(usageResult.status === "rejected" ? trainerPaymentError(usageResult.reason, "Nie udało się pobrać wykorzystania pakietu.") : null);
    setCatalogError(catalogResult.status === "rejected" ? trainerPaymentError(catalogResult.reason, "Nie udało się pobrać oferty pakietów. Odśwież widok, aby wybrać kolejny pakiet.") : null);
    setConfirmablePaymentIds(new Set(pendingResult.status === "fulfilled" ? pendingResult.value.map((payment) => payment.id) : []));
    setPendingPaymentsError(pendingResult.status === "rejected" ? trainerPaymentError(pendingResult.reason, "Nie udało się sprawdzić wpłat oczekujących. Odśwież widok przed potwierdzeniem wpłaty.") : null);
    setClient(mappedClient);
    setBilling(billingData);
    setSubscription(subscriptionData);
    setUsage(usageResult.status === "fulfilled" ? usageResult.value : null);
    setClientPayments(billingData.payments || []);
    setPaymentPage(1);
    setPackages(catalogResult.status === "fulfilled" ? catalogResult.value.filter((item) => item.isActive && packageMatchesClientLocation(item, mappedClient.locationId)) : []);
    setPaymentAmount(typeof billingData.activePackageAmountDue === "number" ? String(Math.max(billingData.activePackageAmountDue, 0)) : "");
    setPaymentPackageId(billingData.activeClientPackageId ? String(billingData.activeClientPackageId) : "");
    setSelectedPackageId("");
    setSelectedNextPackageId(subscriptionData?.nextPackage?.packageId ? String(subscriptionData.nextPackage.packageId) : "");
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
    if (!clientId || !selectedPackageId || basePath !== "/owner") return;

    const selectedPackage = packages.find(
      (item) => item.id === Number(selectedPackageId),
    );

    if (!selectedPackage || selectedPackage.billingType === 5) {
      showOwnerError(new Error("Wybierz pakiet indywidualny z lokalizacji klienta."), "", {
        id: "owner-client-package-location-required",
      });
      return;
    }

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
        expectedBillingType: selectedPackage.billingType || 1,
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
      setIsSaving(false);
    }
  }

  async function handleSetNextPackage() {
    if (!clientId || !selectedNextPackageId || mutationLock.current || isLoading || (basePath === "/trainer" && (!subscription || catalogError))) return;

    const selectedPackage = packages.find(
      (item) => item.id === Number(selectedNextPackageId),
    );

    if (!selectedPackage || selectedPackage.billingType === 5) {
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

      setSubscription(data);
      await loadClientPayments(clientId);
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
      setSubscription(data);
      await loadClientPayments(clientId);
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
      setSubscription(data);
      await loadClientPayments(clientId);
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

    mutationLock.current = true;
    try {
      setIsSaving(true);
      const paymentPayload = {
        clientId,
        clientPackageId: Number(paymentPackageId),
        amount,
        method: Number(paymentMethod) as PaymentMethod,
        paymentDate: new Date().toISOString(),
        note: paymentNote.trim() || null,
      };
      const createdPayment =
        basePath === "/trainer"
          ? await createTrainerPortalClientPayment(clientId, paymentPayload)
          : await createClientPayment(paymentPayload);

      showOwnerSuccess(getCreatedPaymentMessage(createdPayment), {
        id: "owner-client-payment-created",
      });
      setPaymentNote("");
      setIsPaymentModalOpen(false);
      await loadClientPayments(clientId);
    } catch (err) {
      showOwnerError(basePath === "/trainer" ? new Error(trainerPaymentError(err, "Nie udało się zapisać zmian. Spróbuj ponownie.")) : err, "Nie udało się dodać wpłaty.", {
        id: "owner-client-payment-create-error",
      });
    } finally {
      mutationLock.current = false;
      setIsSaving(false);
    }
  }

  async function handleConfirmPayment(payment: ClientPayment) {
    if (!clientId || mutationLock.current || isLoading || !billing || loadError) return;

    if (basePath === "/trainer" && !confirmablePaymentIds.has(payment.id)) return;

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
      showOwnerSuccess("Wpłata została potwierdzona.", {
        id: `owner-client-payment-confirmed-${payment.id}`,
      });
      await loadClientPayments(clientId);
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
      ...packages.map((item) => ({
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
  const mainPackage = packagesBilling.find((item) => item.clientPackageId === billing?.activeClientPackageId) || null;
  const mainUsage = usage?.clientPackageId === mainPackage?.clientPackageId ? usage : null;
  const mainSubscription = subscription;
  const activeCurrency = mainPackage?.currency || "PLN";
  const nextPackageOptions = [{ value: "", label: "Wybierz pakiet" }, ...packages.filter((item) => item.billingType !== 5).map((item) => ({ value: String(item.id), label: item.name }))];
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
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-5 pb-10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Link
            href={clientId ? `${basePath}/clients/${clientId}` : `${basePath}/clients`}
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary-light"
          >
            <ArrowLeft size={18} />
            Karta klienta
          </Link>
          <h1 className="mt-4 font-display text-[2.25rem] font-semibold leading-[0.95] tracking-tight">
            Płatności klienta
          </h1>
          <p className="mt-3 text-on-surface-variant">
            {client?.fullName || billing?.clientName || "Ładowanie klienta..."}
          </p>
        </div>

        <Button
          variant="secondary"
          icon={
            <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
          }
          onClick={() => loadClientPayments()}
          disabled={isLoading || isSaving || processingPaymentId !== null || !clientId}
        >
          Odśwież
        </Button>
      </div>

      {isLoading ? (
        <div className="card-shell p-6 text-on-surface-variant">
          Ładowanie płatności klienta...
        </div>
      ) : null}

      {!isLoading && loadError ? <div role="alert" className="card-shell p-5 text-on-surface-variant">{loadError}</div> : null}

      {billing && !isLoading && !(basePath === "/trainer" && loadError) ? (
        <>
          <section className="grid gap-3 md:grid-cols-4">
            <BillingStat
              label="Łącznie do zapłaty"
              value={typeof billing.totalAmountDue === "number" ? formatMoney(billing.totalAmountDue, activeCurrency) : "Niedostępne"}
              icon={<WalletCards size={18} />}
            />
            <BillingStat
              label="Bieżący pakiet indywidualny"
              value={billing.activeClientPackageId ? billing.activePackageName || "Brak nazwy" : "Brak"}
              icon={<PackagePlus size={18} />}
            />
            <BillingStat
              label="Saldo do wykorzystania"
              value={formatMoney(billing.currentBalance, activeCurrency)}
              icon={<WalletCards size={18} />}
            />
            <BillingStat
              label="Automatyczne przedłużanie"
              value={subscription ? subscription.autoRenewEnabled && !subscription.cancelRenewalRequested ? "Włączone" : "Wyłączone" : "Niedostępne"}
              icon={<RefreshCw size={18} />}
            />
          </section>

          <ClientPackagesSection key={`${basePath}:${clientId}`} packages={billing.packages} activeClientPackageId={billing.activeClientPackageId} clientId={basePath === "/owner" ? clientId || undefined : undefined} onSaved={() => loadClientPayments(clientId, true)} />
          {basePath === "/owner" && clientId ? <><ClientRefundsSection refunds={refunds} loading={isLoading} onConfirm={setRefundToConfirm} /><ClientAuditSection key={clientId} clientId={clientId} revision={auditRevision} /></> : null}

          <section className="grid gap-5">
            <div className="card-shell flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between md:p-5">
              <div>
                <p className="text-section-title">Wpłaty klienta</p>
                <p className="mt-2 max-w-[720px] text-sm leading-6 text-on-surface-variant">
                  Dodaj wpłatę do konkretnego pakietu. Jeśli kwota jest większa
                  niż należność za pakiet, po potwierdzeniu wpłaty nadpłata zasili saldo klienta.
                </p>
                {!packagesBilling.length ? (
                  <p className="mt-3 text-sm font-semibold text-warning-light">
                    Najpierw przypisz klientowi pakiet, żeby dodać wpłatę.
                  </p>
                ) : null}
              </div>
              <Button
                size="lg"
                icon={<ReceiptText size={17} />}
                onClick={() => setIsPaymentModalOpen(true)}
                disabled={isSaving || processingPaymentId !== null || isLoading || packagesBilling.length === 0}
                className="w-full md:w-auto"
              >
                Dodaj wpłatę
              </Button>
            </div>

            <div className="overflow-hidden rounded-[var(--radius-xl)] bg-surface-container-low shadow-soft">
              <div className="flex flex-col gap-2 px-4 py-5 sm:flex-row sm:items-end sm:justify-between md:px-5">
                <div>
                  <p className="text-section-title">Historia wpłat</p>
                  <p className="mt-2 text-sm text-on-surface-variant">
                    Kwota, sposób rozliczenia i najważniejsze akcje w jednym
                    wierszu.
                  </p>
                </div>
                <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-muted">
                  {payments.length} {payments.length === 1 ? "płatność" : "płatności"}
                </p>
              </div>

              {pendingPaymentsError ? <p role="alert" className="px-5 pb-4 text-sm text-on-surface-variant">{pendingPaymentsError}</p> : null}
              <PaymentsList
                payments={visiblePayments}
                isLoading={false}
                processingId={processingPaymentId}
                showClient={false}
                canConfirm={basePath === "/trainer" ? (payment) => confirmablePaymentIds.has(payment.id) : undefined}
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
            </div>
          </section>

          <section
            className={
              mainUsage
                ? "grid gap-5 xl:grid-cols-[0.9fr_1.1fr]"
                : "grid gap-5"
            }
          >
            {mainUsage ? <UsageCard usage={mainUsage} /> : null}

            <div className="grid min-w-0 gap-5">
                {catalogError ? <div role="alert" className="card-shell p-4 text-on-surface-variant">{catalogError}</div> : null}
                {usageError ? <div role="alert" className="card-shell p-4 text-on-surface-variant">{usageError}</div> : null}
                {subscriptionError ? <div role="alert" className="card-shell p-4 text-on-surface-variant">{subscriptionError}</div> : <SubscriptionPanel
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
            </div>
          </section>
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
        packageOptions={clientPackageOptions}
        methodOptions={paymentMethodOptions}
        isSubmitting={isSaving}
        submitLabel="Dodaj wpłatę"
        submittingLabel="Dodawanie..."
        emptyPackagesMessage="Klient nie ma pakietu, do którego można przypisać wpłatę."
        notePlaceholder="Np. przelew za pakiet 8 treningów"
        onAmountChange={setPaymentAmount}
        onPackageChange={handlePaymentPackageChange}
        onMethodChange={setPaymentMethod}
        onNoteChange={setPaymentNote}
        onClose={() => { if (!mutationLock.current) setIsPaymentModalOpen(false); }}
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

  if (!hasActivePackage) {
    return (
      <section className="card-shell flex min-h-[360px] flex-col items-center justify-center p-6 text-center md:p-10">
        <div className="flex h-16 w-16 items-center justify-center rounded-[var(--radius-xl)] bg-primary/15 text-primary-light">
          <PackagePlus size={28} />
        </div>
        <p className="mt-5 text-section-title">{canAssignPackage ? "Ustaw pakiet klienta" : "Brak aktywnego pakietu"}</p>
        <p className="mt-3 max-w-[560px] text-sm leading-6 text-on-surface-variant">
          {canAssignPackage ? "Wybierz pakiet dostępny w lokalizacji " + clientLocationName + "." : "Klient nie ma obecnie aktywnego pakietu indywidualnego."}
        </p>

        {canAssignPackage ? (
          <div className="mt-7 grid w-full max-w-[680px] gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <CustomSelect
              label="Pakiet"
              value={selectedPackageId}
              onChange={onPackageChange}
              options={packageOptions}
            />
            <Button
              icon={<PackagePlus size={16} />}
              onClick={onAssignPackage}
              disabled={
                isSaving || !selectedPackageId || packageOptions.length <= 1
              }
              className="w-full sm:w-auto"
            >
              {isSaving ? "Ustawianie..." : "Ustaw pakiet"}
            </Button>
          </div>
        ) : (
          <p className="mt-6 text-sm font-semibold text-on-surface-muted">
            Pakiet może ustawić właściciel studia.
          </p>
        )}

        {canAssignPackage && packageOptions.length <= 1 ? (
          <p className="mt-4 text-sm font-semibold text-warning-light">
            Brak aktywnych pakietów dla tej lokalizacji.
          </p>
        ) : null}
      </section>
    );
  }

  return (
    <section className="card-shell p-4 md:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-section-title">{isGroup ? "Pakiet grupowy" : "Pakiet indywidualny"}</p>
          <p className="mt-2 text-sm text-on-surface-variant">
            Aktualny pakiet, wykorzystanie wejść i status płatności.
          </p>
        </div>
        <StatusPill label={typeof activePackage?.isActive === "boolean" ? activePackage.isActive ? "Aktywny" : "Nieaktywny" : "Niedostępne"} muted />
      </div>

      <div className={`mt-4 grid gap-3 ${!isGroup && subscription ? "lg:grid-cols-2" : ""}`}>
        <div className="rounded-[var(--radius-lg)] border border-white/5 bg-surface-container-low p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-label text-on-surface-muted">Aktualny pakiet</p>
              <h3 className="mt-2 text-xl font-semibold text-on-surface">
                {activePackageName}
              </h3>
            </div>
            <StatusPill
              label={getPackagePaymentStatusLabel(activePackage?.paymentStatus)}
              muted
            />
          </div>
          {progress !== null ? <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface-container-high">
            <div
              className="h-full rounded-full bg-tertiary-light"
              style={{ width: `${progress}%` }}
            />
          </div> : null}
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <SmallMetric label="Wejścia" value={usedSessions !== undefined && totalSessions !== undefined ? `${usedSessions}/${totalSessions}` : "Niedostępne"} />
            <SmallMetric label="Zapłacono" value={formatMoney(amountPaid, currency)} />
            <SmallMetric label="Do zapłaty" value={formatMoney(amountDue, currency)} />
          </div>
        </div>

        {!isGroup && subscription ? (
          <div className="rounded-[var(--radius-lg)] border border-white/5 bg-surface-container-low p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-label text-on-surface-muted">
                  Automatyczne przedłużanie
                </p>
                <h3 className="mt-2 text-xl font-semibold text-on-surface">
                  {willRenew ? "Włączone" : "Wyłączone"}
                </h3>
              </div>
              <StatusPill
                label={willRenew ? "Odnowienie" : "Zakończenie"}
                muted={!willRenew}
              />
            </div>
            <p className="mt-3 text-sm leading-5 text-on-surface-variant">
              {willRenew
                ? "Po wykorzystaniu aktualnego pakietu system przedłuży subskrypcję automatycznie."
                : "Po wykorzystaniu aktualnego pakietu subskrypcja klienta zostanie zakończona."}
            </p>
            <div className="mt-4">
              {willRenew ? (
                <Button
                  variant="outline"
                  onClick={onCancelAfterCycle}
                  disabled={isSaving || !subscription}
                >
                  Zakończ po pakiecie
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  onClick={onResumeAutoRenew}
                  disabled={isSaving || !subscription}
                >
                  Włącz automatyczne przedłużanie
                </Button>
              )}
            </div>
          </div>
        ) : null}
      </div>

      {canSetNextPackage && !isGroup && subscription ? (
        <div className="mt-3 rounded-[var(--radius-lg)] border border-white/5 bg-surface-container-lowest/50 p-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-on-surface-variant">
                Kolejny pakiet
              </p>
              <p className="mt-1 text-xs leading-5 text-on-surface-muted">
                {willRenew
                  ? "Zostanie użyty po wykorzystaniu aktualnego pakietu."
                  : "Wybór zacznie obowiązywać po ponownym włączeniu automatycznego przedłużania."}
              </p>
            </div>
            <div className="grid w-full shrink-0 gap-2 sm:grid-cols-[minmax(0,280px)_auto] md:w-auto">
              <CustomSelect
                value={selectedNextPackageId}
                onChange={onNextPackageChange}
                options={nextPackageOptions}
              />
              <Button
                variant="outline"
                onClick={onSetNextPackage}
                disabled={
                  isSaving ||
                  !selectedNextPackageId ||
                  nextPackageUnchanged ||
                  packageOptions.length <= 1
                }
              >
                {nextPackageUnchanged ? "Zapisano" : "Zapisz"}
              </Button>
            </div>
          </div>
          {packageOptions.length <= 1 ? (
            <p className="mt-2 text-xs text-warning-light">
              Brak aktywnych pakietów dla lokalizacji {clientLocationName}.
            </p>
          ) : null}
        </div>
      ) : null}

    </section>
  );
}

function BillingStat({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="card-shell flex items-center justify-between gap-4 p-5">
      <div className="min-w-0">
        <p className="text-label text-on-surface-muted">{label}</p>
        <p className="mt-3 truncate text-xl font-semibold text-on-surface">
          {value}
        </p>
      </div>
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-lg)] bg-primary/15 text-primary-light">
        {icon}
      </div>
    </div>
  );
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

  return (
    <section className="card-shell p-4 md:p-5">
      <p className="text-section-title">Wykorzystanie pakietu</p>
      {usage?.clientPackageId ? (
        <>
          <div className="mt-4 rounded-[var(--radius-lg)] bg-surface-container-low p-4">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-label text-on-surface-muted">
                  Użyte wejścia
                </p>
                <p className="mt-2 text-2xl font-semibold text-on-surface">
                  {usedSessions ?? "—"}/{totalSessions ?? "—"}
                </p>
              </div>
              <p className="text-sm font-semibold text-tertiary-light">
                zostało {usage.remainingSessions ?? "—"}
              </p>
            </div>
            {progress !== null ? <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface-container-high">
              <div
                className="h-full rounded-full bg-tertiary-light"
                style={{ width: `${progress}%` }}
              />
            </div> : null}
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2">
            <SmallMetric
              label="Planowany typ"
              value={userTrainingType(usage.expectedBillingType, "Brak danych")}
            />
            <SmallMetric
              label="Inny typ"
              value={String(usage.differentThanExpectedCount)}
            />
            <SmallMetric
              label="Suma korekt"
              value={formatMoney(usage.adjustmentsTotal, "PLN")}
            />
          </div>

          {sessions.length > 0 ? (
            <div className="mt-4 flex flex-col gap-2">
              <div className="flex items-center justify-between gap-3">
                <p className="text-label text-on-surface-muted">
                  Różnice w pakiecie
                </p>
                <p className="text-xs font-semibold text-on-surface-muted">
                  {sessions.length} z {allSessions.length}
                </p>
              </div>
              {sessions.map((session) => (
                <div
                  key={session.sessionId}
                  className="rounded-[var(--radius-md)] bg-surface-container-low px-3 py-2 text-sm"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-on-surface">
                      {formatDate(session.date)}
                    </p>
                    <p className="text-xs text-on-surface-muted">
                      {formatMoney(session.balanceDifference, "PLN")}
                    </p>
                  </div>
                  <p className="mt-1 text-xs text-on-surface-variant">
                    Plan: {userTrainingType(session.plannedBillingType, "brak danych")} · Faktycznie:{" "}
                    {userTrainingType(session.actualBillingType, "brak danych")}
                  </p>
                </div>
              ))}
              {allSessions.length > 3 ? (
                <button
                  type="button"
                  onClick={() => setShowAllSessions((current) => !current)}
                  className="mt-1 h-10 rounded-[var(--radius-md)] border border-secondary px-3 text-xs font-semibold text-primary-light transition hover:border-primary-light hover:bg-surface-container-high"
                >
                  {showAllSessions
                    ? "Pokaż mniej"
                    : `Pokaż wszystkie (${hiddenSessionsCount} więcej)`}
                </button>
              ) : null}
            </div>
          ) : null}
        </>
      ) : (
        <EmptyState label="Brak aktywnego pakietu do policzenia wykorzystania." />
      )}
    </section>
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
        "rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider",
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
    <div className="rounded-[var(--radius-md)] bg-surface-container-lowest px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-muted">
        {label}
      </p>
      <p className="mt-1 truncate font-semibold text-on-surface">{value}</p>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-[var(--radius-lg)] bg-surface-container-low p-6 text-center text-on-surface-variant">
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
