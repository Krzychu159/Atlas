"use client";

import { useMemo, useState } from "react";
import { CalendarDays, Dumbbell, MapPin, UsersRound } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import type { ClientPackageBilling } from "@/app/lib/owner/billing";
import { formatMoney } from "@/app/lib/formatters/money";

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
}: {
  packages: ClientPackageBilling[] | null | undefined;
}) {
  const [visibleCount, setVisibleCount] = useState(6);
  const sortedPackages = useMemo(
    () =>
      [...(packages || [])].sort(
        (first, second) =>
          getTime(second.purchaseDate) - getTime(first.purchaseDate),
      ),
    [packages],
  );
  const visiblePackages = sortedPackages.slice(0, visibleCount);

  return (
    <section className="card-shell p-5 md:p-6">
      <div>
        <p className="text-label text-on-surface-muted">Pakiety klienta</p>
        <h2 className="mt-2 font-display text-[1.65rem] font-semibold leading-tight">
          Historia pakietów
        </h2>
      </div>

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
              />
            ))}
          </div>
          {visiblePackages.length < sortedPackages.length ? (
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
          Brak pakietów w historii.
        </div>
      )}
    </section>
  );
}

function ClientPackageCard({
  packageData,
}: {
  packageData: ClientPackageBilling;
}) {
  const packageKind = getClientPackageKind(packageData);
  const isGroup = packageKind === "group";

  return (
    <article className="rounded-[var(--radius-lg)] bg-surface-container-lowest p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-container-low px-2.5 py-1 text-[10px] font-semibold text-primary-light">
            {isGroup ? <UsersRound size={12} /> : <Dumbbell size={12} />}
            {packageKind === "group"
              ? "Grupowy"
              : packageKind === "main"
                ? "Główny / pozostały"
                : "Typ nieokreślony"}
          </span>
          <h3 className="mt-3 truncate text-base font-semibold">
            {packageData.packageName || "Pakiet bez nazwy"}
          </h3>
        </div>
        <span className="shrink-0 rounded-full bg-tertiary-container/45 px-2.5 py-1 text-[10px] font-semibold text-tertiary-light">
          {getPackageStatusLabel(packageData)}
        </span>
      </div>

      <p className="mt-4 flex items-center gap-2 text-sm text-on-surface-variant">
        <MapPin size={14} className="shrink-0 text-primary-light" />
        {packageData.locationName || "Brak lokalizacji pakietu"}
      </p>

      <p className="mt-2 flex items-center gap-2 text-sm text-on-surface-variant">
        <CalendarDays size={14} className="shrink-0 text-primary-light" />
        Zakup: {formatPackageDate(packageData.purchaseDate)}
        {packageData.activatedAt
          ? ` · Aktywacja: ${formatPackageDate(packageData.activatedAt)}`
          : ""}
      </p>

      <div className="mt-4 grid grid-cols-3 items-end gap-3 border-t border-white/5 pt-4">
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
  if (!packageData.isActive) return packageData.paymentStatus || "Zakończony";

  return packageData.paymentStatus || packageData.activationMode || "Aktywny";
}

function normalizeLocation(value?: string | null) {
  return (value || "").trim().toLowerCase();
}
