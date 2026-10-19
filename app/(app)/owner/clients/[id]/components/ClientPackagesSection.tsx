"use client";

import { Fragment, useMemo, useState, type ReactNode } from "react";
import { Dumbbell, Info, MapPin, UsersRound } from "lucide-react";
import { useCurrentUser } from "@/app/components/current-user-provider";
import { Button } from "@/app/components/ui/button";
import { Tooltip } from "@/app/components/ui/tooltip";
import { getPackageClosureLabel, getPackageOriginLabel, getPackagePaymentStatusLabel, type ClientPackageBilling } from "@/app/lib/owner/billing";
import { formatMoney as formatKnownMoney } from "@/app/lib/formatters/money";
import { userTrainingType } from "@/app/lib/user-messages";
import PackageManagementModal from "./PackageManagementModal";
import ImportClientPackageModal from "./ImportClientPackageModal";
import PackageExpiryDecisionModal from "./PackageExpiryDecisionModal";
import { canDecidePackageExpiry, formatPackageInstant, isPackageExpired, packageTrainingKind } from "@/app/lib/package-validity";
import { isSessionPackage } from "@/app/lib/period-packages";

export function isGroupClientPackage(
  packageData: Pick<ClientPackageBilling, "packageType" | "expectedBillingType" | "billingMode">,
) {
  return getClientPackageKind(packageData) === "group";
}

function getClientPackageKind(
  packageData: Pick<ClientPackageBilling, "packageType" | "expectedBillingType" | "billingMode">,
) {
  const kind = packageTrainingKind(packageData.packageType, packageData.expectedBillingType, packageData.billingMode);
  return kind === "individual" ? "main" : kind;
}

export function getActivePackagesMeta(packages: ClientPackageBilling[] | null | undefined) {
  if (!packages) return undefined;
  const active = packages.filter((item) => item.isActive === true).length;
  if (active === 1) return "1 aktywny";
  const lastDigit = active % 10;
  const lastTwoDigits = active % 100;
  return lastDigit >= 2 && lastDigit <= 4 && (lastTwoDigits < 12 || lastTwoDigits > 14) ? `${active} aktywne` : `${active} aktywnych`;
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
  embedded = false,
}: {
  packages: ClientPackageBilling[] | null | undefined;
  activeClientPackageId?: number | null;
  clientId?: number;
  onSaved?: () => Promise<void>;
  audience?: "staff" | "client";
  embedded?: boolean;
}) {
  const { user } = useCurrentUser();
  const [managedPackage, setManagedPackage] = useState<ClientPackageBilling | null>(null);
  const [expiryPackage, setExpiryPackage] = useState<ClientPackageBilling | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [highlightedId, setHighlightedId] = useState<number | null>(null);
  const [visibleCount, setVisibleCount] = useState(6);
  const sortedPackages = useMemo(
    () =>
      [...(packages || [])].filter(isSessionPackage).sort(
        (first, second) =>
          getTime(second.purchaseDate) - getTime(first.purchaseDate),
      ),
    [packages],
  );
  const mainPackage = sortedPackages.find((item) => item.clientPackageId === activeClientPackageId && !isGroupClientPackage(item));
  const groupPackages = sortedPackages.filter(isGroupClientPackage);
  const history = sortedPackages.filter((item) => item !== mainPackage && !isGroupClientPackage(item));
  const visiblePackages = history.slice(0, Math.max(visibleCount, history.findIndex((item) => item.clientPackageId === highlightedId) + 1));
  const shellClassName = embedded ? "min-w-0" : "card-shell min-w-0 p-5 md:p-6";
  const canManage = user?.role === "owner" && audience === "staff" && Boolean(clientId && onSaved);

  async function handleSaved(clientPackageId?: number) {
    if (clientPackageId !== undefined) setHighlightedId(clientPackageId);
    await onSaved?.();
  }

  function renderCard(item: ClientPackageBilling) {
    return (
      <ClientPackageCard
        key={item.clientPackageId}
        packageData={item}
        highlighted={item.clientPackageId === highlightedId}
        onManage={canManage ? () => setManagedPackage(item) : undefined}
        onExpiry={canManage ? () => setExpiryPackage(item) : undefined}
      />
    );
  }

  if (packages === undefined) {
    return (
      <section className={shellClassName}>
        {embedded ? null : <p className="mb-3 text-section-title">Pakiety klienta</p>}
        <p className="text-sm text-on-surface-variant">Dane pakietów są obecnie niedostępne.</p>
      </section>
    );
  }

  return (
    <section className={shellClassName}>
      {embedded ? null : <p className="mb-4 text-label text-on-surface-muted">{audience === "client" ? "Twoje pakiety" : "Pakiety klienta"}</p>}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-on-surface">Pakiet indywidualny</h3>
        {canManage ? <Button variant="secondary" size="sm" className="h-8 px-3" onClick={() => setIsImportOpen(true)}>Wprowadź trwający pakiet</Button> : null}
      </div>
      {mainPackage ? <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">{renderCard(mainPackage)}</div> : <p className="mt-2 text-xs text-on-surface-variant">{audience === "client" ? "Nie masz bieżącego pakietu indywidualnego. Twoje pakiety grupowe pozostają dostępne niezależnie." : "Klient nie ma bieżącego pakietu indywidualnego. Pakiety grupowe pozostają dostępne niezależnie."}</p>}

      <div className="mt-5 flex items-center gap-2">
        <h3 className="text-sm font-semibold text-on-surface">Pakiety grupowe</h3>
        <InfoTooltip label="Pakiety grupowe nie odnawiają się automatycznie." align="start" />
      </div>
      {groupPackages.length ? <div className="mt-3 grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">{groupPackages.map(renderCard)}</div> : <p className="mt-2 text-xs text-on-surface-variant">Brak pakietów grupowych.</p>}

      <h3 className="mt-5 text-sm font-semibold text-on-surface">Pozostałe pakiety indywidualne</h3>
      {visiblePackages.length ? (
        <>
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {visiblePackages.map(renderCard)}
          </div>
          {visiblePackages.length < history.length ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="mt-3 h-8 px-3"
              onClick={() => setVisibleCount((current) => current + 6)}
            >
              Pokaż więcej
            </Button>
          ) : null}
        </>
      ) : (
        <p className="mt-2 text-xs text-on-surface-variant">Brak pozostałych pakietów indywidualnych.</p>
      )}
      {canManage && managedPackage && clientId && onSaved ? <PackageManagementModal key={managedPackage.clientPackageId} clientId={clientId} packageData={managedPackage} onClose={() => setManagedPackage(null)} onSaved={handleSaved} /> : null}
      {canManage && expiryPackage && clientId && onSaved ? <PackageExpiryDecisionModal key={expiryPackage.clientPackageId} clientId={clientId} packageData={expiryPackage} onClose={() => setExpiryPackage(null)} onSaved={handleSaved} /> : null}
      {canManage && clientId && onSaved ? <ImportClientPackageModal key={clientId} open={isImportOpen} clientId={clientId} onClose={() => setIsImportOpen(false)} onSaved={handleSaved} /> : null}
    </section>
  );
}

