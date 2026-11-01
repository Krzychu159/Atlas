"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CircleAlert, Mail, MapPin, Send, UserCheck } from "lucide-react";
import { locationSelectOptions, type LocationLoadStatus } from "@/app/(app)/owner/components/location-options";
import { Button } from "@/app/components/ui/button";
import { CustomSelect } from "@/app/components/ui/custom-select";
import { DateInput } from "@/app/components/ui/date-input";
import { TextArea, TextField } from "@/app/components/ui/input";
import { ModalFooter, ModalHeader, ModalOverlay } from "@/app/components/ui/modal";
import {
  emptyTrainerClientForm,
  toCreateTrainerClientPayload,
  trainerClientCreateError,
  TRAINER_CLIENT_FIX_FIELDS,
  validateTrainerClientForm,
  type TrainerClientFieldErrors,
  type TrainerClientForm,
} from "@/app/lib/trainer/client-create";
import { createTrainerPortalClient, getTrainerPortalMe } from "@/app/lib/trainer/portal";
import { trainerPortalMeToLocations } from "@/app/lib/trainer/portal-mappers";
import TrainerInviteClientModal from "./TrainerInviteClientModal";

type AddTrainerClientModalProps = {
  onClose: () => void;
  onCreated: () => void;
};

type LocationOption = { value: string; label: string };
type CreatedClient = { id: number | null; name: string; email: string | null; locationId: number };

const PANEL_CLASS = "relative z-10 flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-[34px] bg-surface-container-high shadow-ambient md:max-w-[640px] md:rounded-[var(--radius-xl)]";

