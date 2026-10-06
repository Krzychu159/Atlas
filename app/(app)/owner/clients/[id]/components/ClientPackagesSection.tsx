"use client";

import { useMemo, useState } from "react";
import { CalendarDays, Dumbbell, MapPin, UsersRound } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { getPackageClosureLabel, getPackageOriginLabel, getPackagePaymentStatusLabel, type ClientPackageBilling } from "@/app/lib/owner/billing";
import { formatMoney } from "@/app/lib/formatters/money";
import { userTrainingType } from "@/app/lib/user-messages";
import PackageManagementModal from "./PackageManagementModal";
import ImportClientPackageModal from "./ImportClientPackageModal";

export function isGroupClientPackage(
  packageData: Pick<ClientPackageBilling, "packageType" | "expectedBillingType">,
) {
  return getClientPackageKind(packageData) === "group";
}

function getClientPackageKind(
  packageData: Pick<ClientPackageBilling, "packageType" | "expectedBillingType">,
) {
  const packageType = packageData.packageType?.trim().toLowerCase();

  if (packageType) {
    return packageType.includes("group") ? "group" : "main";
  }
  if (
    packageData.expectedBillingType === null ||
    packageData.expectedBillingType === undefined ||
    packageData.expectedBillingType === ""
  ) {
    return "unknown";
  }

  const billingType = String(packageData.expectedBillingType)
    .trim()
    .toLowerCase();

  return billingType === "5" || billingType.includes("group")
    ? "group"
    : "main";
}

export function getClientGroupLocationNames(
  packages: ClientPackageBilling[] | null | undefined,
  mainLocationName?: string | null,
) {
  const normalizedMainLocation = normalizeLocation(mainLocationName);

  return Array.from(
    new Set(
      (packages || [])
        .filter((item) => item.isActive && isGroupClientPackage(item))
        .map((item) => item.locationName?.trim() || "")
        .filter(
          (name) =>
            Boolean(name) && normalizeLocation(name) !== normalizedMainLocation,
        ),
    ),
  );
}

