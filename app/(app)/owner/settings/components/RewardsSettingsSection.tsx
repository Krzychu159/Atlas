"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Edit3, Gift, LoaderCircle, PauseCircle, Plus, RotateCcw, Save } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { TextArea, TextField } from "@/app/components/ui/input";
import { ModalFooter, ModalHeader, ModalOverlay } from "@/app/components/ui/modal";
import { showAppError, showAppSuccess } from "@/app/components/ui/app-toast";
import {
  createMilestoneDefinition,
  deactivateMilestoneDefinition,
  getMilestoneDefinitions,
  restoreMilestoneDefinition,
  updateMilestoneDefinition,
  type MilestoneDefinition,
  type MilestoneDefinitionPayload,
} from "@/app/lib/milestones";
import SettingsSectionHeader from "./SettingsSectionHeader";

export default function RewardsSettingsSection() {
  const [definitions, setDefinitions] = useState<MilestoneDefinition[]>([]);
  const [editing, setEditing] = useState<MilestoneDefinition | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const loadDefinitions = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await getMilestoneDefinitions(true);
      setDefinitions([...(data || [])].sort((a, b) => a.requiredMonths - b.requiredMonths));
    } catch (error) {
      showAppError(error, "Nie udało się pobrać ustawień nagród.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadDefinitions(), 0);
    return () => window.clearTimeout(timer);
  }, [loadDefinitions]);

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(definition: MilestoneDefinition) {
    setEditing(definition);
    setFormOpen(true);
  }

  async function toggleActive(definition: MilestoneDefinition) {
    try {
      setUpdatingId(definition.id);
      if (definition.isActive) await deactivateMilestoneDefinition(definition.id);
      else await restoreMilestoneDefinition(definition.id);
      await loadDefinitions();
      showAppSuccess(definition.isActive ? "Próg nagrody został wyłączony." : "Próg nagrody został przywrócony.");
    } catch (error) {
      showAppError(error, "Nie udało się zmienić aktywności progu.");
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <section className="card-shell p-5 md:p-6">
      <SettingsSectionHeader
        icon={<Gift size={18} />}
        title="Ustawienia nagród"
        description="Zarządzaj progami stażu klienta i nagrodami, które pojawiają się u ownera, trenera oraz klienta."
        action={<Button type="button" size="sm" icon={<Plus size={16} />} onClick={openCreate} className="w-full sm:w-auto">Dodaj próg</Button>}
      />

      <div className="mt-6">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 rounded-[var(--radius-xl)] bg-surface-container-low py-12 text-sm text-on-surface-muted"><LoaderCircle size={18} className="animate-spin" />Pobieranie definicji nagród...</div>
        ) : definitions.length ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {definitions.map((definition) => (
              <article key={definition.id} className="rounded-[var(--radius-xl)] border border-white/5 bg-surface-container-low p-4 md:p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-lg)] bg-primary/15 text-primary-light"><Gift size={20} /></span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-semibold text-on-surface">{definition.rewardName || "Nagroda"}</h3>
                        <span className={`rounded-full px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-wide ${definition.isActive ? "bg-tertiary-container/55 text-tertiary-light" : "bg-surface-container-high text-on-surface-muted"}`}>{definition.isActive ? "Aktywna" : "Nieaktywna"}</span>
                      </div>
                      <p className="mt-1 text-xs font-semibold text-primary-light">Po {definition.requiredMonths} mies. · {definition.name || "Kamień milowy"}</p>
                    </div>
                  </div>
                  <Button type="button" size="icon" variant="secondary" icon={<Edit3 size={16} />} onClick={() => openEdit(definition)} aria-label={`Edytuj ${definition.rewardName || definition.name}`} />
                </div>
                <p className="mt-4 min-h-10 text-sm leading-5 text-on-surface-variant">{definition.description || "Brak dodatkowego opisu."}</p>
                <div className="mt-4 border-t border-white/5 pt-4">
                  <Button type="button" size="sm" variant="ghost" icon={updatingId === definition.id ? <LoaderCircle size={15} className="animate-spin" /> : definition.isActive ? <PauseCircle size={15} /> : <RotateCcw size={15} />} onClick={() => void toggleActive(definition)} disabled={updatingId !== null}>
                    {definition.isActive ? "Wyłącz próg" : "Przywróć próg"}
                  </Button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center rounded-[var(--radius-xl)] bg-surface-container-low px-5 py-12 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-primary-light"><Gift size={20} /></span>
            <p className="mt-4 text-sm font-semibold text-on-surface">Brak zdefiniowanych nagród</p>
            <p className="mt-2 text-xs text-on-surface-muted">Dodaj pierwszy próg stażu i przypisaną do niego nagrodę.</p>
            <Button type="button" size="sm" icon={<Plus size={15} />} onClick={openCreate} className="mt-5">Dodaj pierwszą nagrodę</Button>
          </div>
        )}
      </div>

      {formOpen ? <RewardFormModal key={editing?.id ?? "new"} definition={editing} onClose={() => setFormOpen(false)} onSaved={loadDefinitions} /> : null}
    </section>
  );
}