export default function AddTrainerClientModal({ onClose, onCreated }: AddTrainerClientModalProps) {
  const router = useRouter();
  const [form, setForm] = useState<TrainerClientForm>(emptyTrainerClientForm);
  const [fieldErrors, setFieldErrors] = useState<TrainerClientFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [locationsStatus, setLocationsStatus] = useState<LocationLoadStatus>("loading");
  const [locationsAttempt, setLocationsAttempt] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [created, setCreated] = useState<CreatedClient | null>(null);
  const [isInviting, setIsInviting] = useState(false);
  const submitting = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    getTrainerPortalMe(controller.signal).then((me) => {
      if (controller.signal.aborted) return;
      const options = trainerPortalMeToLocations(me).map((location) => ({ value: String(location.id), label: location.name || `Lokalizacja ${location.id}` }));
      setLocations(options);
      setLocationsStatus("ready");
      if (options.length === 1) setForm((current) => ({ ...current, locationId: options[0].value }));
    }).catch(() => {
      if (!controller.signal.aborted) setLocationsStatus("error");
    });
    return () => controller.abort();
  }, [locationsAttempt]);

  function updateField(field: keyof TrainerClientForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => (field in current ? { ...current, [field]: undefined } : current));
    setFormError(null);
  }

  function retryLocations() {
    setLocationsStatus("loading");
    setLocationsAttempt((value) => value + 1);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (submitting.current) return;
    const errors = validateTrainerClientForm(form);
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      setFormError(TRAINER_CLIENT_FIX_FIELDS);
      return;
    }

    submitting.current = true;
    setIsSubmitting(true);
    setFormError(null);
    try {
      const payload = toCreateTrainerClientPayload(form);
      const client = await createTrainerPortalClient(payload);
      setCreated({
        id: typeof client?.id === "number" ? client.id : null,
        name: client?.fullName?.trim() || `${payload.firstName} ${payload.lastName}`,
        email: payload.email ?? null,
        locationId: payload.locationId,
      });
      onCreated();
    } catch (error) {
      const failure = trainerClientCreateError(error);
      setFieldErrors(failure.fields);
      setFormError(failure.message);
    } finally {
      submitting.current = false;
      setIsSubmitting(false);
    }
  }

  if (created && created.id !== null && isInviting) {
    return (
      <TrainerInviteClientModal
        client={{ id: created.id, email: created.email, locationId: created.locationId, portalAccessStatus: "NoAccount" }}
        onClose={() => setIsInviting(false)}
        onChanged={onClose}
      />
    );
  }

  if (created) {
    return (
      <ModalOverlay onClose={onClose} className="items-end md:items-center">
        <div className={PANEL_CLASS}>
          <div className="min-h-0 flex-1 overflow-y-auto p-6 md:p-8">
            <ModalHeader
              eyebrow="Nowy klient"
              icon={<UserCheck size={20} />}
              title="Klient jest na Twojej liście"
              description={`${created.name} ma już kartotekę i możesz planować z tą osobą treningi.`}
              onClose={onClose}
            />
            <div className="mt-6 flex gap-3 rounded-[var(--radius-lg)] bg-surface-container-lowest p-4">
              <CircleAlert size={18} className="mt-0.5 shrink-0 text-primary-light" aria-hidden />
              <div className="min-w-0">
                <p className="text-sm font-semibold">Brak dostępu do panelu klienta</p>
                <p className="mt-1 text-sm leading-6 text-on-surface-variant">
                  Ta osoba nie ma jeszcze konta i nie może się zalogować. Żeby otrzymała dostęp, wyślij jej zaproszenie. Możesz to zrobić teraz albo później w kartotece klienta.
                </p>
              </div>
            </div>
          </div>
          <ModalFooter className="bg-surface-container-high md:px-8">
            <Button type="button" variant="secondary" onClick={onClose}>Zamknij</Button>
            {created.id !== null ? (
              <>
                <Button type="button" variant="secondary" icon={<ArrowRight size={18} />} onClick={() => router.push(`/trainer/clients/${created.id}`)}>
                  Otwórz kartotekę
                </Button>
                <Button type="button" icon={<Send size={16} />} onClick={() => setIsInviting(true)}>
                  Wyślij zaproszenie
                </Button>
              </>
            ) : null}
          </ModalFooter>
        </div>
      </ModalOverlay>
    );
  }

  const isLoadingLocations = locationsStatus === "loading";
  const hasNoLocations = locationsStatus === "ready" && locations.length === 0;
  const locationOptions = locations.length > 1
    ? [{ value: "", label: "Wybierz lokalizację" }, ...locations]
    : locationSelectOptions(locationsStatus, locations);

  return (
    <ModalOverlay onClose={isSubmitting ? undefined : onClose} className="items-end md:items-center">
      <form noValidate onSubmit={handleSubmit} className={PANEL_CLASS}>
        <div className="min-h-0 flex-1 overflow-y-auto p-6 md:p-8">
          <ModalHeader
            eyebrow="Nowy klient"
            title="Dodaj klienta"
            description="Klient od razu pojawi się na Twojej liście, ale nie dostanie jeszcze dostępu do panelu klienta."
            onClose={onClose}
          />

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <TextField label="Imię" value={form.firstName} onChange={(value) => updateField("firstName", value)} error={fieldErrors.firstName ?? null} autoComplete="off" required />
            <TextField label="Nazwisko" value={form.lastName} onChange={(value) => updateField("lastName", value)} error={fieldErrors.lastName ?? null} autoComplete="off" required />

            <div className="sm:col-span-2">
              <CustomSelect
                label="Lokalizacja"
                value={form.locationId}
                onChange={(value) => updateField("locationId", value)}
                icon={<MapPin size={17} />}
                options={locationOptions}
              />
              {fieldErrors.locationId ? <p className="mt-1.5 text-xs font-medium text-error-light">{fieldErrors.locationId}</p> : null}
              {hasNoLocations ? <p className="mt-1.5 text-xs text-on-surface-variant">Nie pracujesz jeszcze w żadnej lokalizacji. Poproś właściciela studia o przypisanie.</p> : null}
              {locationsStatus === "error" ? (
                <div role="alert" className="mt-2 flex flex-wrap items-center gap-3 text-xs font-medium text-error-light">
                  Nie udało się pobrać Twoich lokalizacji.
                  <Button type="button" variant="secondary" size="sm" onClick={retryLocations}>Spróbuj ponownie</Button>
                </div>
              ) : null}
            </div>

            <TextField label="E-mail (opcjonalnie)" type="email" value={form.email} onChange={(value) => updateField("email", value)} icon={<Mail size={18} />} error={fieldErrors.email ?? null} autoComplete="off" />
            <TextField label="Telefon (opcjonalnie)" type="tel" value={form.phoneNumber} onChange={(value) => updateField("phoneNumber", value)} autoComplete="off" />
            <TextField label="Cel treningowy (opcjonalnie)" value={form.goal} onChange={(value) => updateField("goal", value)} autoComplete="off" />
            <DateInput label="Początek współpracy (opcjonalnie)" value={form.trainingStartDate} onChange={(value) => updateField("trainingStartDate", value)} />
            <TextArea label="Notatki (opcjonalnie)" value={form.notes} onChange={(value) => updateField("notes", value)} rows={3} className="sm:col-span-2" />
          </div>
        </div>

        {formError ? <p role="alert" className="border-t border-white/5 px-6 py-3 text-sm text-error-light md:px-8">{formError}</p> : null}

        <ModalFooter className="bg-surface-container-high md:px-8">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>Anuluj</Button>
          <Button type="submit" disabled={isSubmitting || isLoadingLocations || hasNoLocations} icon={<ArrowRight size={18} />}>
            {isSubmitting ? "Zapisywanie..." : "Dodaj klienta"}
          </Button>
        </ModalFooter>
      </form>
    </ModalOverlay>
  );
}