function ClientPackageCard({
  packageData,
  onManage,
  onExpiry,
  highlighted = false,
}: {
  packageData: ClientPackageBilling;
  onManage?: () => void;
  onExpiry?: () => void;
  highlighted?: boolean;
}) {
  const packageKind = getClientPackageKind(packageData);
  const isGroup = packageKind === "group";
  const currency = packageData.currency || "PLN";
  const kindLabel = packageKind === "group" ? "Grupowy" : packageKind === "main" ? "Indywidualny / semi" : "Typ nieokreślony";
  const originLabel = getPackageOriginLabel(packageData.origin);
  const closureLabel = getPackageClosureLabel(packageData.closureDisposition);
  const canDecideExpiry = Boolean(onExpiry) && canDecidePackageExpiry(packageData);
  const details: [string, string][] = [
    ["Typ", userTrainingType(String(packageData.expectedBillingType), packageKind === "group" ? "Grupowy" : packageKind === "main" ? "Indywidualny / semi" : "Brak danych")],
    ["Cena", formatMoney(packageData.totalPrice, currency)],
    ["Pozostałe wejścia", String(packageData.remainingSessions ?? "Brak danych")],
    ["Płatność", getPackagePaymentStatusLabel(packageData.paymentStatus)],
    ["Termin płatności", formatPackageDate(packageData.paymentDueDate)],
    ["Zakup", formatPackageDate(packageData.purchaseDate)],
  ];
  if (packageData.activatedAt) details.push(["Aktywacja", formatPackageDate(packageData.activatedAt)]);
  if (originLabel) details.push(["Pochodzenie", originLabel]);

  return (
    <article className={`min-w-0 rounded-[var(--radius-lg)] bg-surface-container-lowest p-3 ${highlighted ? "ring-2 ring-primary-light" : ""}`}>
      {highlighted ? <p role="status" className="mb-2 text-[11px] font-semibold text-primary-light">Ostatnio zapisany pakiet</p> : null}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h4 className="break-words text-sm font-semibold leading-snug">
            {packageData.packageName || "Pakiet bez nazwy"}
          </h4>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-on-surface-muted">
            <span className="inline-flex items-center gap-1 text-primary-light">
              {isGroup ? <UsersRound size={11} /> : <Dumbbell size={11} />}
              {kindLabel}
            </span>
            <span className="inline-flex min-w-0 items-center gap-1">
              <MapPin size={11} className="shrink-0" />
              {packageData.locationName || "Brak lokalizacji"}
            </span>
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <span className="rounded-full bg-tertiary-container/45 px-2 py-0.5 text-[10px] font-semibold text-tertiary-light">
            {getPackageStatusLabel(packageData)}
          </span>
          <InfoTooltip
            align="end"
            srLabel={`Szczegóły pakietu: ${details.map(([label, value]) => `${label}: ${value}`).join(", ")}`}
            label={
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
                {details.map(([label, value]) => (
                  <Fragment key={label}>
                    <dt className="text-on-surface-muted">{label}</dt>
                    <dd>{value}</dd>
                  </Fragment>
                ))}
              </dl>
            }
          />
        </div>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs sm:grid-cols-4">
        <CardStat label="Wejścia" value={`${packageData.usedSessions ?? "—"}/${packageData.totalSessions ?? "—"}`} />
        <CardStat label="Ważność" value={formatPackageInstant(packageData.validUntil)} />
        <CardStat label="Zapłacono" value={formatMoney(packageData.amountPaid, currency)} />
        <CardStat label="Do zapłaty" value={formatMoney(packageData.amountDue, currency)} accent />
      </dl>

      {closureLabel || packageData.closureReason || packageData.closedAt || packageData.refundAmount > 0 || packageData.refundReference ? (
        <dl className="mt-3 grid grid-cols-1 gap-1.5 border-t border-white/5 pt-2 text-xs sm:grid-cols-2">
          {closureLabel ? <div className="font-semibold text-on-surface-variant sm:col-span-2">{closureLabel}</div> : null}
          {packageData.closureReason ? <InlineDetail label="Powód zamknięcia" value={packageData.closureReason} wide /> : null}
          {packageData.closedAt ? <InlineDetail label="Zamknięto" value={formatPackageDate(packageData.closedAt)} /> : null}
          {packageData.refundAmount > 0 ? <InlineDetail label="Kwota zwrotu" value={formatMoney(packageData.refundAmount, packageData.currency)} /> : null}
          {packageData.refundConfirmedAt ? <InlineDetail label="Zwrot potwierdzony" value={formatPackageDate(packageData.refundConfirmedAt)} /> : null}
          {packageData.refundReference ? <InlineDetail label="Potwierdzenie zwrotu" value={packageData.refundReference} /> : null}
        </dl>
      ) : null}

      {isPackageExpired(packageData.validUntil) ? <p className="mt-2 text-[11px] leading-4 text-on-surface-muted">Ważność minęła. Trening odbyty przed końcem ważności nadal może zostać rozliczony.</p> : null}
      {canDecideExpiry || onManage ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {canDecideExpiry ? <Button size="sm" className="h-8 flex-1 px-3" onClick={onExpiry}>Przedłuż / Zakończ pakiet</Button> : null}
          {onManage ? <Button size="sm" className="h-8 flex-1 px-3" variant="secondary" onClick={onManage}>Zarządzaj pakietem</Button> : null}
        </div>
      ) : null}
    </article>
  );
}