function RewardFormModal({ definition, onClose, onSaved }: { definition: MilestoneDefinition | null; onClose: () => void; onSaved: () => Promise<void> }) {
  const [form, setForm] = useState<MilestoneDefinitionPayload>(() => ({
    name: definition?.name || "",
    requiredMonths: definition?.requiredMonths || 1,
    rewardName: definition?.rewardName || "",
    description: definition?.description || "",
    isActive: definition?.isActive ?? true,
  }));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.name.trim() || !form.rewardName.trim() || form.requiredMonths < 1) {
      setError("Uzupełnij nazwę kamienia milowego, nagrodę i poprawną liczbę miesięcy.");
      return;
    }
    try {
      setIsSaving(true);
      const payload = { ...form, name: form.name.trim(), rewardName: form.rewardName.trim(), description: form.description.trim() };
      if (definition) await updateMilestoneDefinition(definition.id, payload);
      else await createMilestoneDefinition(payload);
      await onSaved();
      showAppSuccess(definition ? "Definicja nagrody została zapisana." : "Nowa nagroda została dodana.");
      onClose();
    } catch (saveError) {
      showAppError(saveError, "Nie udało się zapisać definicji nagrody.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <ModalOverlay onClose={isSaving ? undefined : onClose}>
      <form onSubmit={submit} className="relative z-10 w-full max-w-[660px] overflow-hidden rounded-[var(--radius-xl)] border border-white/10 bg-surface-container shadow-ambient">
        <div className="p-5 md:p-6">
          <ModalHeader eyebrow="Ustawienia nagród" title={definition ? "Edytuj nagrodę" : "Dodaj nagrodę"} description="Próg liczony jest w pełnych miesiącach od daty rozpoczęcia treningów klienta." icon={<Gift size={21} />} onClose={onClose} />
          <div className="mt-7 grid gap-4 sm:grid-cols-2">
            <TextField label="Nazwa kamienia milowego" value={form.name} onChange={(name) => { setForm((current) => ({ ...current, name })); setError(""); }} placeholder="np. 6 miesięcy treningów" className="sm:col-span-2" />
            <TextField label="Liczba miesięcy" type="number" min={1} step={1} value={String(form.requiredMonths)} onChange={(value) => setForm((current) => ({ ...current, requiredMonths: Number(value) }))} />
            <TextField label="Nazwa nagrody" value={form.rewardName} onChange={(rewardName) => { setForm((current) => ({ ...current, rewardName })); setError(""); }} placeholder="np. Mały upominek" />
            <TextArea label="Opis" value={form.description} onChange={(description) => setForm((current) => ({ ...current, description }))} placeholder="Krótki opis nagrody i warunków" rows={3} className="sm:col-span-2" />
          </div>
          <div className="mt-5 flex items-center justify-between gap-4 rounded-[var(--radius-lg)] bg-surface-container-low p-4">
            <div><p className="text-sm font-semibold">Aktywna definicja</p><p className="mt-1 text-xs text-on-surface-muted">Aktywne progi są widoczne w postępie klientów.</p></div>
            <button type="button" role="switch" aria-checked={form.isActive} onClick={() => setForm((current) => ({ ...current, isActive: !current.isActive }))} className={`relative h-7 w-12 shrink-0 rounded-full transition ${form.isActive ? "bg-primary" : "bg-surface-bright"}`}><span className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white transition-transform ${form.isActive ? "translate-x-5" : "translate-x-0"}`} /></button>
          </div>
          {error ? <p className="mt-4 text-sm text-error-light">{error}</p> : null}
        </div>
        <ModalFooter>
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSaving}>Anuluj</Button>
          <Button type="submit" icon={isSaving ? <LoaderCircle size={16} className="animate-spin" /> : <Save size={16} />} disabled={isSaving}>{definition ? "Zapisz zmiany" : "Dodaj nagrodę"}</Button>
        </ModalFooter>
      </form>
    </ModalOverlay>
  );
}
