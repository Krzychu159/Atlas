"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowRight, Mail, MapPin, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/app/components/ui/button";
import { CustomSelect } from "@/app/components/ui/custom-select";
import { TextField } from "@/app/components/ui/input";
import { ModalFooter, ModalHeader, ModalOverlay } from "@/app/components/ui/modal";
import InvitationsList from "../../components/InvitationsList";
import { showOwnerError, showOwnerSuccess } from "../../components/owner-toast";
import { createClient } from "@/app/lib/owner/clients";
import {
  cancelInvitation,
  createInvitation,
  getInvitations,
  isPendingInvitation,
  resendInvitation,
  type Invitation,
} from "@/app/lib/owner/invitations";
import { useOwnerLocationFilter } from "@/app/lib/owner/location-filter";
import { getLocations, type Location } from "@/app/lib/owner/locations";
import { getTrainers, type Trainer } from "@/app/lib/owner/trainers";

type AddClientMode = "record" | "invitation";
type AddClientModalProps = {
  open: boolean;
  onClose: () => void;
  onCreated: () => Promise<void>;
  initialMode?: AddClientMode;
};

const initialForm = {
  firstName: "",
  lastName: "",
  email: "",
  phoneNumber: "",
  locationId: "",
  trainerId: "",
};

export default function AddClientModal({ open, onClose, onCreated, initialMode = "record" }: AddClientModalProps) {
  const router = useRouter();
  const { selectedLocationId } = useOwnerLocationFilter();
  const [mode, setMode] = useState<AddClientMode>("record");
  const [form, setForm] = useState(initialForm);
  const [locations, setLocations] = useState<Location[]>([]);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const [isLoadingInvitations, setIsLoadingInvitations] = useState(false);

  const loadInvitations = useCallback(async () => {
    try {
      setIsLoadingInvitations(true);
      const data = await getInvitations({ role: "Client" });
      setInvitations(data.filter(isPendingInvitation));
    } catch (err) {
      showOwnerError(err, "Nie udało się pobrać zaproszeń.", {
        id: "owner-client-invitations-load-error",
      });
    } finally {
      setIsLoadingInvitations(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;

    void Promise.resolve()
      .then(() => {
        setMode(initialMode);
        setIsLoadingOptions(true);
        return Promise.all([getLocations(), getTrainers()]);
      })
      .then(([locationsData, trainersData]) => {
        const availableLocations = locationsData.filter((location) => location.isActive);
        const preferredLocationId = selectedLocationId ? String(selectedLocationId) : "";
        const locationId = availableLocations.some(
          (location) => String(location.id) === preferredLocationId,
        )
          ? preferredLocationId
          : String(availableLocations[0]?.id || "");

        setLocations(availableLocations);
        setTrainers(trainersData);
        setForm({ ...initialForm, locationId });
      })
      .catch((err) => {
        setLocations([]);
        setTrainers([]);
        showOwnerError(err, "Nie udało się pobrać lokalizacji i trenerów.", {
          id: "owner-client-options-load-error",
        });
      })
      .finally(() => setIsLoadingOptions(false));
  }, [open, selectedLocationId, initialMode]);

  useEffect(() => {
    if (!open || mode !== "invitation") return;
    void Promise.resolve().then(() => loadInvitations());
  }, [loadInvitations, mode, open]);

  if (!open) return null;

  const selectedLocationIdNumber = Number(form.locationId);
  const locationOptions = locations.map((location) => ({
    value: String(location.id),
    label: formatLocationLabel(location),
  }));
  const trainerOptions = [
    { value: "", label: "Bez przypisanego trenera" },
    ...trainers
      .filter(
        (trainer) =>
          trainer.locationIds.includes(selectedLocationIdNumber) &&
          trainer.status.toLowerCase().includes("active"),
      )
      .map((trainer) => ({
        value: String(trainer.id),
        label: trainer.fullName || `${trainer.firstName} ${trainer.lastName}`.trim(),
      })),
  ];

  function updateForm(field: keyof typeof initialForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit() {
    const locationId = Number(form.locationId);

    if (!locationId) {
      showOwnerError(new Error("Wybierz lokalizację klienta."), "", {
        id: "owner-client-location-required",
      });
      return;
    }

    try {
      setIsSubmitting(true);

      if (mode === "invitation") {
        const invitation = await createInvitation({
          email: form.email.trim(),
          role: "Client",
          locationId,
          trainerId: form.trainerId ? Number(form.trainerId) : null,
        });

        await loadInvitations();
        if (invitation.lastSendError) {
          showOwnerError(new Error(invitation.lastSendError), "Nie udało się wysłać wiadomości e-mail.", {
            id: "owner-client-invitation-send-error",
          });
          return;
        }

        showOwnerSuccess("Zaproszenie dla klienta zostało wysłane.", {
          id: "owner-client-invitation-create-success",
        });
        setForm((current) => ({ ...initialForm, locationId: current.locationId }));
        return;
      }

      const client = await createClient({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        locationId,
        trainerId: form.trainerId ? Number(form.trainerId) : null,
        email: form.email.trim() || null,
        phoneNumber: form.phoneNumber.trim() || null,
      });

      showOwnerSuccess("Kartoteka klienta została utworzona.", {
        id: "owner-client-create-success",
      });
      onClose();
      await onCreated();
      router.push(`/owner/clients/${client.id}`);
    } catch (err) {
      showOwnerError(
        err,
        mode === "record"
          ? "Nie udało się utworzyć klienta."
          : "Nie udało się wysłać zaproszenia.",
        { id: "owner-client-create-error" },
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCancel(id: number) {
    try {
      await cancelInvitation(id);
      setInvitations((current) => current.filter((item) => item.id !== id));
      showOwnerSuccess("Zaproszenie zostało wycofane.", {
        id: "owner-client-invitation-cancel-success",
      });
    } catch (err) {
      showOwnerError(err, "Nie udało się wycofać zaproszenia.", {
        id: "owner-client-invitation-cancel-error",
      });
    }
  }

  async function handleResend(id: number) {
    try {
      const invitation = await resendInvitation(id);
      await loadInvitations();
      if (invitation.lastSendError) {
        showOwnerError(new Error(invitation.lastSendError), "Nie udało się wysłać wiadomości e-mail.", {
          id: "owner-client-invitation-resend-error",
        });
        return;
      }

      showOwnerSuccess("Zaproszenie zostało ponowione.", {
        id: "owner-client-invitation-resend-success",
      });
    } catch (err) {
      showOwnerError(err, "Nie udało się ponowić zaproszenia.", {
        id: "owner-client-invitation-resend-error",
      });
    }
  }

  const isSubmitDisabled =
    isSubmitting ||
    isLoadingOptions ||
    !form.locationId ||
    (mode === "record"
      ? !form.firstName.trim() || !form.lastName.trim()
      : !form.email.trim());

  return (
    <ModalOverlay onClose={onClose} className="items-end md:items-center">
      <div className="relative z-10 flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-[34px] bg-surface-container-high shadow-ambient md:max-w-[640px] md:rounded-[var(--radius-xl)]">
        <div className="min-h-0 flex-1 overflow-y-auto p-6 md:p-8">
          <ModalHeader
            eyebrow="Nowy klient"
            title="Dodaj klienta"
            description={mode === "record"
              ? "Utwórz kartotekę klienta bez konta i dostępu do panelu."
              : "Wyślij zaproszenie do utworzenia konta w panelu klienta."}
            onClose={onClose}
          />

          <div className="mt-6 grid grid-cols-2 gap-2 rounded-[var(--radius-lg)] bg-surface-container-lowest p-1.5">
            <ModeButton active={mode === "record"} onClick={() => setMode("record")}>Bez dostępu do panelu</ModeButton>
            <ModeButton active={mode === "invitation"} onClick={() => setMode("invitation")}>Zaproś do panelu</ModeButton>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {mode === "record" ? (
              <>
                <TextField label="Imię" value={form.firstName} onChange={(value) => updateForm("firstName", value)} required />
                <TextField label="Nazwisko" value={form.lastName} onChange={(value) => updateForm("lastName", value)} required />
              </>
            ) : null}

            <div>
              <span className="text-label text-on-surface-muted">Lokalizacja</span>
              <CustomSelect
                value={form.locationId}
                onChange={(value) => setForm((current) => ({ ...current, locationId: value, trainerId: "" }))}
                icon={<MapPin size={17} />}
                className="mt-2"
                options={locationOptions.length ? locationOptions : [{ value: "", label: "Brak aktywnych lokalizacji" }]}
              />
            </div>

            <div>
              <span className="text-label text-on-surface-muted">Trener</span>
              <CustomSelect value={form.trainerId} onChange={(value) => updateForm("trainerId", value)} icon={<UserRound size={17} />} className="mt-2" options={trainerOptions} />
            </div>

            <TextField
              label={mode === "record" ? "E-mail kontaktowy" : "E-mail"}
              value={form.email}
              onChange={(value) => updateForm("email", value)}
              type="email"
              icon={<Mail size={18} />}
              required={mode === "invitation"}
              className={mode === "invitation" ? "sm:col-span-2" : ""}
            />

            {mode === "record" ? (
              <TextField label="Telefon" value={form.phoneNumber} onChange={(value) => updateForm("phoneNumber", value)} type="tel" />
            ) : null}
          </div>

          {mode === "invitation" ? (
            <InvitationsList invitations={invitations} isLoading={isLoadingInvitations} onCancel={handleCancel} onResend={handleResend} />
          ) : null}
        </div>

        <ModalFooter className="bg-surface-container-high md:px-8">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>Anuluj</Button>
          <Button onClick={handleSubmit} disabled={isSubmitDisabled} icon={<ArrowRight size={18} />}>
            {isSubmitting ? "Zapisywanie..." : mode === "record" ? "Utwórz kartotekę" : "Wyślij zaproszenie"}
          </Button>
        </ModalFooter>
      </div>
    </ModalOverlay>
  );
}

function ModeButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={["rounded-[var(--radius-md)] px-3 py-3 text-sm font-semibold transition", active ? "bg-primary text-on-primary" : "text-on-surface-variant hover:text-on-surface"].join(" ")}>
      {children}
    </button>
  );
}

function formatLocationLabel(location: Location) {
  const details = [location.city, location.address].filter(Boolean).join(", ");
  return [location.name || `Lokalizacja ${location.id}`, details].filter(Boolean).join(" — ");
}