function CardStat({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] uppercase tracking-wide text-on-surface-muted">{label}</dt>
      <dd className={`mt-0.5 break-words font-semibold ${accent ? "text-tertiary-light" : "text-on-surface"}`}>{value}</dd>
    </div>
  );
}

function InlineDetail({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <dt className="inline text-on-surface-muted">{label}: </dt>
      <dd className="inline break-words">{value}</dd>
    </div>
  );
}

function InfoTooltip({ label, srLabel, align }: { label: ReactNode; srLabel?: string; align: "start" | "end" }) {
  return (
    <Tooltip label={label} align={align}>
      <span tabIndex={0} className="inline-flex rounded-full text-on-surface-muted transition hover:text-primary-light focus-visible:text-primary-light focus-visible:outline-none">
        <Info size={14} aria-hidden="true" />
        <span className="sr-only">{srLabel ?? (typeof label === "string" ? label : "Szczegóły")}</span>
      </span>
    </Tooltip>
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
  if (packageData.closedAt || packageData.closureDisposition) return "Zamknięty";
  if (isPackageExpired(packageData.validUntil)) return "Wygasły";
  return typeof packageData.isActive === "boolean" ? packageData.isActive ? "Aktywny" : "Nieaktywny" : "Brak danych";
}

function normalizeLocation(value?: string | null) {
  return (value || "").trim().toLowerCase();
}

function formatMoney(amount: number | null | undefined, currency?: string | null) {
  return typeof amount === "number" && Number.isFinite(amount) ? formatKnownMoney(amount, currency) : "Brak danych";
}