export default function ClientPackagesSection({
  packages,
  activeClientPackageId,
  clientId,
  onSaved,
  audience = "staff",
}: {
  packages: ClientPackageBilling[] | null | undefined;
  activeClientPackageId?: number | null;
  clientId?: number;
  onSaved?: () => Promise<void>;
  audience?: "staff" | "client";
}) {
  const [managedPackage, setManagedPackage] = useState<ClientPackageBilling | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [highlightedId, setHighlightedId] = useState<number | null>(null);
  const [visibleCount, setVisibleCount] = useState(6);
  const sortedPackages = useMemo(
    () =>
      [...(packages || [])].sort(
        (first, second) =>
          getTime(second.purchaseDate) - getTime(first.purchaseDate),
      ),
    [packages],
  );
  const mainPackage = sortedPackages.find((item) => item.clientPackageId === activeClientPackageId);
  const groupPackages = sortedPackages.filter(isGroupClientPackage);
  const history = sortedPackages.filter((item) => item !== mainPackage && !isGroupClientPackage(item));
  const visiblePackages = history.slice(0, Math.max(visibleCount, history.findIndex((item) => item.clientPackageId === highlightedId) + 1));

  async function handleSaved(clientPackageId?: number) {
    if (clientPackageId !== undefined) setHighlightedId(clientPackageId);
    await onSaved?.();
  }

  return (
    <section className="card-shell p-5 md:p-6">
      <div>
        <p className="text-label text-on-surface-muted">{audience === "client" ? "Twoje pakiety" : "Pakiety klienta"}</p>
        <h2 className="mt-2 font-display text-[1.65rem] font-semibold leading-tight">
          Pakiet indywidualny
        </h2>
      </div>
      {clientId && onSaved ? <Button variant="secondary" className="mt-4 w-full sm:w-auto" onClick={() => setIsImportOpen(true)}>Wprowadź trwający pakiet</Button> : null}

      {mainPackage ? <div className="mt-5"><ClientPackageCard packageData={mainPackage} highlighted={mainPackage.clientPackageId === highlightedId} onManage={clientId && onSaved ? () => setManagedPackage(mainPackage) : undefined} /></div> : <p className="mt-4 text-sm text-on-surface-variant">{audience === "client" ? "Nie masz bieżącego pakietu indywidualnego. Twoje pakiety grupowe pozostają dostępne niezależnie." : "Klient nie ma bieżącego pakietu indywidualnego. Pakiety grupowe pozostają dostępne niezależnie."}</p>}
      <h2 className="mt-6 text-section-title">Pakiety grupowe</h2>
      {groupPackages.length ? <div className="mt-4 grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">{groupPackages.map((item) => <ClientPackageCard key={item.clientPackageId} packageData={item} highlighted={item.clientPackageId === highlightedId} onManage={clientId && onSaved ? () => setManagedPackage(item) : undefined} />)}</div> : <p className="mt-4 text-sm text-on-surface-variant">Brak pakietów grupowych.</p>}
      <h2 className="mt-6 text-section-title">Pozostałe pakiety indywidualne</h2>

      {packages === undefined ? (
        <div className="mt-5 rounded-[var(--radius-lg)] bg-surface-container-lowest p-4 text-sm text-on-surface-variant">
          Dane pakietów są obecnie niedostępne.
        </div>
      ) : visiblePackages.length ? (
        <>
          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visiblePackages.map((packageData) => (
              <ClientPackageCard
                key={packageData.clientPackageId}
                packageData={packageData}
                highlighted={packageData.clientPackageId === highlightedId}
                onManage={clientId && onSaved ? () => setManagedPackage(packageData) : undefined}
              />
            ))}
          </div>
          {visiblePackages.length < history.length ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="mt-4"
              onClick={() => setVisibleCount((current) => current + 6)}
            >
              Pokaż więcej
            </Button>
          ) : null}
        </>
      ) : (
        <div className="mt-5 rounded-[var(--radius-lg)] bg-surface-container-lowest p-4 text-sm text-on-surface-variant">
          Brak pozostałych pakietów indywidualnych.
        </div>
      )}
      {managedPackage && clientId && onSaved ? <PackageManagementModal key={managedPackage.clientPackageId} clientId={clientId} packageData={managedPackage} onClose={() => setManagedPackage(null)} onSaved={handleSaved} /> : null}
      {clientId && onSaved ? <ImportClientPackageModal key={clientId} open={isImportOpen} clientId={clientId} onClose={() => setIsImportOpen(false)} onSaved={handleSaved} /> : null}
    </section>
  );
}

