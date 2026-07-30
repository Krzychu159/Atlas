"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowRight, Mail } from "lucide-react";
import { Button } from "@/app/components/ui/button";
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
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  if (!open) return null;

  async function handleSubmit() {
    if (!selectedLocationId) {
      showOwnerError(
        new Error("Wybierz konkretną lokalizację w nagłówku panelu."),
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
        locationId: selectedLocationId,
      });

      setForm(initialForm);
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
    <ModalOverlay onClose={onClose} className="items-end md:items-center">
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
            onChange={(email) => setForm({ email })}
            type="email"
            placeholder={emailPlaceholder}
            icon={<Mail size={18} />}
            className="mt-8"
          />

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
            disabled={isSubmitting || !form.email}
            icon={<ArrowRight size={18} />}
            className="h-14 w-full uppercase tracking-[0.08em]"
          >
            {isSubmitting ? "Wysyłanie..." : submitLabel}
          </Button>
        </ModalFooter>
      </div>
    </ModalOverlay>
  );
}
