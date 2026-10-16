"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowRight, Mail, MapPin } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { CustomSelect } from "@/app/components/ui/custom-select";
import { TextField } from "@/app/components/ui/input";
import { ModalFooter, ModalHeader, ModalOverlay } from "@/app/components/ui/modal";
import {
  cancelInvitation,
  createInvitation,
  getInvitations,
  isPendingInvitation,
  resendInvitation,
  type Invitation,
  type InvitationRole,
} from "@/app/lib/owner/invitations";
import { useOwnerLocationFilter } from "@/app/lib/owner/location-filter";
import { getLocations, type Location } from "@/app/lib/owner/locations";
import { OwnerTrainerAssignmentSelect } from "./OwnerTrainerAssignmentSelect";
import InvitationsList from "./InvitationsList";
import { showOwnerError, showOwnerSuccess } from "./owner-toast";

type InviteUserModalProps = {
  open: boolean;
  role: InvitationRole;
  title: string;
  description: string;
  submitLabel: string;
  emailPlaceholder: string;
  toastScope: string;
  successMessage: string;
  onClose: () => void;
};

const initialForm = {
  email: "",
  locationId: "",
  trainerId: "",
};

export default function InviteUserModal({
  open,
  role,
  title,
  description,
  submitLabel,
  emailPlaceholder,
  toastScope,
  successMessage,
  onClose,
}: InviteUserModalProps) {
  const { selectedLocationId } = useOwnerLocationFilter();
  const [form, setForm] = useState(initialForm);
  const [locations, setLocations] = useState<Location[]>([]);
  const [isTrainerChecking, setIsTrainerChecking] = useState(false);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const [isLoadingInvitations, setIsLoadingInvitations] = useState(false);

  const loadInvitations = useCallback(async () => {
    try {
      setIsLoadingInvitations(true);

      const data = await getInvitations({ role });

      setInvitations(data.filter(isPendingInvitation));
    } catch (err) {
      showOwnerError(err, "Nie udało się pobrać zaproszeń.", {
        id: `${toastScope}-invitations-load-error`,
      });
    } finally {
      setIsLoadingInvitations(false);
    }
  }, [role, toastScope]);

  useEffect(() => {
    if (!open) return;

    void Promise.resolve().then(() => loadInvitations());
  }, [loadInvitations, open]);

  useEffect(() => {
    if (!open) return;

    const controller = new AbortController();
    void Promise.resolve()
      .then(() => {
        controller.signal.throwIfAborted();
        setIsLoadingOptions(true);

        return getLocations(controller.signal);
      })
      .then((locationsData) => {
        if (controller.signal.aborted) return;
        const availableLocations = locationsData.filter(
          (location) => location.isActive,
        );
        const preferredLocationId = selectedLocationId
          ? String(selectedLocationId)
          : "";
        const resolvedLocationId = availableLocations.some(
          (location) => String(location.id) === preferredLocationId,
        )
          ? preferredLocationId
          : availableLocations[0]
            ? String(availableLocations[0].id)
            : "";

        setLocations(availableLocations);
        setForm({
          email: "",
          locationId: resolvedLocationId,
          trainerId: "",
        });
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setLocations([]);
        showOwnerError(err, "Nie udało się pobrać lokalizacji.", {
          id: `${toastScope}-invitation-options-load-error`,
        });
      })
      .finally(() => { if (!controller.signal.aborted) setIsLoadingOptions(false); });
    return () => controller.abort();
  }, [open, role, selectedLocationId, toastScope]);

  if (!open) return null;

  async function handleSubmit() {
    if (isTrainerChecking || isSubmitting) return;
    const locationId = Number(form.locationId);

    if (!locationId) {
      showOwnerError(
        new Error("Wybierz lokalizację dla zaproszenia."),
        "",
        { id: `${toastScope}-invitation-location-required` },
      );
      return;
    }

    try {
      setIsSubmitting(true);

      await createInvitation({
        email: form.email,
        role,
        locationId,
        trainerId:
          role === "Client" && form.trainerId
            ? Number(form.trainerId)
            : null,
      });

      setForm((current) => ({
        ...initialForm,
        locationId: current.locationId,
      }));
      await loadInvitations();
      showOwnerSuccess(successMessage, {
        id: `${toastScope}-invitation-create-success`,
      });
    } catch (err) {
      showOwnerError(err, "Nie udało się wysłać zaproszenia.", {
        id: `${toastScope}-invitation-create-error`,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const locationOptions = locations.map((location) => ({
    value: String(location.id),
    label: formatLocationLabel(location),
  }));

  async function handleCancel(id: number) {
    try {
      await cancelInvitation(id);

      setInvitations((current) =>
        current.filter((invitation) => invitation.id !== id),
      );
      showOwnerSuccess("Zaproszenie zostało wycofane.", {
        id: `${toastScope}-invitation-cancel-success`,
      });
    } catch (err) {
      showOwnerError(err, "Nie udało się wycofać zaproszenia.", {
        id: `${toastScope}-invitation-cancel-error`,
      });
    }
  }

  async function handleResend(id: number) {
    try {
      await resendInvitation(id);
      await loadInvitations();
      showOwnerSuccess("Zaproszenie zostało ponowione.", {
        id: `${toastScope}-invitation-resend-success`,
      });
    } catch (err) {
      showOwnerError(err, "Nie udało się ponowić zaproszenia.", {
        id: `${toastScope}-invitation-resend-error`,
      });
    }
  }

  return (
    <ModalOverlay onClose={isSubmitting ? undefined : onClose} className="items-end md:items-center">
      <div className="relative z-10 flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-[34px] bg-surface-container-high shadow-ambient md:max-w-[560px] md:rounded-[var(--radius-xl)]">
        <div className="min-h-0 flex-1 overflow-y-auto p-6 md:p-8">
          <ModalHeader
            eyebrow="Zaproszenie"
            title={title}
            description={description}
            onClose={onClose}
          />

          <TextField
            label="Adres e-mail"
            value={form.email}
            onChange={(email) => setForm((current) => ({ ...current, email }))}
            type="email"
            placeholder={emailPlaceholder}
            icon={<Mail size={18} />}
            className="mt-8"
          />

          <div
            className={[
              "mt-4 grid gap-4",
              role === "Client" ? "sm:grid-cols-2" : "",
            ].join(" ")}
          >
            <div>
              <span className="text-label text-on-surface-muted">
                Lokalizacja
              </span>
              <CustomSelect
                value={form.locationId}
                onChange={(locationId) =>
                  setForm((current) => ({
                    ...current,
                    locationId,
                    trainerId: "",
                  }))
                }
                icon={<MapPin size={17} />}
                className="mt-2"
                options={
                  locationOptions.length
                    ? locationOptions
                    : [{ value: "", label: "Brak aktywnych lokalizacji" }]
                }
              />
            </div>

            {role === "Client" ? (
              <div>
                <span className="text-label text-on-surface-muted">
                  Trener
                </span>
                <OwnerTrainerAssignmentSelect key={form.locationId} value={form.trainerId} onChange={trainerId => setForm(current => ({ ...current, trainerId }))} locationId={Number(form.locationId) || null} onCheckingChange={setIsTrainerChecking} />
              </div>
            ) : null}
          </div>

          <InvitationsList
            invitations={invitations}
            isLoading={isLoadingInvitations}
            onCancel={handleCancel}
            onResend={handleResend}
          />
        </div>

        <ModalFooter className="bg-surface-container-high md:px-8">
          <Button
            onClick={handleSubmit}
            disabled={
              isSubmitting ||
              isLoadingOptions || isTrainerChecking ||
              !form.email.trim() ||
              !form.locationId
            }
            icon={<ArrowRight size={18} />}
            className="h-11 w-full"
          >
            {isSubmitting ? "Wysyłanie..." : submitLabel}
          </Button>
        </ModalFooter>
      </div>
    </ModalOverlay>
  );
}

function formatLocationLabel(location: Location) {
  const details = [location.city, location.address].filter(Boolean).join(", ");

  return [location.name || `Lokalizacja ${location.id}`, details]
    .filter(Boolean)
    .join(" — ");
}