function ClientPackageCard({
  packageData,
  onManage,
  highlighted = false,
}: {
  packageData: ClientPackageBilling;
  onManage?: () => void;
  highlighted?: boolean;
}) {
  const packageKind = getClientPackageKind(packageData);
  const isGroup = packageKind === "group";

  return (
    <article className={`min-w-0 rounded-[var(--radius-lg)] bg-surface-container-lowest p-4 ${highlighted ? "ring-2 ring-primary-light" : ""}`}>
      {highlighted ? <p role="status" className="mb-3 text-xs font-semibold text-primary-light">Ostatnio zapisany pakiet</p> : null}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-container-low px-2.5 py-1 text-[10px] font-semibold text-primary-light">
            {isGroup ? <UsersRound size={12} /> : <Dumbbell size={12} />}
            {packageKind === "group"
              ? "Grupowy"
              : packageKind === "main"
                ? "Indywidualny / semi"
                : "Typ nieokreślony"}
          </span>
          <h3 className="mt-3 break-words text-base font-semibold">
            {packageData.packageName || "Pakiet bez nazwy"}
          </h3>
        </div>
        <span className="shrink-0 rounded-full bg-tertiary-container/45 px-2.5 py-1 text-[10px] font-semibold text-tertiary-light">
          {getPackageStatusLabel(packageData)}
        </span>
      </div>
      {getPackageOriginLabel(packageData.origin) ? <p className="mt-3 text-xs text-primary-light">{getPackageOriginLabel(packageData.origin)}</p> : null}
      {getPackageClosureLabel(packageData.closureDisposition) ? <p className="mt-3 text-sm font-semibold text-on-surface-variant">{getPackageClosureLabel(packageData.closureDisposition)}</p> : null}

      <p className="mt-4 flex items-center gap-2 text-sm text-on-surface-variant">
        <MapPin size={14} className="shrink-0 text-primary-light" />
        {packageData.locationName || "Brak lokalizacji pakietu"}
      </p>

      <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
        <div><dt className="text-on-surface-muted">Typ</dt><dd>{userTrainingType(String(packageData.expectedBillingType), packageKind === "group" ? "Grupowy" : "Indywidualny / semi")}</dd></div>
        <div><dt className="text-on-surface-muted">Cena</dt><dd>{formatMoney(packageData.totalPrice, packageData.currency || "PLN")}</dd></div>
        <div><dt className="text-on-surface-muted">Pozostałe wejścia</dt><dd>{packageData.remainingSessions}</dd></div>
        <div><dt className="text-on-surface-muted">Ważność</dt><dd>{formatPackageDate(packageData.validUntil)}</dd></div>
        <div><dt className="text-on-surface-muted">Termin płatności</dt><dd>{formatPackageDate(packageData.paymentDueDate)}</dd></div>
        <div><dt className="text-on-surface-muted">Płatność</dt><dd>{getPackagePaymentStatusLabel(packageData.paymentStatus)}</dd></div>
        {packageData.closureReason ? <div className="sm:col-span-2"><dt className="text-on-surface-muted">Powód zamknięcia</dt><dd className="break-words">{packageData.closureReason}</dd></div> : null}
        {packageData.closedAt ? <div><dt className="text-on-surface-muted">Data zamknięcia</dt><dd>{formatPackageDate(packageData.closedAt)}</dd></div> : null}
        {packageData.refundAmount > 0 ? <div><dt className="text-on-surface-muted">Kwota zwrotu</dt><dd>{formatMoney(packageData.refundAmount, packageData.currency)}</dd></div> : null}
        {packageData.refundConfirmedAt ? <div><dt className="text-on-surface-muted">Zwrot potwierdzony</dt><dd>{formatPackageDate(packageData.refundConfirmedAt)}</dd></div> : null}
        {packageData.refundReference ? <div><dt className="text-on-surface-muted">Potwierdzenie zwrotu</dt><dd className="break-words">{packageData.refundReference}</dd></div> : null}
      </dl>

      <p className="mt-2 flex items-center gap-2 text-sm text-on-surface-variant">
        <CalendarDays size={14} className="shrink-0 text-primary-light" />
        Zakup: {formatPackageDate(packageData.purchaseDate)}
        {packageData.activatedAt
          ? ` · Aktywacja: ${formatPackageDate(packageData.activatedAt)}`
          : ""}
      </p>

      <div className="mt-4 grid grid-cols-1 items-end gap-3 border-t border-white/5 pt-4 sm:grid-cols-3">
        <div>
          <p className="text-label text-on-surface-muted">Wykorzystanie</p>
          <p className="mt-1 text-sm font-semibold">
            {packageData.usedSessions}/{packageData.totalSessions}
          </p>
        </div>
        <div className="text-right">
          <p className="text-label text-on-surface-muted">Zapłacono</p>
          <p className="mt-1 text-sm font-semibold">
            {formatMoney(packageData.amountPaid, packageData.currency || "PLN")}
          </p>
        </div>
        <div className="text-right">
          <p className="text-label text-on-surface-muted">Do zapłaty</p>
          <p className="mt-1 text-sm font-semibold text-tertiary-light">
            {formatMoney(packageData.amountDue, packageData.currency || "PLN")}
          </p>
        </div>
      </div>
      {onManage ? <Button className="mt-4 w-full" variant="secondary" onClick={onManage}>Zarządzaj pakietem</Button> : null}
    </article>
  );
}

function formatPackageDate(value?: string | null) {
  if (!value) return "Brak daty";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium" }).format(date);
}

function getTime(value?: string | null) {
  if (!value) return 0;

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function getPackageStatusLabel(packageData: ClientPackageBilling) {
  return packageData.isActive ? "Aktywny" : "Nieaktywny";
}

function normalizeLocation(value?: string | null) {
  return (value || "").trim().toLowerCase();
}
