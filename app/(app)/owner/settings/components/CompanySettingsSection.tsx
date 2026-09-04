"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Building2,
  CreditCard,
  Edit3,
  Landmark,
  LoaderCircle,
  Mail,
  MapPin,
  Phone,
  Plus,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { showAppError } from "@/app/components/ui/app-toast";
import {
  getPaymentConfiguration,
  type LegalEntity,
} from "@/app/lib/owner/payment-configuration";
import CompanyFormModal from "./CompanyFormModal";
import SettingsSectionHeader from "./SettingsSectionHeader";

// Sekcja: Ustawienia firmy
export default function CompanySettingsSection() {
  const [entities, setEntities] = useState<LegalEntity[]>([]);
  const [editingEntity, setEditingEntity] = useState<LegalEntity | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadError, setHasLoadError] = useState(false);

  const loadCompanies = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setIsLoading(true);
      setHasLoadError(false);
      const configuration = await getPaymentConfiguration();
      setEntities(configuration?.legalEntities || []);
    } catch (error) {
      setHasLoadError(true);
      showAppError(error, "Nie udało się pobrać ustawień firm.", {
        id: "company-settings-load-error",
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadCompanies(), 0);
    return () => window.clearTimeout(timer);
  }, [loadCompanies]);

  function openCreateForm() {
    setEditingEntity(null);
    setFormOpen(true);
  }

  function openEditForm(entity: LegalEntity) {
    setEditingEntity(entity);
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditingEntity(null);
  }

  return (
    <section className="card-shell p-5 md:p-6">
      <SettingsSectionHeader
        icon={<Building2 size={18} />}
        title="Ustawienia firmy"
        description="Dane działalności, które są przypisywane do lokalizacji i używane w rozliczeniach oraz instrukcjach płatności."
        action={
          <Button
            type="button"
            size="sm"
            icon={<Plus size={16} />}
            onClick={openCreateForm}
            className="w-full sm:w-auto"
          >
            Dodaj firmę
          </Button>
        }
      />

      <div className="mt-6">
        {isLoading ? (
          <LoadingCompanies />
        ) : hasLoadError && entities.length === 0 ? (
          <LoadError onRetry={() => void loadCompanies()} />
        ) : entities.length === 0 ? (
          <EmptyCompanies onAdd={openCreateForm} />
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {entities.map((entity) => (
              <CompanyCard key={entity.id} entity={entity} onEdit={() => openEditForm(entity)} />
            ))}
          </div>
        )}
      </div>

      {formOpen ? (
        <CompanyFormModal
          key={editingEntity?.id ?? "new-company"}
          entity={editingEntity}
          onClose={closeForm}
          onSaved={() => loadCompanies(false)}
        />
      ) : null}
    </section>
  );
}

function CompanyCard({
  entity,
  onEdit,
}: {
  entity: LegalEntity;
  onEdit: () => void;
}) {
  const hasPaymentDetails = Boolean(
    entity.paymentRecipientName || entity.bankAccountNumber || entity.blikPhoneNumber,
  );

  return (
    <article className="rounded-[var(--radius-xl)] border border-white/5 bg-surface-container-low p-4 md:p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-lg)] bg-primary/15 text-primary-light">
            <Landmark size={20} />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-base font-semibold text-on-surface">{entity.name}</h3>
              <span
                className={`rounded-full px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-wide ${
                  entity.isActive
                    ? "bg-tertiary-container/55 text-tertiary-light"
                    : "bg-surface-container-high text-on-surface-muted"
                }`}
              >
                {entity.isActive ? "Aktywna" : "Nieaktywna"}
              </span>
            </div>
            <p className="mt-1 text-xs text-on-surface-muted">NIP {entity.nip || "nie podano"}</p>
          </div>
        </div>
        <Button
          type="button"
          size="icon"
          variant="secondary"
          icon={<Edit3 size={16} />}
          onClick={onEdit}
          aria-label={`Edytuj firmę ${entity.name}`}
        />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <CompanyDetail icon={<MapPin size={15} />} label="Adres" value={entity.address} />
        <CompanyDetail icon={<Mail size={15} />} label="E-mail" value={entity.email} />
        <CompanyDetail icon={<Phone size={15} />} label="Telefon" value={entity.phone} />
        <CompanyDetail
          icon={<CreditCard size={15} />}
          label="Płatności"
          value={hasPaymentDetails ? entity.paymentRecipientName || "Skonfigurowane" : null}
        />
      </div>

      {entity.bankAccountNumber ? (
        <div className="mt-4 rounded-[var(--radius-lg)] bg-surface-container-lowest p-3">
          <p className="text-label text-on-surface-muted">Rachunek bankowy</p>
          <p className="mt-2 break-all font-mono text-xs font-semibold tracking-wide text-on-surface-variant">
            {entity.bankAccountNumber}
          </p>
        </div>
      ) : null}
    </article>
  );
}

function CompanyDetail({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null;
}) {
  return (
    <div className="flex min-w-0 gap-2.5 rounded-[var(--radius-lg)] bg-surface-container-lowest p-3">
      <span className="mt-0.5 shrink-0 text-primary-light">{icon}</span>
      <div className="min-w-0">
        <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-on-surface-muted">{label}</p>
        <p className="mt-1 truncate text-xs font-semibold text-on-surface-variant">
          {value || "Nie podano"}
        </p>
      </div>
    </div>
  );
}

function LoadingCompanies() {
  return (
    <div className="flex items-center justify-center gap-2 rounded-[var(--radius-xl)] bg-surface-container-low py-12 text-sm text-on-surface-muted">
      <LoaderCircle size={18} className="animate-spin" />
      Pobieranie danych firm...
    </div>
  );
}

function LoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center rounded-[var(--radius-xl)] bg-surface-container-low px-5 py-10 text-center">
      <p className="text-sm font-semibold text-on-surface">Nie udało się wyświetlić firm</p>
      <p className="mt-2 text-xs text-on-surface-muted">Sprawdź połączenie i spróbuj ponownie.</p>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        icon={<RefreshCw size={15} />}
        onClick={onRetry}
        className="mt-4"
      >
        Spróbuj ponownie
      </Button>
    </div>
  );
}

function EmptyCompanies({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center rounded-[var(--radius-xl)] bg-surface-container-low px-5 py-12 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-primary-light">
        <Building2 size={20} />
      </span>
      <p className="mt-4 text-sm font-semibold text-on-surface">Brak skonfigurowanej firmy</p>
      <p className="mt-2 max-w-md text-xs leading-5 text-on-surface-muted">
        Dodaj pierwszą firmę i uzupełnij jej dane rozliczeniowe.
      </p>
      <Button type="button" size="sm" icon={<Plus size={15} />} onClick={onAdd} className="mt-5">
        Dodaj pierwszą firmę
      </Button>
    </div>
  );
}
